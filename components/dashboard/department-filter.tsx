"use client";

import type { Department, DepartmentId } from "@/types/dashboard";

interface DepartmentFilterProps {
  departments: Department[];
  selectedDept: DepartmentId | null;
  onSelect: (deptId: DepartmentId | null) => void;
  allLabel?: string;
}

export default function DepartmentFilter({
  departments,
  selectedDept,
  onSelect,
  allLabel = "Все подотделы",
}: DepartmentFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          !selectedDept
            ? "bg-indigo-600 text-white"
            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
        }`}
      >
        {allLabel}
      </button>
      {departments.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            selectedDept === d.id
              ? "text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
          style={selectedDept === d.id ? { backgroundColor: d.color } : {}}
        >
          {d.icon} {d.person}
        </button>
      ))}
    </div>
  );
}
