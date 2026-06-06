import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Recupera la sesión guardada (si el usuario ya inició sesión antes)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Escucha cambios de sesión (login / logout) en tiempo real
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    signOut: () => supabase.auth.signOut(),
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Cargando…
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}
