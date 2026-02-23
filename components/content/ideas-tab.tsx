"use client";

import { useState } from "react";
import type { Idea } from "@/types/dashboard";
import IdeaModal from "./idea-modal";

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

interface IdeasTabProps {
  ideas: Idea[];
  canWrite: boolean;
  onAdd: (idea: Idea) => void;
  onUpdate: (idea: Idea) => void;
  onDelete: (id: number) => void;
}

export default function IdeasTab({ ideas, canWrite, onAdd, onUpdate, onDelete }: IdeasTabProps) {
  const [modal, setModal] = useState<Idea | "new" | null>(null);

  function handleSave(idea: Idea) {
    if (modal === "new") {
      onAdd(idea);
    } else {
      onUpdate(idea);
    }
    setModal(null);
  }

  return (
    <>
      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={() => setModal("new")}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Добавить идею
          </button>
        </div>
      )}

      {ideas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Идей пока нет
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Заголовок</th>
                <th className="py-3 px-4 font-medium">Описание</th>
                <th className="py-3 px-4 font-medium">Статус</th>
                <th className="py-3 px-4 font-medium">Дата</th>
                {canWrite && <th className="py-3 px-4 font-medium w-28">Действия</th>}
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => (
                <tr key={idea.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-medium text-gray-900">{idea.title}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{idea.description}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[idea.status]}`}>
                      {STATUS_LABELS[idea.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{idea.date}</td>
                  {canWrite && (
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModal(idea)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => onDelete(idea.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <IdeaModal
          idea={modal === "new" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
