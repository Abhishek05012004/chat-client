"use client"

import { useState, useEffect, useRef } from "react"
import api from "../utils/api"
import { toast } from "react-toastify"
import EmojiPicker from "emoji-picker-react"
import VideoCall from "./VideoCall"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft,
  faVideo,
  faSmile,
  faPaperclip,
  faPaperPlane,
  faTrash,
  faTrashAlt,
  faBan,
  faDownload,
  faCheck,
  faCheckDouble,
  faImage,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFile,
  faFileAlt,
  faTimes,
  faEllipsisV,
  faUser,
  faPhone,
  faInfoCircle,
  faSearch,
  faVolumeUp,
  faImage as faImageIcon,
  faMicrophone,
  faCamera,
  faExpand,
  faCompress
} from "@fortawesome/free-solid-svg-icons"

export default function ChatWindow({
  chat,
  socket,
  onOpenProfile,
  globalIncomingCall,
  onGlobalCallAccepted,
  onGlobalCallRejected,
  setGlobalIncomingCall,
  setShowGlobalCallScreen,
  onBack,
}) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileCaption, setFileCaption] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(null)
  const [isVideoCallMode, setIsVideoCallMode] = useState(false)
  const [incomingVideoCall, setIncomingVideoCall] = useState(null)
  const [otherUserOnline, setOtherUserOnline] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 })
  const [isCallFullScreen, setIsCallFullScreen] = useState(false)
  const messagesEndRef = useRef(null)
  const messageRefs = useRef({})
  const typingTimeoutRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const fileInputRef = useRef(null)
  const deleteMenuRef = useRef(null)
  const inputRef = useRef(null)
  const currentUser = JSON.parse(sessionStorage.getItem("user"))

  const otherUser = chat.participants.find((p) => p._id !== currentUser.id)

  useEffect(() => {
    if (chat) {
      fetchMessages()
      joinChat()
    }

    return () => {
      if (socket && chat) {
        socket.off("receive-message")
        socket.off("message-seen-update")
        socket.off("message-delivered-update")
        socket.off("user-typing")
        socket.off("user-stop-typing")
        socket.off("message-reaction-update")
        socket.off("message-deleted")
        socket.off("video-call-reject")
      }
    }
  }, [chat])

  useEffect(() => {
    if (socket && chat) {
      socket.off("receive-message")
      socket.off("message-delivered-update")
      socket.off("message-seen-update")
      socket.off("user-typing")
      socket.off("user-stop-typing")
      socket.off("message-reaction-update")
      socket.off("message-deleted")
      socket.off("video-call-reject")

      socket.on("receive-message", (message) => {
        if (message.chatId === chat._id) {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg._id === message._id)
            if (exists) return prev
            return [...prev, message]
          })
          if (message.sender._id !== currentUser.id) {
            markMessageAsDelivered()
            markMessageAsSeen()
          }
        }
      })

      socket.on("message-delivered-update", (data) => {
        if (data.chatId === chat._id) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId
                ? {
                    ...msg,
                    deliveredTo: msg.deliveredTo?.some((d) => d.user === data.userId)
                      ? msg.deliveredTo
                      : [...(msg.deliveredTo || []), { user: data.userId, deliveredAt: new Date() }],
                  }
                : msg,
            ),
          )
        }
      })

      socket.on("message-seen-update", (data) => {
        if (data.chatId === chat._id) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId
                ? {
                    ...msg,
                    seenBy: msg.seenBy.some((s) => s.user === data.userId)
                      ? msg.seenBy
                      : [...msg.seenBy, { user: data.userId, seenAt: new Date() }],
                  }
                : msg,
            ),
          )
        }
      })

      socket.on("user-typing", (data) => {
        if (data.chatId === chat._id && data.userId !== currentUser.id) {
          setIsTyping(true)
          setTypingUser(data.username || otherUser.username)
        }
      })

      socket.on("user-stop-typing", (data) => {
        if (data.chatId === chat._id) {
          setIsTyping(false)
          setTypingUser(null)
        }
      })

      socket.on("message-reaction-update", (data) => {
        if (data.chatId === chat._id) {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg)),
          )
        }
      })

      socket.on("message-deleted", (data) => {
        if (data.chatId === chat._id) {
          if (data.isDeletedForAll) {
            setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId))
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg._id === data.messageId
                  ? {
                      ...msg,
                      deletedBy: [...(msg.deletedBy || []), { user: data.userId }],
                    }
                  : msg,
              ),
            )
          }
        }
      })

      socket.on("video-call-reject", (data) => {
        if (data.reason === "rejected_by_user") {
          const systemMessage = {
            _id: `system-${Date.now()}`,
            content: `Video call rejected by ${data.receiverName || otherUser.username}`,
            sender: {
              _id: "system",
              username: "System",
            },
            type: "system",
            createdAt: new Date(),
            isSystem: true,
          }
          setMessages((prev) => [...prev, systemMessage])
          setIsVideoCallMode(false)
        } else if (data.reason === "unable_to_respond") {
          const systemMessage = {
            _id: `system-${Date.now()}`,
            content: `${data.receiverName || otherUser.username} is unable to respond`,
            sender: {
              _id: "system",
              username: "System",
            },
            type: "system",
            createdAt: new Date(),
            isSystem: true,
          }
          setMessages((prev) => [...prev, systemMessage])
          setIsVideoCallMode(false)
        }
      })
    }
  }, [socket, chat])

  useEffect(() => {
    if (socket && chat) {
      socket.on("video-call-offer", (data) => {
        console.log("[ChatWindow] Received video call offer:", data)
        if (data.receiverId === currentUser.id && chat._id === data.chatId) {
          setIncomingVideoCall(data)
          setIsVideoCallMode(true)
        }
      })

      socket.on("video-call-end", () => {
        setIsVideoCallMode(false)
        setIncomingVideoCall(null)
      })

      socket.on("call:accepted-notification", (data) => {
        console.log("[ChatWindow] Call accepted notification received from", data.receiverId)
        if (data.callerId === currentUser.id) {
          console.log("[ChatWindow] Setting video call mode to true for initiator")
          setIsVideoCallMode(true)
        }
      })

      socket.on("call:incoming", (data) => {
        console.log("[ChatWindow] Incoming call received from", data.callerId, "to", data.receiverId)
        console.log("[ChatWindow] Current user:", currentUser.id, "Other user:", otherUser._id, "Chat ID:", chat._id)
        console.log("[ChatWindow] Call data:", data)
        
        // Check if this call is for the current user
        if (data.receiverId !== currentUser.id) {
          console.log("[ChatWindow] Call not for current user, ignoring")
          return
        }
        
        // IMPORTANT: Don't set incomingVideoCall state here
        // Let ChatApp handle the global incoming call screen
        // The VideoCall component will handle calls from the current chat
        
        // If this call is for the current chat, just log it
        const isForThisChat = (data.chatId && data.chatId === chat._id) || 
                              (data.callerId === otherUser._id)
        
        if (isForThisChat) {
          console.log("[ChatWindow] Call is for current chat, VideoCall component will handle it");
          // Only set incomingVideoCall if this is for the current chat
          // and we're not already showing a global call screen
          setIncomingVideoCall(data);
          setIsVideoCallMode(true);
        }
      })

      socket.on("user-status-changed", (data) => {
        console.log("[ChatWindow] Status change received:", data)
        if (String(data.userId) === String(otherUser._id)) {
          setOtherUserOnline(data.status === "online")
          console.log("[ChatWindow] Other user online status:", data.status === "online")
        }
      })

      // When call ends (timeout/no answer, reject, or hang up), clear incoming call card when we're the receiver
      socket.on("call:ended", (data) => {
        const isReceiver = String(data.receiverId) === String(currentUser.id)
        const isCallerFromThisChat = String(data.callerId) === String(otherUser._id)
        if (isReceiver && isCallerFromThisChat) {
          setIncomingVideoCall(null)
          setIsVideoCallMode(false)
          if (setGlobalIncomingCall) setGlobalIncomingCall(null)
          if (setShowGlobalCallScreen) setShowGlobalCallScreen(false)
        }
      })

      return () => {
        socket.off("video-call-offer")
        socket.off("video-call-end")
        socket.off("call:accepted-notification")
        socket.off("call:incoming")
        socket.off("user-status-changed")
        socket.off("call:ended")
      }
    }
  }, [socket, chat, currentUser, otherUser._id])

  useEffect(() => {
    if (globalIncomingCall && chat) {
      // Check if this call is for the current chat
      const isForThisChat = globalIncomingCall.chatId === chat._id || 
                           globalIncomingCall.callerId === otherUser._id
      
      if (isForThisChat && globalIncomingCall.receiverId === currentUser.id) {
        console.log("[ChatWindow] Setting incoming call from global call screen, autoAccept:", globalIncomingCall.autoAccept)
        
        // Only set incomingVideoCall if we're in the right chat
        setIncomingVideoCall(globalIncomingCall)
        setIsVideoCallMode(true)
        
        // Clear the global call after setting it in ChatWindow
        if (setGlobalIncomingCall) {
          setGlobalIncomingCall(null)
        }
        if (setShowGlobalCallScreen) {
          setShowGlobalCallScreen(false)
        }
      }
    }
  }, [globalIncomingCall, chat, otherUser._id, currentUser.id, setGlobalIncomingCall, setShowGlobalCallScreen])

  useEffect(() => {
    if (otherUser) {
      const isOnline = otherUser.status === "online"
      setOtherUserOnline(isOnline)
      console.log("[ChatWindow] Initial other user status:", isOnline, "otherUser._id:", otherUser._id)
    }
  }, [otherUser])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false)
        setShowReactionPicker(null)
      }
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target)) {
        setShowDeleteMenu(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (chat && messages.length > 0) {
      markMessageAsDelivered()
      markMessageAsSeen()
    }
  }, [chat, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const joinChat = () => {
    if (socket) {
      socket.emit("join-chat", chat._id)
    }
  }

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/chats/${chat._id}/messages`)
      setMessages(response.data.messages)
    } catch (error) {
      console.error("Fetch messages error:", error)
      toast.error("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  const markMessageAsDelivered = async () => {
    try {
      const undeliveredMessages = messages.filter(
        (msg) => msg.sender._id !== currentUser.id && !msg.deliveredTo?.some((d) => d.user === currentUser.id),
      )

      if (undeliveredMessages.length > 0) {
        await api.post(`/api/chats/${chat._id}/delivered`)

        undeliveredMessages.forEach((msg) => {
          if (socket) {
            socket.emit("message-delivered", {
              chatId: chat._id,
              messageId: msg._id,
              userId: currentUser.id,
            })
          }
        })
      }
    } catch (error) {
      console.error("Mark delivered error:", error)
    }
  }

  const markMessageAsSeen = async () => {
    try {
      const unseenMessages = messages.filter(
        (msg) => msg.sender._id !== currentUser.id && !msg.seenBy.some((s) => s.user === currentUser.id),
      )

      if (unseenMessages.length > 0) {
        await api.post(`/api/chats/${chat._id}/seen`)

        unseenMessages.forEach((msg) => {
          if (socket) {
            socket.emit("message-seen", {
              chatId: chat._id,
              messageId: msg._id,
              userId: currentUser.id,
            })
          }
        })
      }
    } catch (error) {
      console.error("Mark seen error:", error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    try {
      const response = await api.post(`/api/chats/${chat._id}/messages`, {
        content: newMessage,
      })

      const messageData = {
        ...response.data.message,
        chatId: chat._id,
      }

      if (socket) {
        socket.emit("send-message", messageData)
        socket.emit("unread-count-changed", { chatId: chat._id })
      }

      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === response.data.message._id)
        if (exists) return prev
        return [...prev, response.data.message]
      })

      setNewMessage("")
      setShowEmojiPicker(false)
      stopTyping()
    } catch (error) {
      console.error("Send message error:", error)
      toast.error("Failed to send message")
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile({
        file,
        name: file.name,
        type: file.type,
        size: file.size,
      })
      fileInputRef.current.value = ""
    }
  }

  const handleSendFile = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile.file)
      formData.append("caption", fileCaption)

      const response = await api.post(`/api/uploads/${chat._id}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const messageData = {
        ...response.data.message,
        chatId: chat._id,
      }

      if (socket) {
        socket.emit("send-message", messageData)
        socket.emit("unread-count-changed", { chatId: chat._id })
      }

      setMessages((prev) => [...prev, response.data.message])
      setSelectedFile(null)
      setFileCaption("")
      toast.success("File sent successfully")
    } catch (error) {
      console.error("File upload error:", error)
      toast.error(error.response?.data?.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelFile = () => {
    setSelectedFile(null)
    setFileCaption("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDeleteMessage = async (messageId, deleteType) => {
    try {
      await api.delete(`/api/chats/${chat._id}/messages/${messageId}`, {
        data: { deleteType },
      })

      if (deleteType === "everyone") {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId))
      } else {
        setMessages((prev) =>
          prev.filter((msg) => {
            if (msg._id === messageId) {
              return false
            }
            return true
          }),
        )
      }

      if (socket) {
        socket.emit("message-deleted", {
          chatId: chat._id,
          messageId,
          userId: currentUser.id,
          isDeletedForAll: deleteType === "everyone",
        })
      }

      toast.success(`Message deleted ${deleteType === "everyone" ? "for everyone" : ""}`)
      setShowDeleteMenu(null)
    } catch (error) {
      console.error("Delete message error:", error)
      toast.error(error.response?.data?.message || "Failed to delete message")
    }
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return faImageIcon
    if (fileType.includes("pdf")) return faFilePdf
    if (fileType.includes("word") || fileType.includes("document")) return faFileWord
    if (fileType.includes("excel") || fileType.includes("sheet")) return faFileExcel
    if (fileType.includes("text") || fileType.includes("plain")) return faFileAlt
    return faFile
  }

  const getFileIconColor = (fileType) => {
    if (fileType.startsWith("image/")) return "text-purple-500"
    if (fileType.includes("pdf")) return "text-red-500"
    if (fileType.includes("word") || fileType.includes("document")) return "text-blue-500"
    if (fileType.includes("excel") || fileType.includes("sheet")) return "text-green-500"
    return "text-gray-500"
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)

    if (socket) {
      socket.emit("typing", { chatId: chat._id, userId: currentUser.id, username: currentUser.username })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 1000)
    }
  }

  const stopTyping = () => {
    if (socket) {
      socket.emit("stop-typing", { chatId: chat._id, userId: currentUser.id })
    }
  }

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await api.post(`/api/chats/${chat._id}/messages/${messageId}/react`, { emoji })

      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions: response.data.message.reactions } : msg)),
      )

      if (socket) {
        socket.emit("message-reacted", {
          chatId: chat._id,
          messageId,
          reactions: response.data.message.reactions,
        })
      }

      setShowReactionPicker(null)
    } catch (error) {
      console.error("Reaction error:", error)
      toast.error("Failed to add reaction")
    }
  }

  const getMessageStatus = (message) => {
    if (message.sender._id !== currentUser.id) return null

    const isRead = message.seenBy?.some((seen) => seen.user === otherUser._id)
    const isDelivered = message.deliveredTo?.some((delivered) => delivered.user === otherUser._id)

    if (isRead) {
      return { icon: faCheckDouble, color: "text-blue-500", label: "Read" }
    } else if (isDelivered) {
      return { icon: faCheckDouble, color: "text-gray-400", label: "Delivered" }
    } else {
      return { icon: faCheck, color: "text-gray-400", label: "Sent" }
    }
  }

  const groupMessagesByDate = (messages) => {
    const groups = {}
    messages.forEach((message) => {
      const date = new Date(message.createdAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let dateKey
      if (date.toDateString() === today.toDateString()) {
        dateKey = "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = "Yesterday"
      } else {
        dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    return groups
  }

  const groupedMessages = groupMessagesByDate(messages)

  const handleStartVideoCall = () => {
    if (!otherUserOnline) {
      toast.warning(`${otherUser.username} is not online`)
      return
    }
    
    console.log("[ChatWindow] Starting video call with", otherUser.username)
    
    // Reset any existing call state
    setIncomingVideoCall(null)
    
    // Set video call mode to true
    setIsVideoCallMode(true)
  }

  const handleAcceptVideoCall = (callData) => {
    setIsVideoCallMode(true)
    if (setGlobalIncomingCall) {
      setGlobalIncomingCall(null)
      setShowGlobalCallScreen(false)
    }
  }

  const handleRejectVideoCall = () => {
    setIncomingVideoCall(null)
    setIsVideoCallMode(false)
    if (setGlobalIncomingCall) {
      setGlobalIncomingCall(null)
      setShowGlobalCallScreen(false)
    }
  }

  const handleEndVideoCall = () => {
    setIsVideoCallMode(false)
    setIncomingVideoCall(null)
    setIsCallFullScreen(false)
    if (setGlobalIncomingCall) {
      setGlobalIncomingCall(null)
      setShowGlobalCallScreen(false)
    }
  }

  const handleCallLog = async (chatId, callStatus, callerId, durationInSeconds) => {
    try {
      const response = await api.post(`/api/chats/${chatId}/call-log`, {
        callStatus,
        callerId,
        durationInSeconds: durationInSeconds ?? undefined,
      })
      const newMessage = { ...response.data.message, chatId }
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newMessage._id)
        if (exists) return prev
        return [...prev, newMessage]
      })
      if (socket) {
        socket.emit("send-message", newMessage)
        socket.emit("unread-count-changed", { chatId })
      }
    } catch (error) {
      console.error("[ChatWindow] Call log error:", error)
    }
  }

  const handleToggleEmojiPicker = () => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false)
    } else {
      const inputRect = inputRef.current?.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const pickerHeight = 350
      
      if (inputRect && windowHeight - inputRect.bottom > pickerHeight + 10) {
        setEmojiPickerPosition({
          top: inputRect.bottom + 5,
          left: inputRect.left,
        })
      } else {
        setEmojiPickerPosition({
          top: inputRect?.top - pickerHeight - 5 || 0,
          left: inputRect?.left || 0,
        })
      }
      setShowEmojiPicker(true)
    }
  }

  const handleToggleReactionPicker = (messageId, event) => {
    if (showReactionPicker === messageId) {
      setShowReactionPicker(null)
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const pickerHeight = 300
      
      if (buttonRect.top < pickerHeight + 10) {
        setEmojiPickerPosition({
          top: buttonRect.bottom + 5,
          left: buttonRect.left - 100,
        })
      } else {
        setEmojiPickerPosition({
          top: buttonRect.top - pickerHeight - 5,
          left: buttonRect.left - 100,
        })
      }
      setShowReactionPicker(messageId)
    }
  }

  const handleToggleFullScreen = () => {
    setIsCallFullScreen(!isCallFullScreen)
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Video Call Overlay - Only when in video call mode */}
      {isVideoCallMode && (
        <div className={`${isCallFullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-40'}`}>
          <VideoCall
            chat={chat}
            socket={socket}
            onCallEnd={handleEndVideoCall}
            onCallLog={handleCallLog}
            otherUser={otherUser}
            currentUser={currentUser}
            isVisible={isVideoCallMode}
            incomingCallData={incomingVideoCall}
            isFullScreen={isCallFullScreen}
            onToggleFullScreen={handleToggleFullScreen}
          />
        </div>
      )}

      {/* Chat Header */}
      <div className={`bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 flex-shrink-0 ${isVideoCallMode && !isCallFullScreen ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden text-gray-600 hover:text-gray-800 transition"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
          </button>
          
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onOpenProfile(otherUser._id, false)}
          >
            {otherUser.profileImage ? (
              <img
                src={otherUser.profileImage || "/placeholder.svg"}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {otherUser.username[0].toUpperCase()}
              </div>
            )}
            
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800 text-base">{otherUser.username}</h3>
              <p className="text-xs text-gray-600">
                {isTyping ? (
                  <span className="text-green-600 animate-pulse">typing...</span>
                ) : otherUserOnline ? (
                  <span className="text-green-600">online</span>
                ) : (
                  `last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}`
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleStartVideoCall}
            className={`text-gray-600 hover:text-gray-800 transition ${!otherUserOnline ? "opacity-50 cursor-not-allowed" : ""}`}
            title={otherUserOnline ? "Video call" : "User is offline"}
            disabled={!otherUserOnline}
          >
            <FontAwesomeIcon icon={faVideo} className="text-xl" />
          </button>
          <button className="text-gray-600 hover:text-gray-800 transition">
            <FontAwesomeIcon icon={faEllipsisV} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Messages section */}
      <div className={`flex-1 overflow-y-auto bg-gray-50 p-4 ${isVideoCallMode && !isCallFullScreen ? 'opacity-30 pointer-events-none' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faUser} className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-gray-800 text-lg font-semibold mb-2">Say hello to {otherUser.username}</h3>
            <p className="text-gray-600 text-sm">Start a conversation now</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-6">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                    {date}
                  </div>
                </div>

                {dateMessages.map((message, index) => {
                  const isOwn = message.sender._id === currentUser.id
                  const isSystem = message.isSystem
                  const isCallMessage = message.type === "call"
                  const messageStatus = !isCallMessage ? getMessageStatus(message) : null

                  return isSystem ? (
                    <div key={message._id} className="flex justify-center my-2">
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={message._id}
                      ref={(el) => (messageRefs.current[message._id] = el)}
                      className={`flex mb-1 ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[65%] md:max-w-[50%]`}>
                        <div className="relative group">
                          {/* Message bubble */}
                          <div
                            className={`rounded-lg px-3 py-1.5 ${isOwn
                              ? "bg-blue-500 text-white rounded-tr-none"
                              : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                            }`}
                          >
                            {isCallMessage ? (
                              <div className="flex items-center gap-2 py-0.5">
                                <FontAwesomeIcon icon={faVideo} className="text-sm opacity-90 shrink-0" />
                                <p className="text-sm break-words whitespace-pre-wrap flex-1">
                                  {message.content}
                                </p>
                                <p className="text-[10px] opacity-70 whitespace-nowrap shrink-0">
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ) : message.content && (
                              <div className="flex items-end">
                                <p className="text-sm break-words whitespace-pre-wrap flex-1 pr-10">
                                  {message.content}
                                </p>
                                <div className="flex items-center gap-1 shrink-0 pl-1 self-end">
                                  <p className="text-[10px] opacity-70 whitespace-nowrap">
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {messageStatus && (
                                    <FontAwesomeIcon 
                                      icon={messageStatus.icon} 
                                      className={`text-[10px] ${messageStatus.color}`}
                                      title={messageStatus.label}
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-1">
                                {message.attachments.map((attachment, idx) => {
                                  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"
                                  const downloadUrl = `${API_URL}${attachment.fileUrl}`

                                  return (
                                    <a
                                      key={idx}
                                      href={downloadUrl}
                                      download={attachment.fileName}
                                      className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg mb-1 transition-colors cursor-pointer border border-gray-300"
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <FontAwesomeIcon 
                                        icon={getFileIcon(attachment.fileType)} 
                                        className={`text-lg ${getFileIconColor(attachment.fileType)}`}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                          {attachment.fileName}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                      </div>
                                      <FontAwesomeIcon 
                                        icon={faDownload} 
                                        className="text-gray-500 text-xs"
                                      />
                                    </a>
                                  )
                                })}
                                {/* Time and status for attachment messages */}
                                <div className="flex justify-end items-center gap-1 mt-0.5">
                                  <p className="text-[10px] opacity-70">
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {/* Only show status for my own messages */}
                                  {messageStatus && (
                                    <FontAwesomeIcon 
                                      icon={messageStatus.icon} 
                                      className={`text-[10px] ${messageStatus.color}`}
                                      title={messageStatus.label}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reactions - not for call messages */}
                          {!isCallMessage && message.reactions && message.reactions.length > 0 && (
                            <div className={`flex gap-1 mt-0.5 flex-wrap ${isOwn ? "justify-end" : "justify-start"}`}>
                              {Array.from(
                                message.reactions.reduce((acc, r) => {
                                  acc.set(r.emoji, (acc.get(r.emoji) || 0) + 1)
                                  return acc
                                }, new Map()),
                              ).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message._id, emoji)}
                                  className="bg-gray-200 hover:bg-gray-300 rounded-full px-1.5 py-0.5 text-xs flex items-center gap-0.5"
                                >
                                  <span className="text-xs">{emoji}</span>
                                  <span className="text-[9px] text-gray-600">{count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Message actions - not for call messages (WhatsApp-style) */}
                          {!isCallMessage && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 ${isOwn 
                              ? "left-0 -translate-x-full mr-1" 
                              : "right-0 translate-x-full ml-1"} opacity-0 group-hover:opacity-100 transition-opacity`}
                          >
                            <div className="bg-white border border-gray-300 rounded-md shadow-sm flex items-center p-0.5">
                              <button
                                onClick={(e) => handleToggleReactionPicker(message._id, e)}
                                className="p-1 hover:bg-gray-100 rounded-sm transition-colors"
                                title="Add reaction"
                              >
                                <FontAwesomeIcon icon={faSmile} className="text-gray-600 text-xs" />
                              </button>

                              <div ref={deleteMenuRef} className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowDeleteMenu(showDeleteMenu === message._id ? null : message._id)
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded-sm transition-colors"
                                  title="Delete message"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-gray-600 text-xs" />
                                </button>

                                {showDeleteMenu === message._id && (
                                  <div
                                    className={`absolute bottom-full ${isOwn ? "right-0" : "left-0"} mb-0.5 bg-white border border-gray-300 rounded-md shadow-lg z-20 min-w-max`}
                                  >
                                    <button
                                      onClick={() => handleDeleteMessage(message._id, "me")}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                    >
                                      <FontAwesomeIcon icon={faTrashAlt} className="text-gray-600 mr-1.5 text-xs" />
                                      Delete for me
                                    </button>
                                    {isOwn && (
                                      <button
                                        onClick={() => handleDeleteMessage(message._id, "everyone")}
                                        className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border-t border-gray-200"
                                      >
                                        <FontAwesomeIcon icon={faBan} className="text-red-600 mr-1.5 text-xs" />
                                        Delete for everyone
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reaction picker */}
      {showReactionPicker && (
        <div
          ref={emojiPickerRef}
          className="fixed z-[100]"
          style={{
            top: emojiPickerPosition.top,
            left: emojiPickerPosition.left,
          }}
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              handleReaction(showReactionPicker, emojiData.emoji)
              setShowReactionPicker(null)
            }}
            width={250}
            height={300}
            previewConfig={{ showPreview: false }}
            searchDisabled
            skinTonesDisabled
          />
        </div>
      )}

      {/* Message Input */}
      <div className={`bg-gray-50 p-3 border-t border-gray-200 ${isVideoCallMode && !isCallFullScreen ? 'opacity-30 pointer-events-none' : ''}`}>
        {selectedFile && (
          <div className="mb-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <FontAwesomeIcon 
                  icon={getFileIcon(selectedFile.type)} 
                  className="text-xl text-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-600">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={handleCancelFile}
                className="text-gray-500 hover:text-gray-700"
                title="Cancel"
              >
                <FontAwesomeIcon icon={faTimes} className="text-lg" />
              </button>
            </div>
            <input
              type="text"
              value={fileCaption}
              onChange={(e) => setFileCaption(e.target.value)}
              placeholder="Add caption (optional)"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <form
          onSubmit={
            selectedFile
              ? (e) => {
                  e.preventDefault()
                  handleSendFile()
                }
              : handleSendMessage
          }
          className="flex items-center gap-2"
        >
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleEmojiPicker}
              className="p-3 text-gray-600 hover:text-gray-800 transition disabled:opacity-50"
              title="Add emoji"
              disabled={selectedFile !== null}
            >
              <FontAwesomeIcon icon={faSmile} className="text-xl" />
            </button>
          </div>

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={uploading || selectedFile !== null}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || selectedFile !== null}
              className="p-3 text-gray-600 hover:text-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach file"
            >
              <FontAwesomeIcon icon={faPaperclip} className="text-xl" />
            </button>
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-800 placeholder-gray-500 text-sm"
              disabled={selectedFile !== null}
            />
          </div>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="fixed z-[100]"
              style={{
                top: emojiPickerPosition.top,
                left: emojiPickerPosition.left,
              }}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={250}
                height={300}
                previewConfig={{ showPreview: false }}
                searchDisabled
                skinTonesDisabled
              />
            </div>
          )}

          {selectedFile ? (
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FontAwesomeIcon icon={faPaperPlane} className="text-lg" />
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`p-3 rounded-full transition flex items-center justify-center ${
                newMessage.trim()
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-lg" />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}