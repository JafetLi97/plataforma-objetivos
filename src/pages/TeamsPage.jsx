import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/ui'

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTeam, setNewTeam] = useState('')
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState({}) // { [teamId]: email }
  const [msg, setMsg] = useState({}) // { [teamId]: mensaje }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('teams')
      .select(
        'id, name, owner_id, team_members(role, user_id, profiles(email, full_name))'
      )
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    setTeams(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createTeam = async (e) => {
    e.preventDefault()
    if (!newTeam.trim()) return
    setError('')
    // 1) Crear el equipo
    const { data: team, error: tErr } = await supabase
      .from('teams')
      .insert({ name: newTeam.trim(), owner_id: user.id })
      .select()
      .single()
    if (tErr) return setError(tErr.message)
    // 2) Agregar al creador como miembro (rol owner)
    const { error: mErr } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'owner' })
    if (mErr) return setError(mErr.message)
    setNewTeam('')
    load()
  }

  const invite = async (teamId) => {
    const email = (inviteEmail[teamId] || '').trim().toLowerCase()
    setMsg((m) => ({ ...m, [teamId]: '' }))
    if (!email) return
    // Buscar al usuario por email (debe estar registrado)
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (pErr) return setMsg((m) => ({ ...m, [teamId]: pErr.message }))
    if (!profile) {
      return setMsg((m) => ({
        ...m,
        [teamId]: 'No existe un usuario con ese email. Debe registrarse primero.',
      }))
    }
    const { error: insErr } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: profile.id, role: 'member' })
    if (insErr) {
      const dup = insErr.code === '23505'
      return setMsg((m) => ({
        ...m,
        [teamId]: dup ? 'Esa persona ya está en el equipo.' : insErr.message,
      }))
    }
    setInviteEmail((s) => ({ ...s, [teamId]: '' }))
    setMsg((m) => ({ ...m, [teamId]: '✓ Miembro agregado.' }))
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Equipos</h1>
      <p className="text-sm text-slate-500 mb-4">
        Crea equipos e invita personas para trabajar objetivos en común.
      </p>

      <form onSubmit={createTeam} className="flex gap-2 mb-6">
        <input
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          placeholder="Nombre del nuevo equipo"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 rounded-lg"
        >
          Crear equipo
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : teams.length === 0 ? (
        <div className="text-center text-slate-400 py-12 border border-dashed rounded-xl">
          Todavía no perteneces a ningún equipo.
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const isOwner = team.owner_id === user.id
            return (
              <div key={team.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    👥 {team.name}{' '}
                    {isOwner && (
                      <span className="text-xs font-normal text-slate-400">
                        (eres dueño)
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {team.team_members?.length || 0} miembro(s)
                  </span>
                </div>

                <ul className="text-sm text-slate-600 space-y-1 mb-3">
                  {team.team_members?.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {m.profiles?.full_name || m.profiles?.email}
                      {m.role === 'owner' && (
                        <span className="text-xs text-slate-400">· dueño</span>
                      )}
                    </li>
                  ))}
                </ul>

                {isOwner && (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail[team.id] || ''}
                        onChange={(e) =>
                          setInviteEmail((s) => ({
                            ...s,
                            [team.id]: e.target.value,
                          }))
                        }
                        placeholder="email@de-la-persona.com"
                        className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => invite(team.id)}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-3 rounded-lg"
                      >
                        Invitar
                      </button>
                    </div>
                    {msg[team.id] && (
                      <p className="text-xs mt-1 text-slate-500">{msg[team.id]}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
