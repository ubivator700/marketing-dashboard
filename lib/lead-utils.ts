import type { Lead, ProductType } from "@/types/dashboard";

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

// ─── Financial calculations ──────────────────────────────────────

/** Smart revenue for a set of leads: use product type avgCheck when available.
 *  When a lead has multiple product types, use the average of their avgChecks. */
function smartRevenueForLeads(leads: Lead[], avgCheck: number, productTypes?: ProductType[]): number {
  const ptMap = productTypes?.length
    ? new Map(productTypes.map((pt) => [pt.id, pt.avgCheck]))
    : null;
  return leads.reduce((sum, lead) => {
    if (ptMap && lead.productTypeIds.length > 0) {
      const checks = lead.productTypeIds.map((id) => ptMap.get(id) || 0).filter((c) => c > 0);
      if (checks.length > 0) return sum + checks.reduce((a, b) => a + b, 0) / checks.length;
    }
    return sum + avgCheck;
  }, 0);
}

/** Revenue = smart sum of profitable leads × their avgCheck */
export function channelRevenue(
  leads: Lead[],
  channelId: number,
  avgCheck: number,
  productTypes?: ProductType[],
): number {
  const profitable = leads.filter(
    (l) => l.channelId === channelId && (l.result === "measurement" || l.result === "sale")
  );
  return smartRevenueForLeads(profitable, avgCheck, productTypes);
}

/** ROMI = (revenue - expenses) / expenses × 100%. Null if expenses = 0 */
export function channelRomi(revenue: number, expenses: number): number | null {
  if (expenses === 0) return null;
  return Math.round(((revenue - expenses) / expenses) * 100);
}

/** Total revenue across multiple channels */
export function totalRevenue(
  leads: Lead[],
  channelIds: number[],
  avgCheck: number,
  productTypes?: ProductType[],
): number {
  const profitable = leads.filter(
    (l) =>
      channelIds.includes(l.channelId) &&
      (l.result === "measurement" || l.result === "sale")
  );
  return smartRevenueForLeads(profitable, avgCheck, productTypes);
}
