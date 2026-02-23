import type { Expense } from "@/types/dashboard";

export function addExpense(expenses: Expense[], expense: Expense): Expense[] {
  return [...expenses, expense];
}

export function updateExpense(
  expenses: Expense[],
  expenseId: number,
  updates: Partial<Omit<Expense, "id">>
): Expense[] {
  return expenses.map((e) =>
    e.id !== expenseId ? e : { ...e, ...updates }
  );
}

export function deleteExpense(expenses: Expense[], expenseId: number): Expense[] {
  return expenses.filter((e) => e.id !== expenseId);
}

export function totalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function expensesByProject(expenses: Expense[], projectId: number): Expense[] {
  return expenses.filter((e) => e.projectId === projectId);
}

export function totalExpensesForProject(expenses: Expense[], projectId: number): number {
  return expensesByProject(expenses, projectId).reduce((sum, e) => sum + e.amount, 0);
}

export function expensesByChannel(expenses: Expense[], channelId: number): Expense[] {
  return expenses.filter((e) => e.channelId === channelId);
}

export function totalExpensesForChannel(expenses: Expense[], channelId: number): number {
  return expensesByChannel(expenses, channelId).reduce((sum, e) => sum + e.amount, 0);
}
