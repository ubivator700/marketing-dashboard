import type { Lead } from "@/types/dashboard";

// ─── Lead CRUD ───────────────────────────────────────────────────

export function addLead(leads: Lead[], lead: Lead): Lead[] {
  return [...leads, lead];
}

export function updateLead(
  leads: Lead[],
  leadId: number,
  updates: Partial<Omit<Lead, "id">>
): Lead[] {
  return leads.map((l) => (l.id !== leadId ? l : { ...l, ...updates }));
}

export function deleteLead(leads: Lead[], leadId: number): Lead[] {
  return leads.filter((l) => l.id !== leadId);
}

// ─── Queries ─────────────────────────────────────────────────────

export function leadsByChannel(leads: Lead[], channelId: number): Lead[] {
  return leads.filter((l) => l.channelId === channelId);
}

export function leadsByDate(leads: Lead[], date: string): Lead[] {
  return leads.filter((l) => l.date === date);
}

export function leadsForMonth(leads: Lead[], year: number, month: number): Lead[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return leads.filter((l) => l.date.startsWith(prefix));
}

