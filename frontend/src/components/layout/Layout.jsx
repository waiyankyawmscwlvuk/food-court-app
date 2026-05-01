import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, CreditCard, ArrowUpCircle, ShoppingCart,
  Store, List, BarChart2, Users, LogOut, ChevronRight, Utensils
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','counter','vendor'] },
  { to: '/cards', label: 'Prepaid Cards', icon: CreditCard, roles: ['admin','counter'] },
  { to: '/topup', label: 'Top-Up', icon: ArrowUpCircle, roles: ['admin','counter'] },
  { to: '/orders', label: 'New Order', icon: ShoppingCart, roles: ['admin','counter'] },
  { to: '/vendors', label: 'Vendors & Menu', icon: Utensils, roles: ['admin','vendor'] },
  { to: '/transactions', label: 'Transactions', icon: List, roles: ['admin','counter'] },
  { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['admin','counter'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const visible = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Store className="text-blue-600" size={24} />
            <div>
              <p className="font-bold text-gray-900 text-sm">Food Court</p>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
