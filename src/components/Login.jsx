"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../utils/api"

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isRememberMe, setIsRememberMe] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) {
      setError("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.identifier.trim() || !formData.password.trim()) {
      setError("Please enter all credentials")
      return
    }

    setLoading(true)

    try {
      const response = await api.post("/api/auth/login", {
        ...formData,
        rememberMe: isRememberMe
      })
      login(response.data.token, response.data.user)
      navigate("/chat")
    } catch (err) {
      // Handle specific error cases without clearing form
      if (err.response?.status === 401) {
        setError("Invalid credentials. Please check your username/email and password.")
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || "Invalid input. Please check your credentials.")
      } else if (err.response?.status === 404) {
        setError("User not found. Please check your username/email.")
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.")
      } else if (!err.response) {
        setError("Network error. Please check your connection.")
      } else {
        const errorMessage = err.response?.data?.message || "Login failed. Please try again."
        setError(errorMessage)
      }
      setLoading(false)
      console.error("[v0] Login error:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Welcome Back Header with different background */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-md mb-4">
                <i className="fas fa-comments text-white text-xl md:text-2xl"></i>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Welcome Back</h1>
              <p className="text-gray-600 text-sm md:text-base">Login to continue your conversations</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-circle text-red-600 text-xs"></i>
                </div>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Username / Email / Phone
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-user text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                  </div>
                  <input
                    type="text"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    placeholder="Enter username, email or phone"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base ${
                      error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                    required
                    disabled={loading}
                  />
                  {formData.identifier && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, identifier: "" }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      <i className="fas fa-times text-gray-400 hover:text-gray-600 text-sm"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs md:text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base ${
                      error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                    required
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={loading}
                    >
                      <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsRememberMe(!isRememberMe)}
                  className="flex items-center gap-2 group"
                  disabled={loading}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                    isRememberMe 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : 'bg-white border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {isRememberMe && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 select-none">Remember me</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl shadow hover:shadow-md transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-200 text-sm md:text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin text-sm"></i>
                    <span>Logging in...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-sign-in-alt"></i>
                    <span>Login</span>
                  </span>
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-3">
                Don't have an account?
              </p>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors group"
              >
                <span>Create an account</span>
                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 md:px-8 py-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              By logging in, you agree to our{" "}
              <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Add these styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}