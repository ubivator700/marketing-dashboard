import type { Department, TeamMember } from "@/types/dashboard";

interface StructureTabProps {
  departments: Department[];
  teamMembers: TeamMember[];
}

export default function StructureTab({
  departments,
  teamMembers,
}: StructureTabProps) {
  return (
    <div className="space-y-8">
      {/* Mission */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center shadow-lg">
        <p className="text-xs uppercase tracking-widest opacity-80 mb-2">
          Миссия отдела
        </p>
        <h2 className="text-xl font-bold">
          Привлечение заявок (лидов, покупателей)
        </h2>
        <h2 className="text-xl font-bold">
          и формирование имиджа компании
        </h2>
      </div>

      {/* Org tree */}
      <div className="flex flex-col items-center">
        {/* Top: Management */}
        <div className="bg-white rounded-xl p-5 shadow-md border-2 border-indigo-500 max-w-sm w-full text-center">
          <span className="text-3xl">{"\u{1F451}"}</span>
          <h3 className="font-bold text-gray-900 mt-2">
            Руководство / Маркетинг
          </h3>
          <p className="text-indigo-600 font-medium text-sm">Никита</p>
          <p className="text-xs text-gray-500 mt-1">
            Стратегия · Анализ · Управление · УТП · Планы
          </p>
        </div>

        {/* Connector line */}
        <div className="w-0.5 h-8 bg-gray-300" />

        {/* Horizontal connector */}
        <div className="relative w-full max-w-3xl">
          <div
            className="absolute top-0 left-1/6 right-1/6 h-0.5 bg-gray-300"
            style={{ left: "16.6%", right: "16.6%" }}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departments.slice(1).map((dept) => (
              <div key={dept.id} className="flex flex-col items-center">
                <div className="w-0.5 h-8 bg-gray-300" />
                <div
                  className="bg-white rounded-xl p-4 shadow-sm border-2 w-full text-center"
                  style={{ borderColor: dept.color }}
                >
                  <span className="text-2xl">{dept.icon}</span>
                  <h4 className="font-semibold text-gray-900 text-sm mt-2">
                    {dept.name}
                  </h4>
                  <p
                    className="font-medium text-sm mt-1"
                    style={{ color: dept.color }}
                  >
                    {dept.person}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dept.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team summary */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">
          Распределение ответственности
        </h3>
        <div className="space-y-3">
          {teamMembers.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: p.color }}
              >
                {p.name[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.roles.join(" · ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
