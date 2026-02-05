"use client"

import { createContext, useState, useEffect, useContext } from "react"
import api from "../utils/api"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Use sessionStorage so user is logged out when tab/browser is closed
    const token = sessionStorage.getItem("token")
    if (token) {
      try {
        const response = await api.get("/api/auth/me")
        const profileResponse = await api.get("/api/profile")
        const userData = {
          ...response.data.user,
          profileImage: profileResponse.data.profileImage,
          bio: profileResponse.data.bio,
        }
        setUser(userData)
        sessionStorage.setItem("user", JSON.stringify(userData))
      } catch (error) {
        console.error("[v0] Auth check failed:", error)
        sessionStorage.removeItem("token")
        sessionStorage.removeItem("user")
      }
    }
    setLoading(false)
  }

  const login = (token, userData) => {
    // sessionStorage clears when tab/browser closes - user must login again on next visit
    sessionStorage.setItem("token", token)
    sessionStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
  }

  const updateUser = (updatedData) => {
    const newUserData = { ...user, ...updatedData }
    setUser(newUserData)
    sessionStorage.setItem("user", JSON.stringify(newUserData))
  }

  const logout = async () => {
    try {
      await api.post("/api/auth/logout")
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
    sessionStorage.removeItem("token")
    sessionStorage.removeItem("user")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}