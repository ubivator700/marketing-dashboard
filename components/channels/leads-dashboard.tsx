"use client";

import { useState, useCallback } from "react";
import type { Lead } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { addLead, updateLead, deleteLead as removeLead, leadsByDate } from "@/lib/lead-utils";
import LeadsList from "./leads-list";
import LeadEditModal from "./lead-edit-modal";
import LeadsCalendar from "./leads-calendar";

type LeadTabId = "list" | "calendar";

interface DayDetail {
  date: string;
  leads: Lead[];
}

export default function LeadsDashboard() {
  const {
    channels, leads, setLeads, expenses,
    dailyLeadPlan, monthlyLeadPlan,
  } = useAppContext();

  const [tab, setTab] = useState<LeadTabId>("list");
  const [editLead, setEditLead] = useState<{ lead: Lead | null } | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);

  const handleLeadSave = useCallback(
    (lead: Lead) => {
      setLeads((prev) => {
        const exists = prev.some((l) => l.id === lead.id);
        if (exists) return updateLead(prev, lead.id, lead);
        return addLead(prev, lead);
      });
      setEditLead(null);
    },
    [setLeads]
  );

  const handleLeadDelete = useCallback(
    (leadId: number) => {
      setLeads((prev) => removeLead(prev, leadId));
      setEditLead(null);
    },
    [setLeads]
  );

  const tabs: { id: LeadTabId; label: string }[] = [
    { id: "list", label: "Список" },
    { id: "calendar", label: "Календарь" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Лиды</h1>
            <p className="text-sm text-gray-500 mt-1">{leads.length} лид{leads.length === 1 ? "" : leads.length < 5 ? "а" : "ов"}</p>
          </div>
          <div className="flex items-center gap-3">
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
        </div>

        {tab === "list" && (
          <LeadsList
            leads={leads}
            channels={channels}
            onEditLead={(lead) => setEditLead({ lead })}
            onAddLead={() => setEditLead({ lead: null })}
          />
        )}

        {tab === "calendar" && (
          <LeadsCalendar
            leads={leads}
            expenses={expenses}
            dailyLeadPlan={dailyLeadPlan}
            monthlyLeadPlan={monthlyLeadPlan}
            onSelectDay={(date, dayLeads) => setDayDetail({ date, leads: dayLeads })}
          />
        )}
      </div>

      {editLead && (
        <LeadEditModal
          lead={editLead.lead}
          channels={channels}
          onSave={handleLeadSave}
          onDelete={editLead.lead ? handleLeadDelete : undefined}
          onClose={() => setEditLead(null)}
        />
      )}

      {dayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDayDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {new Date(dayDetail.date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => setDayDetail(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
            {dayDetail.leads.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Нет лидов за этот день</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {dayDetail.leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => { setDayDetail(null); setEditLead({ lead }); }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 flex-1">{lead.name}</span>
                    <span className="text-xs text-gray-400">{channels.find((c) => c.id === lead.channelId)?.name ?? "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
