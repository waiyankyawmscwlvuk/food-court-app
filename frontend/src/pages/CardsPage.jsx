import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cardsAPI } from '../services/api'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Search, CreditCard, Eye, Printer } from 'lucide-react'

export default function CardsPage() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '' })
  const [creating, setCreating] = useState(false)
  const [bulkPrinting, setBulkPrinting] = useState(false)

  useEffect(() => {
    cardsAPI.list().then(r => setCards(r.data)).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await cardsAPI.create(form)
      setCards([res.data, ...cards])
      setForm({ customer_name: '', customer_phone: '', customer_email: '' })
      setShowForm(false)
      toast.success(`Card ${res.data.card_number} created!`)
    } catch {
      toast.error('Failed to create card.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (card) => {
    try {
      const res = await cardsAPI.toggleStatus(card.id)
      setCards(cards.map(c => c.id === card.id ? res.data : c))
      toast.success(`Card ${res.data.status === 'active' ? 'activated' : 'deactivated'}.`)
    } catch {
      toast.error('Failed to update status.')
    }
  }

  const handleBulkPrint = async () => {
    setBulkPrinting(true)
    try {
      const res = await api.post('/cards/print-bulk/', {}, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'all_cards_print.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Bulk print PDF downloaded — print and cut!')
    } catch {
      toast.error('Failed to generate bulk print.')
    } finally {
      setBulkPrinting(false)
    }
  }

  const filtered = cards.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.card_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prepaid Cards</h1>
          <p className="text-gray-500 mt-1">{cards.length} total cards</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button onClick={handleBulkPrint} disabled={bulkPrinting}
              className="btn-secondary flex items-center gap-2">
              <Printer size={16} /> {bulkPrinting ? 'Generating...' : 'Bulk Print All'}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Card
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Card</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Customer Name *</label>
              <input className="input" required value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.customer_email}
                onChange={e => setForm({ ...form, customer_email: e.target.value })} placeholder="Email address" />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create Card'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or card number..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Card No.</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Customer</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Balance</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Created</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(card => (
                  <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-mono font-medium text-blue-600">{card.card_number}</td>
                    <td className="py-3 px-2">
                      <div>{card.customer_name}</div>
                      <div className="text-gray-400 text-xs">{card.customer_phone}</div>
                    </td>
                    <td className="py-3 px-2 font-semibold">{parseFloat(card.balance).toFixed(2)}</td>
                    <td className="py-3 px-2">
                      <span className={card.status === 'active' ? 'badge-active' : 'badge-inactive'}>
                        {card.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-400">{new Date(card.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Link to={`/cards/${card.id}`} className="text-blue-600 hover:text-blue-700">
                          <Eye size={16} />
                        </Link>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleToggle(card)}
                            className={`text-xs px-2 py-1 rounded-md ${card.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                            {card.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-gray-400">No cards found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
