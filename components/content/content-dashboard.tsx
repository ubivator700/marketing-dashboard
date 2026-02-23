"use client";

import { useState, useEffect, useCallback } from "react";
import type { Post, Idea } from "@/types/dashboard";
import { useAuth } from "@/lib/auth-context";
import PostsTab from "./posts-tab";
import IdeasTab from "./ideas-tab";

type ContentTab = "posts" | "ideas";

const tabs: { id: ContentTab; label: string }[] = [
  { id: "posts", label: "Посты" },
  { id: "ideas", label: "Идеи" },
];

export default function ContentDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ContentTab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const canWrite = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    Promise.all([
      fetch("/api/posts").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/ideas").then((r) => (r.ok ? r.json() : [])),
    ]).then(([p, i]) => {
      setPosts(p);
      setIdeas(i);
      setLoading(false);
    });
  }, []);

  // ─── Posts CRUD ────────────────────────────────────────────────

  const addPost = useCallback(async (post: Post) => {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
    if (res.ok) {
      const created = await res.json();
      setPosts((prev) => [created, ...prev]);
    }
  }, []);

  const updatePost = useCallback(async (post: Post) => {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
    if (res.ok) {
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  }, []);

  const deletePost = useCallback(async (id: number) => {
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }, []);

  // ─── Ideas CRUD ───────────────────────────────────────────────

  const addIdea = useCallback(async (idea: Idea) => {
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idea),
    });
    if (res.ok) {
      const created = await res.json();
      setIdeas((prev) => [created, ...prev]);
    }
  }, []);

  const updateIdea = useCallback(async (idea: Idea) => {
    const res = await fetch(`/api/ideas/${idea.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idea),
    });
    if (res.ok) {
      const updated = await res.json();
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
  }, []);

  const deleteIdea = useCallback(async (id: number) => {
    const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    if (res.ok) {
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">Загрузка контента...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Контент</h1>
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "posts" && (
        <PostsTab
          posts={posts}
          canWrite={canWrite}
          onAdd={addPost}
          onUpdate={updatePost}
          onDelete={deletePost}
        />
      )}
      {tab === "ideas" && (
        <IdeasTab
          ideas={ideas}
          canWrite={canWrite}
          onAdd={addIdea}
          onUpdate={updateIdea}
          onDelete={deleteIdea}
        />
      )}
    </div>
  );
}
