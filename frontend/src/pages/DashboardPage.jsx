import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { transactionsAPI, vendorsAPI, ordersAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ShoppingBag, DollarSign, TrendingUp, ArrowUpCircle, Utensils, Package } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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

// ── Vendor Dashboard ──────────────────────────────────────────────────────────
function VendorDashboard({ user }) {
  const [vendors, setVendors] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      vendorsAPI.list(),
      ordersAPI.list({ date: today }),
    ])
      .then(([vRes, oRes]) => {
        // Only show vendors owned by this user
        const myVendors = vRes.data.filter(v => v.owner === user.id)
        setVendors(myVendors)

        // Filter orders for my vendors
        const myVendorIds = myVendors.map(v => v.id)
        const myOrders = oRes.data.filter(o => myVendorIds.includes(o.vendor))
        setOrders(myOrders)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.id, today])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  // ── compute stats ────────────────────────────────────────────────────────────
  const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
  const totalOrders = orders.length

  // Total food items across all my vendors
  const totalItems = vendors.reduce((sum, v) => sum + (v.item_count || 0), 0)

  // Sales breakdown per vendor (for chart)
  const vendorSalesData = vendors.map(v => {
    const vendorOrders = orders.filter(o => o.vendor === v.id)
    const sales = vendorOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
    return {
      name: `${v.name} (Stall ${v.stall_number})`,
      sales,
      orders: vendorOrders.length,
    }
  })

  // Recent orders (latest 8)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome, <strong>{user.username}</strong> — today's sales summary for{' '}
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {vendors.length === 0 ? (
        // No vendor assigned yet
        <div className="card text-center py-16">
          <Utensils size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium mb-1">No stalls assigned to your account yet.</p>
          <p className="text-gray-400 text-sm">Ask an administrator to assign a vendor stall to you.</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              title="Total Sales Today"
              value={`${totalSales.toFixed(2)}`}
              icon={DollarSign}
              color="bg-blue-500"
              subtitle={`${totalOrders} order${totalOrders !== 1 ? 's' : ''}`}
            />
            <StatCard
              title="My Stalls"
              value={vendors.length}
              icon={Utensils}
              color="bg-green-500"
              subtitle={vendors.map(v => `Stall ${v.stall_number}`).join(', ')}
            />
            <StatCard
              title="Menu Items"
              value={totalItems}
              icon={Package}
              color="bg-purple-500"
              subtitle="Across all my stalls"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales bar chart */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Sales by Stall Today</h3>
              {vendorSalesData.some(v => v.sales > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vendorSalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${parseFloat(v).toFixed(2)}`, 'Sales']} />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <ShoppingBag size={36} className="mb-2 opacity-30" />
                  <p className="text-sm">No sales yet today.</p>
                </div>
              )}
            </div>

            {/* Per-stall stats */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Stall Breakdown</h3>
              <div className="space-y-3">
                {vendors.map(vendor => {
                  const vOrders = orders.filter(o => o.vendor === vendor.id)
                  const vSales = vOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
                  return (
                    <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{vendor.name}</p>
                        <p className="text-xs text-gray-400">Stall {vendor.stall_number} · {vOrders.length} order{vOrders.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-700">{vSales.toFixed(2)}</p>
                        <Link
                          to={`/vendors/${vendor.id}/items`}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          Manage menu →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent orders table */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">
              Recent Orders Today ({totalOrders})
            </h3>
            {recentOrders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No orders yet today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Order No.</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Customer</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Stall</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Amount</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => {
                      const stall = vendors.find(v => v.id === order.vendor)
                      return (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 font-mono text-xs text-blue-600">{order.order_number}</td>
                          <td className="py-2 px-2">{order.customer_name || '—'}</td>
                          <td className="py-2 px-2 text-gray-500 text-xs">
                            {stall ? `Stall ${stall.stall_number}` : '—'}
                          </td>
                          <td className="py-2 px-2 font-semibold text-green-700">
                            {parseFloat(order.total_amount).toFixed(2)}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-400 text-xs">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Admin / Counter Dashboard ─────────────────────────────────────────────────
function AdminCounterDashboard() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    transactionsAPI.dailyReport(today)
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [today])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const paymentChartData = report?.topup_by_payment_method?.map(m => ({
    name: (m.payment_method || 'unknown').replace('_', ' '),
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
        <p className="text-gray-500 mt-1">
          Today's overview —{' '}
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Top-Up Today"
          value={`${parseFloat(report?.total_topup || 0).toFixed(2)}`}
          icon={TrendingUp}
          color="bg-green-500"
          subtitle={`${report?.topup_count || 0} transactions`}
        />
        <StatCard
          title="Total Sales Today"
          value={`${parseFloat(report?.total_sales || 0).toFixed(2)}`}
          icon={DollarSign}
          color="bg-blue-500"
          subtitle={`${report?.purchase_count || 0} orders`}
        />
        <StatCard
          title="Total Transactions"
          value={report?.total_transactions || 0}
          icon={ShoppingBag}
          color="bg-purple-500"
          subtitle="Today"
        />
        <StatCard
          title="Net Balance Change"
          value={`${(parseFloat(report?.total_topup || 0) - parseFloat(report?.total_sales || 0)).toFixed(2)}`}
          icon={ArrowUpCircle}
          color="bg-orange-500"
          subtitle="Top-up minus sales"
        />
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
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">No top-up data today.</p>
          )}
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
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">No sales data today.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()

  if (user?.role === 'vendor') {
    return <VendorDashboard user={user} />
  }

  return <AdminCounterDashboard />
}
