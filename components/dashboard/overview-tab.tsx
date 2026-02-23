"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type {
  Department,
  DepartmentId,
  StatItem,
  PieChartDataItem,
  BarChartDataItem,
} from "@/types/dashboard";
import StatCard from "./stat-card";
import ProgressBar from "./progress-bar";

interface OverviewTabProps {
  departments: Department[];
  stats: StatItem[];
  pieData: PieChartDataItem[];
  barData: BarChartDataItem[];
  onDepartmentClick: (deptId: DepartmentId) => void;
}

export default function OverviewTab({
  departments,
  stats,
  pieData,
  barData,
  onDepartmentClick,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Статус задач
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={(props: PieLabelRenderProps) =>
                  `${props.name ?? ""}: ${props.value ?? ""}`
                }
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Прогресс по подотделам
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {departments.map((dept) => {
          const deptDone = dept.tasks.filter((t) => t.status === "done").length;
          const deptProgress = Math.round(
            dept.goals.reduce((s, g) => s + g.progress, 0) / dept.goals.length
          );
          return (
            <div
              key={dept.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onDepartmentClick(dept.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dept.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-sm text-gray-500">{dept.person}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-lg font-bold"
                    style={{ color: dept.color }}
                  >
                    {deptProgress}%
                  </span>
                  <p className="text-xs text-gray-400">целей</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{dept.description}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar progress={deptProgress} color={dept.color} />
                </div>
                <span className="text-xs text-gray-500">
                  {deptDone}/{dept.tasks.length} задач
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
