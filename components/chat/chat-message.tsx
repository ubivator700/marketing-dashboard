"use client";

import { useRouter } from "next/navigation";
import type { FileRef } from "@/lib/chat/types";

// ─── Simple Markdown renderer (bold, lists, code, links) ────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // List item
    if (/^[-•]\s/.test(line)) {
      result.push(
        <div key={i} className="flex gap-1.5 ml-2">
          <span className="text-gray-400">•</span>
          <span>{renderInline(line.replace(/^[-•]\s/, ""))}</span>
        </div>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(line)) {
      const num = line.match(/^(\d+)[.)]\s/)?.[1];
      result.push(
        <div key={i} className="flex gap-1.5 ml-2">
          <span className="text-gray-400 min-w-[1.2em]">{num}.</span>
          <span>{renderInline(line.replace(/^\d+[.)]\s/, ""))}</span>
        </div>,
      );
      continue;
    }

    // Empty line → spacing
    if (line.trim() === "") {
      result.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular line
    result.push(
      <div key={i}>{renderInline(line)}</div>,
    );
  }

  return result;
}

function renderInline(text: string): React.ReactNode {
  // Split by bold (**text**), inline code (`code`), and plain text
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code key={match.index} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-xs font-mono">
          {match[3]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ─── File download button ────────────────────────────────────────

function FileButton({ file }: { file: FileRef }) {
  return (
    <a
      href={`/api/chat/download/${file.id}`}
      download={file.name}
      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {file.name}
    </a>
  );
}

// ─── Navigation link ─────────────────────────────────────────────

function NavLink({ path, label }: { path: string; label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(path)}
      className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
      {label}
    </button>
  );
}

// ─── Detect navigation suggestions in text ───────────────────────

const NAV_PATHS: Record<string, string> = {
  "/": "Главная",
  "/overview": "Обзор",
  "/projects": "Проекты",
  "/content": "Контент",
  "/channels": "Каналы",
  "/leads": "Лиды",
  "/expenses": "Расходы",
  "/organization": "Организация",
  "/admin": "Админ",
};

function extractNavLinks(text: string): { path: string; label: string }[] {
  const links: { path: string; label: string }[] = [];
  for (const [path, label] of Object.entries(NAV_PATHS)) {
    if (path === "/") continue; // Skip root — too common
    if (text.includes(path)) {
      links.push({ path, label });
    }
  }
  return links;
}

// ─── Main component ──────────────────────────────────────────────

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  files?: FileRef[];
}

export default function ChatMessage({ role, content, files }: ChatMessageProps) {
  const isUser = role === "user";
  const navLinks = isUser ? [] : extractNavLinks(content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-md"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md"
        }`}
      >
        {isUser ? content : renderMarkdown(content)}

        {/* Navigation links */}
        {navLinks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {navLinks.map((link) => (
              <NavLink key={link.path} {...link} />
            ))}
          </div>
        )}

        {/* File downloads */}
        {files && files.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {files.map((file) => (
              <FileButton key={file.id} file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
