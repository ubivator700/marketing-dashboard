"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ContentProject, ContentReel, Employee, ProjectTask, ProjectTaskStatus } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { projectTaskStatusLabels, projectTaskStatusColors } from "@/lib/projects-data";

interface ContentProjectsTabProps {
  employees: Employee[];
  currentUserEmployeeName: string | null;
  defaultFilterAssignee?: string;
  onEditProjectTask?: (projectId: number, stageId: number, task: ProjectTask) => void;
  onAddProjectTask?: (projectId: number, stageId: number) => void;
  onToggleTaskStatus?: (projectId: number, stageId: number, taskId: number, status: ProjectTaskStatus) => void;
}

/**
 * Вкладка "Контент" — управление контент-планами.
 *
 * Каждый контент-план = теневой Project (kind='content') в БД.
 * Каждый ролик = теневой Stage в этом теневом Project.
 * Задачи ролика = обычные project_tasks этого теневого Stage,
 * поэтому они автоматически попадают во "Все задачи"/Канбан/Календарь.
 */
export default function ContentProjectsTab({
  employees,
  currentUserEmployeeName,
  defaultFilterAssignee,
  onEditProjectTask,
  onAddProjectTask,
  onToggleTaskStatus,
}: ContentProjectsTabProps) {
  const { projects } = useAppContext();
  // Мапа shadowStageId → задачи ролика (обычные project_tasks теневого stage)
  const tasksByShadowStage = useMemo(() => {
    const map = new Map<number, ProjectTask[]>();
    for (const p of projects) {
      if (p.kind !== "content") continue;
      for (const s of p.stages) {
        if (s.tasks.length === 0) continue;
        map.set(s.id, s.tasks.filter((t) => !t.cancelled));
      }
    }
    return map;
  }, [projects]);

  const [contentProjects, setContentProjects] = useState<ContentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingCp, setEditingCp] = useState<ContentProject | null>(null);
  const [creatingReelFor, setCreatingReelFor] = useState<number | null>(null);
  const [editingReel, setEditingReel] = useState<{ cpId: number; reel: ContentReel } | null>(null);
  const [expandedCp, setExpandedCp] = useState<Set<number>>(new Set());

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/content-projects");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContentProjects(data);
    } catch (err) {
      console.error("[content-projects] load error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleExpand = (cpId: number) => {
    setExpandedCp((prev) => {
      const next = new Set(prev);
      if (next.has(cpId)) next.delete(cpId);
      else next.add(cpId);
      return next;
    });
  };

  const handleSaveCp = async (cp: Partial<ContentProject>, isNew: boolean) => {
    const url = isNew ? "/api/content-projects" : `/api/content-projects/${cp.id}`;
    const method = isNew ? "POST" : "PUT";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cp),
      });
      if (res.ok) {
        await reload();
        setCreating(false);
        setEditingCp(null);
      } else {
        const text = await res.text().catch(() => "");
        let msg = `${res.status} ${res.statusText}`;
        try {
          const data = JSON.parse(text);
          if (data?.error) msg = data.error;
        } catch { if (text) msg = text.slice(0, 200); }
        console.error("[content-projects] save failed", res.status, text);
        alert(`Ошибка сохранения: ${msg}`);
      }
    } catch (err) {
      console.error("[content-projects] network error", err);
      alert(`Сетевая ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteCp = async (id: number) => {
    if (!window.confirm("Удалить контент-план со всеми роликами и задачами?")) return;
    const res = await fetch(`/api/content-projects/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
    else alert("Ошибка удаления");
  };

  const handleSaveReel = async (reel: Partial<ContentReel>, isNew: boolean) => {
    const url = isNew ? "/api/content-reels" : `/api/content-reels/${reel.id}`;
    const method = isNew ? "POST" : "PUT";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reel),
      });
      if (res.ok) {
        await reload();
        setCreatingReelFor(null);
        setEditingReel(null);
      } else {
        const text = await res.text().catch(() => "");
        let msg = `${res.status} ${res.statusText}`;
        try { const data = JSON.parse(text); if (data?.error) msg = data.error; } catch { if (text) msg = text.slice(0, 200); }
        console.error("[content-reels] save failed", res.status, text);
        alert(`Ошибка сохранения ролика: ${msg}`);
      }
    } catch (err) {
      console.error("[content-reels] network error", err);
      alert(`Сетевая ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteReel = async (id: number) => {
    if (!window.confirm("Удалить ролик со всеми задачами?")) return;
    const res = await fetch(`/api/content-reels/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
  };

  const handleUploadAttachment = async (
    reelId: number,
    files: FileList,
    kind: "reference" | "document"
  ) => {
    const fd = new FormData();
    fd.append("kind", kind);
    for (const f of Array.from(files)) fd.append("files", f);
    const res = await fetch(`/api/content-reels/${reelId}/attachments`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) await reload();
    else alert("Ошибка загрузки файлов");
  };

  const handleDeleteAttachment = async (reelId: number, attachmentId: number) => {
    const res = await fetch(`/api/content-reels/${reelId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    if (res.ok) await reload();
  };

  // Фильтр по сотруднику: контент-план виден если
  //  · responsible совпадает с фильтром
  //  · или responsible пуст (общий план для всех)
  //  · или среди задач любого ролика есть assignee == фильтр
  const filteredCps = useMemo(() => {
    if (!defaultFilterAssignee || defaultFilterAssignee === "__all__") return contentProjects;
    return contentProjects.filter((cp) => {
      if (!cp.responsible) return true;
      if (cp.responsible === defaultFilterAssignee) return true;
      // tasks внутри роликов живут в shadow project, и здесь не дублируются —
      // полную проверку assignee проще делать во "Все задачи"/Канбане
      return false;
    });
  }, [contentProjects, defaultFilterAssignee]);

  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Загрузка контент-планов…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700 transition-colors shadow-sm"
        >
          + Новый контент-план
        </button>
      </div>

      {filteredCps.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          Нет контент-планов. Создайте первый, нажав кнопку выше.
        </div>
      )}

      <div className="space-y-3">
        {filteredCps.map((cp) => {
          const expanded = expandedCp.has(cp.id);
          const totalTasks = cp.reels.reduce((s, r) => s + (r.taskCount ?? 0), 0);
          const doneTasks = cp.reels.reduce((s, r) => s + (r.doneTaskCount ?? 0), 0);
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          return (
            <div key={cp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(cp.id)}>
                <span className="text-fuchsia-500 text-lg">🎬</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{cp.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                    {cp.responsible && <span>👤 {cp.responsible}</span>}
                    <span>📅 {new Date(cp.deadline + "T00:00:00").toLocaleDateString("ru-RU")}</span>
                    <span>🎞 {cp.reels.length} ролик{cp.reels.length === 1 ? "" : cp.reels.length < 5 ? "а" : "ов"}</span>
                    <span>✅ {doneTasks}/{totalTasks} задач ({progress}%)</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCp(cp); }}
                  className="text-xs text-gray-400 hover:text-indigo-600"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCp(cp.id); }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  🗑
                </button>
              </div>

              {/* Reels */}
              {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-2">
                  {cp.reels.map((reel) => {
                    const reelTasks = reel.shadowStageId ? (tasksByShadowStage.get(reel.shadowStageId) ?? []) : [];
                    return (
                      <ReelCard
                        key={reel.id}
                        reel={reel}
                        tasks={reelTasks}
                        shadowProjectId={cp.shadowProjectId}
                        onEdit={() => setEditingReel({ cpId: cp.id, reel })}
                        onDelete={() => handleDeleteReel(reel.id)}
                        onUpload={(files, kind) => handleUploadAttachment(reel.id, files, kind)}
                        onDeleteAttachment={(attId) => handleDeleteAttachment(reel.id, attId)}
                        onAddTask={() => {
                          if (reel.shadowStageId && cp.shadowProjectId && onAddProjectTask) {
                            onAddProjectTask(cp.shadowProjectId, reel.shadowStageId);
                          }
                        }}
                        onEditTask={(task) => {
                          if (reel.shadowStageId && cp.shadowProjectId && onEditProjectTask) {
                            onEditProjectTask(cp.shadowProjectId, reel.shadowStageId, task);
                          }
                        }}
                        onToggleTaskStatus={(task, status) => {
                          if (reel.shadowStageId && cp.shadowProjectId && onToggleTaskStatus) {
                            onToggleTaskStatus(cp.shadowProjectId, reel.shadowStageId, task.id, status);
                          }
                        }}
                      />
                    );
                  })}
                  <button
                    onClick={() => setCreatingReelFor(cp.id)}
                    className="w-full text-left px-3 py-2 text-xs text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg border border-dashed border-fuchsia-200"
                  >
                    + Новый ролик
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating && (
        <CpEditModal
          cp={null}
          employees={employees}
          defaultResponsible={currentUserEmployeeName ?? ""}
          onSave={(cp) => handleSaveCp(cp, true)}
          onClose={() => setCreating(false)}
        />
      )}
      {editingCp && (
        <CpEditModal
          cp={editingCp}
          employees={employees}
          onSave={(cp) => handleSaveCp({ ...editingCp, ...cp }, false)}
          onClose={() => setEditingCp(null)}
        />
      )}
      {creatingReelFor != null && (
        <ReelEditModal
          reel={null}
          contentProjectId={creatingReelFor}
          onSave={(reel) => handleSaveReel(reel, true)}
          onClose={() => setCreatingReelFor(null)}
        />
      )}
      {editingReel && (
        <ReelEditModal
          reel={editingReel.reel}
          contentProjectId={editingReel.cpId}
          onSave={(reel) => handleSaveReel({ ...editingReel.reel, ...reel }, false)}
          onClose={() => setEditingReel(null)}
        />
      )}
    </div>
  );
}

// ─── Reel card ─────────────────────────────────────────────────────

function ReelCard({
  reel,
  tasks,
  shadowProjectId,
  onEdit,
  onDelete,
  onUpload,
  onDeleteAttachment,
  onAddTask,
  onEditTask,
  onToggleTaskStatus,
}: {
  reel: ContentReel;
  tasks: ProjectTask[];
  shadowProjectId: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onUpload: (files: FileList, kind: "reference" | "document") => void;
  onDeleteAttachment: (attId: number) => void;
  onAddTask: () => void;
  onEditTask: (task: ProjectTask) => void;
  onToggleTaskStatus: (task: ProjectTask, status: ProjectTaskStatus) => void;
}) {
  const refs = reel.attachments.filter((a) => a.kind === "reference");
  const docs = reel.attachments.filter((a) => a.kind === "document");

  const STATUS_LABELS: Record<string, string> = {
    idea: "Идея",
    in_progress: "В работе",
    review: "На проверке",
    published: "Опубликован",
    cancelled: "Отменён",
  };
  const STATUS_COLORS: Record<string, string> = {
    idea: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    review: "bg-amber-100 text-amber-700",
    published: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="text-fuchsia-400">🎞</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900">{reel.name}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[reel.status] ?? ""}`}>
              {STATUS_LABELS[reel.status] ?? reel.status}
            </span>
          </div>
          {reel.description && <p className="text-xs text-gray-500 mt-0.5">{reel.description}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
            {reel.deadline && <span>📅 {new Date(reel.deadline + "T00:00:00").toLocaleDateString("ru-RU")}</span>}
            <span>✅ {reel.doneTaskCount ?? 0}/{reel.taskCount ?? 0}</span>
          </div>

          {/* Attachments */}
          {(refs.length > 0 || docs.length > 0) && (
            <div className="mt-2 space-y-1">
              {refs.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-semibold text-fuchsia-600 mb-0.5">Референсы</p>
                  <div className="flex flex-wrap gap-1">
                    {refs.map((a) => (
                      <a
                        key={a.id}
                        href={a.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] px-2 py-0.5 bg-fuchsia-50 text-fuchsia-700 rounded hover:bg-fuchsia-100 group"
                      >
                        {a.fileName}{" "}
                        <button
                          onClick={(e) => { e.preventDefault(); onDeleteAttachment(a.id); }}
                          className="ml-1 opacity-0 group-hover:opacity-100 text-red-500"
                        >×</button>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {docs.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-semibold text-blue-600 mb-0.5">Документы</p>
                  <div className="flex flex-wrap gap-1">
                    {docs.map((a) => (
                      <a
                        key={a.id}
                        href={a.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 group"
                      >
                        {a.fileName}{" "}
                        <button
                          onClick={(e) => { e.preventDefault(); onDeleteAttachment(a.id); }}
                          className="ml-1 opacity-0 group-hover:opacity-100 text-red-500"
                        >×</button>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tasks list */}
          {tasks.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              <p className="text-[10px] uppercase font-semibold text-emerald-600 mb-1">Задачи</p>
              {tasks.map((t) => (
                <ReelTaskRow
                  key={t.id}
                  task={t}
                  onEdit={() => onEditTask(t)}
                  onToggleStatus={(status) => onToggleTaskStatus(t, status)}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <label className="text-[11px] text-fuchsia-600 hover:underline cursor-pointer">
              + Референс
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => e.target.files && onUpload(e.target.files, "reference")}
              />
            </label>
            <label className="text-[11px] text-blue-600 hover:underline cursor-pointer">
              + Документ
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => e.target.files && onUpload(e.target.files, "document")}
              />
            </label>
            <button
              onClick={onAddTask}
              disabled={!shadowProjectId || !reel.shadowStageId}
              className="text-[11px] text-emerald-600 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              + Задача
            </button>
          </div>
        </div>
        <button onClick={onEdit} className="text-xs text-gray-400 hover:text-indigo-600">✏️</button>
        <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500">🗑</button>
      </div>
    </div>
  );
}

// ─── Reel task row ─────────────────────────────────────────────────

function ReelTaskRow({
  task,
  onEdit,
  onToggleStatus,
}: {
  task: ProjectTask;
  onEdit: () => void;
  onToggleStatus: (status: ProjectTaskStatus) => void;
}) {
  const isOverdue = task.status !== "done" && new Date(task.deadline + "T00:00:00") < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const isDone = task.status === "done";

  // Цикл статусов: todo → in_progress → done → todo
  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next: Record<ProjectTaskStatus, ProjectTaskStatus> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    onToggleStatus(next[task.status as ProjectTaskStatus] ?? "todo");
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors group ${isDone ? "opacity-60" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={cycleStatus}
        title={`Сменить статус (сейчас: ${projectTaskStatusLabels[task.status as ProjectTaskStatus]})`}
        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isDone
            ? "bg-green-500 border-green-500 text-white"
            : task.status === "in_progress"
            ? "bg-blue-50 border-blue-400"
            : "border-gray-300 hover:border-gray-500 bg-white"
        }`}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {task.status === "in_progress" && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </button>

      {/* Clickable body — opens edit modal */}
      <button onClick={onEdit} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <span className={`text-xs flex-1 min-w-0 truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
          {task.name}
        </span>
        {task.assignee && (
          <span className="text-[10px] text-gray-500 hidden sm:inline truncate max-w-[80px]">{task.assignee}</span>
        )}
        <span className={`text-[10px] flex-shrink-0 ${isOverdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
          {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${projectTaskStatusColors[task.status as ProjectTaskStatus]}`}>
          {projectTaskStatusLabels[task.status as ProjectTaskStatus]}
        </span>
      </button>
    </div>
  );
}

// ─── CP edit modal ─────────────────────────────────────────────────

function CpEditModal({
  cp,
  employees,
  defaultResponsible,
  onSave,
  onClose,
}: {
  cp: ContentProject | null;
  employees: Employee[];
  defaultResponsible?: string;
  onSave: (cp: Partial<ContentProject>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(cp?.name ?? "");
  const [description, setDescription] = useState(cp?.description ?? "");
  const [startDate, setStartDate] = useState(cp?.startDate ?? "");
  const [deadline, setDeadline] = useState(cp?.deadline ?? "");
  const [responsible, setResponsible] = useState(cp?.responsible ?? defaultResponsible ?? "");
  const [priority, setPriority] = useState(cp?.priority ?? 0);

  const submit = () => {
    if (!name.trim()) return alert("Введите название");
    if (!deadline) return alert("Укажите дедлайн");
    onSave({ name: name.trim(), description, startDate: startDate || undefined, deadline, responsible, priority });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{cp ? "Редактировать контент-план" : "Новый контент-план"}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Старт</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Дедлайн</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Ответственный</label>
            <select value={responsible ?? ""} onChange={(e) => setResponsible(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option value="">—</option>
              {employees.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Приоритет</label>
            <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={submit} className="px-4 py-2 text-sm bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reel edit modal ───────────────────────────────────────────────

function ReelEditModal({
  reel,
  contentProjectId,
  onSave,
  onClose,
}: {
  reel: ContentReel | null;
  contentProjectId: number;
  onSave: (reel: Partial<ContentReel>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(reel?.name ?? "");
  const [description, setDescription] = useState(reel?.description ?? "");
  const [startDate, setStartDate] = useState(reel?.startDate ?? "");
  const [deadline, setDeadline] = useState(reel?.deadline ?? "");
  const [status, setStatus] = useState(reel?.status ?? "idea");
  const [priority, setPriority] = useState(reel?.priority ?? 0);

  const submit = () => {
    if (!name.trim()) return alert("Введите название");
    onSave({
      contentProjectId,
      name: name.trim(),
      description,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      status,
      priority,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{reel ? "Редактировать ролик" : "Новый ролик"}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Название ролика</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Старт</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Дедлайн</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Статус</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ContentReel["status"])} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                <option value="idea">Идея</option>
                <option value="in_progress">В работе</option>
                <option value="review">На проверке</option>
                <option value="published">Опубликован</option>
                <option value="cancelled">Отменён</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Приоритет</label>
              <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={submit} className="px-4 py-2 text-sm bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
