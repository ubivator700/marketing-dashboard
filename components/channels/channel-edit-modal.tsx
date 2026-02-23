"use client";

import { useState } from "react";
import type { Channel, ChannelGroup } from "@/types/dashboard";
import { channelGroupLabels } from "@/lib/channels-data";
import ModalShell from "@/components/dashboard/modal-shell";

interface ChannelEditModalProps {
  channel: Channel | null;
  onSave: (channel: Channel) => void;
  onDelete?: (channelId: number) => void;
  onClose: () => void;
}

export default function ChannelEditModal({
  channel,
  onSave,
  onDelete,
  onClose,
}: ChannelEditModalProps) {
  const isCreate = channel === null;

  const [name, setName] = useState(channel?.name ?? "");
  const [group, setGroup] = useState<ChannelGroup>(channel?.group ?? "digital");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      setError("Введите название канала");
      return;
    }
    onSave({
      id: channel?.id ?? Date.now(),
      name: name.trim(),
      group,
      tasks: channel?.tasks ?? [],
    });
  };

  const handleDelete = () => {
    if (channel && onDelete && window.confirm("Удалить канал? Связанные расходы и лиды останутся, но потеряют привязку.")) {
      onDelete(channel.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новый канал" : "Редактировать канал"}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Название канала..."
            className={inputClass}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Группа</label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as ChannelGroup)}
            className={selectClass}
          >
            {(Object.entries(channelGroupLabels) as [ChannelGroup, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {isCreate ? "Создать" : "Сохранить"}
        </button>
        {!isCreate && onDelete && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Удалить
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Отмена
        </button>
      </div>
    </ModalShell>
  );
}
