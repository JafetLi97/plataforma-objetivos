// Pequeños componentes de interfaz reutilizables.

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

export function StatusBadge({ slug, name }) {
  const style = STATUS_STYLES[slug] || 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {name}
    </span>
  )
}

export function ProgressBar({ value }) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
      <div
        className="bg-green-500 h-2 rounded-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }) {
  return <div className="py-10 text-center text-slate-400">{label}</div>
}
