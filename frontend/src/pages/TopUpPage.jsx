import { useState } from 'react'
import { cardsAPI, transactionsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { ArrowUpCircle, Search, CheckCircle } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
  { value: 'bank_card', label: 'Bank Card' },
]

export default function TopUpPage() {
  const [uidInput, setUidInput] = useState('')
  const [card, setCard] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState({ amount: '', payment_method: 'cash', note: '' })
  const [processing, setProcessing] = useState(false)
  const [lastTxn, setLastTxn] = useState(null)

  const handleScan = async (e) => {
    e.preventDefault()
    setScanning(true)
    setCard(null)
    setLastTxn(null)
    try {
      const res = await cardsAPI.scan(uidInput.trim())
      if (res.data.status !== 'active') {
        toast.error('This card is not active.')
        return
      }
      setCard(res.data)
    } catch {
      toast.error('Card not found. Please check the UID.')
    } finally {
      setScanning(false)
    }
  }

  const handleTopUp = async (e) => {
    e.preventDefault()
    if (!card) return
    setProcessing(true)
    try {
      const res = await transactionsAPI.topup({
        card_uid: card.uid,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        note: form.note,
      })
      setLastTxn(res.data)
      setCard(prev => ({ ...prev, balance: res.data.balance_after }))
      setForm({ amount: '', payment_method: 'cash', note: '' })
      toast.success(`Top-up of ${parseFloat(form.amount).toFixed(2)} successful!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Top-up failed.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Card Top-Up</h1>
        <p className="text-gray-500 mt-1">Scan a QR card and add balance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan Section */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Step 1: Scan / Enter Card UID</h3>
          <form onSubmit={handleScan} className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Enter card UID (UUID format)"
                value={uidInput} onChange={e => setUidInput(e.target.value)} required />
            </div>
            <button type="submit" disabled={scanning} className="btn-primary w-full">
              {scanning ? 'Searching...' : 'Find Card'}
            </button>
          </form>

          {card && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-green-600" size={18} />
                <span className="font-semibold text-gray-900">Card Found</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Card No.</span><span className="font-mono font-semibold">{card.card_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{card.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="font-bold text-blue-700">{parseFloat(card.balance).toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Top-Up Form */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Step 2: Enter Top-Up Details</h3>
          {!card ? (
            <div className="text-center py-10 text-gray-400">
              <ArrowUpCircle size={40} className="mx-auto mb-2 opacity-30" />
              <p>Scan a card first to proceed</p>
            </div>
          ) : (
            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="label">Amount (MMK) *</label>
                <input className="input text-lg font-semibold" type="number" min="1" step="0.01" required
                  placeholder="0.00" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Payment Method *</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setForm({ ...form, payment_method: m.value })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        form.payment_method === m.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" placeholder="Add a note..."
                  value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
              <button type="submit" disabled={processing || !form.amount} className="btn-success w-full text-base py-3">
                {processing ? 'Processing...' : `Top Up ${form.amount ? parseFloat(form.amount).toFixed(2) : '0.00'}`}
              </button>
            </form>
          )}
        </div>
      </div>

      {lastTxn && (
        <div className="card mt-6 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="text-green-600" size={20} />
            <span className="font-semibold text-green-800">Top-Up Successful!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">Transaction ID</p><p className="font-mono font-medium">{lastTxn.transaction_id}</p></div>
            <div><p className="text-gray-500">Amount</p><p className="font-bold text-green-700">+{parseFloat(lastTxn.amount).toFixed(2)}</p></div>
            <div><p className="text-gray-500">Payment Method</p><p className="capitalize">{lastTxn.payment_method?.replace('_', ' ')}</p></div>
            <div><p className="text-gray-500">New Balance</p><p className="font-bold">{parseFloat(lastTxn.balance_after).toFixed(2)}</p></div>
          </div>
        </div>
      )}
    </div>
  )
}
