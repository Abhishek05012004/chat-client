"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "react-toastify"
import api from "../utils/api"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faKey, 
  faEnvelope, 
  faShieldAlt, 
  faArrowLeft,
  faSpinner,
  faCheckCircle,
  faRedoAlt
} from "@fortawesome/free-solid-svg-icons"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState("")
  const [formData, setFormData] = useState({
    identifier: "",
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

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post("/api/auth/forgot-password", {
        identifier: formData.identifier,
      })
      setUserId(response.data.userId)
      setStep(2)
      toast.success("OTP sent to your registered email!")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post("/api/auth/verify-forgot-otp", {
        userId,
        otp: formData.otp,
      })
      setStep(3)
      toast.success("OTP verified! Set your new password")
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid OTP")
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      await api.post("/api/auth/reset-password", {
        userId,
        password: formData.password,
      })
      toast.success("Password reset successful! You can now login")
      setTimeout(() => navigate("/login"), 2000)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)
    try {
      await api.post("/api/auth/resend-forgot-otp", { userId })
      toast.success("OTP resent to your email!")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      navigate("/login")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleBack}
                className="cursor-pointer p-2 hover:bg-white/50 rounded-xl transition text-indigo-600"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Reset Password</h1>
                <p className="text-gray-600 text-sm md:text-base">
                  {step === 1 && "Enter your username, email, or phone to receive OTP"}
                  {step === 2 && "Enter the OTP sent to your registered email"}
                  {step === 3 && "Create a strong new password for your account"}
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mt-4">
              <div className={`flex items-center ${step >= 1 ? "text-indigo-600" : "text-gray-400"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    step >= 1 ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "bg-gray-200"
                  }`}
                >
                  <FontAwesomeIcon icon={step > 1 ? faCheckCircle : faEnvelope} className="text-xs" />
                </div>
                <span className="ml-2 text-xs font-medium hidden md:block">Verify Identity</span>
              </div>
              <div className={`w-8 h-1 mx-2 ${step >= 2 ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-200"}`}></div>
              <div className={`flex items-center ${step >= 2 ? "text-indigo-600" : "text-gray-400"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    step >= 2 ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "bg-gray-200"
                  }`}
                >
                  <FontAwesomeIcon icon={step > 2 ? faCheckCircle : faShieldAlt} className="text-xs" />
                </div>
                <span className="ml-2 text-xs font-medium hidden md:block">Enter OTP</span>
              </div>
              <div className={`w-8 h-1 mx-2 ${step >= 3 ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-200"}`}></div>
              <div className={`flex items-center ${step >= 3 ? "text-indigo-600" : "text-gray-400"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    step >= 3 ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow" : "bg-gray-200"
                  }`}
                >
                  <FontAwesomeIcon icon={faKey} className="text-xs" />
                </div>
                <span className="ml-2 text-xs font-medium hidden md:block">New Password</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6 md:p-8">
            {/* Step 1: Request OTP */}
            {step === 1 && (
              <form onSubmit={handleRequestOTP} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Username / Email / Phone
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FontAwesomeIcon 
                        icon={faEnvelope} 
                        className="text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors" 
                      />
                    </div>
                    <input
                      type="text"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                      placeholder="Enter your username, email or phone"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm md:text-base hover:border-gray-400"
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the username, email, or phone associated with your account
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl shadow hover:shadow-md transform hover:-translate-y-0.5 disabled:transform-none transition-all duration-200 text-sm md:text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                      <span>Sending OTP...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FontAwesomeIcon icon={faShieldAlt} />
                      <span>Send Verification OTP</span>
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
                    Enter the 6-digit OTP sent to your registered email
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Check your inbox and spam folder</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Verification Code
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FontAwesomeIcon 
                        icon={faShieldAlt} 
                        className="text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors" 
                      />
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
                      <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                      <span>Verifying OTP...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>Verify & Continue</span>
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
                    <FontAwesomeIcon icon={faRedoAlt} />
                    <span>Resend OTP</span>
                  </button>
                  <p className="text-gray-500 text-xs mt-2">Didn't receive the code? Wait 60 seconds before resending</p>
                </div>
              </form>
            )}

            {/* Step 3: Reset Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FontAwesomeIcon 
                        icon={faKey} 
                        className="text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors" 
                      />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your new password"
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
                        <FontAwesomeIcon icon={showPassword ? "eye-slash" : "eye"} className="text-sm" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FontAwesomeIcon 
                        icon={faKey} 
                        className="text-gray-400 text-sm md:text-base group-focus-within:text-indigo-600 transition-colors" 
                      />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your new password"
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
                        <FontAwesomeIcon icon={showConfirmPassword ? "eye-slash" : "eye"} className="text-sm" />
                      </button>
                    </div>
                  </div>
                  {formData.password && formData.confirmPassword && (
                    <p className={`text-xs font-medium mt-1 ${
                      formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formData.password === formData.confirmPassword 
                        ? '✓ Passwords match' 
                        : '✗ Passwords do not match'}
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
                      <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                      <span>Resetting Password...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>Reset Password</span>
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Back to Login Link */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm mb-3">
                Remember your password?
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors group"
              >
                <span>Back to Login</span>
                <FontAwesomeIcon icon={faArrowLeft} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 md:px-8 py-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              Password reset is secure and encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}