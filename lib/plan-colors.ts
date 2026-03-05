// Shared color definitions for PlanItem cards and Gantt chart bars
export const PLAN_ITEM_COLORS: Record<string, {
  bg: string; border: string; accent: string; text: string; stripe: string; meta: string; hex: string
}> = {
  blue:    { bg: "bg-blue-200",    border: "border-blue-300",    accent: "#3b82f6", text: "text-blue-900",    stripe: "bg-blue-600",    meta: "text-blue-700",    hex: "#3b82f6" },
  rose:    { bg: "bg-rose-200",    border: "border-rose-300",    accent: "#f43f5e", text: "text-rose-900",    stripe: "bg-rose-600",    meta: "text-rose-700",    hex: "#f43f5e" },
  emerald: { bg: "bg-emerald-200", border: "border-emerald-300", accent: "#10b981", text: "text-emerald-900", stripe: "bg-emerald-600", meta: "text-emerald-700", hex: "#10b981" },
  amber:   { bg: "bg-amber-200",   border: "border-amber-300",   accent: "#f59e0b", text: "text-amber-900",   stripe: "bg-amber-600",   meta: "text-amber-700",   hex: "#f59e0b" },
  violet:  { bg: "bg-violet-200",  border: "border-violet-300",  accent: "#8b5cf6", text: "text-violet-900",  stripe: "bg-violet-600",  meta: "text-violet-700",  hex: "#8b5cf6" },
  cyan:    { bg: "bg-cyan-200",    border: "border-cyan-300",    accent: "#06b6d4", text: "text-cyan-900",    stripe: "bg-cyan-600",    meta: "text-cyan-700",    hex: "#06b6d4" },
  indigo:  { bg: "bg-indigo-200",  border: "border-indigo-300",  accent: "#6366f1", text: "text-indigo-900",  stripe: "bg-indigo-600",  meta: "text-indigo-700",  hex: "#6366f1" },
  orange:  { bg: "bg-orange-200",  border: "border-orange-300",  accent: "#f97316", text: "text-orange-900",  stripe: "bg-orange-600",  meta: "text-orange-700",  hex: "#f97316" },
};
