import type { ChatCompletionTool } from "openai/resources/chat/completions";

// ─── Tool definitions for OpenAI function calling ────────────────

export const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_leads",
      description:
        "Получить список лидов с фильтрами. Возвращает массив лидов и общее количество. Используй для анализа заявок, конверсий и подсчёта лидов за период.",
      parameters: {
        type: "object",
        properties: {
          channelId: { type: "number", description: "ID канала для фильтрации" },
          dateFrom: { type: "string", description: "Дата начала периода (YYYY-MM-DD)" },
          dateTo: { type: "string", description: "Дата конца периода (YYYY-MM-DD)" },
          result: {
            type: "string",
            enum: ["measurement", "sale", "deferred"],
            description: "Результат лида: measurement (замер), sale (продажа), deferred (отложен)",
          },
          contactMethod: {
            type: "string",
            enum: ["salon", "phone", "social", "old_request"],
            description: "Способ контакта: salon (салон), phone (телефон), social (соцсети), old_request (старая заявка)",
          },
          storeId: { type: "number", description: "ID торговой точки (магазина) для фильтрации" },
          productTypeId: { type: "number", description: "ID типа товара для фильтрации" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expenses",
      description: "Получить список расходов с фильтрами. Возвращает расходы и суммы.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "number", description: "ID проекта" },
          channelId: { type: "number", description: "ID канала" },
          dateFrom: { type: "string", description: "Дата начала (YYYY-MM-DD)" },
          dateTo: { type: "string", description: "Дата конца (YYYY-MM-DD)" },
          storeId: { type: "number", description: "ID торговой точки (магазина)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_channel_stats",
      description:
        "Получить агрегированную статистику по каналу: количество лидов, результативных лидов, расходы и стоимость привлечения лида. Можно указать период.",
      parameters: {
        type: "object",
        properties: {
          channelId: { type: "number", description: "ID канала" },
          dateFrom: { type: "string", description: "Дата начала (YYYY-MM-DD)" },
          dateTo: { type: "string", description: "Дата конца (YYYY-MM-DD)" },
          storeId: { type: "number", description: "ID торговой точки (магазина)" },
          productTypeId: { type: "number", description: "ID типа товара для фильтрации" },
        },
        required: ["channelId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_monthly_comparison",
      description:
        "Сравнить метрику за два месяца. Возвращает значения за каждый месяц и процент изменения. Используй для вопросов вроде 'на сколько процентов выросли лиды'.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["leads", "expenses", "profitable_leads"],
            description: "Метрика: leads (все лиды), profitable_leads (результативные), expenses (расходы)",
          },
          month1: { type: "string", description: "Первый месяц (YYYY-MM)" },
          month2: { type: "string", description: "Второй месяц (YYYY-MM)" },
          channelId: { type: "number", description: "ID канала (опционально, для фильтрации)" },
          storeId: { type: "number", description: "ID торговой точки (опционально)" },
          productTypeId: { type: "number", description: "ID типа товара (опционально)" },
        },
        required: ["metric", "month1", "month2"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_department_tasks",
      description: "Получить задачи конкретного отдела с их статусами и приоритетами.",
      parameters: {
        type: "object",
        properties: {
          departmentId: {
            type: "string",
            enum: ["management", "ads", "content", "tech"],
            description: "ID отдела",
          },
        },
        required: ["departmentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_details",
      description: "Получить полную информацию о проекте: стадии, задачи, дедлайны, прогресс.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "number", description: "ID проекта" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_standalone_tasks",
      description: "Получить самостоятельные задачи (не привязанные к проектам).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["todo", "in_progress", "done"], description: "Фильтр по статусу" },
          assignee: { type: "string", description: "Фильтр по исполнителю" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_posts_and_ideas",
      description: "Получить посты и идеи для контент-маркетинга.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["posts", "ideas", "all"], description: "Тип контента (по умолчанию all)" },
          status: { type: "string", description: "Фильтр по статусу (proposed/approved для постов, new/in_progress/approved/rejected для идей)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_excel_report",
      description:
        "Сгенерировать Excel-отчёт с указанными данными. Верни данные в виде массива строк (rows). Каждая строка — массив значений ячеек.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Название файла (без .xlsx)" },
          sheets: {
            type: "array",
            description: "Листы в Excel-файле",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Название листа" },
                columns: {
                  type: "array",
                  items: { type: "string" },
                  description: "Заголовки колонок",
                },
                rows: {
                  type: "array",
                  items: { type: "array", items: {} },
                  description: "Данные: массив строк, каждая строка — массив значений",
                },
              },
              required: ["name", "columns", "rows"],
            },
          },
        },
        required: ["filename", "sheets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description:
        "Помочь пользователю найти нужный раздел дашборда. Верни путь и описание того, что там можно найти.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["dashboard", "overview", "projects", "content", "channels", "leads", "expenses", "stores", "products", "organization", "admin"],
            description: "Страница дашборда",
          },
        },
        required: ["page"],
      },
    },
  },
];
