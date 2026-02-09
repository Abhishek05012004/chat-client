"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"

import api from "../utils/api"

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phoneNumber: "",
    otp: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post("/api/auth/register", {
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
      })

      setUserId(response.data.userId)
      setStep(2)

    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post("/api/auth/verify-otp", {
        userId,
        otp: formData.otp,
      })

      setStep(3)

    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)

    try {
      await api.post("/api/auth/resend-otp", { userId })

    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {

      return
    }

    if (formData.password.length < 6) {

      return
    }

    setLoading(true)

    try {
      await api.post("/api/auth/set-password", {
        userId,
        password: formData.password,
      })


      setTimeout(() => navigate("/login"), 2000)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header with different background - matches login theme */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-md mb-4">
                <i className="fas fa-user-plus text-white text-xl md:text-2xl"></i>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Create Account</h1>
              <p className="text-gray-600 text-sm md:text-base">Join our chat community</p>
            </div>

            {/* Progress Steps - Enhanced design */}
            <div className="flex items-center justify-center mt-6">
              <div className={`flex items-center ${step >= 1 ? "text-indigo-600" : "text-gray-400"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    step >= 1 ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "bg-gray-200"
                  }`}
                >
                  <span className="text-sm font-semibold">1</span>
                </div>
                <span className="ml-2 text-xs font-medium hidden md:block">Register</span>
              </div>
              <div className={`w-8 h-1 mx-1 md:mx-2 ${step >= 2 ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-200"}`}></div>
              <div className={`flex items-center ${step >= 2 ? "text-indigo-600" : "text-gray-400"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    step >= 2 ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "bg-gray-200"
                  }`}
                >
                  <span className="text-sm font-semibold">2</span>
                </div>
                <span className="ml-2 text-xs font-medium hidden md:block">Verify</span>
              </div>
              <div className={`w-8 h-1 mx-1 md:mx-2 ${step >= 3 ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-200"}`}></div>
              <div className={`flex items-center ${step >= 3 ? "text-indigo-600" : "text-gray-400"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    step >= 3 ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "bg-gray-200"
                  }`}
                >
                  <span className="text-sm font-semibold">3</span>
                </div>
                <span className="ml-2 text-xs font-medium hidden md:block">Password</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6 md:p-8">
            {/* Step 1: Register */}
            {step === 1 && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-user text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                    </div>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter your username"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base hover:border-gray-400"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-envelope text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base hover:border-gray-400"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-phone text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                    </div>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base hover:border-gray-400"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl shadow hover:shadow-md transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-200 text-sm md:text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner fa-spin text-sm"></i>
                      <span>Sending OTP...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-arrow-right"></i>
                      <span>Continue</span>
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="text-center mb-2">
                  <p className="text-gray-600 text-sm md:text-base">
                    Enter the OTP sent to <span className="font-semibold text-indigo-600">{formData.email}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Check your email inbox</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    OTP Code
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-key text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                    </div>
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-center text-lg md:text-xl tracking-widest font-mono hover:border-gray-400"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl shadow hover:shadow-md transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-200 text-sm md:text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner fa-spin text-sm"></i>
                      <span>Verifying...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-check"></i>
                      <span>Verify OTP</span>
                    </span>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors inline-flex items-center gap-1"
                  >
                    <i className="fas fa-redo-alt"></i>
                    <span>Resend OTP</span>
                  </button>
                  <p className="text-gray-500 text-xs mt-2">Didn't receive the code? Check spam folder</p>
                </div>
              </form>
            )}

            {/* Step 3: Set Password */}
            {step === 3 && (
              <form onSubmit={handleSetPassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
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
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base hover:border-gray-400"
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
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-lock text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors"></i>
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base hover:border-gray-400"
                      required
                      disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={loading}
                      >
                        <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                      </button>
                    </div>
                  </div>
                  {formData.password && formData.confirmPassword && (
                    <p className={`text-xs font-medium mt-1 ${
                      formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl shadow hover:shadow-md transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-200 text-sm md:text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner fa-spin text-sm"></i>
                      <span>Creating Account...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-check-circle"></i>
                      <span>Complete Registration</span>
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-3">
                Already have an account?
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors group"
              >
                <span>Login to your account</span>
                <i className="fas fa-sign-in-alt group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 md:px-8 py-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              By registering, you agree to our{" "}
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
    </div>
  )
}