import { useState, useEffect } from 'react'
import { transactionsAPI, cardsAPI, ordersAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CreditCard, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (user?.role !== 'vendor') {
      transactionsAPI.dailyReport(today)
        .then(r => setReport(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [today, user])

  const paymentChartData = report?.topup_by_payment_method?.map(m => ({
    name: m.payment_method?.replace('_', ' ') || 'Unknown',
    amount: parseFloat(m.total),
    count: m.count,
  })) || []

  const vendorChartData = report?.vendor_sales?.map(v => ({
    name: v.vendor__name,
    amount: parseFloat(v.total),
    orders: v.count,
  })) || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Today's overview — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {user?.role === 'vendor' ? (
        <div className="card text-center py-12">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Welcome, {user.username}! Go to <strong>Vendors &amp; Menu</strong> to manage your food items.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Top-Up Today" value={`${parseFloat(report?.total_topup || 0).toFixed(2)}`} icon={TrendingUp} color="bg-green-500" subtitle={`${report?.topup_count || 0} transactions`} />
            <StatCard title="Total Sales Today" value={`${parseFloat(report?.total_sales || 0).toFixed(2)}`} icon={DollarSign} color="bg-blue-500" subtitle={`${report?.purchase_count || 0} orders`} />
            <StatCard title="Total Transactions" value={report?.total_transactions || 0} icon={ShoppingBag} color="bg-purple-500" subtitle="Today" />
            <StatCard title="Net Balance Change" value={`${(parseFloat(report?.total_topup || 0) - parseFloat(report?.total_sales || 0)).toFixed(2)}`} icon={CreditCard} color="bg-orange-500" subtitle="Top-up minus sales" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Top-Up by Payment Method</h3>
              {paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={paymentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-10">No top-up data today.</p>}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Sales by Vendor</h3>
              {vendorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vendorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v}`, 'Sales']} />
                    <Bar dataKey="amount" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-10">No sales data today.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
