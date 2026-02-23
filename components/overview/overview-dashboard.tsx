"use client";

import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { useAppContext } from "@/lib/app-context";
import { monthlyStats, channelPieData, currentMonthKpi } from "@/lib/overview-utils";

const PIE_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316",
];

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

export default function OverviewDashboard() {
  const { leads, expenses, channels, averageCheck } = useAppContext();

  const stats = useMemo(
    () => monthlyStats(leads, expenses, averageCheck, 12),
    [leads, expenses, averageCheck],
  );

  const pie = useMemo(
    () => channelPieData(leads, expenses, channels, averageCheck),
    [leads, expenses, channels, averageCheck],
  );

  const kpi = useMemo(
    () => currentMonthKpi(leads, expenses, averageCheck),
    [leads, expenses, averageCheck],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Лиды за месяц" value={String(kpi.leads)} accent="text-indigo-600" />
        <KpiCard label="Выручка" value={`${fmt(kpi.revenue)} ₽`} accent="text-green-600" />
        <KpiCard label="Расходы" value={`${fmt(kpi.expenses)} ₽`} accent="text-red-500" />
        <KpiCard label="ROMI" value={kpi.romi !== null ? `${kpi.romi}%` : "—"} accent="text-amber-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart — leads & revenue */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Динамика: лиды и выручка</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v, name) =>
                  name === "revenue" ? `${fmt(Number(v ?? 0))} ₽` : String(v ?? 0)
                }
                labelFormatter={(l) => `Месяц: ${l}`}
              />
              <Legend formatter={(v) => (v === "leads" ? "Лиды" : "Выручка")} />
              <Line yAxisId="left" type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart — expenses */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Расходы по месяцам</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${fmt(Number(v ?? 0))} ₽`} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} name="Расходы" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart — channels */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Выручка по каналам</h3>
          {pie.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={(props: PieLabelRenderProps) => {
                    const name = props.name ?? "";
                    const pct = props.percent != null ? `${(props.percent * 100).toFixed(0)}%` : "";
                    return `${name}: ${pct}`;
                  }}
                >
                  {pie.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${fmt(Number(v ?? 0))} ₽`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-12 text-center">Нет данных по каналам</p>
          )}
        </div>

        {/* Monthly table */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Сводка по месяцам</h3>
          <div className="overflow-auto max-h-[280px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Месяц</th>
                  <th className="py-2 pr-4 font-medium text-right">Лиды</th>
                  <th className="py-2 pr-4 font-medium text-right">Выручка</th>
                  <th className="py-2 pr-4 font-medium text-right">Расходы</th>
                  <th className="py-2 font-medium text-right">ROMI</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-gray-700">{s.label} {s.year}</td>
                    <td className="py-2 pr-4 text-right text-gray-900">{s.leads}</td>
                    <td className="py-2 pr-4 text-right text-green-600">{fmt(s.revenue)} ₽</td>
                    <td className="py-2 pr-4 text-right text-red-500">{fmt(s.expenses)} ₽</td>
                    <td className="py-2 text-right">
                      {s.romi !== null ? (
                        <span className={s.romi >= 0 ? "text-green-600" : "text-red-500"}>
                          {s.romi}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
