import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge, ProgressBar, Spinner } from '../components/ui'

export default function ObjectiveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [objective, setObjective] = useState(null)
  const [tasks, setTasks] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTask, setNewTask] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: obj, error: objErr }, { data: tk }, { data: st }] =
      await Promise.all([
        supabase
          .from('objectives')
          .select('*, statuses(slug,name), teams(name)')
          .eq('id', id)
          .single(),
        supabase
          .from('tasks')
          .select('*, statuses(slug,name)')
          .eq('objective_id', id)
          .order('created_at', { ascending: true }),
        supabase.from('statuses').select('*').order('sort_order'),
      ])
    if (objErr) setError(objErr.message)
    setObjective(obj || null)
    setTasks(tk || [])
    setStatuses(st || [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const addTask = async (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    const firstStatus = statuses[0]?.id
    const { error: insErr } = await supabase.from('tasks').insert({
      objective_id: id,
      title: newTask.trim(),
      status_id: firstStatus,
    })
    if (insErr) return setError(insErr.message)
    setNewTask('')
    load()
  }

  const changeTaskStatus = async (taskId, statusId) => {
    const { error: upErr } = await supabase
      .from('tasks')
      .update({ status_id: Number(statusId) })
      .eq('id', taskId)
    if (upErr) return setError(upErr.message)
    load()
  }

  const deleteTask = async (taskId) => {
    const { error: delErr } = await supabase.from('tasks').delete().eq('id', taskId)
    if (delErr) return setError(delErr.message)
    load()
  }

  const changeObjectiveStatus = async (statusId) => {
    const { error: upErr } = await supabase
      .from('objectives')
      .update({ status_id: Number(statusId) })
      .eq('id', id)
    if (upErr) return setError(upErr.message)
    load()
  }

  const deleteObjective = async () => {
    if (!confirm('¿Eliminar este objetivo y todas sus tareas?')) return
    const { error: delErr } = await supabase.from('objectives').delete().eq('id', id)
    if (delErr) return setError(delErr.message)
    navigate('/')
  }

  if (loading) return <Spinner />
  if (!objective)
    return (
      <div className="text-center text-slate-400 py-12">
        No se encontró el objetivo.{' '}
        <Link to="/" className="text-blue-600">
          Volver al panel
        </Link>
      </div>
    )

  const done = tasks.filter((t) => t.statuses?.slug === 'done').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  const isOwner = objective.owner_id === user.id

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600">
        ← Volver al panel
      </Link>

      <div className="bg-white border rounded-xl p-5 mt-3 mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold">{objective.title}</h1>
          <StatusBadge slug={objective.statuses?.slug} name={objective.statuses?.name} />
        </div>
        {objective.description && (
          <p className="text-sm text-slate-600 mb-3">{objective.description}</p>
        )}
        <p className="text-xs text-slate-500 mb-4">
          {objective.team_id ? `👥 ${objective.teams?.name}` : '👤 Personal'}
          {objective.due_date ? ` · vence ${objective.due_date}` : ''}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <ProgressBar value={pct} />
          <span className="text-sm text-slate-500 w-10 text-right">{pct}%</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-slate-600">
            Estado del objetivo:{' '}
            <select
              value={objective.status_id}
              onChange={(e) => changeObjectiveStatus(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm bg-white"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {isOwner && (
            <button
              onClick={deleteObjective}
              className="text-sm text-red-600 hover:underline ml-auto"
            >
              Eliminar objetivo
            </button>
          )}
        </div>
      </div>

      <h2 className="font-semibold mb-3">Tareas</h2>

      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Nueva tarea…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 rounded-lg"
        >
          Añadir
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center border border-dashed rounded-xl">
          Sin tareas todavía. Añade la primera arriba.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="bg-white border rounded-lg px-3 py-2 flex items-center gap-3"
            >
              <span
                className={`flex-1 text-sm ${
                  t.statuses?.slug === 'done'
                    ? 'line-through text-slate-400'
                    : ''
                }`}
              >
                {t.title}
              </span>
              <select
                value={t.status_id}
                onChange={(e) => changeTaskStatus(t.id, e.target.value)}
                className="border rounded-lg px-2 py-1 text-xs bg-white"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => deleteTask(t.id)}
                className="text-slate-400 hover:text-red-600 text-sm"
                title="Eliminar tarea"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
