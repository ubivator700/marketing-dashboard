import type { Project, ProjectTaskStatus } from "@/types/dashboard";

export const initialProjects: Project[] = [
  {
    id: 1,
    name: "Запуск рекламной кампании Q2",
    goal: "Увеличить поток лидов на 30% через новые каналы",
    description: "Комплексная кампания по запуску рекламы в новых каналах с A/B тестированием",
    deadline: "2026-06-30",
    priority: 1,
    responsible: "Диана",
    planItemId: null,
    stages: [
      {
        id: 1,
        name: "Подготовка",
        result: "Утверждённая стратегия и креативы",
        description: "Разработка стратегии, подготовка креативов и настройка аналитики",
        deadline: "2026-03-31",
        projectId: 1,
        tasks: [
          { id: 1, name: "Провести анализ целевой аудитории", description: "Сегментация ЦА для новых каналов", assignee: "Никита", deadline: "2026-03-15", status: "done", stageId: 1, projectId: 1 },
          { id: 2, name: "Разработать креативы", description: "3 варианта баннеров + видео", assignee: "Дима", deadline: "2026-03-25", status: "in_progress", stageId: 1, projectId: 1 },
          { id: 3, name: "Настроить UTM-метки", description: "UTM для всех каналов", assignee: "Никита", deadline: "2026-03-28", status: "todo", stageId: 1, projectId: 1 },
        ],
      },
      {
        id: 2,
        name: "Запуск",
        result: "Работающие кампании в 3 каналах",
        description: "Запуск и первичная оптимизация рекламных кампаний",
        deadline: "2026-05-15",
        projectId: 1,
        tasks: [
          { id: 4, name: "Запустить Яндекс.Директ", description: "Контекстная реклама", assignee: "Диана", deadline: "2026-04-10", status: "todo", stageId: 2, projectId: 1 },
          { id: 5, name: "Запустить VK Ads", description: "Таргетированная реклама", assignee: "Диана", deadline: "2026-04-20", status: "todo", stageId: 2, projectId: 1 },
        ],
      },
      {
        id: 3,
        name: "Анализ результатов",
        result: "Отчёт по эффективности с рекомендациями",
        description: "Сбор данных, анализ ROI, формирование отчёта",
        deadline: "2026-06-30",
        projectId: 1,
        tasks: [
          { id: 6, name: "Собрать данные по конверсиям", description: "Агрегация данных из всех каналов", assignee: "Никита", deadline: "2026-06-15", status: "todo", stageId: 3, projectId: 1 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Редизайн контент-стратегии",
    goal: "Повысить вовлечённость до 5% ER",
    description: "Пересмотр контент-плана, внедрение новых форматов и единого гайдлайна",
    deadline: "2026-04-30",
    priority: 2,
    responsible: "Дима",
    planItemId: null,
    stages: [
      {
        id: 4,
        name: "Аудит текущего контента",
        result: "Отчёт с рекомендациями по улучшению",
        description: "Анализ существующего контента и метрик",
        deadline: "2026-03-15",
        projectId: 2,
        tasks: [
          { id: 7, name: "Собрать статистику по постам", description: "ER, охваты, вовлечённость по каждому каналу", assignee: "Дима", deadline: "2026-03-10", status: "done", stageId: 4, projectId: 2 },
          { id: 8, name: "Определить топ-форматы", description: "Какие форматы работают лучше всего", assignee: "Дима", deadline: "2026-03-15", status: "in_progress", stageId: 4, projectId: 2 },
        ],
      },
      {
        id: 5,
        name: "Разработка нового контент-плана",
        result: "Утверждённый контент-план на Q2",
        description: "Новая стратегия с акцентом на видео и Stories",
        deadline: "2026-04-15",
        projectId: 2,
        tasks: [
          { id: 9, name: "Создать контент-план на апрель", description: "20+ постов с рубрикатором", assignee: "Дима", deadline: "2026-04-01", status: "todo", stageId: 5, projectId: 2 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Внедрение CRM-аналитики",
    goal: "Автоматизировать сквозную аналитику маркетинга",
    description: "Интеграция CRM с рекламными кабинетами и настройка дашбордов",
    deadline: "2026-05-31",
    priority: 3,
    responsible: "Никита",
    planItemId: null,
    stages: [
      {
        id: 6,
        name: "Интеграция",
        result: "Работающая связка CRM + рекламные кабинеты",
        description: "Техническая интеграция систем",
        deadline: "2026-04-30",
        projectId: 3,
        tasks: [
          { id: 10, name: "Настроить API-коннекторы", description: "Яндекс.Директ, VK, Google Ads", assignee: "Никита", deadline: "2026-04-15", status: "in_progress", stageId: 6, projectId: 3 },
          { id: 11, name: "Тестировать передачу данных", description: "Проверка корректности данных", assignee: "Никита", deadline: "2026-04-25", status: "todo", stageId: 6, projectId: 3 },
        ],
      },
    ],
  },
];

export const projectTaskStatusLabels: Record<ProjectTaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export const projectTaskStatusColors: Record<ProjectTaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};
