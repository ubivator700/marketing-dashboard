"use client";

import type { Channel, Lead, Expense, StandaloneTask } from "@/types/dashboard";
import { channelGroupLabels, channelGroupColors } from "@/lib/channels-data";
import { leadsByChannel } from "@/lib/lead-utils";
import { totalExpensesForChannel } from "@/lib/expense-utils";
import ModalShell from "@/components/dashboard/modal-shell";
import ChannelTaskList from "./channel-task-list";

interface ChannelDetailModalProps {
  channel: Channel;
  leads: Lead[];
  expenses: Expense[];
  standaloneTasks: StandaloneTask[];
  employees: string[];
  onEdit: (channel: Channel) => void;
  onDelete: (channelId: number) => void;
  onToggleTask: (channelId: number, taskId: number) => void;
  onAddTask: (channelId: number, task: StandaloneTask) => void;
  onDeleteTask: (channelId: number, taskId: number) => void;
  onClose: () => void;
}

export default function ChannelDetailModal({
  channel,
  leads,
  expenses,
  standaloneTasks,
  employees,
  onEdit,
  onDelete,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onClose,
}: ChannelDetailModalProps) {
  const chLeads = leadsByChannel(leads, channel.id);
  const chExpenses = totalExpensesForChannel(expenses, channel.id);
  const costPerLead = chLeads.length > 0 ? Math.round(chExpenses / chLeads.length) : null;
  const chMeasurements = chLeads.filter((l) => l.result === "measurement").length;
  const chSales = chLeads.filter((l) => l.result === "sale").length;
  const chResults = chMeasurements + chSales;
  const costPerResult = chResults > 0 ? Math.round(chExpenses / chResults) : null;
  const chConversion = chLeads.length > 0 ? Math.round((chResults / chLeads.length) * 100) : 0;
  const groupColor = channelGroupColors[channel.group];

  return (
    <ModalShell onClose={onClose} title={channel.name} maxWidth="max-w-lg">
      {/* Group badge */}
      <div className="mb-4">
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: groupColor }}
        >
          {channelGroupLabels[channel.group]}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Лиды</p>
          <p className="text-lg font-bold text-gray-900">{chLeads.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Результаты</p>
          <p className="text-lg font-bold text-violet-600">{chResults}</p>
          <p className="text-[10px] text-gray-400">{chMeasurements} зам. · {chSales} прод.</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Конверсия</p>
          <p className="text-lg font-bold text-emerald-600">{chConversion}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Расходы</p>
          <p className="text-lg font-bold text-red-500">{chExpenses.toLocaleString("ru-RU")} ₽</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Стоимость лида</p>
          <p className="text-lg font-bold text-amber-600">
            {costPerLead !== null ? `${costPerLead.toLocaleString("ru-RU")} ₽` : "—"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Стоимость результата</p>
          <p className="text-lg font-bold text-teal-600">
            {costPerResult !== null ? `${costPerResult.toLocaleString("ru-RU")} ₽` : "—"}
          </p>
        </div>
      </div>

      {/* Tasks — now showing standalone tasks linked to this channel */}
      <div className="border-t border-gray-100 pt-4">
        <ChannelTaskList
          channelId={channel.id}
          tasks={standaloneTasks}
          employees={employees}
          onToggle={(taskId) => onToggleTask(channel.id, taskId)}
          onAdd={(task) => onAddTask(channel.id, task)}
          onDelete={(taskId) => onDeleteTask(channel.id, taskId)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={() => onEdit(channel)}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Редактировать
        </button>
        <button
          onClick={() => {
            if (window.confirm("Удалить канал?")) onDelete(channel.id);
          }}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
        >
          Удалить
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </ModalShell>
  );
}
