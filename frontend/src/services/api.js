import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const res = await axios.post('/api/auth/refresh/', { refresh })
        localStorage.setItem('access_token', res.data.access)
        original.headers.Authorization = `Bearer ${res.data.access}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  me: () => api.get('/auth/me/'),
  changePassword: (data) => api.post('/auth/change-password/', data),
  listUsers: () => api.get('/auth/users/'),
  createUser: (data) => api.post('/auth/users/', data),
  updateUser: (id, data) => api.patch(`/auth/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}/`),
}

// Cards
export const cardsAPI = {
  list: () => api.get('/cards/'),
  create: (data) => api.post('/cards/', data),
  get: (id) => api.get(`/cards/${id}/`),
  update: (id, data) => api.patch(`/cards/${id}/`, data),
  toggleStatus: (id) => api.post(`/cards/${id}/toggle-status/`),
  scan: (uid) => api.post('/cards/scan/', { uid }),
}

// Vendors
export const vendorsAPI = {
  list: () => api.get('/vendors/'),
  create: (data) => api.post('/vendors/', data),
  get: (id) => api.get(`/vendors/${id}/`),
  update: (id, data) => api.patch(`/vendors/${id}/`, data),
  delete: (id) => api.delete(`/vendors/${id}/`),
  listFoodItems: (vendorId) => api.get(`/vendors/food-items/?vendor=${vendorId}`),
  allFoodItems: () => api.get('/vendors/food-items/'),
  createFoodItem: (data) => api.post('/vendors/food-items/', data),
  updateFoodItem: (id, data) => api.patch(`/vendors/food-items/${id}/`, data),
  deleteFoodItem: (id) => api.delete(`/vendors/food-items/${id}/`),
}

// Orders
export const ordersAPI = {
  list: (params) => api.get('/orders/', { params }),
  create: (data) => api.post('/orders/create/', data),
  get: (id) => api.get(`/orders/${id}/`),
}

// Transactions
export const transactionsAPI = {
  list: (params) => api.get('/transactions/', { params }),
  topup: (data) => api.post('/transactions/topup/', data),
  receipt: (orderId) => api.get(`/transactions/receipt/${orderId}/`, { responseType: 'blob' }),
  dailyReport: (date) => api.get('/transactions/reports/daily/', { params: { date } }),
  topupReport: (date) => api.get('/transactions/reports/topup/', { params: { date } }),
}
