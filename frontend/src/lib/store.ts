import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
  emailVerified?: boolean
  kycStatus?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setUser: (user: User) => void
  setLoading: (v: boolean) => void
  isLoggedIn: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,

  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
    }
    set({ user, accessToken })
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
    }
    set({ user: null, accessToken: null })
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  setLoading: (isLoading) => set({ isLoading }),

  isLoggedIn: () => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('access_token')
  },
}))

// Hydrate from localStorage on app boot
export function hydrateAuth() {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('access_token')
  const userStr = localStorage.getItem('user')
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr)
      useAuthStore.getState().setAuth(user, token, localStorage.getItem('refresh_token') || '')
    } catch {}
  }
}
