import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { getOpenAIClient } from "@/lib/chat/openai";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { CHAT_TOOLS } from "@/lib/chat/tools";
import { executeTool } from "@/lib/chat/tool-executor";
import type { ChatMessage, FileRef } from "@/lib/chat/types";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_TOOL_ROUNDS = 6;

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const openai = getOpenAIClient();
    const systemPrompt = await buildSystemPrompt(session!.role);

    // Build OpenAI messages array
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const collectedFiles: FileRef[] = [];

    // Tool-calling loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 4096,
        messages: openaiMessages,
        tools: CHAT_TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      if (!choice) break;

      const message = choice.message;

      // If model wants to call tools
      if (choice.finish_reason === "tool_calls" || (message.tool_calls && message.tool_calls.length > 0)) {
        // Add assistant message with tool calls to conversation
        openaiMessages.push(message);

        // Execute each tool call
        for (const toolCall of message.tool_calls ?? []) {
          // Only handle function-type tool calls
          if (toolCall.type !== "function") continue;

          const fnName = toolCall.function.name;
          let fnArgs: Record<string, unknown> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          const result = await executeTool(fnName, fnArgs, collectedFiles);

          // Add tool result
          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        continue; // Next round with tool results
      }

      // Model finished — return the text response
      const reply = message.content || "Не удалось получить ответ.";
      return NextResponse.json({
        reply,
        files: collectedFiles.length > 0 ? collectedFiles : undefined,
      });
    }

    // If we exhausted rounds, return whatever we have
    return NextResponse.json({
      reply: "Запрос потребовал слишком много шагов анализа. Попробуйте задать более конкретный вопрос.",
      files: collectedFiles.length > 0 ? collectedFiles : undefined,
    });
  } catch (err: unknown) {
    console.error("[chat] Error:", err);
    let message = "Внутренняя ошибка сервера";
    if (err instanceof Error) {
      // Check for upstream API errors (502, 503, connection refused, etc.)
      if (err.message.includes("502") || err.message.includes("Bad gateway")) {
        message = "AI-сервис временно недоступен (502). Попробуйте позже.";
      } else if (err.message.includes("503") || err.message.includes("Service Unavailable")) {
        message = "AI-сервис временно недоступен (503). Попробуйте позже.";
      } else if (err.message.includes("ECONNREFUSED") || err.message.includes("fetch failed")) {
        message = "Не удалось подключиться к AI-сервису. Попробуйте позже.";
      } else if (err.message.includes("<!DOCTYPE") || err.message.includes("<html")) {
        message = "AI-сервис вернул ошибку. Попробуйте позже.";
      } else {
        message = err.message;
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
