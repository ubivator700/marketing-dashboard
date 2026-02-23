import type { Channel, ChannelGroup } from "@/types/dashboard";

export const channelGroupLabels: Record<ChannelGroup, string> = {
  offline: "Оффлайн маркетинг",
  digital: "Цифровой маркетинг",
  loyalty: "Лояльность",
};

export const channelGroupColors: Record<ChannelGroup, string> = {
  offline: "#f59e0b",
  digital: "#6366f1",
  loyalty: "#10b981",
};

export const channelGroupOrder: ChannelGroup[] = ["digital", "offline", "loyalty"];

export const DEFAULT_MONTHLY_LEAD_PLAN = 200;
export const DEFAULT_DAILY_LEAD_PLAN = 7;

export const initialChannels: Channel[] = [
  // Оффлайн
  { id: 1, name: "Фасад", group: "offline", tasks: [] },
  { id: 2, name: "Расклейка", group: "offline", tasks: [] },
  // Цифровой
  { id: 3, name: "РСЯ", group: "digital", tasks: [] },
  { id: 4, name: "Вконтакте", group: "digital", tasks: [] },
  { id: 5, name: "Телеграмм", group: "digital", tasks: [] },
  { id: 6, name: "Одноклассники", group: "digital", tasks: [] },
  // Лояльность
  { id: 7, name: "Сарафанное радио", group: "loyalty", tasks: [] },
  { id: 8, name: "Постоянный клиент", group: "loyalty", tasks: [] },
  { id: 9, name: "Обзвон", group: "loyalty", tasks: [] },
];
