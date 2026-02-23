import type {
  DashboardData,
  TaskStatus,
  TaskPriority,
  TabDefinition,
  TeamMember,
  Employee,
} from "@/types/dashboard";

export const initialData: DashboardData = {
  departments: [
    {
      id: "management",
      name: "Руководство / Маркетинг",
      person: "Никита",
      color: "#6366f1",
      icon: "\u{1F3AF}",
      description: "Анализ, стратегия, УТП, планы, управление",
      goals: [
        { id: 1, text: "Увеличить количество лидов на 30% к Q3", progress: 45, kpi: "Лиды/мес" },
        { id: 2, text: "Разработать маркетинговую стратегию на H2 2026", progress: 20, kpi: "Документ" },
        { id: 3, text: "Сформировать 3 новых УТП для основных продуктов", progress: 60, kpi: "УТП" },
      ],
      tasks: [
        { id: 1, text: "Провести анализ конкурентов", status: "done", priority: "high", dueDate: "2026-02-10", startDate: "2026-02-03", dueTime: "10:00", duration: 120 },
        { id: 2, text: "Составить квартальный план", status: "in_progress", priority: "high", dueDate: "2026-02-28", startDate: "2026-02-17", dueTime: "09:00", duration: 180 },
        { id: 3, text: "Подготовить отчёт по ROI рекламных каналов", status: "in_progress", priority: "medium", dueDate: "2026-03-05", startDate: "2026-02-24", dueTime: "14:00", duration: 90 },
        { id: 4, text: "Утвердить акции на март", status: "todo", priority: "medium", dueDate: "2026-03-01", dueTime: "11:00", duration: 60 },
        { id: 5, text: "Провести стратегическую сессию с командой", status: "todo", priority: "low", dueDate: "2026-03-15", dueTime: "15:00", duration: 120 },
      ],
    },
    {
      id: "ads",
      name: "Рекламный менеджмент",
      person: "Диана",
      color: "#ec4899",
      icon: "\u{1F4E2}",
      description: "Рекламные каналы, кампании, рутинные задачи",
      goals: [
        { id: 1, text: "Снизить CPL на 15% по всем каналам", progress: 30, kpi: "CPL, \u20BD" },
        { id: 2, text: "Запустить рекламу в 2 новых каналах", progress: 50, kpi: "Каналы" },
        { id: 3, text: "Достичь CTR > 3% в контекстной рекламе", progress: 70, kpi: "CTR, %" },
      ],
      tasks: [
        { id: 1, text: "Настроить ретаргетинг в Яндекс.Директ", status: "done", priority: "high", dueDate: "2026-02-07", startDate: "2026-02-03", dueTime: "11:00", duration: 90 },
        { id: 2, text: "Обновить креативы для VK Ads", status: "in_progress", priority: "high", dueDate: "2026-02-25", startDate: "2026-02-18", dueTime: "10:00", duration: 120 },
        { id: 3, text: "Оптимизировать ставки в Google Ads", status: "in_progress", priority: "medium", dueDate: "2026-03-03", startDate: "2026-02-20", dueTime: "13:00", duration: 60 },
        { id: 4, text: "Подготовить отчёт по рекламным расходам", status: "todo", priority: "medium", dueDate: "2026-03-10", dueTime: "09:00", duration: 120 },
        { id: 5, text: "Тестировать новые аудитории в Telegram Ads", status: "todo", priority: "low", dueDate: "2026-03-20", dueTime: "16:00", duration: 90 },
      ],
    },
    {
      id: "content",
      name: "Фабрика контента",
      person: "Дима",
      color: "#10b981",
      icon: "\u{1F3A8}",
      description: "Контент, имидж компании, соц. сети",
      goals: [
        { id: 1, text: "Публиковать 20+ постов в месяц по всем соцсетям", progress: 65, kpi: "Посты/мес" },
        { id: 2, text: "Увеличить вовлечённость (ER) до 5%", progress: 40, kpi: "ER, %" },
        { id: 3, text: "Создать фирменный гайдлайн по контенту", progress: 10, kpi: "Документ" },
      ],
      tasks: [
        { id: 1, text: "Написать 5 постов для Telegram-канала", status: "done", priority: "high", dueDate: "2026-02-12", startDate: "2026-02-08", dueTime: "09:00", duration: 150 },
        { id: 2, text: "Снять Reels для Instagram", status: "in_progress", priority: "high", dueDate: "2026-02-22", startDate: "2026-02-18", dueTime: "12:00", duration: 180 },
        { id: 3, text: "Подготовить контент-план на март", status: "in_progress", priority: "medium", dueDate: "2026-02-28", startDate: "2026-02-20", dueTime: "14:00", duration: 120 },
        { id: 4, text: "Обновить обложки в соцсетях", status: "todo", priority: "low", dueDate: "2026-03-08", dueTime: "10:00", duration: 90 },
        { id: 5, text: "Написать кейс по последнему проекту", status: "todo", priority: "medium", dueDate: "2026-03-12", dueTime: "11:00", duration: 180 },
      ],
    },
    {
      id: "tech",
      name: "Технический отдел",
      person: "Никита",
      color: "#f59e0b",
      icon: "\u2699\uFE0F",
      description: "Технологии, автоматизация, IT-решения",
      goals: [
        { id: 1, text: "Автоматизировать 5 рутинных процессов", progress: 40, kpi: "Процессы" },
        { id: 2, text: "Внедрить CRM-аналитику для маркетинга", progress: 25, kpi: "Система" },
        { id: 3, text: "Сократить время на рутину на 20%", progress: 35, kpi: "Часы/нед" },
      ],
      tasks: [
        { id: 1, text: "Настроить автоотчёты в Google Analytics", status: "done", priority: "high", dueDate: "2026-02-14", startDate: "2026-02-05", dueTime: "10:00", duration: 120 },
        { id: 2, text: "Интегрировать CRM с рекламными кабинетами", status: "in_progress", priority: "high", dueDate: "2026-03-01", startDate: "2026-02-15", dueTime: "09:00", duration: 240 },
        { id: 3, text: "Исследовать AI-инструменты для контента", status: "in_progress", priority: "medium", dueDate: "2026-03-07", startDate: "2026-02-22", dueTime: "15:00", duration: 90 },
        { id: 4, text: "Настроить UTM-генератор", status: "todo", priority: "low", dueDate: "2026-03-18", dueTime: "13:00", duration: 60 },
        { id: 5, text: "Автоматизировать сбор данных по лидам", status: "todo", priority: "high", dueDate: "2026-02-28", dueTime: "11:00", duration: 150 },
      ],
    },
  ],
};

export const statusLabels: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export const priorityLabels: Record<TaskPriority, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export const priorityDots: Record<TaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

export const tabs: TabDefinition[] = [
  { id: "overview", label: "Обзор" },
  { id: "calendar", label: "Календарь" },
];

export const dayNamesShortRu = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const teamMembers: TeamMember[] = [
  { name: "Никита", roles: ["Руководство / Маркетинг", "Технический отдел"], color: "#6366f1" },
  { name: "Диана", roles: ["Рекламный менеджмент"], color: "#ec4899" },
  { name: "Дима", roles: ["Фабрика контента"], color: "#10b981" },
];

export const initialEmployees: Employee[] = [
  { name: "Никита", departmentId: "management", roles: ["Руководитель", "Технический отдел"], color: "#6366f1", schedule: [] },
  { name: "Диана", departmentId: "ads", roles: ["Рекламный менеджер"], color: "#ec4899", schedule: [] },
  { name: "Дима", departmentId: "content", roles: ["Контент-менеджер"], color: "#10b981", schedule: [] },
];

export const dayTypeLabels: Record<import("@/types/dashboard").DayType, string> = {
  work: "Рабочий",
  dayoff: "Выходной",
  vacation: "Отгул",
};
