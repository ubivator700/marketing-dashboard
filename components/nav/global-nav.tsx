"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

// ─── Nav structure ──────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: string;
  href: string;
  children?: { label: string; icon: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Дашборд", icon: "📊", href: "/",
    children: [{ label: "Обзор", icon: "📈", href: "/overview" }],
  },
  {
    label: "Проекты", icon: "📁", href: "/projects",
    children: [{ label: "Контент", icon: "✏️", href: "/content" }],
  },
  {
    label: "Каналы", icon: "📡", href: "/channels",
    children: [{ label: "Лиды", icon: "👥", href: "/leads" }],
  },
  { label: "Расходы", icon: "💰", href: "/expenses" },
  { label: "Организация", icon: "🏢", href: "/organization" },
];

// ─── Helpers ────────────────────────────────────────────────────

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

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") {
    if (pathname === "/") return true;
  } else if (pathname.startsWith(item.href)) {
    return true;
  }
  if (item.children?.some((c) => pathname.startsWith(c.href))) return true;
  return false;
}

// ─── NavDropdown (desktop) ──────────────────────────────────────

function NavDropdown({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = isItemActive(item, pathname);

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center rounded-lg transition-all ${
          active
            ? "bg-indigo-600 shadow-md"
            : "hover:bg-gray-100"
        }`}
      >
        <Link
          href={item.href}
          onClick={() => setOpen(false)}
          className={`pl-4 pr-1 py-2 text-sm font-medium transition-colors ${
            active ? "text-white" : "text-gray-600"
          }`}
        >
          {item.icon} {item.label}
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`pr-3 pl-1 py-2 transition-colors ${
            active ? "text-white" : "text-gray-600"
          }`}
          aria-label={`${item.label} меню`}
        >
          <svg
            className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[160px]">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname.startsWith(child.href)
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {child.icon} {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NavLink (desktop, no dropdown) ─────────────────────────────

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-md"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {item.icon} {item.label}
    </Link>
  );
}

// ─── Mobile Drawer ──────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  pathname,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  isAdmin: boolean;
}) {
  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Drawer panel */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Навигация</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            {"\u00D7"}
          </button>
        </div>
        <nav className="py-2">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item, pathname);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active && !item.children?.some((c) => pathname.startsWith(c.href))
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onClose}
                    className={`flex items-center gap-2 pl-10 pr-4 py-2.5 text-sm transition-colors ${
                      pathname.startsWith(child.href)
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <span>{child.icon}</span>
                    {child.label}
                  </Link>
                ))}
              </div>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>⚙️</span>
              Админ
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}

// ─── Main GlobalNav ─────────────────────────────────────────────

export default function GlobalNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (!user) return null;

  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-14">
            {/* Left section: hamburger (mobile) / spacer (desktop) */}
            <div className="flex-1 flex items-center">
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
                aria-label="Открыть меню"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Center: Desktop nav items */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <NavDropdown key={item.href} item={item} pathname={pathname} />
                ) : (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                )
              )}
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === "/admin"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Админ
                </Link>
              )}
            </div>

            {/* Right section: User info + logout */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              <span className="text-sm text-gray-700 font-medium hidden sm:inline">
                {user.employeeName || user.username}
              </span>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        pathname={pathname}
        isAdmin={user.role === "admin"}
      />
    </>
  );
}
