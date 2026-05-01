import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CardsPage from './pages/CardsPage'
import CardDetailPage from './pages/CardDetailPage'
import TopUpPage from './pages/TopUpPage'
import OrderPage from './pages/OrderPage'
import VendorsPage from './pages/VendorsPage'
import FoodItemsPage from './pages/FoodItemsPage'
import TransactionsPage from './pages/TransactionsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="cards" element={<PrivateRoute roles={['admin','counter']}><CardsPage /></PrivateRoute>} />
        <Route path="cards/:id" element={<PrivateRoute roles={['admin','counter']}><CardDetailPage /></PrivateRoute>} />
        <Route path="topup" element={<PrivateRoute roles={['admin','counter']}><TopUpPage /></PrivateRoute>} />
        <Route path="orders" element={<PrivateRoute roles={['admin','counter']}><OrderPage /></PrivateRoute>} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="vendors/:id/items" element={<FoodItemsPage />} />
        <Route path="transactions" element={<PrivateRoute roles={['admin','counter']}><TransactionsPage /></PrivateRoute>} />
        <Route path="reports" element={<PrivateRoute roles={['admin','counter']}><ReportsPage /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppRoutes />
    </AuthProvider>
  )
}
