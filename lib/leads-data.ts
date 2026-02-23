import type { Lead, ContactMethod, LeadResult } from "@/types/dashboard";

export const DEFAULT_AVERAGE_CHECK = 8000;

export const contactMethodLabels: Record<ContactMethod, string> = {
  salon: "В салоне",
  phone: "По телефону",
  social: "Соц. сети",
};

export const leadResultLabels: Record<LeadResult, string> = {
  measurement: "Замер",
  sale: "Продажа",
  deferred: "Отложенный",
};

export const leadResultColors: Record<LeadResult, string> = {
  measurement: "bg-blue-100 text-blue-700",
  sale: "bg-green-100 text-green-700",
  deferred: "bg-yellow-100 text-yellow-700",
};

export const initialLeads: Lead[] = [
  { id: 1, name: "Иванов Пётр", channelId: 3, contactMethod: "phone", result: "measurement", date: "2025-03-05", note: "Квартира 45 м2" },
  { id: 2, name: "Смирнова Анна", channelId: 4, contactMethod: "social", result: "sale", date: "2025-03-07", note: "Кухня под ключ" },
  { id: 3, name: "Козлов Дмитрий", channelId: 7, contactMethod: "salon", result: "measurement", date: "2025-03-10" },
  { id: 4, name: "Фёдорова Елена", channelId: 1, contactMethod: "salon", result: "deferred", date: "2025-03-12", note: "Вернётся через месяц" },
  { id: 5, name: "Николаев Артём", channelId: 9, contactMethod: "phone", result: "sale", date: "2025-03-15" },
];
