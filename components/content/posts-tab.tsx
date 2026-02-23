"use client";

import { useState } from "react";
import type { Post } from "@/types/dashboard";
import PostModal from "./post-modal";

const PRODUCT_LABELS: Record<string, string> = {
  windows: "Окна",
  balconies: "Балконы",
  entrance_doors: "Входные двери",
  interior_doors: "Межкомнатные двери",
  flooring: "Напольные покрытия",
  other: "Другое",
};

const PRODUCT_COLORS: Record<string, string> = {
  windows: "bg-blue-100 text-blue-700",
  balconies: "bg-emerald-100 text-emerald-700",
  entrance_doors: "bg-orange-100 text-orange-700",
  interior_doors: "bg-purple-100 text-purple-700",
  flooring: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  proposed: "Предложено",
  approved: "Одобрено",
};

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
};

interface PostsTabProps {
  posts: Post[];
  canWrite: boolean;
  onAdd: (post: Post) => void;
  onUpdate: (post: Post) => void;
  onDelete: (id: number) => void;
}

export default function PostsTab({ posts, canWrite, onAdd, onUpdate, onDelete }: PostsTabProps) {
  const [modal, setModal] = useState<Post | "new" | null>(null);

  function handleSave(post: Post) {
    if (modal === "new") {
      onAdd(post);
    } else {
      onUpdate(post);
    }
    setModal(null);
  }

  return (
    <>
      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={() => setModal("new")}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Добавить пост
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Постов пока нет
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {post.photoUrl && (
                <div className="h-40 bg-gray-100 overflow-hidden">
                  <img
                    src={post.photoUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 line-clamp-2">{post.title}</h3>
                {post.topic && (
                  <p className="text-xs text-gray-500">Тема: {post.topic}</p>
                )}
                <p className="text-sm text-gray-600 line-clamp-3">{post.text}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCT_COLORS[post.product]}`}>
                    {PRODUCT_LABELS[post.product]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                    {STATUS_LABELS[post.status]}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">{post.date}</span>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => setModal(post)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => onDelete(post.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <PostModal
          post={modal === "new" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
