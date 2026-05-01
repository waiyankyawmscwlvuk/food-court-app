import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { vendorsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'

export default function FoodItemsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', description: '', is_available: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([vendorsAPI.get(id), vendorsAPI.listFoodItems(id)])
      .then(([v, f]) => { setVendor(v.data); setItems(f.data) })
      .finally(() => setLoading(false))
  }, [id])

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, price: item.price, description: item.description, is_available: item.is_available })
    setShowForm(true)
  }

  const resetForm = () => { setEditItem(null); setForm({ name: '', price: '', description: '', is_available: true }); setShowForm(false) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const data = { ...form, vendor: parseInt(id) }
      if (editItem) {
        const res = await vendorsAPI.updateFoodItem(editItem.id, data)
        setItems(items.map(i => i.id === editItem.id ? res.data : i))
        toast.success('Item updated!')
      } else {
        const res = await vendorsAPI.createFoodItem(data)
        setItems([...items, res.data])
        toast.success('Item added!')
      }
      resetForm()
    } catch { toast.error('Failed to save item.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this item?')) return
    try {
      await vendorsAPI.deleteFoodItem(itemId)
      setItems(items.filter(i => i.id !== itemId))
      toast.success('Item deleted.')
    } catch { toast.error('Failed to delete item.') }
  }

  const canEdit = user?.role === 'admin' || user?.role === 'vendor'

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>

  return (
    <div>
      <Link to="/vendors" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to Vendors
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendor?.name}</h1>
          <p className="text-gray-500 mt-1">Stall {vendor?.stall_number} — {items.length} items</p>
        </div>
        {canEdit && <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Item</button>}
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">{editItem ? 'Edit Item' : 'New Food Item'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Item Name *</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Price (MMK) *</label><input className="input" type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="available" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} className="rounded" />
              <label htmlFor="available" className="text-sm text-gray-700">Available for order</label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Item Name</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Description</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Price</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
              {canEdit && <th className="text-left py-3 px-2 text-gray-500 font-medium">Actions</th>}
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{item.name}</td>
                  <td className="py-3 px-2 text-gray-500">{item.description || '—'}</td>
                  <td className="py-3 px-2 font-semibold text-blue-700">{parseFloat(item.price).toFixed(2)}</td>
                  <td className="py-3 px-2"><span className={item.is_available ? 'badge-active' : 'badge-inactive'}>{item.is_available ? 'Available' : 'Unavailable'}</span></td>
                  {canEdit && (
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-700"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-gray-400">No food items yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
