'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuthUser {
  id: string
  name: string
  type: string
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  workspaceId: string | null
  workspaceName: string | null
  login: (name: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    setUser(stored ? (JSON.parse(stored) as AuthUser) : null)
    setToken(localStorage.getItem('accessToken'))
    setWorkspaceId(localStorage.getItem('workspaceId'))
    setWorkspaceName(localStorage.getItem('workspaceName'))
    setIsLoading(false)
  }, [])

  const login = useCallback(async (name: string, password: string) => {
    const res = await fetch('/api/v1/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error?.message ?? 'Login failed')
    }
    const data = await res.json()
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    if (data.workspaceId) {
      localStorage.setItem('workspaceId', data.workspaceId)
    } else {
      localStorage.removeItem('workspaceId')
    }
    if (data.workspaceName) {
      localStorage.setItem('workspaceName', data.workspaceName)
    } else {
      localStorage.removeItem('workspaceName')
    }
    setToken(data.accessToken)
    setUser(data.user)
    setWorkspaceId(data.workspaceId ?? null)
    setWorkspaceName(data.workspaceName ?? null)
    router.push('/')
  }, [router])

  const logout = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('workspaceId')
    localStorage.removeItem('workspaceName')
    setToken(null)
    setUser(null)
    setWorkspaceId(null)
    setWorkspaceName(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, token, workspaceId, workspaceName, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
