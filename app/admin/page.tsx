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

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, employeesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/employees"),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (employeesRes.ok) {
        const emps = await employeesRes.json();
        setEmployees(emps.map((e: any) => ({ name: e.name })));
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

  const handleCreate = async (e: React.FormEvent) => {
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

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditEmployee(u.employeeName || "");
  };

  const saveEdit = async (u: User) => {
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

  const handleDelete = async (u: User) => {
    if (!confirm(`Удалить пользователя ${u.username}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
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
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>

        {/* Create user form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Новый пользователь</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Логин</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => { setNewUsername(e.target.value); setFormError(""); }}
                placeholder="username"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setFormError(""); }}
                placeholder="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Роль</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="viewer">Просмотр</option>
                <option value="manager">Менеджер</option>
                <option value="admin">Админ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Сотрудник</label>
              <select
                value={newEmployee}
                onChange={(e) => setNewEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— не привязан —</option>
                {employees.map((emp) => (
                  <option key={emp.name} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "..." : "Создать"}
            </button>
          </form>
          {formError && <p className="text-sm text-red-500 mt-2">{formError}</p>}
        </div>

        {/* Users table */}
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
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                          className="px-2 py-1 border border-gray-200 rounded text-xs"
                        >
                          <option value="viewer">Просмотр</option>
                          <option value="manager">Менеджер</option>
                          <option value="admin">Админ</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {editingId === u.id ? (
                        <select
                          value={editEmployee}
                          onChange={(e) => setEditEmployee(e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded text-xs"
                        >
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
                          <button
                            onClick={() => saveEdit(u)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(u)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
