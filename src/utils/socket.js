import { io } from "socket.io-client"

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://chat-server-5h9u.onrender.com"

let socket = null
let currentUserId = null
let currentLoginTime = null

export const initializeSocket = (userId) => {
  // Always create a new socket connection on fresh login
  if (socket) {
    socket.disconnect()
    socket = null
  }

  currentUserId = userId
  currentLoginTime = Date.now() // Store login timestamp

  const emitUserOnline = () => {
    if (currentUserId && socket) {
      console.log("[Socket] Emitting user-online for", currentUserId, "loginTime:", currentLoginTime)
      socket.emit("user-online", String(currentUserId), currentLoginTime)
    }
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"], // Add this for better compatibility
    withCredentials: true, // Add this for cookies/auth
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.connect()

  // Emit user-online when connected
  socket.on("connect", () => {
    console.log("[Socket] Connected, emitting user-online for", currentUserId)
    emitUserOnline()
  })

  // If already connected (e.g. fast reconnect), emit immediately
  if (socket.connected) {
    emitUserOnline()
  }

  // Handle reconnection - re-announce as online
  socket.on("reconnect", () => {
    console.log("[Socket] Reconnected, emitting user-online for", currentUserId)
    emitUserOnline()
  })

  return socket
}

export const getSocket = () => {
  return socket
}

export const disconnectSocket = () => {
  if (socket && currentUserId) {
    // Emit user-offline with login time to ensure we only logout the right session
    socket.emit("user-offline", String(currentUserId))
  }
  
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  currentUserId = null
  currentLoginTime = null
}