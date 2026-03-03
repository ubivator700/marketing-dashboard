"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────

interface PlanCard {
  id: number;
  text: string;
}

interface PlanSubSection {
  id: number;
  title: string;
  cards: PlanCard[];
}

interface PlanSection {
  id: number;
  title: string;
  color: string; // "blue" | "rose" | "emerald" | "amber" | "violet" | "cyan"
  cards: PlanCard[];
  subSections: PlanSubSection[];
}

// ─── Color palette ──────────────────────────────────────────────────

const COLORS: Record<
  string,
  {
    headerBg: string;
    headerText: string;
    sectionBg: string;
    sectionBorder: string;
    cardBg: string;
    cardBorder: string;
    cardHover: string;
    accent: string;
    subHeaderBg: string;
    subHeaderText: string;
  }
> = {
  blue: {
    headerBg: "bg-blue-500",
    headerText: "text-white",
    sectionBg: "bg-blue-50/40",
    sectionBorder: "border-blue-200",
    cardBg: "bg-white",
    cardBorder: "border-blue-100",
    cardHover: "hover:border-blue-300 hover:shadow-md",
    accent: "#3b82f6",
    subHeaderBg: "bg-blue-100",
    subHeaderText: "text-blue-800",
  },
  rose: {
    headerBg: "bg-rose-500",
    headerText: "text-white",
    sectionBg: "bg-rose-50/40",
    sectionBorder: "border-rose-200",
    cardBg: "bg-white",
    cardBorder: "border-rose-100",
    cardHover: "hover:border-rose-300 hover:shadow-md",
    accent: "#f43f5e",
    subHeaderBg: "bg-rose-100",
    subHeaderText: "text-rose-800",
  },
  emerald: {
    headerBg: "bg-emerald-500",
    headerText: "text-white",
    sectionBg: "bg-emerald-50/40",
    sectionBorder: "border-emerald-200",
    cardBg: "bg-white",
    cardBorder: "border-emerald-100",
    cardHover: "hover:border-emerald-300 hover:shadow-md",
    accent: "#10b981",
    subHeaderBg: "bg-emerald-100",
    subHeaderText: "text-emerald-800",
  },
  amber: {
    headerBg: "bg-amber-500",
    headerText: "text-white",
    sectionBg: "bg-amber-50/40",
    sectionBorder: "border-amber-200",
    cardBg: "bg-white",
    cardBorder: "border-amber-100",
    cardHover: "hover:border-amber-300 hover:shadow-md",
    accent: "#f59e0b",
    subHeaderBg: "bg-amber-100",
    subHeaderText: "text-amber-800",
  },
  violet: {
    headerBg: "bg-violet-500",
    headerText: "text-white",
    sectionBg: "bg-violet-50/40",
    sectionBorder: "border-violet-200",
    cardBg: "bg-white",
    cardBorder: "border-violet-100",
    cardHover: "hover:border-violet-300 hover:shadow-md",
    accent: "#8b5cf6",
    subHeaderBg: "bg-violet-100",
    subHeaderText: "text-violet-800",
  },
  cyan: {
    headerBg: "bg-cyan-500",
    headerText: "text-white",
    sectionBg: "bg-cyan-50/40",
    sectionBorder: "border-cyan-200",
    cardBg: "bg-white",
    cardBorder: "border-cyan-100",
    cardHover: "hover:border-cyan-300 hover:shadow-md",
    accent: "#06b6d4",
    subHeaderBg: "bg-cyan-100",
    subHeaderText: "text-cyan-800",
  },
};

const COLOR_OPTIONS = Object.keys(COLORS);

// ─── Initial data from the plan image ───────────────────────────────

const INITIAL_SECTIONS: PlanSection[] = [
  {
    id: 1,
    title: "Сбор статистики / Аналитика",
    color: "blue",
    cards: [
      { id: 1, text: "Установить в салонах ИИ видеонаблюдение" },
      {
        id: 2,
        text: "Собирать и анализировать отчёты по РСЯ(сам или с Анной) раз в неделю. По каким заголовкам чаще переходят и т. д.",
      },
      {
        id: 3,
        text: "Вместо бланка по работе с клиентами дать менеджерам наш дашборд",
      },
      {
        id: 4,
        text: "Сделать приложение для менеджеров по продажам(по примеру таблиц эксель) и интегрировать с рекламным дашбордом",
      },
    ],
    subSections: [],
  },
  {
    id: 2,
    title: "Разработка УТП",
    color: "rose",
    cards: [
      {
        id: 5,
        text: 'Разработать список "Халявных" УТП с жёсткими условиями(как у Русдверь)',
      },
      {
        id: 6,
        text: "Разработать несколько Акций стимулирующих ап-сейл и кросс сейл",
      },
      {
        id: 7,
        text: "Детская защита в подарок. Сгенерировать пару макетов, детально продумать механику",
      },
      {
        id: 8,
        text: "Бесплатная диагностика окон(тепловизор, шумомер)",
      },
    ],
    subSections: [],
  },
  {
    id: 3,
    title: "Рекламные каналы",
    color: "rose",
    cards: [],
    subSections: [
      {
        id: 1,
        title: "Сайт/РСЯ",
        cards: [
          {
            id: 9,
            text: "Сделать рекламные объявления и баннеры на сайте с новыми УТП",
          },
          {
            id: 10,
            text: "Сделать анимированную главную страницу с закрытием на отправку формы",
          },
          {
            id: 11,
            text: "Добавить больше маркетинговых блоков(по примеру русдверь и москона)",
          },
        ],
      },
      {
        id: 2,
        title: "Вконтакте",
        cards: [
          {
            id: 12,
            text: 'Собрать актуальную информацию по таргету ВК. Запустить рекламную кампанию на ограниченном бюджете с "халявными" УТП',
          },
          { id: 13, text: "Попробовать ИИ в настройке таргета" },
          { id: 14, text: "Продолжается постинг/накрутка лайков" },
          {
            id: 15,
            text: "Провести эксклюзивную акцию со скидкой/подарком",
          },
        ],
      },
      {
        id: 3,
        title: "Телеграм",
        cards: [
          {
            id: 16,
            text: "Рекламироваться в новостных пабликах с халявными УТП(хорошо заходили МК двери)",
          },
          { id: 17, text: "Продолжается постинг/накрутка лайков" },
          {
            id: 18,
            text: "Провести эксклюзивную акцию со скидкой/подарком",
          },
        ],
      },
      {
        id: 4,
        title: "Одноклассники",
        cards: [
          {
            id: 19,
            text: 'Запустить таргет на ограниченном бюджете с "Халявными" УТП',
          },
          { id: 20, text: "Продолжается постинг/накрутка лайков" },
        ],
      },
      {
        id: 5,
        title: "Авито",
        cards: [
          {
            id: 21,
            text: "Найти хорошее(проверенное) обучение по лидогенерации в авито",
          },
          {
            id: 22,
            text: "Разместить на авито весь наш каталог дверей",
          },
        ],
      },
      {
        id: 6,
        title: "Расклейка",
        cards: [
          {
            id: 23,
            text: "Адаптировать новые УТП в стиле старых макетов(Ярко красные) в формате А4",
          },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Поиск новых каналов",
    color: "amber",
    cards: [
      { id: 24, text: "Попробовать рекламу в супермаркетах" },
      { id: 25, text: "Инстаграм?" },
    ],
    subSections: [],
  },
  {
    id: 5,
    title: "Лояльность (LTV)",
    color: "emerald",
    cards: [
      {
        id: 26,
        text: 'Продумать и ввести акцию "Приведи друга - получи подарок/скидку"',
      },
      { id: 27, text: "Ввести скидки для постоянных клиентов" },
      {
        id: 28,
        text: "Продумать и ввести систему регулярных прозвонов",
      },
    ],
    subSections: [],
  },
];

const STORAGE_KEY = "marketing-plan-board";

// ─── ID generator ───────────────────────────────────────────────────

let _nextId = 100;
function genId(): number {
  return _nextId++ + Date.now();
}

// ─── Component ──────────────────────────────────────────────────────

export default function PlansDashboard() {
  const [sections, setSections] = useState<PlanSection[]>(INITIAL_SECTIONS);
  const [loaded, setLoaded] = useState(false);

  // Editing state
  const [editingCardKey, setEditingCardKey] = useState<string | null>(null);
  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);
  const titleEditRef = useRef<HTMLInputElement>(null);

  // Color picker
  const [colorPickerSection, setColorPickerSection] = useState<number | null>(null);

  // ─── Load from localStorage ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PlanSection[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSections(parsed);
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // ─── Save to localStorage ───
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    }
  }, [sections, loaded]);

  // ─── Focus edit field ───
  useEffect(() => {
    if (editingCardKey && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(
        editRef.current.value.length,
        editRef.current.value.length
      );
    }
  }, [editingCardKey]);

  useEffect(() => {
    if (editingTitleKey && titleEditRef.current) {
      titleEditRef.current.focus();
      titleEditRef.current.select();
    }
  }, [editingTitleKey]);

  // ─── Card CRUD ───
  const startEditCard = useCallback(
    (key: string, text: string) => {
      setEditingCardKey(key);
      setEditText(text);
    },
    []
  );

  const saveCard = useCallback(() => {
    if (!editingCardKey) return;
    const trimmed = editText.trim();

    setSections((prev) =>
      prev.map((section) => {
        // Check direct cards
        const updatedCards = section.cards.map((card) => {
          if (`s${section.id}-c${card.id}` === editingCardKey) {
            return { ...card, text: trimmed || card.text };
          }
          return card;
        });

        // Check sub-section cards
        const updatedSubs = section.subSections.map((sub) => ({
          ...sub,
          cards: sub.cards.map((card) => {
            if (`s${section.id}-ss${sub.id}-c${card.id}` === editingCardKey) {
              return { ...card, text: trimmed || card.text };
            }
            return card;
          }),
        }));

        return { ...section, cards: updatedCards, subSections: updatedSubs };
      })
    );

    setEditingCardKey(null);
    setEditText("");
  }, [editingCardKey, editText]);

  const cancelEdit = useCallback(() => {
    setEditingCardKey(null);
    setEditText("");
  }, []);

  const addCard = useCallback(
    (sectionId: number, subSectionId?: number) => {
      const newCard: PlanCard = { id: genId(), text: "Новая задача" };
      setSections((prev) =>
        prev.map((section) => {
          if (section.id !== sectionId) return section;
          if (subSectionId != null) {
            return {
              ...section,
              subSections: section.subSections.map((sub) =>
                sub.id === subSectionId
                  ? { ...sub, cards: [...sub.cards, newCard] }
                  : sub
              ),
            };
          }
          return { ...section, cards: [...section.cards, newCard] };
        })
      );
      // Start editing the new card
      const key = subSectionId != null
        ? `s${sectionId}-ss${subSectionId}-c${newCard.id}`
        : `s${sectionId}-c${newCard.id}`;
      setTimeout(() => startEditCard(key, ""), 50);
    },
    [startEditCard]
  );

  const deleteCard = useCallback(
    (sectionId: number, cardId: number, subSectionId?: number) => {
      setSections((prev) =>
        prev.map((section) => {
          if (section.id !== sectionId) return section;
          if (subSectionId != null) {
            return {
              ...section,
              subSections: section.subSections.map((sub) =>
                sub.id === subSectionId
                  ? { ...sub, cards: sub.cards.filter((c) => c.id !== cardId) }
                  : sub
              ),
            };
          }
          return {
            ...section,
            cards: section.cards.filter((c) => c.id !== cardId),
          };
        })
      );
    },
    []
  );

  // ─── Section CRUD ───
  const startEditTitle = useCallback(
    (key: string, text: string) => {
      setEditingTitleKey(key);
      setEditText(text);
    },
    []
  );

  const saveTitle = useCallback(() => {
    if (!editingTitleKey) return;
    const trimmed = editText.trim();

    setSections((prev) =>
      prev.map((section) => {
        if (`title-s${section.id}` === editingTitleKey) {
          return { ...section, title: trimmed || section.title };
        }
        // Sub-section titles
        return {
          ...section,
          subSections: section.subSections.map((sub) => {
            if (`title-s${section.id}-ss${sub.id}` === editingTitleKey) {
              return { ...sub, title: trimmed || sub.title };
            }
            return sub;
          }),
        };
      })
    );

    setEditingTitleKey(null);
    setEditText("");
  }, [editingTitleKey, editText]);

  const addSection = useCallback(() => {
    const newSection: PlanSection = {
      id: genId(),
      title: "Новый раздел",
      color: COLOR_OPTIONS[sections.length % COLOR_OPTIONS.length],
      cards: [],
      subSections: [],
    };
    setSections((prev) => [...prev, newSection]);
    setTimeout(
      () => startEditTitle(`title-s${newSection.id}`, ""),
      50
    );
  }, [sections.length, startEditTitle]);

  const deleteSection = useCallback((sectionId: number) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const addSubSection = useCallback((sectionId: number) => {
    const newSub: PlanSubSection = {
      id: genId(),
      title: "Новый подраздел",
      cards: [],
    };
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, subSections: [...section.subSections, newSub] }
          : section
      )
    );
  }, []);

  const deleteSubSection = useCallback(
    (sectionId: number, subId: number) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                subSections: section.subSections.filter(
                  (s) => s.id !== subId
                ),
              }
            : section
        )
      );
    },
    []
  );

  const changeSectionColor = useCallback(
    (sectionId: number, color: string) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, color } : s))
      );
      setColorPickerSection(null);
    },
    []
  );

  const resetBoard = useCallback(() => {
    setSections(INITIAL_SECTIONS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ─── Render: Card ───
  function renderCard(
    card: PlanCard,
    sectionId: number,
    colors: (typeof COLORS)[string],
    subSectionId?: number
  ) {
    const cardKey =
      subSectionId != null
        ? `s${sectionId}-ss${subSectionId}-c${card.id}`
        : `s${sectionId}-c${card.id}`;
    const isEditing = editingCardKey === cardKey;

    return (
      <div
        key={card.id}
        className={`group/card relative rounded-lg border transition-all duration-200 ${colors.cardBg} ${colors.cardBorder} ${
          isEditing ? "ring-2 ring-indigo-400 shadow-lg" : colors.cardHover
        }`}
        style={{
          borderLeftWidth: "3px",
          borderLeftColor: colors.accent,
        }}
      >
        {isEditing ? (
          <div className="p-2">
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveCard}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveCard();
                }
                if (e.key === "Escape") cancelEdit();
              }}
              className="w-full text-sm text-gray-800 bg-transparent border-none outline-none resize-none min-h-[40px]"
              rows={3}
            />
          </div>
        ) : (
          <div
            className="px-3 py-2.5 cursor-pointer"
            onClick={() => startEditCard(cardKey, card.text)}
          >
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {card.text}
            </p>
          </div>
        )}

        {/* Delete button */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteCard(sectionId, card.id, subSectionId);
            }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-200/0 text-gray-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-xs opacity-0 group-hover/card:opacity-100 transition-all"
            title="Удалить"
          >
            {"\u00D7"}
          </button>
        )}
      </div>
    );
  }

  // ─── Render: SubSection ───
  function renderSubSection(
    sub: PlanSubSection,
    sectionId: number,
    colors: (typeof COLORS)[string]
  ) {
    const titleKey = `title-s${sectionId}-ss${sub.id}`;
    const isEditingTitle = editingTitleKey === titleKey;

    return (
      <div
        key={sub.id}
        className="bg-white/60 rounded-lg border border-gray-100 overflow-hidden"
      >
        {/* Sub-section header */}
        <div
          className={`flex items-center justify-between px-3 py-2 ${colors.subHeaderBg}`}
        >
          {isEditingTitle ? (
            <input
              ref={titleEditRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setEditingTitleKey(null);
                  setEditText("");
                }
              }}
              className={`text-sm font-semibold bg-transparent border-none outline-none ${colors.subHeaderText} w-full`}
            />
          ) : (
            <h4
              className={`text-sm font-semibold ${colors.subHeaderText} cursor-pointer hover:opacity-70 transition-opacity`}
              onClick={() => startEditTitle(titleKey, sub.title)}
            >
              {sub.title}
            </h4>
          )}
          <button
            onClick={() => deleteSubSection(sectionId, sub.id)}
            className="w-5 h-5 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-xs opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all"
            title="Удалить подраздел"
          >
            {"\u00D7"}
          </button>
        </div>

        {/* Cards */}
        <div className="p-2 space-y-2">
          {sub.cards.map((card) =>
            renderCard(card, sectionId, colors, sub.id)
          )}

          {/* Add card button */}
          <button
            onClick={() => addCard(sectionId, sub.id)}
            className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors border border-dashed border-gray-200 hover:border-gray-300"
          >
            + Добавить
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Section ───
  function renderSection(section: PlanSection) {
    const colors = COLORS[section.color] || COLORS.blue;
    const hasSubSections = section.subSections.length > 0;
    const titleKey = `title-s${section.id}`;
    const isEditingTitle = editingTitleKey === titleKey;
    const totalCards = hasSubSections
      ? section.subSections.reduce((sum, sub) => sum + sub.cards.length, 0)
      : section.cards.length;

    return (
      <div
        className={`group rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${colors.sectionBg} ${colors.sectionBorder}`}
      >
        {/* Section header */}
        <div
          className={`flex items-center justify-between px-4 py-3 ${colors.headerBg} ${colors.headerText}`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleEditRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setEditingTitleKey(null);
                    setEditText("");
                  }
                }}
                className="text-base font-bold bg-white/20 rounded px-2 py-0.5 text-white placeholder-white/60 border-none outline-none w-full"
              />
            ) : (
              <h3
                className="text-base font-bold truncate cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => startEditTitle(titleKey, section.title)}
              >
                {section.title}
              </h3>
            )}
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 flex-shrink-0">
              {totalCards}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2">
            {/* Color picker toggle */}
            <div className="relative">
              <button
                onClick={() =>
                  setColorPickerSection(
                    colorPickerSection === section.id ? null : section.id
                  )
                }
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs transition-colors"
                title="Цвет"
              >
                🎨
              </button>
              {colorPickerSection === section.id && (
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 flex gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => changeSectionColor(section.id, c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        c === section.color
                          ? "border-gray-800 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: COLORS[c].accent }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Delete section */}
            <button
              onClick={() => deleteSection(section.id)}
              className="w-6 h-6 rounded-full bg-white/0 hover:bg-white/20 flex items-center justify-center text-sm opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-all"
              title="Удалить раздел"
            >
              {"\u00D7"}
            </button>
          </div>
        </div>

        {/* Section body */}
        <div className="p-3">
          {/* Direct cards (no sub-sections) */}
          {!hasSubSections && (
            <div className="space-y-2">
              {section.cards.map((card) =>
                renderCard(card, section.id, colors)
              )}
              <button
                onClick={() => addCard(section.id)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-colors border border-dashed border-gray-200 hover:border-gray-300"
              >
                + Добавить задачу
              </button>
            </div>
          )}

          {/* Sub-sections grid */}
          {hasSubSections && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.subSections.map((sub) =>
                  renderSubSection(sub, section.id, colors)
                )}
              </div>
              <button
                onClick={() => addSubSection(section.id)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-colors border border-dashed border-gray-200 hover:border-gray-300"
              >
                + Добавить подраздел
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Планы маркетинга
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Стратегический план развития маркетинга. Нажмите на карточку для
            редактирования.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addSection}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Раздел
          </button>
          <button
            onClick={resetBoard}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Сбросить
          </button>
        </div>
      </div>

      {/* Board grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className={
              section.subSections.length > 0 ? "lg:col-span-2" : ""
            }
          >
            {renderSection(section)}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">
            Нет разделов. Нажмите &quot;+ Раздел&quot; чтобы начать.
          </p>
        </div>
      )}
    </div>
  );
}
