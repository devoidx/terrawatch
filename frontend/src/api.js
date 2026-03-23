import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tw_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tw_token')
      window.location.href = '/login?expired=1'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register    = d  => api.post('/auth/register', d).then(r => r.data)
export const login       = d  => api.post('/auth/login', new URLSearchParams(d), {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
}).then(r => r.data)
export const getMe       = () => api.get('/auth/me').then(r => r.data)

// ── Users ────────────────────────────────────────────────────────────────────
export const updateEmail        = d => api.patch('/users/me/email', d).then(r => r.data)
export const changePassword     = d => api.patch('/users/me/password', d).then(r => r.data)
export const getNotifPrefs      = () => api.get('/users/me/notifications').then(r => r.data)
export const updateNotifPrefs   = d => api.patch('/users/me/notifications', d).then(r => r.data)

// ── Alert Regions ─────────────────────────────────────────────────────────────
export const getAlertRegions    = () => api.get('/alerts/regions').then(r => r.data)
export const createAlertRegion  = d  => api.post('/alerts/regions', d).then(r => r.data)
export const updateAlertRegion  = (id, d) => api.patch(`/alerts/regions/${id}`, d).then(r => r.data)
export const deleteAlertRegion  = id => api.delete(`/alerts/regions/${id}`)
export const getAlertHistory    = () => api.get('/alerts/history').then(r => r.data)

// ── Live Data ─────────────────────────────────────────────────────────────────
export const getEarthquakes = (params) =>
  api.get('/data/earthquakes', { params }).then(r => r.data)
export const getVolcanoes   = (params) =>
  api.get('/data/volcanoes', { params }).then(r => r.data)
export const getEqStats     = () =>
  api.get('/data/earthquakes/stats').then(r => r.data)

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminGetUsers      = () => api.get('/admin/users').then(r => r.data)
export const adminUpdateUser    = (id, d) => api.patch(`/admin/users/${id}`, d).then(r => r.data)
export const adminDeleteUser    = id => api.delete(`/admin/users/${id}`)
export const adminGetRegions    = () => api.get('/admin/alert-regions').then(r => r.data)
export const adminGetSentAlerts = () => api.get('/admin/sent-alerts').then(r => r.data)
export const adminGetSettings   = () => api.get('/admin/settings').then(r => r.data)
export const adminUpdateSetting = (key, d) => api.patch(`/admin/settings/${key}`, d).then(r => r.data)

export const adminUpdateSmtp    = d  => api.patch('/admin/settings/smtp', d).then(r => r.data)
export const adminTestSmtp      = () => api.post('/admin/settings/smtp/test').then(r => r.data)
