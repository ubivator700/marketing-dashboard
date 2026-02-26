"use client";

import { useState } from "react";
import type { Lead, Channel, ContactMethod, LeadResult, Store, ProductType } from "@/types/dashboard";
import { contactMethodLabels, leadResultLabels } from "@/lib/leads-data";
import ModalShell from "@/components/dashboard/modal-shell";

interface LeadEditModalProps {
  lead: Lead | null;
  channels: Channel[];
  stores?: Store[];
  defaultStoreId?: number | null;
  productTypes?: ProductType[];
  onSave: (lead: Lead) => void;
  onDelete?: (leadId: number) => void;
  onClose: () => void;
}

export default function LeadEditModal({
  lead,
  channels,
  stores = [],
  defaultStoreId = null,
  productTypes = [],
  onSave,
  onDelete,
  onClose,
}: LeadEditModalProps) {
  const isCreate = lead === null;
  const today = new Date().toISOString().split("T")[0];

  const [name, setName] = useState(lead?.name ?? "");
  const [channelId, setChannelId] = useState<number>(lead?.channelId ?? channels[0]?.id ?? 0);
  const [contactMethod, setContactMethod] = useState<ContactMethod>(lead?.contactMethod ?? "phone");
  const [result, setResult] = useState<LeadResult>(lead?.result ?? "measurement");
  const [date, setDate] = useState(lead?.date ?? today);
  const [note, setNote] = useState(lead?.note ?? "");
  const [storeId, setStoreId] = useState<number | null>(lead?.storeId ?? defaultStoreId);
  const [selectedPtIds, setSelectedPtIds] = useState<number[]>(lead?.productTypeIds ?? []);
  const [error, setError] = useState("");

  const toggleProductType = (ptId: number) => {
    setSelectedPtIds((prev) =>
      prev.includes(ptId) ? prev.filter((id) => id !== ptId) : [...prev, ptId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) { setError("Введите имя лида"); return; }
    onSave({
      id: lead?.id ?? Date.now(),
      name: name.trim(),
      channelId,
      contactMethod,
      result,
      date,
      note: note.trim() || undefined,
      storeId,
      productTypeIds: selectedPtIds,
    });
  };

  const handleDelete = () => {
    if (lead && onDelete && window.confirm("Удалить лида?")) {
      onDelete(lead.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новый лид" : "Редактировать лида"}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Имя</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="ФИО клиента..."
              className={`${inputClass} flex-1`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => { setName("Неизвестно"); setError(""); }}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                name === "Неизвестно"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              Неизвестно
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Канал</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0}>Рекламный канал неизвестен</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Способ связи</label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
              className={selectClass}
            >
              {(Object.entries(contactMethodLabels) as [ContactMethod, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Результат</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as LeadResult)}
              className={selectClass}
            >
              {(Object.entries(leadResultLabels) as [LeadResult, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Заметка</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={2}
            className={inputClass}
          />
        </div>

        {stores.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Точка</label>
            <select
              value={storeId ?? ""}
              onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : null)}
              className={selectClass}
            >
              <option value="">Без точки</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {productTypes.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Типы товаров {selectedPtIds.length > 0 && <span className="text-indigo-500">({selectedPtIds.length})</span>}
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg bg-white max-h-32 overflow-y-auto">
              {productTypes.map((pt) => {
                const isSelected = selectedPtIds.includes(pt.id);
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => toggleProductType(pt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {isSelected && <span className="mr-1">&#10003;</span>}
                    {pt.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
