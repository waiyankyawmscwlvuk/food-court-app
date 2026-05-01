import { useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'counter', label: 'Counter Staff' },
  { value: 'vendor', label: 'Vendor' },
]

const roleBadge = (role) => {
  if (role === 'admin') return 'badge-admin'
  if (role === 'counter') return 'badge-counter'
  return 'badge-vendor'
}

const emptyForm = { username: '', email: '', first_name: '', last_name: '', phone: '', role: 'counter', password: '' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authAPI.listUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  }, [])

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name, phone: u.phone || '', role: u.role, password: '' })
    setShowForm(true)
  }

  const resetForm = () => { setEditUser(null); setForm(emptyForm); setShowForm(false) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editUser) {
        const res = await authAPI.updateUser(editUser.id, payload)
        setUsers(users.map(u => u.id === editUser.id ? res.data : u))
        toast.success('User updated!')
      } else {
        const res = await authAPI.createUser(payload)
        setUsers([res.data, ...users])
        toast.success('User created!')
      }
      resetForm()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'string' ? msg : 'Failed to save user.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await authAPI.deleteUser(id)
      setUsers(users.filter(u => u.id !== id))
      toast.success('User deleted.')
    } catch { toast.error('Failed to delete user.') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} system users</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editUser ? 'Edit User' : 'Create New User'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Username *</label>
              <input className="input" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input className="input" type="password" required={!editUser} minLength={8}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editUser ? 'Leave blank to keep current' : ''} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Username</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Full Name</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Role</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Created</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-semibold text-gray-900">{u.username}</td>
                    <td className="py-3 px-3">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="py-3 px-3 text-gray-500">{u.email || '—'}</td>
                    <td className="py-3 px-3"><span className={roleBadge(u.role)}>{u.role}</span></td>
                    <td className="py-3 px-3"><span className={u.is_active ? 'badge-active' : 'badge-inactive'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-700"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-16 text-gray-400">
                    <Users size={40} className="mx-auto mb-2 opacity-30" />
                    No users found.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
