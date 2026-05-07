"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { Salary, AdvanceRequest, Employee } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";

export default function SalariesDashboard() {
  const { employees } = useAppContext();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [salaryEditing, setSalaryEditing] = useState<{ employee: Employee; existing: Salary | null } | null>(null);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<Set<string>>(new Set());

  // Выбранный месяц для расчёта (YYYY-MM)
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Дата последнего дня выбранного месяца — для "действующий оклад"
  const monthEndDate = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  }, [selectedMonth]);

  // Список доступных месяцев — последние 12 от сегодняшнего
  const availableMonths = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const now = new Date();
    const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      arr.push({ key, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
    }
    return arr;
  }, []);

  const reload = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch("/api/salaries").then((res) => (res.ok ? res.json() : [])),
        fetch("/api/advance-requests").then((res) => (res.ok ? res.json() : [])),
      ]);
      setSalaries(s);
      setRequests(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Группировка истории по сотруднику + текущий оклад (последняя по effective_from)
  const salariesByEmployee = useMemo(() => {
    const map = new Map<string, Salary[]>();
    for (const s of salaries) {
      const arr = map.get(s.employeeName) ?? [];
      arr.push(s);
      map.set(s.employeeName, arr);
    }
    for (const [name, arr] of map) {
      arr.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
      map.set(name, arr);
    }
    return map;
  }, [salaries]);

  // Оклад, действовавший в выбранном месяце:
  // самая свежая запись employee_salaries с effective_from <= конец месяца
  const salaryInMonthByEmployee = useMemo(() => {
    const map = new Map<string, Salary | null>();
    for (const e of employees) {
      const arr = salariesByEmployee.get(e.name) ?? [];
      const eligible = arr.find((s) => s.effectiveFrom <= monthEndDate);
      map.set(e.name, eligible ?? null);
    }
    return map;
  }, [employees, salariesByEmployee, monthEndDate]);

  // Сумма одобренных авансов за выбранный месяц
  const advancesInMonthByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "approved" || !r.decidedAt) continue;
      const decisionMonth = r.decidedAt.slice(0, 7);
      if (decisionMonth !== selectedMonth) continue;
      map.set(r.employeeName, (map.get(r.employeeName) ?? 0) + r.amount);
    }
    return map;
  }, [requests, selectedMonth]);

  // Итог по выбранному месяцу: фонд оплаты труда (оклад + премия − авансы)
  const monthlyTotals = useMemo(() => {
    let salarySum = 0;
    let bonusSum = 0;
    let advanceSum = 0;
    for (const e of employees) {
      const s = salaryInMonthByEmployee.get(e.name);
      const a = advancesInMonthByEmployee.get(e.name) ?? 0;
      if (s) {
        salarySum += s.salary;
        bonusSum += s.bonus;
      }
      advanceSum += a;
    }
    return { salarySum, bonusSum, advanceSum, payable: salarySum + bonusSum - advanceSum };
  }, [employees, salaryInMonthByEmployee, advancesInMonthByEmployee]);

  const handleSaveSalary = async (data: {
    employeeName: string;
    salary: number;
    bonus: number;
    effectiveFrom: string;
    notes?: string;
    id?: number;
  }) => {
    const url = data.id ? `/api/salaries/${data.id}` : "/api/salaries";
    const method = data.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await reload();
      setSalaryEditing(null);
    } else {
      alert("Ошибка сохранения");
    }
  };

  const handleDeleteSalary = async (id: number) => {
    if (!window.confirm("Удалить запись истории оклада?")) return;
    const res = await fetch(`/api/salaries/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
  };

  const handleRequestAdvance = async (amount: number, reason: string) => {
    const res = await fetch("/api/advance-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason }),
    });
    if (res.ok) {
      await reload();
      setAdvanceModal(false);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Ошибка отправки заявки");
    }
  };

  const decideAdvance = async (id: number, status: "approved" | "rejected") => {
    const res = await fetch(`/api/advance-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await reload();
  };

  const deleteRequest = async (id: number) => {
    if (!window.confirm("Удалить заявку?")) return;
    const res = await fetch(`/api/advance-requests/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
  };

  const toggleHistory = (name: string) => {
    setHistoryOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const myCurrent = user?.employeeName ? salaryInMonthByEmployee.get(user.employeeName) : null;
  const myAdvancesInMonth = user?.employeeName ? (advancesInMonthByEmployee.get(user.employeeName) ?? 0) : 0;
  const myRequests = requests.filter((r) => r.employeeName === user?.employeeName);
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const selectedMonthLabel = availableMonths.find((m) => m.key === selectedMonth)?.label ?? selectedMonth;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Зарплаты</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isAdmin ? "Оклады, премии и авансы" : "Ваш оклад и заявки на аванс"} · {selectedMonthLabel}
            </p>
          </div>

          {/* Селектор месяца */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-700 shadow-sm self-start">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Месяц:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee view */}
        {!isAdmin && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Расчёт за {selectedMonthLabel}</h2>
              {myCurrent ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Оклад</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{myCurrent.salary.toLocaleString("ru-RU")} ₽</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Премия</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{myCurrent.bonus.toLocaleString("ru-RU")} ₽</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Авансы за месяц</p>
                      <p className="text-xl font-bold text-amber-600">−{myAdvancesInMonth.toLocaleString("ru-RU")} ₽</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">К выплате</p>
                      <p className="text-xl font-bold text-indigo-600">{(myCurrent.salary + myCurrent.bonus - myAdvancesInMonth).toLocaleString("ru-RU")} ₽</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">Оклад действует с {new Date(myCurrent.effectiveFrom + "T00:00:00").toLocaleDateString("ru-RU")}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">На этот месяц оклад ещё не был назначен.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Заявки на аванс</h2>
                <button onClick={() => setAdvanceModal(true)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                  + Запросить аванс
                </button>
              </div>
              {myRequests.length === 0 && <p className="text-sm text-gray-400">Заявок пока нет.</p>}
              <div className="space-y-2">
                {myRequests.map((r) => (
                  <AdvanceRow key={r.id} req={r} onDelete={r.status === "pending" ? () => deleteRequest(r.id) : undefined} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin view */}
        {isAdmin && (
          <div className="space-y-6">
            {/* Summary за выбранный месяц */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm">
                <p className="text-xs text-gray-500">Оклады</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{monthlyTotals.salarySum.toLocaleString("ru-RU")} ₽</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm">
                <p className="text-xs text-gray-500">Премии</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{monthlyTotals.bonusSum.toLocaleString("ru-RU")} ₽</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm">
                <p className="text-xs text-amber-500">Авансы</p>
                <p className="text-xl font-bold text-amber-600">−{monthlyTotals.advanceSum.toLocaleString("ru-RU")} ₽</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800 px-4 py-3 shadow-sm">
                <p className="text-xs text-indigo-600">К выплате</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{monthlyTotals.payable.toLocaleString("ru-RU")} ₽</p>
              </div>
            </div>

            {/* Pending advance requests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
                Заявки на аванс
                {pendingRequests.length > 0 && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {pendingRequests.length} ждёт
                  </span>
                )}
              </h2>
              {requests.length === 0 && <p className="text-sm text-gray-400">Заявок нет.</p>}
              <div className="space-y-2">
                {pendingRequests.map((r) => (
                  <AdvanceRow
                    key={r.id}
                    req={r}
                    onApprove={() => decideAdvance(r.id, "approved")}
                    onReject={() => decideAdvance(r.id, "rejected")}
                  />
                ))}
                {requests.filter((r) => r.status !== "pending").length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">История ({requests.filter((r) => r.status !== "pending").length})</summary>
                    <div className="mt-2 space-y-1">
                      {requests.filter((r) => r.status !== "pending").slice(0, 30).map((r) => (
                        <AdvanceRow key={r.id} req={r} readonly />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Salaries table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Расчёт за {selectedMonthLabel}
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Оклад берётся из последней записи, действующей на конец месяца. Авансы — одобренные за этот месяц.
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {employees.map((e) => {
                  const inMonth = salaryInMonthByEmployee.get(e.name) ?? null;
                  const advance = advancesInMonthByEmployee.get(e.name) ?? 0;
                  const payable = inMonth ? inMonth.salary + inMonth.bonus - advance : 0;
                  const history = salariesByEmployee.get(e.name) ?? [];
                  const expanded = historyOpen.has(e.name);
                  return (
                    <div key={e.name} className="px-5 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[140px]">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{e.name}</p>
                          {e.position && <p className="text-xs text-gray-500">{e.position}</p>}
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-right">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase">Оклад</p>
                            <p className="text-sm font-semibold">{inMonth ? `${inMonth.salary.toLocaleString("ru-RU")} ₽` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase">Премия</p>
                            <p className="text-sm font-semibold">{inMonth ? `${inMonth.bonus.toLocaleString("ru-RU")} ₽` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-amber-400 uppercase">Аванс</p>
                            <p className="text-sm font-semibold text-amber-600">{advance > 0 ? `−${advance.toLocaleString("ru-RU")} ₽` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase">К выплате</p>
                            <p className="text-sm font-bold text-indigo-600">{inMonth ? `${payable.toLocaleString("ru-RU")} ₽` : "—"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSalaryEditing({ employee: e, existing: null })}
                          className="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          + Изменить
                        </button>
                        {history.length > 0 && (
                          <button onClick={() => toggleHistory(e.name)} className="text-xs text-gray-500 hover:text-indigo-600">
                            История ({history.length}) {expanded ? "▲" : "▼"}
                          </button>
                        )}
                      </div>
                      {expanded && history.length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-100 dark:border-gray-600 space-y-1">
                          {history.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500 w-24">с {new Date(s.effectiveFrom + "T00:00:00").toLocaleDateString("ru-RU")}</span>
                              <span>{s.salary.toLocaleString("ru-RU")} ₽</span>
                              <span className="text-gray-400">+ {s.bonus.toLocaleString("ru-RU")} ₽</span>
                              {s.notes && <span className="text-gray-400 italic flex-1 truncate">{s.notes}</span>}
                              <button onClick={() => setSalaryEditing({ employee: e, existing: s })} className="text-gray-400 hover:text-indigo-600">✏️</button>
                              <button onClick={() => handleDeleteSalary(s.id)} className="text-gray-400 hover:text-red-500">🗑</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Salary edit modal */}
      {salaryEditing && (
        <SalaryEditModal
          employee={salaryEditing.employee}
          existing={salaryEditing.existing}
          onSave={handleSaveSalary}
          onClose={() => setSalaryEditing(null)}
        />
      )}

      {/* Advance request modal */}
      {advanceModal && (
        <AdvanceRequestModal
          onSubmit={handleRequestAdvance}
          onClose={() => setAdvanceModal(false)}
        />
      )}
    </div>
  );
}

// ─── Salary edit modal ─────────────────────────────────────────

function SalaryEditModal({
  employee,
  existing,
  onSave,
  onClose,
}: {
  employee: Employee;
  existing: Salary | null;
  onSave: (data: { employeeName: string; salary: number; bonus: number; effectiveFrom: string; notes?: string; id?: number }) => Promise<void>;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [salary, setSalary] = useState(String(existing?.salary ?? 0));
  const [bonus, setBonus] = useState(String(existing?.bonus ?? 0));
  const [effectiveFrom, setEffectiveFrom] = useState(existing?.effectiveFrom ?? today);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const s = parseFloat(salary);
    const b = parseFloat(bonus);
    if (isNaN(s) || s < 0) return alert("Неверный оклад");
    if (isNaN(b) || b < 0) return alert("Неверная премия");
    if (!effectiveFrom) return alert("Укажите дату действия");
    setSaving(true);
    try {
      await onSave({
        employeeName: employee.name,
        salary: s,
        bonus: b,
        effectiveFrom,
        notes,
        id: existing?.id,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{existing ? "Изменить запись" : "Новый оклад"}</h3>
        <p className="text-xs text-gray-500 mb-4">{employee.name}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Оклад ₽</label>
              <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Премия ₽</label>
              <input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Действует с</label>
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Заметка</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Отмена</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Advance request modal ─────────────────────────────────────

function AdvanceRequestModal({ onSubmit, onClose }: { onSubmit: (amount: number, reason: string) => Promise<void>; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return alert("Сумма должна быть больше 0");
    setSubmitting(true);
    try {
      await onSubmit(a, reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Запрос на аванс</h3>
        <p className="text-xs text-gray-500 mb-4">Заявка отправится админу</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Сумма ₽</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Причина</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Отмена</button>
          <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {submitting ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Advance row ───────────────────────────────────────────────

function AdvanceRow({
  req,
  onApprove,
  onReject,
  onDelete,
  readonly,
}: {
  req: AdvanceRequest;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}) {
  const statusBadge =
    req.status === "approved" ? "bg-green-100 text-green-700"
    : req.status === "rejected" ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  const statusLabel = req.status === "approved" ? "Одобрено" : req.status === "rejected" ? "Отклонено" : "Ожидает";

  return (
    <div className="flex items-start gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{req.employeeName}</span>
          <span className="text-sm font-bold text-indigo-600">{req.amount.toLocaleString("ru-RU")} ₽</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge}`}>{statusLabel}</span>
          <span className="text-[10px] text-gray-400">{new Date(req.createdAt).toLocaleDateString("ru-RU")}</span>
        </div>
        {req.reason && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{req.reason}</p>}
      </div>
      {!readonly && onApprove && onReject && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onApprove} className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Одобрить</button>
          <button onClick={onReject} className="px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Отклонить</button>
        </div>
      )}
      {!readonly && onDelete && (
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 text-sm">🗑</button>
      )}
    </div>
  );
}
