# Архитектура Marketing Dashboard

## Общая схема

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          КЛИЕНТ (Next.js 16)                           │
│                                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────────────┐  │
│  │  Login   │──▶│ AuthContext   │──▶│        AppContext               │  │
│  │  /login  │   │ (JWT cookie) │   │  (центральное хранилище)       │  │
│  └──────────┘   └──────────────┘   │                                │  │
│                                     │  projects[]    plans[]         │  │
│                                     │  expenses[]    channels[]      │  │
│                                     │  leads[]       departments[]   │  │
│                                     │  employees[]   stores[]        │  │
│                                     │  standaloneTasks[]             │  │
│                                     │  recurringTasks[]              │  │
│                                     │  productTypes[]                │  │
│                                     │  settings (averageCheck, ...)  │  │
│                                     └──────────┬─────────────────────┘  │
│                                                 │                       │
│                          useAppContext()         │  setState → useEffect │
│                    ┌────────────────────────────┬┘  → syncArray()       │
│                    ▼                            ▼                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      СТРАНИЦЫ / КОМПОНЕНТЫ                      │   │
│  │                                                                 │   │
│  │  /            → Дашборд (обзор, задачи, цели, календарь)       │   │
│  │  /projects    → Проекты, Все задачи, Текущие, Регулярные, Ганд │   │
│  │  /channels    → Каналы, статистика по направлениям              │   │
│  │  /leads       → Лиды (таблица + календарь)                     │   │
│  │  /expenses    → Расходы (таблица + импорт Excel)               │   │
│  │  /overview    → Аналитика (графики Recharts)                   │   │
│  │  /content     → Посты + Идеи                                   │   │
│  │  /stores      → Магазины                                       │   │
│  │  /products    → Типы товаров + Средний чек                     │   │
│  │  /plans       → Планы                                          │   │
│  │  /organization→ Структура (отделы, сотрудники, расписание)     │   │
│  │  /admin       → Управление пользователями                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP (fetch)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API ROUTES (Next.js)                             │
│                                                                         │
│  middleware.ts ── JWT проверка ── cookie "mkd_session"                  │
│                                                                         │
│  /api/auth/login    POST   → bcrypt verify → JWT sign → set cookie     │
│  /api/auth/logout   POST   → clear cookie                              │
│  /api/auth/me       GET    → verify JWT → return user                  │
│                                                                         │
│  /api/projects      GET/POST      ┐                                    │
│  /api/projects/[id] GET/PUT/DEL   ├─ Проекты + этапы + задачи         │
│  /api/projects/reorder POST       ┘                                    │
│                                                                         │
│  /api/plans         GET/POST      ┐                                    │
│  /api/plans/[id]    GET/PUT/DEL   ├─ Планы + пункты                   │
│  /api/plans/reorder POST          ┘                                    │
│                                                                         │
│  /api/channels      GET/POST      ── Каналы + задачи каналов          │
│  /api/leads         GET/POST      ── Лиды + product_type привязки     │
│  /api/expenses      GET/POST      ── Расходы                          │
│  /api/departments   GET           ── Отделы + цели + задачи           │
│  /api/employees     GET/POST      ── Сотрудники + расписание          │
│  /api/standalone-tasks GET/POST   ── Текущие задачи                   │
│  /api/recurring-tasks  GET/POST   ── Регулярные задачи                │
│  /api/stores        GET/POST      ── Магазины                         │
│  /api/product-types GET/POST      ── Типы товаров                     │
│  /api/settings      GET/PUT       ── Настройки                        │
│  /api/posts         GET/POST      ── Посты                            │
│  /api/ideas         GET/POST      ── Идеи                             │
│  /api/users         GET/POST      ── Пользователи (admin)             │
│  /api/chat          POST          ── AI-ассистент (OpenAI)            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ mysql2/promise
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MySQL 8.0                                      │
│                                                                         │
│  auto-migrate.ts → CREATE TABLE IF NOT EXISTS + ensureColumn            │
│  init-db.sql     → Начальная структура                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Иерархия данных

```
Plan (План)
├── PlanItem (Этап плана)  ◄── planItemId
│   └── Project (Проект)
│       ├── Stage (Этап проекта)
│       │   └── ProjectTask (Задача проекта)
│       └── Expense (Расход)
│
Channel (Канал: digital / offline / loyalty)
├── ChannelTask (Задача канала)
├── Lead (Лид)
│   └── ProductType[] (Типы товаров — M:N)
├── StandaloneTask (Текущая задача)
└── RecurringTask (Регулярная задача)
│
Department (Отдел: management / ads / content / tech)
├── Goal (Цель отдела)
├── Task (Задача отдела)
└── Employee (Сотрудник)
    └── ScheduleDay (Расписание)
│
Store (Магазин)
│
Post (Пост)         Idea (Идея)
│
User (Пользователь: admin / manager / viewer)
│
Settings (averageCheck, monthlyLeadPlan, monthlyBudget, taxCoefficient)
```

---

## Поток данных

```
                    ┌──────────────────┐
                    │   Загрузка App   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  GET /api/auth/me│
                    └────────┬─────────┘
                             │
                 ┌───────────▼────────────┐
                 │   12 параллельных GET   │
                 │   /api/projects         │
                 │   /api/plans            │
                 │   /api/channels         │
                 │   /api/leads            │ ──▶ useState() для каждой
                 │   /api/expenses         │     сущности
                 │   /api/departments      │
                 │   /api/employees        │
                 │   /api/standalone-tasks │
                 │   /api/recurring-tasks  │
                 │   /api/stores           │
                 │   /api/product-types    │
                 │   /api/settings         │
                 └───────────┬─────────────┘
                             │
                    ┌────────▼─────────┐
                    │ dataLoaded=true   │
                    │ Рендер страниц   │
                    └──────────────────┘
```

```
  Пользователь меняет данные
           │
  ┌────────▼─────────┐
  │  setState(new)    │   Компонент вызывает setProjects / setLeads / ...
  └────────┬─────────┘
           │
  ┌────────▼──────────────────────────────┐
  │  useEffect → сравнение prev vs new    │
  │                                        │
  │  Новые элементы  → POST /api/...      │
  │  Изменённые      → PUT  /api/.../id   │
  │  Удалённые       → DELETE /api/.../id │
  │                                        │
  │  prevRef = current                     │
  └────────────────────────────────────────┘
```

---

## Страница «Проекты» — детальная схема

```
ProjectsDashboard
│
├── Вкладка "Проекты"
│   ├── PlanBlock (план)
│   │   └── PlanItemBlock (этап плана)
│   │       └── CompactProjectCard (связанные проекты)
│   └── SortableProjectCard (проекты без плана, drag & drop)
│       └── StageCard → ProjectTaskRow
│
├── Вкладка "Все задачи"
│   └── AllTasksTab (фильтры, сортировка, поиск)
│       ├── ProjectTask → ProjectTaskEditModal (✏️ редактирование)
│       └── StandaloneTask → StandaloneTaskModal (✏️ редактирование)
│
├── Вкладка "Текущие задачи" (дашборд на сегодня)
│   └── StandaloneTasksTab
│       ├── Проектные задачи (дедлайн = сегодня)
│       │   └── [Проект] [Этап плана] [Этап проекта]
│       ├── Текущие задачи (дедлайн = сегодня)
│       └── Регулярные задачи (generateInstances)
│
├── Вкладка "Регулярные"
│   └── RecurringTasksTab (CRUD регулярных задач)
│
└── Вкладка "Календарь"
    └── ProjectsCalendarTab
        ├── Месячный вид с drag & drop
        └── Ганд-диаграмма (GanttChart)
```

---

## Аутентификация

```
  /login                                     Middleware
  ┌──────────┐     POST /api/auth/login     ┌─────────────────────┐
  │ username │────▶ bcrypt.compare() ────▶  │ Каждый запрос:      │
  │ password │     JWT sign (7 дней)        │                     │
  └──────────┘     Set-Cookie: mkd_session  │ cookie есть?        │
                                             │ ├─ Нет → 401/login │
  Роли:                                      │ └─ Да → verify JWT │
  ┌─────────┬────────────────────────┐      │     ├─ OK → next() │
  │ admin   │ Полный доступ          │      │     └─ Err → 401   │
  │ manager │ CRUD всех данных       │      └─────────────────────┘
  │ viewer  │ Только чтение          │
  └─────────┴────────────────────────┘
```

---

## Docker деплой

```
docker-compose.yml
│
├── db (MySQL 8.0)
│   ├── init-db.sql → начальная структура
│   ├── Volume: mysql_data
│   └── Healthcheck: mysqladmin ping
│
└── app (Next.js)
    ├── Dockerfile: node:20-alpine
    │   ├── Stage 1: npm ci (deps)
    │   ├── Stage 2: next build --webpack
    │   └── Stage 3: node server.js (standalone)
    ├── Порт: 127.0.0.1:3000
    └── depends_on: db (healthy)
```
