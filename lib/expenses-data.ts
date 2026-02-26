import type { Expense } from "@/types/dashboard";

export const initialExpenses: Expense[] = [
  { id: 1, name: "Яндекс.Директ — бюджет март", amount: 150000, responsible: "Диана", date: "2026-03-01", projectId: 1, channelId: 3, storeId: null },
  { id: 2, name: "VK Ads — тестовый бюджет", amount: 50000, responsible: "Диана", date: "2026-03-05", projectId: 1, channelId: 4, storeId: null },
  { id: 3, name: "Дизайн баннеров (фриланс)", amount: 25000, responsible: "Дима", date: "2026-03-10", projectId: 1, channelId: null, storeId: null },
  { id: 4, name: "Подписка Figma (годовая)", amount: 18000, responsible: "Дима", date: "2026-02-15", projectId: 2, channelId: null, storeId: null },
  { id: 5, name: "Видеосъёмка Reels", amount: 35000, responsible: "Дима", date: "2026-03-12", projectId: 2, channelId: null, storeId: null },
  { id: 6, name: "Лицензия CRM-системы", amount: 45000, responsible: "Никита", date: "2026-02-20", projectId: 3, channelId: null, storeId: null },
  { id: 7, name: "Канцтовары для офиса", amount: 3500, responsible: "Никита", date: "2026-03-15", projectId: null, channelId: null, storeId: null },
];
