"use client";

import { useMemo, useState } from "react";
import type { Channel, ChannelGroup, Lead, Expense, StandaloneTask } from "@/types/dashboard";
import {
  channelGroupLabels,
  channelGroupColors,
  channelGroupOrder,
} from "@/lib/channels-data";
import { leadsByChannel } from "@/lib/lead-utils";
import { totalExpensesForChannel } from "@/lib/expense-utils";

interface ChannelCardListProps {
  channels: Channel[];
  leads: Lead[];
  expenses: Expense[];
  standaloneTasks: StandaloneTask[];
  filterGroup: ChannelGroup | null;
  onSelectChannel: (channel: Channel) => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: number) => void;
}

export default function ChannelCardList({
  channels,
  leads,
  expenses,
  standaloneTasks,
  filterGroup,
  onSelectChannel,
  onEditChannel,
  onDeleteChannel,
}: ChannelCardListProps) {
  const groups = filterGroup ? [filterGroup] : channelGroupOrder;

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (channelId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  // Today's date key
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const groupChannels = channels.filter((c) => c.group === group);
        if (groupChannels.length === 0) return null;

        const groupColor = channelGroupColors[group];

        return (
          <div key={group}>
            {/* Group header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-1 h-6 rounded-full"
                style={{ backgroundColor: groupColor }}
              />
              <h3 className="text-base font-bold text-gray-800">
                {channelGroupLabels[group]}
              </h3>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: groupColor + "18", color: groupColor }}
              >
                {groupChannels.length}
              </span>
            </div>

            {/* Channel cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupChannels.map((channel) => {
                const chLeads = leadsByChannel(leads, channel.id);
                const chExpenses = totalExpensesForChannel(expenses, channel.id);
                const chTasks = standaloneTasks.filter((t) => t.channelId === channel.id);
                const doneTasks = chTasks.filter((t) => t.status === "done").length;
                const costPerLead = chLeads.length > 0 ? Math.round(chExpenses / chLeads.length) : null;
                const chResults = chLeads.filter((l) => l.result === "measurement" || l.result === "sale").length;
                const costPerResult = chResults > 0 ? Math.round(chExpenses / chResults) : null;

                // Leads today for this channel
                const chLeadsToday = chLeads.filter((l) => l.date === todayKey).length;

                const isExpanded = expandedIds.has(channel.id);

                return (
                  <div
                    key={channel.id}
                    className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group overflow-hidden"
                    onClick={() => onSelectChannel(channel)}
                  >
                    {/* Top accent bar */}
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: groupColor }}
                    />

                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-base font-bold text-gray-900 mb-0.5">
                            {channel.name}
                          </h4>
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: groupColor }}
                          >
                            {channelGroupLabels[group]}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditChannel(channel); }}
                            className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Удалить канал?")) onDeleteChannel(channel.id);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Main stat — monthly leads */}
                      <div className="flex items-end gap-2 mb-3">
                        <span className="text-3xl font-black text-gray-900">
                          {chLeads.length}
                        </span>
                        <span className="text-sm text-gray-400 mb-1">
                          лид{chLeads.length === 1 ? "" : chLeads.length < 5 ? "а" : "ов"} за месяц
                        </span>
                      </div>

                      {/* Lead count: today */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs text-gray-500">
                            Сегодня: <span className="font-bold text-gray-800">{chLeadsToday}</span>
                          </span>
                        </div>
                      </div>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-100">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Расходы</p>
                          <p className="text-sm font-bold text-red-500">
                            {chExpenses > 0 ? `${(chExpenses / 1000).toFixed(0)}к` : "0"}
                            <span className="text-[10px] font-normal text-gray-400"> ₽</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Стоим. лида</p>
                          <p className="text-sm font-bold text-amber-600">
                            {costPerLead !== null ? `${costPerLead.toLocaleString("ru-RU")}` : "—"}
                            <span className="text-[10px] font-normal text-gray-400"> ₽</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Стоим. рез.</p>
                          <p className="text-sm font-bold text-teal-600">
                            {costPerResult !== null ? `${costPerResult.toLocaleString("ru-RU")}` : "—"}
                            <span className="text-[10px] font-normal text-gray-400"> ₽</span>
                          </p>
                        </div>
                      </div>

                      {/* Tasks */}
                      {chTasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-50">
                          {/* Clickable task summary bar */}
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 hover:bg-gray-50 rounded-lg py-1 -mx-1 px-1 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(channel.id);
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              <span className="text-xs text-gray-500">
                                {doneTasks}/{chTasks.length}
                              </span>
                            </div>
                            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${(doneTasks / chTasks.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              Задачи
                              <svg
                                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </button>

                          {/* Expanded task list */}
                          {isExpanded && (
                            <div
                              className="mt-2 space-y-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {chTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-start gap-2 py-1 px-1 rounded-md"
                                >
                                  {/* Done/not-done indicator */}
                                  {task.status === "done" ? (
                                    <svg
                                      className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <circle cx="12" cy="12" r="10" />
                                    </svg>
                                  )}

                                  {/* Task name, assignee and deadline */}
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-xs leading-relaxed ${
                                        task.status === "done"
                                          ? "line-through text-gray-400"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {task.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {task.assignee && (
                                        <span className="text-[10px] text-gray-400">
                                          {task.assignee}
                                        </span>
                                      )}
                                      {task.deadline && (
                                        <span className="text-[10px] text-gray-400">
                                          до {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
