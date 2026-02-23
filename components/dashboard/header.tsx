"use client";

import type { TabId, TabDefinition } from "@/types/dashboard";

interface HeaderProps {
  activeTab: TabId;
  tabs: TabDefinition[];
  onTabChange: (tab: TabId) => void;
}

export default function Header({ activeTab, tabs, onTabChange }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <p className="text-sm text-gray-500">Цели · Планы · Задачи</p>
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-indigo-700">
              Главная цель:
            </span>
            <span className="text-sm text-indigo-600">
              Привлечение лидов + Имидж компании
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
