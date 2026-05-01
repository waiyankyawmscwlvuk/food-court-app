import { useState, useEffect } from 'react'
import { transactionsAPI } from '../services/api'
import { ArrowUpCircle, ShoppingCart, Filter } from 'lucide-react'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', date: '' })

  const fetchData = () => {
    setLoading(true)
    const params = {}
    if (filter.type) params.type = filter.type
    if (filter.date) params.date = filter.date
    transactionsAPI.list(params).then(r => setTransactions(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 mt-1">All financial transaction records</p>
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Type</label>
            <select className="input w-40" value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
              <option value="">All Types</option>
              <option value="topup">Top-Up</option>
              <option value="purchase">Purchase</option>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} />
          </div>
          <button onClick={fetchData} className="btn-primary flex items-center gap-2"><Filter size={16} /> Apply</button>
          <button onClick={() => { setFilter({ type: '', date: '' }); setTimeout(fetchData, 0) }} className="btn-secondary">Clear</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Transaction ID</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Card</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Customer</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Amount</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Payment</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Balance After</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">By</th>
              </tr></thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-mono text-xs">{txn.transaction_id}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${txn.transaction_type === 'topup' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {txn.transaction_type === 'topup' ? <ArrowUpCircle size={11} /> : <ShoppingCart size={11} />}
                        {txn.transaction_type === 'topup' ? 'Top-Up' : 'Purchase'}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono text-xs">{txn.card_number}</td>
                    <td className="py-3 px-2">{txn.customer_name}</td>
                    <td className={`py-3 px-2 font-semibold ${txn.transaction_type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.transaction_type === 'topup' ? '+' : '-'}{parseFloat(txn.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 capitalize text-gray-500">{txn.payment_method?.replace('_', ' ') || '—'}</td>
                    <td className="py-3 px-2 font-medium">{parseFloat(txn.balance_after).toFixed(2)}</td>
                    <td className="py-3 px-2 text-gray-400 text-xs">{new Date(txn.created_at).toLocaleString()}</td>
                    <td className="py-3 px-2 text-gray-500">{txn.processed_by_name}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan="9" className="text-center py-10 text-gray-400">No transactions found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
