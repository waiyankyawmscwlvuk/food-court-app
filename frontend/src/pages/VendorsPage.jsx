import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { vendorsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Store, Utensils } from 'lucide-react'

export default function VendorsPage() {
  const { user } = useAuth()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', stall_number: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    vendorsAPI.list().then(r => setVendors(r.data)).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await vendorsAPI.create(form)
      setVendors([res.data, ...vendors])
      setForm({ name: '', stall_number: '', description: '' }); setShowForm(false)
      toast.success('Vendor created!')
    } catch { toast.error('Failed to create vendor.') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendors & Menu</h1>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Vendor</button>
        )}
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">New Vendor</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="label">Vendor Name *</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Stall Number *</label><input className="input" required value={form.stall_number} onChange={e => setForm({ ...form, stall_number: e.target.value })} /></div>
            <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(v => (
            <div key={v.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{v.name}</h3>
                  <p className="text-sm text-gray-400">Stall {v.stall_number}</p>
                </div>
                <span className={`ml-auto ${v.is_active ? 'badge-active' : 'badge-inactive'}`}>{v.is_active ? 'Open' : 'Closed'}</span>
              </div>
              {v.description && <p className="text-sm text-gray-500 mb-3">{v.description}</p>}
              <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-3 mt-2">
                <span>{v.item_count} menu items</span>
                <Link to={`/vendors/${v.id}/items`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                  <Utensils size={14} /> Manage Menu
                </Link>
              </div>
            </div>
          ))}
          {vendors.length === 0 && <div className="col-span-3 text-center py-20 text-gray-400"><Store size={48} className="mx-auto mb-3 opacity-30" /><p>No vendors yet.</p></div>}
        </div>
      )}
    </div>
  )
}
