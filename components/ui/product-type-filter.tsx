"use client";

import type { ProductType } from "@/types/dashboard";

interface ProductTypeFilterProps {
  productTypes: ProductType[];
  selectedProductTypeId: number | null;
  onSelect: (productTypeId: number | null) => void;
}

export default function ProductTypeFilter({ productTypes, selectedProductTypeId, onSelect }: ProductTypeFilterProps) {
  if (productTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          selectedProductTypeId === null
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        Все товары
      </button>
      {productTypes.map((pt) => (
        <button
          key={pt.id}
          onClick={() => onSelect(pt.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedProductTypeId === pt.id
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {pt.name}
        </button>
      ))}
    </div>
  );
}
