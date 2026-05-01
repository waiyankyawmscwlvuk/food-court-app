import { useState, useEffect } from 'react'
import { transactionsAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Calendar, TrendingUp, DollarSign, ArrowUpCircle, ShoppingBag } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function StatCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [dailyReport, setDailyReport] = useState(null)
  const [topupReport, setTopupReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = async (selectedDate) => {
    setLoading(true)
    try {
      const [daily, topup] = await Promise.all([
        transactionsAPI.dailyReport(selectedDate),
        transactionsAPI.topupReport(selectedDate),
      ])
      setDailyReport(daily.data)
      setTopupReport(topup.data)
    } catch {
      setDailyReport(null)
      setTopupReport(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports(date) }, [])

  const handleDateChange = (e) => {
    setDate(e.target.value)
  }

  const handleApply = () => fetchReports(date)

  const paymentMethodData = topupReport?.by_payment_method?.map(m => ({
    name: (m.payment_method || 'unknown').replace('_', ' '),
    value: parseFloat(m.total),
    count: m.count,
  })) || []

  const vendorData = dailyReport?.vendor_sales?.map(v => ({
    name: v.vendor__name,
    sales: parseFloat(v.total),
    orders: v.count,
  })) || []

  const topupTxns = topupReport?.transactions || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Daily financial summary and analytics</p>
      </div>

      {/* Date Picker */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Report Date</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="input pl-9 w-48"
                value={date}
                max={today}
                onChange={handleDateChange}
              />
            </div>
          </div>
          <button onClick={handleApply} className="btn-primary">Generate Report</button>
          <button onClick={() => { setDate(today); fetchReports(today) }} className="btn-secondary">Today</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : dailyReport ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Top-Up"
              value={parseFloat(dailyReport.total_topup).toFixed(2)}
              icon={ArrowUpCircle}
              color="bg-green-500"
              sub={`${dailyReport.topup_count} transactions`}
            />
            <StatCard
              title="Total Sales"
              value={parseFloat(dailyReport.total_sales).toFixed(2)}
              icon={DollarSign}
              color="bg-blue-500"
              sub={`${dailyReport.purchase_count} orders`}
            />
            <StatCard
              title="Total Transactions"
              value={dailyReport.total_transactions}
              icon={ShoppingBag}
              color="bg-purple-500"
              sub="Top-ups + purchases"
            />
            <StatCard
              title="Net Flow"
              value={(parseFloat(dailyReport.total_topup) - parseFloat(dailyReport.total_sales)).toFixed(2)}
              icon={TrendingUp}
              color="bg-orange-500"
              sub="Top-up minus sales"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie: Top-up by payment method */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Top-Up by Payment Method</h3>
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                      labelLine={false}
                    >
                      {paymentMethodData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => v.toFixed(2)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No top-up data for this date.</div>
              )}
            </div>

            {/* Bar: Sales by vendor */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Sales by Vendor</h3>
              {vendorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={vendorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => v.toFixed(2)} />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No sales data for this date.</div>
              )}
            </div>
          </div>

          {/* Top-up breakdown table */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Top-Up Breakdown by Payment Method</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Payment Method</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Count</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethodData.length > 0 ? paymentMethodData.map((m, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 capitalize font-medium">{m.name}</td>
                      <td className="py-2 px-3">{m.count}</td>
                      <td className="py-2 px-3 font-semibold text-green-700">{m.value.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center py-6 text-gray-400">No top-up data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor Sales Table */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Vendor-wise Sales Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Vendor</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Orders</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorData.length > 0 ? vendorData.map((v, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{v.name}</td>
                      <td className="py-2 px-3">{v.orders}</td>
                      <td className="py-2 px-3 font-semibold text-blue-700">{v.sales.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center py-6 text-gray-400">No sales data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top-up transaction log */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Top-Up Transaction Log ({topupTxns.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Transaction ID</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Card</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Amount</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Method</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {topupTxns.length > 0 ? topupTxns.map(txn => (
                    <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs">{txn.transaction_id}</td>
                      <td className="py-2 px-3 font-mono text-xs">{txn.card_number}</td>
                      <td className="py-2 px-3">{txn.customer_name}</td>
                      <td className="py-2 px-3 font-semibold text-green-700">+{parseFloat(txn.amount).toFixed(2)}</td>
                      <td className="py-2 px-3 capitalize">{txn.payment_method?.replace('_', ' ') || '—'}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{new Date(txn.created_at).toLocaleTimeString()}</td>
                      <td className="py-2 px-3 text-gray-500">{txn.processed_by_name}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="text-center py-6 text-gray-400">No top-up transactions.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 text-gray-400">
          <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
          <p>No data available for the selected date.</p>
        </div>
      )}
    </div>
  )
}
