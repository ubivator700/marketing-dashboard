"use client";

import { useState, useMemo } from "react";
import type { Lead, Channel, LeadResult, ContactMethod } from "@/types/dashboard";
import { contactMethodLabels, leadResultLabels, leadResultColors } from "@/lib/leads-data";

interface LeadsListProps {
  leads: Lead[];
  channels: Channel[];
  onEditLead: (lead: Lead) => void;
  onAddLead: () => void;
}

type SortField = "name" | "channel" | "contactMethod" | "result" | "date" | "note";
type SortDir = "asc" | "desc";

export default function LeadsList({
  leads,
  channels,
  onEditLead,
  onAddLead,
}: LeadsListProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const channelMap = useMemo(() => {
    const map = new Map<number, string>();
    channels.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [channels]);

  const channelName = (channelId: number): string =>
    channelId === 0 ? "Неизвестен" : (channelMap.get(channelId) ?? "—");

  const sorted = useMemo(() => {
    const arr = [...leads];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name, "ru");
          break;
        case "channel":
          cmp = channelName(a.channelId).localeCompare(channelName(b.channelId), "ru");
          break;
        case "contactMethod":
          cmp = contactMethodLabels[a.contactMethod].localeCompare(
            contactMethodLabels[b.contactMethod],
            "ru"
          );
          break;
        case "result":
          cmp = leadResultLabels[a.result].localeCompare(
            leadResultLabels[b.result],
            "ru"
          );
          break;
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "note":
          cmp = (a.note ?? "").localeCompare(b.note ?? "", "ru");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [leads, sortField, sortDir, channelMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300 text-[10px]">⇅</span>;
    }
    return (
      <span className="ml-1 text-indigo-500 text-[10px]">
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const thClass =
    "text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none transition-colors";

  return (
    <div>
      {/* Header with add button */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={onAddLead}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Новый лид
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("name")}
              >
                Имя <SortIcon field="name" />
              </th>
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("channel")}
              >
                Канал <SortIcon field="channel" />
              </th>
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("contactMethod")}
              >
                Связь <SortIcon field="contactMethod" />
              </th>
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("result")}
              >
                Результат <SortIcon field="result" />
              </th>
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("date")}
              >
                Дата <SortIcon field="date" />
              </th>
              <th
                className={`text-left ${thClass}`}
                onClick={() => handleSort("note")}
              >
                Заметка <SortIcon field="note" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Нет лидов
                </td>
              </tr>
            )}
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onEditLead(lead)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {lead.name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {channelName(lead.channelId)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {contactMethodLabels[lead.contactMethod]}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${leadResultColors[lead.result]}`}
                  >
                    {leadResultLabels[lead.result]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(lead.date + "T00:00:00").toLocaleDateString(
                    "ru-RU",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                  {lead.note ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Показано: {leads.length} из {leads.length}
      </p>
    </div>
  );
}
