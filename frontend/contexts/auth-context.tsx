"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

interface User {
  username: string
  token: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  signup: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000")

  useEffect(() => {
    // Check for saved auth on mount
    const savedUser = localStorage.getItem("rag-user")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error("Failed to parse saved user", e)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch(`${baseUrl}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Login failed" }))
        throw new Error(error.detail || "Login failed")
      }

      const data = await response.json()
      const userData = {
        username,
        token: data.access_token,
      }

      setUser(userData)
      localStorage.setItem("rag-user", JSON.stringify(userData))

      toast({
        title: "Login Successful",
        description: "You have been logged in successfully.",
      })

      return true
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Failed to login",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Signup failed" }))
        throw new Error(error.detail || "Signup failed")
      }

      toast({
        title: "Signup Successful",
        description: "Your account has been created. Please log in.",
      })

      return true
    } catch (error) {
      console.error("Signup error:", error)
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("rag-user")
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
