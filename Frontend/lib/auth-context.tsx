"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usersApi, type User } from "@/lib/api"
import { clearCache } from "@/lib/api/cache"
import { getToken, setToken, setUnauthorizedHandler } from "@/lib/api/client"

interface AuthContextValue {
  user: User | null
  /** True until the stored token has been checked against the API. */
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>
  logout: () => void
  /** Merge fresh fields into the cached user after a profile save. */
  patchUser: (patch: Partial<User>) => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Cached responses belong to the account that fetched them — dropping the
  // store here is what stops the next person to sign in on this browser from
  // seeing the previous one's notes flash up before their own load.
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    clearCache()
  }, [])

  // Restore the session from a stored token on first mount.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await usersApi.me()
        if (!cancelled) setUser(me)
      } catch {
        // Token is stale or the API is down — fall back to signed-out.
        if (!cancelled) setToken(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [])

  // A 401 anywhere in the app drops us back to the sign-in screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      clearCache()
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const auth = await usersApi.login({ email, password })
    setToken(auth.token)
    // The login response omits bio/profile_pic, so read the full profile.
    try {
      setUser(await usersApi.me())
    } catch {
      setUser({ _id: auth._id, username: auth.username, email: auth.email })
    }
  }, [])

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const auth = await usersApi.register({ username, email, password })
      setToken(auth.token)
      try {
        setUser(await usersApi.me())
      } catch {
        setUser({ _id: auth._id, username: auth.username, email: auth.email })
      }
    },
    []
  )

  const patchUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current))
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) return
    setUser(await usersApi.me())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      patchUser,
      refresh,
    }),
    [user, loading, login, register, logout, patchUser, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }
  return context
}
