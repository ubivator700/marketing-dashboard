"use client";

import { useState } from "react";
import type { Project, Channel, Store } from "@/types/dashboard";

interface Props {
  projects: Project[];
  channels: Channel[];
  stores: Store[];
  onSubmit: (req: {
    name: string;
    amount: number;
    date: string;
    projectId: number | null;
    channelId: number | null;
    storeId: number | null;
  }) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseRequestModal({ projects, channels, stores, onSubmit, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState(today);
  const [projectId, setProjectId] = useState<string>("");
  const [channelId, setChannelId] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return alert("Введите название");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert("Сумма должна быть больше 0");
    if (!date) return alert("Укажите дату");
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        amount: amt,
        date,
        projectId: projectId ? Number(projectId) : null,
        channelId: channelId ? Number(channelId) : null,
        storeId: storeId ? Number(storeId) : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Запрос на расход</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Заявка отправится админу на одобрение</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Сумма ₽</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Дата</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Проект</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2">
              <option value="">—</option>
              {projects.filter((p) => p.kind !== "content").map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Канал</label>
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2">
              <option value="">—</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {stores.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 block">Магазин</label>
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2">
                <option value="">—</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Отмена</button>
          <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {submitting ? "Отправка..." : "Отправить заявку"}
          </button>
        </div>
      </div>
    </div>
  );
}
