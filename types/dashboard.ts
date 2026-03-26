export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type DepartmentId = "management" | "ads" | "content" | "tech";
export type TabId = "overview" | "goals" | "tasks" | "calendar" | "board" | "structure";

export type DayType = "work" | "dayoff" | "vacation";

export interface ScheduleDay {
  date: string; // "YYYY-MM-DD"
  type: DayType;
}

export type EmployeePosition = "Маркетолог" | "Дизайнер" | "Контент-менеджер" | "Руководитель" | string;

export interface Employee {
  name: string;
  departmentId: DepartmentId;
  roles: string[];
  color: string;
  position?: EmployeePosition;
  schedule: ScheduleDay[];
}

export interface Goal {
  id: number;
  text: string;
  progress: number;
  kpi: string;
}

export interface Task {
  id: number;
  text: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  startDate?: string;
  dueTime?: string;   // "HH:MM" format, e.g. "09:00"
  duration?: number;   // duration in minutes, e.g. 60
}

export interface Department {
  id: DepartmentId;
  name: string;
  person: string;
  color: string;
  icon: string;
  description: string;
  goals: Goal[];
  tasks: Task[];
}

export interface DashboardData {
  departments: Department[];
}

export interface TaskWithDepartment extends Task {
  dept: Department;
}

export interface BarChartDataItem {
  name: string;
  dept: string;
  progress: number;
  color: string;
}

export interface PieChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface StatItem {
  label: string;
  value: string | number;
  accent: string;
}

export interface TabDefinition {
  id: TabId;
  label: string;
}

export interface TeamMember {
  name: string;
  roles: string[];
  color: string;
}

// ─── Project Management ───────────────────────────────────────────

export type ProjectTaskStatus = "todo" | "in_progress" | "done";

export interface ProjectTask {
  id: number;
  name: string;
  description: string;
  assignee: string;
  startDate?: string;  // "YYYY-MM-DD"
  deadline: string;
  dueTime?: string;   // "HH:MM" — time-of-day for calendar placement
  duration?: number;   // minutes
  status: ProjectTaskStatus;
  stageId: number;
  projectId: number;
  cancelled?: boolean;
}

export interface Stage {
  id: number;
  name: string;
  result: string;
  description: string;
  startDate?: string;  // "YYYY-MM-DD"
  deadline: string;
  projectId: number;
  priority?: number;
  cancelled?: boolean;
  tasks: ProjectTask[];
}

export interface Project {
  id: number;
  name: string;
  goal: string;
  description: string;
  startDate?: string;
  deadline: string;
  priority: number;
  responsible?: string;
  planItemId: number | null;
  cancelled?: boolean;
  stages: Stage[];
}

// ─── Plans (Plan > PlanItem > Project hierarchy) ─────────────────

export interface PlanItem {
  id: number;
  name: string;
  result: string;
  startDate?: string;
  deadline: string;
  responsible: string;
  color: string;
  sortOrder: number;
  planId: number;
  cancelled?: boolean;
}

export interface Plan {
  id: number;
  name: string;
  startDate?: string;
  deadline: string;
  sortOrder: number;
  cancelled?: boolean;
  items: PlanItem[];
}

// ─── Expenses ─────────────────────────────────────────────────────

export interface Expense {
  id: number;
  name: string;
  amount: number;
  responsible: string;
  date: string; // "YYYY-MM-DD"
  projectId: number | null;
  channelId: number | null;
  storeId: number | null;
}

// ─── Stores (торговые точки) ────────────────────────────────────

export interface Store {
  id: number;
  name: string;
  tbu: number; // точка безубыточности (₽)
}

// ─── Product Types (типы товаров) ──────────────────────────────

export type ProductCategory = "doors" | "windows" | "floors" | "other";

export interface ProductType {
  id: number;
  name: string;
  category: ProductCategory;
  avgCheck: number;
  avgMarkup: number;
}

// ─── Channels & Leads ────────────────────────────────────────────

export type ChannelGroup = "loyalty" | "digital" | "offline";

export interface ChannelTask {
  id: number;
  text: string;
  done: boolean;
  deadline?: string;
}

export interface Channel {
  id: number;
  name: string;
  group: ChannelGroup;
  tasks: ChannelTask[];
}

export type ContactMethod = "salon" | "phone" | "social" | "old_request";
export type LeadResult = "measurement" | "sale" | "deferred";

export interface Lead {
  id: number;
  name: string;
  channelId: number;
  contactMethod: ContactMethod;
  result: LeadResult;
  date: string;
  note?: string;
  storeId: number | null;
  productTypeIds: number[];
}

// ─── Standalone Tasks (not tied to projects) ────────────────────

export type StandaloneTaskStatus = "todo" | "in_progress" | "done";

export interface StandaloneTask {
  id: number;
  name: string;
  description: string;
  assignee: string;
  deadline: string;
  dueTime?: string;
  duration?: number;
  status: StandaloneTaskStatus;
  channelId: number | null;
}

// ─── Content (Posts & Ideas) ─────────────────────────────────────

export type PostProduct = "windows" | "balconies" | "entrance_doors" | "interior_doors" | "flooring" | "other";
export type PostStatus = "proposed" | "approved";
export type IdeaStatus = "new" | "in_progress" | "approved" | "rejected";

export interface Post {
  id: number;
  title: string;
  text: string;
  topic: string;
  product: PostProduct;
  status: PostStatus;
  photoUrl: string | null;
  date: string;
}

export interface Idea {
  id: number;
  title: string;
  description: string;
  status: IdeaStatus;
  date: string;
}

// ─── Recurring Tasks ─────────────────────────────────────────────

export type RecurrenceType = "daily" | "weekly" | "monthly";
export type RecurringTaskStatus = "active" | "paused";

export interface RecurringTask {
  id: number;
  name: string;
  description: string;
  assignee: string;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;  // every N days/weeks/months
  recurrenceDays: string;      // "0,2,4" for weekly (Mon,Wed,Fri); "15" for monthly (day of month); "" for daily
  channelId: number | null;
  dueTime?: string;            // "HH:MM"
  duration?: number;           // minutes
  status: RecurringTaskStatus;
}

// ─── Design Orders ───────────────────────────────────────────────

export type DesignOrderStatus = "new" | "accepted" | "rejected";

export interface DesignOrderAttachment {
  id: number;
  orderId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
}

export interface DesignOrder {
  id: number;
  title: string;
  description: string;
  author: string;
  status: DesignOrderStatus;
  createdAt: string; // ISO datetime
  acceptedBy: string | null;
  taskId: number | null;
  attachments: DesignOrderAttachment[];
}

// ─── Navigation ───────────────────────────────────────────────────

export type PageId = "dashboard" | "projects" | "expenses" | "channels" | "leads" | "organization" | "overview" | "content" | "stores" | "products" | "orders";

export interface PageDefinition {
  id: PageId;
  label: string;
  href: string;
  icon: string;
}
