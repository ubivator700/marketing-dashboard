"use client";

import { useState } from "react";
import type { Post, PostProduct, PostStatus } from "@/types/dashboard";
import ModalShell from "@/components/dashboard/modal-shell";

const PRODUCT_OPTIONS: { value: PostProduct; label: string }[] = [
  { value: "windows", label: "Окна" },
  { value: "balconies", label: "Балконы" },
  { value: "entrance_doors", label: "Входные двери" },
  { value: "interior_doors", label: "Межкомнатные двери" },
  { value: "flooring", label: "Напольные покрытия" },
  { value: "other", label: "Другое" },
];

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: "proposed", label: "Предложено" },
  { value: "approved", label: "Одобрено" },
];

interface PostModalProps {
  post: Post | null;
  onSave: (post: Post) => void;
  onClose: () => void;
}

export default function PostModal({ post, onSave, onClose }: PostModalProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [text, setText] = useState(post?.text ?? "");
  const [topic, setTopic] = useState(post?.topic ?? "");
  const [product, setProduct] = useState<PostProduct>(post?.product ?? "other");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "proposed");
  const [photoUrl, setPhotoUrl] = useState(post?.photoUrl ?? "");
  const [date, setDate] = useState(
    post?.date ?? new Date().toISOString().slice(0, 10)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    onSave({
      id: post?.id ?? Date.now(),
      title: title.trim(),
      text: text.trim(),
      topic: topic.trim(),
      product,
      status,
      photoUrl: photoUrl.trim() || null,
      date,
    });
  }

  return (
    <ModalShell
      title={post ? "Редактировать пост" : "Новый пост"}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текст *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тематика</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Продукт</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value as PostProduct)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRODUCT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Фото URL</label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {post ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
