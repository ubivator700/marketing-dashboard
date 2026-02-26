// ─── Chat message types ──────────────────────────────────────────

export interface FileRef {
  id: string;
  name: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: FileRef[];
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  files?: FileRef[];
}
