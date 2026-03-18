import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken: refresh })
        localStorage.setItem('access_token', data.data.accessToken)
        localStorage.setItem('refresh_token', data.data.refreshToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        // Security: only remove auth keys, not all localStorage data
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        if (typeof window !== 'undefined') window.location.href = '/auth?reason=expired'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
}

// ── User ──────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.patch('/users/profile', data),
}

// ── Policies ──────────────────────────────────────────────────
export const policiesApi = {
  getAll: () => api.get('/policies'),
  getById: (id: string) => api.get(`/policies/${id}`),
  purchase: (data: any) => api.post('/policies/purchase', data),
  getProducts: (params?: any) => api.get('/insurance/products', { params }),
}

// ── Payments ──────────────────────────────────────────────────
export const paymentsApi = {
  create: (data: any) => api.post('/payments/create', data),
  verify: (ref: string) => api.get(`/payments/verify/${ref}`),
  getHistory: () => api.get('/payments/history'),
  deletePending: (id: string) => api.delete(`/payments/${id}`),
  retry: (id: string) => api.post(`/payments/${id}/retry`),
}

// ── Claims ────────────────────────────────────────────────────
export const claimsApi = {
  getAll: () => api.get('/claims'),
  getById: (id: string) => api.get(`/claims/${id}`),
  create: (data: any) => api.post('/claims', data),
}

// ── Chat ──────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, sessionId?: string) => api.post('/chat', { message, sessionId }),
  getHistory: (sessionId?: string) => api.get('/chat/history', { params: { sessionId } }),
}


export const compareApi = {
  // Maps category labels to Curacel product type IDs
  byCategory: (category: string, limit = 5) => {
    const typeMap: Record<string, string> = {
      motor: '2', vehicle: '10', health: '1', life: '3',
      business: '8', property: '8', gadget: '7', travel: '9',
      'fire & burglary': '8', 'goods in transit': '4', 'personal accident': '13',
      'micro health': '12', 'comprehensive auto': '10', '3rd party auto': '2',
    }
    const typeId = typeMap[category.toLowerCase()]
    return typeId
      ? api.get('/curacel/products', { params: { type: typeId, per_page: limit, calculate_premium: 1 } })
      : api.get('/curacel/products', { params: { per_page: limit, calculate_premium: 1 } })
  },
  checkEligibility: (data: { insuranceType: string; location: string; age?: number; hasCar?: boolean; hasBusiness?: boolean }) =>
    api.post('/chat/eligibility', data),
}

export const curacelApi = {
  getStatus: () => api.get('/curacel/status'),
  getProductTypes: () => api.get('/curacel/product-types'),
  getProducts: (params?: { type?: string | number; page?: number; calculate_premium?: number; per_page?: number }) =>
    api.get('/curacel/products', { params: { calculate_premium: 1, ...params } }),
  getProduct: (code: string) => api.get(`/curacel/products/${code}`),
  createQuote: (dto: any) => api.post('/curacel/quote', dto),
  convertQuote: (code: string) => api.post(`/curacel/quote/${code}/convert`),
  getPolicies: () => api.get('/curacel/policies'),
  submitClaim: (dto: any) => api.post('/curacel/claims', dto),
  getWallet: () => api.get('/curacel/wallet'),
}

export const verificationApi = {
  check: (params: { plate?: string; policy?: string }) => api.get('/insurance/verify', { params }),
  getKycStatus: () => api.get('/users/verify-identity/status'),
  sendPhoneOtp: (phone: string) => api.post('/users/verify-identity/phone/send-otp', { phone }),
  verifyPhoneOtp: (otp: string) => api.post('/users/verify-identity/phone/verify-otp', { otp }),
  verifyNIN: (nin: string) => api.post('/users/verify-identity/nin', { nin }),
  verifyBVN: (bvn: string) => api.post('/users/verify-identity/bvn', { bvn }),
}

export const renewalApi = {
  getExpiring: (days?: number) => api.get('/renewal/expiring', { params: { days } }),
  trigger: () => api.post('/renewal/trigger'),
}

export const fraudApi = {
  getFlags: (params?: { resolved?: boolean; level?: string }) => api.get('/fraud', { params }),
  getStats: () => api.get('/fraud/stats'),
  resolve: (id: string, notes: string) => api.patch(`/fraud/${id}/resolve`, { notes }),
}

export const partnerApi = {
  getQuote: (data: any) => api.post('/partner/quote', data),
  purchase: (data: any) => api.post('/partner/purchase', data),
}

export const referralsApi = {
  getStats: () => api.get('/referrals/stats'),
  generate: () => api.post('/referrals/generate'),
}

export const leadsApi = {
  create: (data: { insuranceType: string; name?: string; phone?: string; location?: string; notes?: string }) =>
    api.post('/leads', data),
  mine: () => api.get('/leads/mine'),
}

// ── SME ───────────────────────────────────────────────────────
export const smeApi = {
  create: (data: any) => api.post('/sme/create', data),
  getProfile: () => api.get('/sme/profile'),
  update: (data: any) => api.patch('/sme/profile', data),
}

// ── Recommendations ───────────────────────────────────────────
export const recommendationsApi = {
  get: (params?: Record<string, string>) => api.get('/recommendations', { params }),
  getQuote: (productId: string, context?: Record<string, any>) => api.post('/recommendations/quote', { productId, ...context }),
}

// ── Auth extended ─────────────────────────────────────────────
export const authExtendedApi = {
  verifyEmail: (otp: string) => api.post('/auth/verify-email', { otp }),
  resendOtp: () => api.post('/auth/resend-otp'),
}

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  getAll: (limit = 50) => api.get(`/notifications?limit=${limit}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
}
