"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface OrderAttachment {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
}

interface DesignOrder {
  id: number;
  title: string;
  description: string;
  author: string;
  status: "new" | "accepted" | "rejected";
  createdAt: string;
  acceptedBy: string | null;
  attachments: OrderAttachment[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Новый", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  accepted: { label: "Принят", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  rejected: { label: "Отклонён", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function OrdersPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<DesignOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [tab, setTab] = useState<"form" | "list">("form");

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/design-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError("Заполните название и имя автора");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description);
      formData.append("author", author.trim());
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/design-orders", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка отправки");
        return;
      }

      setSuccess(true);
      setTitle("");
      setDescription("");
      setAuthor("");
      setFiles([]);
      loadOrders();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6 mt-4">
          <button
            onClick={() => setTab("form")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "form"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
            }`}
          >
            Новый заказ
          </button>
          <button
            onClick={() => setTab("list")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              tab === "list"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
            }`}
          >
            Все заказы
            {orders.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === "list" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
              }`}>
                {orders.length}
              </span>
            )}
          </button>
        </div>

        {/* Form tab */}
        {tab === "form" && (
          <>
            {success ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg mx-auto text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Заказ отправлен!</h2>
                <p className="text-gray-500 mb-6">Ваш заказ принят и будет рассмотрен дизайнером в ближайшее время.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Отправить ещё
                  </button>
                  <button
                    onClick={() => { setSuccess(false); setTab("list"); }}
                    className="px-6 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-medium hover:bg-indigo-50 transition-colors"
                  >
                    Смотреть заказы
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Заказ для дизайнера</h1>
                  <p className="text-sm text-gray-500 mt-1">Опишите, что вам нужно, и прикрепите необходимые файлы</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Название заказа *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setError(""); }}
                      placeholder="Например: Баннер для акции"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Подробное описание заказа, размеры, цвета, пожелания..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ваше имя *</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => { setAuthor(e.target.value); setError(""); }}
                      placeholder="Как вас зовут"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Файлы</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                    >
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m6 0h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                      </svg>
                      <p className="text-sm text-gray-500">Нажмите для загрузки фото и документов</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.psd,.ai,.eps,.svg,.xls,.xlsx,.xlsm,.csv"
                      onChange={handleFilesChange}
                      className="hidden"
                    />

                    {files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                            <span className="text-gray-700 truncate mr-2">{f.name}</span>
                            <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 shrink-0">
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Отправка..." : "Отправить заказ"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* Orders list tab */}
        {tab === "list" && (
          <div className="space-y-3">
            {loadingOrders ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <p className="text-sm text-gray-400">Загрузка заказов...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-gray-500 font-medium">Заказов пока нет</p>
                <p className="text-xs text-gray-400 mt-1">Создайте первый заказ на вкладке &laquo;Новый заказ&raquo;</p>
              </div>
            ) : (
              orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{order.title}</h3>
                      <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {order.description && (
                      <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{order.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {order.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(order.createdAt)}
                      </span>
                      {order.acceptedBy && (
                        <span className="text-green-600 font-medium">Принял: {order.acceptedBy}</span>
                      )}
                    </div>

                    {order.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {order.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={a.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {a.fileName}
                            <span className="text-indigo-400">({formatFileSize(a.fileSize)})</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
