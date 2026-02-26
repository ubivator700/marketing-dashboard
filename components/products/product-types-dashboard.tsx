"use client";

import { useState, useCallback, useMemo } from "react";
import type { ProductType, ProductCategory } from "@/types/dashboard";
import { productCategoryLabels } from "@/lib/leads-data";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { productProfit } from "@/lib/overview-utils";

// ─── Constants ──────────────────────────────────────────────────

const categoryIcons: Record<ProductCategory, string> = {
  doors: "\ud83d\udecb",
  windows: "\ud83e\ude9f",
  floors: "\ud83c\udfe0",
  other: "\ud83d\udce6",
};

const categoryBorderColors: Record<ProductCategory, string> = {
  doors: "border-l-amber-400",
  windows: "border-l-sky-400",
  floors: "border-l-emerald-400",
  other: "border-l-gray-300",
};

const categoryBadgeColors: Record<ProductCategory, string> = {
  doors: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  windows: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  floors: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const CATEGORIES: ProductCategory[] = ["doors", "windows", "floors", "other"];

type TimePeriod = "month" | "all";

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}\u041c`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}\u043a`;
  return String(n);
}

function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Main Component ─────────────────────────────────────────────

export default function ProductTypesDashboard() {
  const { productTypes, setProductTypes, leads, taxCoefficient, setTaxCoefficient } = useAppContext();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");

  const [editingTax, setEditingTax] = useState(false);
  const [taxInput, setTaxInput] = useState(String(Math.round(taxCoefficient * 100 * 10) / 10));

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ProductCategory>("other");
  const [newAvgCheck, setNewAvgCheck] = useState("");
  const [newAvgMarkup, setNewAvgMarkup] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ProductCategory>("other");
  const [editAvgCheck, setEditAvgCheck] = useState("");
  const [editAvgMarkup, setEditAvgMarkup] = useState("");

  const prefix = useMemo(() => currentMonthPrefix(), []);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const maxId = productTypes.reduce((max, pt) => Math.max(max, pt.id), 0);
    setProductTypes((prev) => [
      ...prev,
      {
        id: maxId + 1,
        name: newName.trim(),
        category: newCategory,
        avgCheck: Number(newAvgCheck) || 0,
        avgMarkup: Number(newAvgMarkup) || 0,
      },
    ]);
    setNewName("");
    setNewCategory("other");
    setNewAvgCheck("");
    setNewAvgMarkup("");
    setCreating(false);
  }, [newName, newCategory, newAvgCheck, newAvgMarkup, productTypes, setProductTypes]);

  const handleStartEdit = (pt: ProductType) => {
    setEditingId(pt.id);
    setEditName(pt.name);
    setEditCategory(pt.category);
    setEditAvgCheck(String(pt.avgCheck));
    setEditAvgMarkup(String(pt.avgMarkup));
  };

  const handleSaveEdit = useCallback(() => {
    if (!editName.trim() || editingId === null) return;
    setProductTypes((prev) =>
      prev.map((pt) =>
        pt.id === editingId
          ? {
              ...pt,
              name: editName.trim(),
              category: editCategory,
              avgCheck: Number(editAvgCheck) || 0,
              avgMarkup: Number(editAvgMarkup) || 0,
            }
          : pt
      )
    );
    setEditingId(null);
  }, [editingId, editName, editCategory, editAvgCheck, editAvgMarkup, setProductTypes]);

  const handleDelete = useCallback(
    (ptId: number) => {
      const leadsCount = leads.filter((l) => l.productTypeIds.includes(ptId)).length;
      let msg = "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0442\u0438\u043f \u0442\u043e\u0432\u0430\u0440\u0430?";
      if (leadsCount > 0) {
        msg += `\n\n\u041a \u044d\u0442\u043e\u043c\u0443 \u0442\u0438\u043f\u0443 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u043e ${leadsCount} \u043b\u0438\u0434(\u043e\u0432). \u041e\u043d\u0438 \u043f\u043e\u0442\u0435\u0440\u044f\u044e\u0442 \u043f\u0440\u0438\u0432\u044f\u0437\u043a\u0443.`;
      }
      if (!confirm(msg)) return;
      setProductTypes((prev) => prev.filter((pt) => pt.id !== ptId));
    },
    [leads, setProductTypes]
  );

  // Stats per product type — filtered by time period
  const ptStats = useMemo(() => {
    const filteredLeads = timePeriod === "month"
      ? leads.filter((l) => l.date.startsWith(prefix))
      : leads;

    const map = new Map<number, { leadCount: number; profitableCount: number }>();
    for (const pt of productTypes) {
      const ptLeads = filteredLeads.filter((l) => l.productTypeIds.includes(pt.id));
      const profitable = ptLeads.filter(
        (l) => l.result === "measurement" || l.result === "sale"
      ).length;
      map.set(pt.id, { leadCount: ptLeads.length, profitableCount: profitable });
    }
    return map;
  }, [productTypes, leads, timePeriod, prefix]);

  const inputClass =
    "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white";
  const selectClass =
    "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 dark:text-white";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">\u0422\u0438\u043f\u044b \u0442\u043e\u0432\u0430\u0440\u043e\u0432</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            \u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u0442\u043e\u0432\u0430\u0440\u043e\u0432 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 \u00b7 {productTypes.length}{" "}
            {productTypes.length === 1 ? "\u0442\u0438\u043f" : productTypes.length < 5 ? "\u0442\u0438\u043f\u0430" : "\u0442\u0438\u043f\u043e\u0432"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time period toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setTimePeriod("month")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timePeriod === "month"
                  ? "bg-white dark:bg-gray-600 text-violet-700 dark:text-violet-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              \u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043c\u0435\u0441\u044f\u0446
            </button>
            <button
              onClick={() => setTimePeriod("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timePeriod === "all"
                  ? "bg-white dark:bg-gray-600 text-violet-700 dark:text-violet-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              \u0412\u0441\u0451 \u0432\u0440\u0435\u043c\u044f
            </button>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
            >
              + \u041d\u043e\u0432\u044b\u0439 \u0442\u0438\u043f
            </button>
          )}
        </div>
      </div>

      {/* Tax coefficient control */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-100 dark:border-violet-800 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-800 flex items-center justify-center text-xl">
              {"\ud83d\udcb3"}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">\u041d\u0430\u043b\u043e\u0433\u043e\u0432\u044b\u0439 \u043a\u043e\u044d\u0444\u0444\u0438\u0446\u0438\u0435\u043d\u0442</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                \u041f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f \u043a\u043e \u0432\u0441\u0435\u043c \u0442\u043e\u0432\u0430\u0440\u0430\u043c \u0434\u043b\u044f \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043f\u0440\u0438\u0431\u044b\u043b\u0438 \u043f\u043e\u0441\u043b\u0435 \u043d\u0430\u043b\u043e\u0433\u0430
              </p>
            </div>
          </div>
          {editingTax ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={taxInput}
                onChange={(e) => setTaxInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setTaxCoefficient(Number(taxInput) / 100);
                    setEditingTax(false);
                  }
                  if (e.key === "Escape") setEditingTax(false);
                }}
                className="w-20 px-2 py-1.5 border border-violet-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:border-violet-600 dark:text-white"
                autoFocus
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
              <button
                onClick={() => {
                  setTaxCoefficient(Number(taxInput) / 100);
                  setEditingTax(false);
                }}
                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700"
              >
                OK
              </button>
              <button
                onClick={() => setEditingTax(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                \u041e\u0442\u043c\u0435\u043d\u0430
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                {(taxCoefficient * 100).toFixed(1)}%
              </span>
              {isAdmin && (
                <button
                  onClick={() => {
                    setTaxInput(String(Math.round(taxCoefficient * 100 * 10) / 10));
                    setEditingTax(true);
                  }}
                  className="p-1.5 text-violet-300 hover:text-violet-600 dark:hover:text-violet-200 transition-colors rounded-lg hover:bg-violet-100 dark:hover:bg-violet-800"
                  title="\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-violet-200 dark:border-violet-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">\u041d\u043e\u0432\u044b\u0439 \u0442\u0438\u043f \u0442\u043e\u0432\u0430\u0440\u0430</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }} placeholder="\u041c\u0435\u0436\u043a\u043e\u043c\u043d\u0430\u0442\u043d\u044b\u0435 \u0434\u0432\u0435\u0440\u0438..." autoFocus className={inputClass + " w-full"} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u0412\u0438\u0434 \u0442\u043e\u0432\u0430\u0440\u0430</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ProductCategory)} className={selectClass + " w-full"}>
                {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{productCategoryLabels[cat]}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u0447\u0435\u043a, {"\u20bd"}</label>
              <input type="number" value={newAvgCheck} onChange={(e) => setNewAvgCheck(e.target.value)} placeholder="0" className={inputClass + " w-full"} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u0421\u0440\u0435\u0434\u043d\u044f\u044f \u043d\u0430\u0446\u0435\u043d\u043a\u0430, %</label>
              <input type="number" value={newAvgMarkup} onChange={(e) => setNewAvgMarkup(e.target.value)} placeholder="0" className={inputClass + " w-full"} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">\u0421\u043e\u0437\u0434\u0430\u0442\u044c</button>
            <button onClick={() => { setCreating(false); setNewName(""); setNewAvgCheck(""); setNewAvgMarkup(""); }} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">\u041e\u0442\u043c\u0435\u043d\u0430</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {productTypes.length === 0 && !creating && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <span className="text-4xl mb-3 block">{"\ud83d\udce6"}</span>
          <p className="text-gray-400 text-sm">\u041d\u0435\u0442 \u0442\u0438\u043f\u043e\u0432 \u0442\u043e\u0432\u0430\u0440\u043e\u0432. \u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043f\u0435\u0440\u0432\u044b\u0439 \u0442\u0438\u043f.</p>
        </div>
      )}

      {/* Product cards — responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {productTypes.map((pt) => {
          const stats = ptStats.get(pt.id) ?? { leadCount: 0, profitableCount: 0 };
          const revenue = stats.profitableCount * pt.avgCheck;
          const profitPerLead = productProfit(pt.avgCheck, pt.avgMarkup);
          const totalProfit = Math.round(stats.profitableCount * profitPerLead);
          const taxAmount = Math.round(totalProfit * taxCoefficient);
          const profitAfterTax = totalProfit - taxAmount;

          return (
            <div
              key={pt.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 ${categoryBorderColors[pt.category]} overflow-hidden`}
            >
              {editingId === pt.id ? (
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }} autoFocus className={inputClass + " w-full"} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u0412\u0438\u0434 \u0442\u043e\u0432\u0430\u0440\u0430</label>
                      <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as ProductCategory)} className={selectClass + " w-full"}>
                        {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{productCategoryLabels[cat]}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u0447\u0435\u043a, {"\u20bd"}</label>
                      <input type="number" value={editAvgCheck} onChange={(e) => setEditAvgCheck(e.target.value)} className={inputClass + " w-full"} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">\u0421\u0440\u0435\u0434\u043d\u044f\u044f \u043d\u0430\u0446\u0435\u043d\u043a\u0430, %</label>
                      <input type="number" value={editAvgMarkup} onChange={(e) => setEditAvgMarkup(e.target.value)} className={inputClass + " w-full"} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">\u041e\u0442\u043c\u0435\u043d\u0430</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Card header */}
                  <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{categoryIcons[pt.category]}</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{pt.name}</h3>
                      </div>
                      <div className="mt-1.5 ml-8">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${categoryBadgeColors[pt.category]}`}>
                          {productCategoryLabels[pt.category]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleStartEdit(pt)} className="p-1.5 text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30" title="\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(pt.id)} className="p-1.5 text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="\u0423\u0434\u0430\u043b\u0438\u0442\u044c">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Parameters */}
                  <div className="px-5 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">\u0421\u0440. \u0447\u0435\u043a</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{fmt(pt.avgCheck)} {"\u20bd"}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">\u041d\u0430\u0446\u0435\u043d\u043a\u0430</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{pt.avgMarkup}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="px-5 pb-4 border-t border-gray-50 dark:border-gray-700 pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <StatBlock label="\u041b\u0438\u0434\u044b" value={String(stats.leadCount)} color="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" />
                      <StatBlock label="\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b" value={String(stats.profitableCount)} color="bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
                      {revenue > 0 && (
                        <StatBlock label="\u0412\u044b\u0440\u0443\u0447\u043a\u0430" value={`${fmtShort(revenue)} \u20bd`} color="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" />
                      )}
                      {profitAfterTax !== 0 && (
                        <StatBlock label="\u041f\u0440\u0438\u0431\u044b\u043b\u044c" value={`${fmtShort(profitAfterTax)} \u20bd`} sub={taxAmount > 0 ? `\u043d\u0430\u043b\u043e\u0433 ${fmtShort(taxAmount)} \u20bd` : undefined} color="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stat Block ─────────────────────────────────────────────────

function StatBlock({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`${color} rounded-lg px-2.5 py-2`}>
      <p className="text-[9px] uppercase tracking-wider font-medium opacity-60">{label}</p>
      <p className="text-xs font-bold leading-tight">{value}</p>
      {sub && <p className="text-[9px] opacity-50 leading-tight">{sub}</p>}
    </div>
  );
}
