"use client";

import type { Store } from "@/types/dashboard";

interface StoreFilterProps {
  stores: Store[];
  selectedStoreId: number | null;
  onSelect: (storeId: number | null) => void;
}

export default function StoreFilter({ stores, selectedStoreId, onSelect }: StoreFilterProps) {
  if (stores.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          selectedStoreId === null
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        Все точки
      </button>
      {stores.map((store) => (
        <button
          key={store.id}
          onClick={() => onSelect(store.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedStoreId === store.id
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {store.name}
        </button>
      ))}
    </div>
  );
}
