interface ProgressBarProps {
  progress: number;
  color: string;
  height?: string;
}

export default function ProgressBar({ progress, color, height = "h-2" }: ProgressBarProps) {
  return (
    <div className={`bg-gray-100 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full transition-all`}
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  );
}
