import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge, ProgressBar, Spinner } from '../components/ui'

function progressOf(tasks) {
  if (!tasks || tasks.length === 0) return 0
  const done = tasks.filter((t) => t.statuses?.slug === 'done').length
  return Math.round((done / tasks.length) * 100)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [objectives, setObjectives] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all') // all | personal | team
  const [error, setError] = useState('')

  // Campos del formulario de nuevo objetivo
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [{ data: objs, error: objErr }, { data: tm }] = await Promise.all([
      supabase
        .from('objectives')
        .select(
          'id, title, description, team_id, due_date, statuses(slug,name), teams(name), tasks(id, statuses(slug))'
        )
        .order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name'),
    ])
    if (objErr) setError(objErr.message)
    setObjectives(objs || [])
    setTeams(tm || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createObjective = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('objectives').insert({
      title,
      description: description || null,
      owner_id: user.id,
      team_id: teamId || null,
      due_date: dueDate || null,
    })
    setSaving(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setTitle('')
    setDescription('')
    setTeamId('')
    setDueDate('')
    setShowForm(false)
    load()
  }

  const filtered = objectives.filter((o) => {
    if (filter === 'personal') return !o.team_id
    if (filter === 'team') return !!o.team_id
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Panel de objetivos</h1>
          <p className="text-sm text-slate-500">
            Tu avance personal y el de tus equipos en un solo lugar.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancelar' : '+ Nuevo objetivo'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createObjective}
          className="bg-white border rounded-xl p-4 mb-6 space-y-3"
        >
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del objetivo"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Asignar a
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Personal (solo yo)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    Equipo: {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fecha límite (opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {saving ? 'Guardando…' : 'Crear objetivo'}
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-4 text-sm">
        {[
          ['all', 'Todos'],
          ['personal', 'Personales'],
          ['team', 'De equipo'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full border ${
              filter === key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-12 border border-dashed rounded-xl">
          Aún no hay objetivos. Crea el primero con “+ Nuevo objetivo”.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((o) => {
            const pct = progressOf(o.tasks)
            return (
              <Link
                key={o.id}
                to={`/objectives/${o.id}`}
                className="bg-white border rounded-xl p-4 hover:shadow-md transition block"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold leading-tight">{o.title}</h3>
                  <StatusBadge slug={o.statuses?.slug} name={o.statuses?.name} />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {o.team_id ? `👥 ${o.teams?.name}` : '👤 Personal'}
                  {o.due_date ? ` · vence ${o.due_date}` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <ProgressBar value={pct} />
                  <span className="text-xs text-slate-500 w-9 text-right">
                    {pct}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {o.tasks?.length || 0} tarea(s)
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
