import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, CreditCard, ArrowUpCircle, ShoppingCart,
  Store, List, BarChart2, Users, LogOut, Utensils, Menu, X,
} from 'lucide-react'

const navItems = [
  { to: '/',             label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','counter','vendor'] },
  { to: '/cards',        label: 'Prepaid Cards', icon: CreditCard,      roles: ['admin','counter'] },
  { to: '/topup',        label: 'Top-Up',        icon: ArrowUpCircle,   roles: ['admin','counter'] },
  { to: '/orders',       label: 'New Order',     icon: ShoppingCart,    roles: ['admin','counter'] },
  { to: '/vendors',      label: 'Vendors & Menu',icon: Utensils,        roles: ['admin','vendor'] },
  { to: '/transactions', label: 'Transactions',  icon: List,            roles: ['admin','counter'] },
  { to: '/reports',      label: 'Reports',       icon: BarChart2,       roles: ['admin','counter'] },
  { to: '/users',        label: 'Users',         icon: Users,           roles: ['admin'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auto-close sidebar whenever the route changes (mobile nav tap)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Lock body scroll while mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleLogout = () => { logout(); navigate('/login') }
  const visible = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Dark backdrop (mobile only) ───────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden
          ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Store className="text-blue-600 flex-shrink-0" size={22} />
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Food Court</p>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links — scrollable if many items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout — pinned to bottom, never cut off */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Right side: mobile top-bar + page content ─────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar — hidden on desktop */}
        <header className="flex lg:hidden items-center gap-3 h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Store className="text-blue-600" size={18} />
            <span className="font-bold text-gray-900 text-sm">Food Court</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}
