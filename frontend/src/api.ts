import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE ?? '/api'
export const api = axios.create({ baseURL })

function getAccess() { return localStorage.getItem('access') }
function getRefresh() { return localStorage.getItem('refresh') }
function setAccess(t: string) { localStorage.setItem('access', t) }

api.interceptors.request.use(cfg => {
  const token = getAccess()
  if (token) cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` }
  return cfg
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(r => r, async (error) => {
  const original = (error.config || {}) as any
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true
    if (!refreshing) {
      const rt = getRefresh()
      refreshing = rt
        ? api.post('/auth/refresh/', { refresh: rt })
            .then(res => { const at = res.data.access as string; setAccess(at); return at })
            .catch(() => null)
        : Promise.resolve(null)
    }
    const newAccess = await refreshing; refreshing = null
    if (newAccess) {
      original.headers = { ...original.headers, Authorization: `Bearer ${newAccess}` }
      return api(original)
    }
    localStorage.removeItem('access'); localStorage.removeItem('refresh')
    window.location.href = '/login'
  }
  return Promise.reject(error)
})
