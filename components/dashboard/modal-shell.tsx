"use client";

interface ModalShellProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function ModalShell({
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl p-5 shadow-xl ${maxWidth} w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            {"\u00D7"}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
