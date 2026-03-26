"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: "admin" | "manager" | "viewer";
  employeeName: string | null;
}

interface EmployeeOption {
  name: string;
  departmentId: string;
  position?: string;
  color: string;
  roles: string[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  manager: "Менеджер",
  viewer: "Просмотр",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

const POSITIONS = ["Руководитель", "Маркетолог", "Дизайнер", "Контент-менеджер"];

const DEPARTMENT_LABELS: Record<string, string> = {
  management: "Управление",
  ads: "Реклама",
  content: "Контент",
  tech: "Технический",
};

const COLOR_OPTIONS = [
  { value: "#6366f1", label: "Индиго" },
  { value: "#ec4899", label: "Розовый" },
  { value: "#f59e0b", label: "Жёлтый" },
  { value: "#10b981", label: "Зелёный" },
  { value: "#3b82f6", label: "Синий" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#ef4444", label: "Красный" },
  { value: "#14b8a6", label: "Бирюзовый" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "employees">("users");

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [newEmployee, setNewEmployee] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [editEmployee, setEditEmployee] = useState("");

  // Employee form
  const [empName, setEmpName] = useState("");
  const [empDept, setEmpDept] = useState("management");
  const [empPosition, setEmpPosition] = useState("Маркетолог");
  const [empColor, setEmpColor] = useState("#6366f1");
  const [empError, setEmpError] = useState("");
  const [empSaving, setEmpSaving] = useState(false);
  const [editingEmpName, setEditingEmpName] = useState<string | null>(null);
  const [editEmpDept, setEditEmpDept] = useState("management");
  const [editEmpPosition, setEditEmpPosition] = useState("Маркетолог");
  const [editEmpColor, setEditEmpColor] = useState("#6366f1");

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, employeesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/employees"),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (employeesRes.ok) {
        const emps = await employeesRes.json();
        setEmployees(emps);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
      return;
    }
    if (user) fetchData();
  }, [user, router, fetchData]);

  // ─── User CRUD ───
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setFormError("Заполните логин и пароль");
      return;
    }
    setSaving(true);
    setFormError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        employeeName: newEmployee || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "Ошибка создания");
      setSaving(false);
      return;
    }
    const created = await res.json();
    setUsers((prev) => [...prev, created]);
    setNewUsername("");
    setNewPassword("");
    setNewRole("viewer");
    setNewEmployee("");
    setSaving(false);
  };

  const startEditUser = (u: User) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditEmployee(u.employeeName || "");
  };

  const saveEditUser = async (u: User) => {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: u.username,
        role: editRole,
        employeeName: editEmployee || null,
      }),
    });
    setUsers((prev) =>
      prev.map((x) =>
        x.id === u.id ? { ...x, role: editRole, employeeName: editEmployee || null } : x
      )
    );
    setEditingId(null);
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`Удалить пользователя ${u.username}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    }
  };

  // ─── Employee CRUD ───
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      setEmpError("Введите имя сотрудника");
      return;
    }
    setEmpSaving(true);
    setEmpError("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: empName.trim(),
        departmentId: empDept,
        roles: [],
        color: empColor,
        position: empPosition,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setEmpError(data.error || "Ошибка создания");
      setEmpSaving(false);
      return;
    }
    const created = await res.json();
    setEmployees((prev) => [...prev, created]);
    setEmpName("");
    setEmpSaving(false);
  };

  const startEditEmployee = (emp: EmployeeOption) => {
    setEditingEmpName(emp.name);
    setEditEmpDept(emp.departmentId);
    setEditEmpPosition(emp.position || "Маркетолог");
    setEditEmpColor(emp.color);
  };

  const saveEditEmployee = async (emp: EmployeeOption) => {
    await fetch(`/api/employees/${encodeURIComponent(emp.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: emp.name,
        departmentId: editEmpDept,
        roles: emp.roles,
        color: editEmpColor,
        position: editEmpPosition,
      }),
    });
    setEmployees((prev) =>
      prev.map((e) =>
        e.name === emp.name
          ? { ...e, departmentId: editEmpDept, position: editEmpPosition, color: editEmpColor }
          : e
      )
    );
    setEditingEmpName(null);
  };

  const handleDeleteEmployee = async (emp: EmployeeOption) => {
    if (!confirm(`Удалить сотрудника ${emp.name}?`)) return;
    const res = await fetch(`/api/employees/${encodeURIComponent(emp.name)}`, { method: "DELETE" });
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.name !== emp.name));
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Администрирование</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
          {(["users", "employees"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === t ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "users" ? "Пользователи" : "Сотрудники"}
            </button>
          ))}
        </div>

        {/* ═══ Users Tab ═══ */}
        {activeTab === "users" && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Новый пользователь</h2>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Логин</label>
                  <input type="text" value={newUsername} onChange={(e) => { setNewUsername(e.target.value); setFormError(""); }} placeholder="username" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Пароль</label>
                  <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setFormError(""); }} placeholder="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Роль</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="viewer">Просмотр</option>
                    <option value="manager">Менеджер</option>
                    <option value="admin">Админ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Сотрудник</label>
                  <select value={newEmployee} onChange={(e) => setNewEmployee(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— не привязан —</option>
                    {employees.map((emp) => (
                      <option key={emp.name} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {saving ? "..." : "Создать"}
                </button>
              </form>
              {formError && <p className="text-sm text-red-500 mt-2">{formError}</p>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              {loading ? (
                <p className="p-6 text-center text-gray-400">Загрузка...</p>
              ) : (
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-6 py-3">ID</th>
                      <th className="text-left px-6 py-3">Логин</th>
                      <th className="text-left px-6 py-3">Роль</th>
                      <th className="text-left px-6 py-3">Сотрудник</th>
                      <th className="text-right px-6 py-3">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 text-gray-400">{u.id}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{u.username}</td>
                        <td className="px-6 py-3">
                          {editingId === u.id ? (
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value as any)} className="px-2 py-1 border border-gray-200 rounded text-xs">
                              <option value="viewer">Просмотр</option>
                              <option value="manager">Менеджер</option>
                              <option value="admin">Админ</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {editingId === u.id ? (
                            <select value={editEmployee} onChange={(e) => setEditEmployee(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs">
                              <option value="">— нет —</option>
                              {employees.map((emp) => (
                                <option key={emp.name} value={emp.name}>{emp.name}</option>
                              ))}
                            </select>
                          ) : (
                            u.employeeName || <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right space-x-2">
                          {editingId === u.id ? (
                            <>
                              <button onClick={() => saveEditUser(u)} className="text-xs text-indigo-600 hover:text-indigo-800">Сохранить</button>
                              <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditUser(u)} className="text-xs text-indigo-600 hover:text-indigo-800">Изменить</button>
                              <button onClick={() => handleDeleteUser(u)} className="text-xs text-red-500 hover:text-red-700">Удалить</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ═══ Employees Tab ═══ */}
        {activeTab === "employees" && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Новый сотрудник</h2>
              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Имя</label>
                  <input type="text" value={empName} onChange={(e) => { setEmpName(e.target.value); setEmpError(""); }} placeholder="Имя сотрудника" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Должность</label>
                  <select value={empPosition} onChange={(e) => setEmpPosition(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Отдел</label>
                  <select value={empDept} onChange={(e) => setEmpDept(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Цвет</label>
                  <select value={empColor} onChange={(e) => setEmpColor(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={empSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {empSaving ? "..." : "Добавить"}
                </button>
              </form>
              {empError && <p className="text-sm text-red-500 mt-2">{empError}</p>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              {loading ? (
                <p className="p-6 text-center text-gray-400">Загрузка...</p>
              ) : (
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-6 py-3">Имя</th>
                      <th className="text-left px-6 py-3">Должность</th>
                      <th className="text-left px-6 py-3">Отдел</th>
                      <th className="text-left px-6 py-3">Цвет</th>
                      <th className="text-right px-6 py-3">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr key={emp.name} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-6 py-3">
                          {editingEmpName === emp.name ? (
                            <select value={editEmpPosition} onChange={(e) => setEditEmpPosition(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs">
                              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{emp.position || "—"}</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {editingEmpName === emp.name ? (
                            <select value={editEmpDept} onChange={(e) => setEditEmpDept(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs">
                              {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          ) : (
                            DEPARTMENT_LABELS[emp.departmentId] || emp.departmentId
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {editingEmpName === emp.name ? (
                            <select value={editEmpColor} onChange={(e) => setEditEmpColor(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs">
                              {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: emp.color }} />
                          )}
                        </td>
                        <td className="px-6 py-3 text-right space-x-2">
                          {editingEmpName === emp.name ? (
                            <>
                              <button onClick={() => saveEditEmployee(emp)} className="text-xs text-indigo-600 hover:text-indigo-800">Сохранить</button>
                              <button onClick={() => setEditingEmpName(null)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditEmployee(emp)} className="text-xs text-indigo-600 hover:text-indigo-800">Изменить</button>
                              <button onClick={() => handleDeleteEmployee(emp)} className="text-xs text-red-500 hover:text-red-700">Удалить</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
