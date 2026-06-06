import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()

  const navItem = (to, label) => {
    const active = pathname === to
    return (
      <Link
        to={to}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="font-bold text-blue-600 mr-1 sm:mr-2 whitespace-nowrap">
              🎯 Objetivos
            </span>
            {navItem('/', 'Panel')}
            {navItem('/teams', 'Equipos')}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:block text-xs text-slate-500 max-w-[160px] truncate">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-slate-600 hover:text-red-600 font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
