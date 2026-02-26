"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ChatPanel from "./chat-panel";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Don't render for unauthenticated users
  if (!user) return null;

  return (
    <>
      {/* Chat panel */}
      {open && <ChatPanel onClose={() => setOpen(false)} />}

      {/* Floating action button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-gray-600 hover:bg-gray-700 rotate-0"
            : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
        }`}
        aria-label={open ? "Закрыть чат" : "Открыть AI-ассистент"}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        )}
      </button>
    </>
  );
}
