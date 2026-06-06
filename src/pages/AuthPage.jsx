import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setInfo(
          'Cuenta creada. Si la confirmación por email está activa revisa tu correo; ' +
            'si no, ya puedes iniciar sesión.'
        )
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-xl font-bold text-slate-800">
            Plataforma de Objetivos
          </h1>
          <p className="text-sm text-slate-500">
            Da seguimiento a tus objetivos y los de tu equipo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
        >
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 rounded-md ${
                mode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-1.5 rounded-md ${
                mode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500'
              }`}
            >
              Registrarse
            </button>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition"
          >
            {loading
              ? 'Procesando…'
              : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
