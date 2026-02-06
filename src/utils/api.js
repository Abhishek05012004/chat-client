import axios from "axios"

// Use your Render server URL directly
const API_URL = "https://chat-server-5h9u.onrender.com"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Add this for cookies
})

// Add token to requests (sessionStorage - cleared when tab/browser closes)
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Handle token expiration - BUT NOT FOR LOGIN REQUESTS
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config
    
    // Only redirect to login for authenticated requests (not login attempts)
    if (error.response?.status === 401 && 
        !originalRequest.url.includes('/api/auth/login') && 
        !originalRequest.url.includes('/api/auth/register')) {
      sessionStorage.removeItem("token")
      sessionStorage.removeItem("user")
      window.location.href = "/login"
    }
    
    return Promise.reject(error)
  },
)

export default api