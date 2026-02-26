"use client";

import { useState, useCallback, useRef } from "react";
import type { Lead } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { addLead, updateLead, deleteLead as removeLead, leadsByDate } from "@/lib/lead-utils";
import LeadsList from "./leads-list";
import LeadEditModal from "./lead-edit-modal";
import LeadsCalendar from "./leads-calendar";
import StoreFilter from "@/components/ui/store-filter";
import ProductTypeFilter from "@/components/ui/product-type-filter";

type LeadTabId = "list" | "calendar";

interface DayDetail {
  date: string;
  leads: Lead[];
}

export default function LeadsDashboard() {
  const {
    channels, leads, setLeads, expenses,
    dailyLeadPlan, monthlyLeadPlan,
    stores, selectedStoreId, setSelectedStoreId,
    productTypes, selectedProductTypeId, setSelectedProductTypeId,
    filteredLeads, filteredExpenses,
  } = useAppContext();

  const [tab, setTab] = useState<LeadTabId>("list");
  const [editLead, setEditLead] = useState<{ lead: Lead | null } | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ─── Excel import ───
  const handleDownloadTemplate = async () => {
    const res = await fetch("/api/leads/template");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/leads/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ inserted: 0, errors: [data.error ?? "Неизвестная ошибка"] });
      } else {
        setImportResult({ inserted: data.inserted, errors: data.errors ?? [] });
        // Add imported leads to state
        if (data.leads && data.leads.length > 0) {
          setLeads((prev) => [...prev, ...data.leads]);
        }
      }
    } catch {
      setImportResult({ inserted: 0, errors: ["Ошибка сети"] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const tabs: { id: LeadTabId; label: string }[] = [
    { id: "list", label: "Список" },
    { id: "calendar", label: "Календарь" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Лиды</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filteredLeads.length} лид{filteredLeads.length === 1 ? "" : filteredLeads.length < 5 ? "а" : "ов"}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Import / Template buttons */}
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title="Скачать шаблон Excel"
            >
              📥 Шаблон
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50"
              title="Импорт лидов из Excel"
            >
              {importing ? "⏳ Импорт..." : "📤 Импорт Excel"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />

            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        {(stores.length > 0 || productTypes.length > 0) && (
          <div className="mb-4 space-y-2">
            {stores.length > 0 && (
              <StoreFilter stores={stores} selectedStoreId={selectedStoreId} onSelect={setSelectedStoreId} />
            )}
            {productTypes.length > 0 && (
              <ProductTypeFilter productTypes={productTypes} selectedProductTypeId={selectedProductTypeId} onSelect={setSelectedProductTypeId} />
            )}
          </div>
        )}

        {/* Import result toast */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-xl border ${importResult.errors.length > 0 && importResult.inserted === 0 ? "bg-red-50 border-red-200" : importResult.errors.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                {importResult.inserted > 0 && (
                  <p className="text-sm font-medium text-green-800">
                    ✅ Импортировано: {importResult.inserted} лид{importResult.inserted === 1 ? "" : importResult.inserted < 5 ? "а" : "ов"}
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
          </div>
        )}

        {tab === "list" && (
          <LeadsList
            leads={filteredLeads}
            channels={channels}
            stores={stores}
            productTypes={productTypes}
            onEditLead={(lead) => setEditLead({ lead })}
            onAddLead={() => setEditLead({ lead: null })}
          />
        )}

        {tab === "calendar" && (
          <LeadsCalendar
            leads={filteredLeads}
            expenses={filteredExpenses}
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
          stores={stores}
          defaultStoreId={selectedStoreId}
          productTypes={productTypes}
          onSave={handleLeadSave}
          onDelete={editLead.lead ? handleLeadDelete : undefined}
          onClose={() => setEditLead(null)}
        />
      )}

      {dayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDayDetail(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {new Date(dayDetail.date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => setDayDetail(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
            {dayDetail.leads.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Нет лидов за этот день</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {dayDetail.leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => { setDayDetail(null); setEditLead({ lead }); }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{lead.name}</span>
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
