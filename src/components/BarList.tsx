export default function BarList({ data, color = 'bg-indigo-500' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-36 truncate text-slate-600">{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className={`h-full ${color} rounded-full`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right text-slate-500 text-xs">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
