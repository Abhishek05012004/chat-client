"use client"

import { useState, useEffect, useRef } from "react"
import api from "../utils/api"

import EmojiPicker from "emoji-picker-react"
import { toast } from "react-toastify"
import VideoCall from "./VideoCall"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft,
  faVideo,
  faSmile,
  faCopy,
  faCheckSquare,
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
  faCompress,
  faFolder
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
  onShowMedia,
  onVideoCallStateChange,
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
  const [deleteMenuPosition, setDeleteMenuPosition] = useState("down")
  const [showDeleteMenu, setShowDeleteMenu] = useState(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState([])
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false)
  const [showReactionDetails, setShowReactionDetails] = useState(null)
  const [reactionDetailsPosition, setReactionDetailsPosition] = useState(null)
  const [isVideoCallMode, setIsVideoCallMode] = useState(false)
  const [incomingVideoCall, setIncomingVideoCall] = useState(null)
  const [otherUserOnline, setOtherUserOnline] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 })
  const [pickerDimensions, setPickerDimensions] = useState({ width: 300, height: 400 })
  const [isCallFullScreen, setIsCallFullScreen] = useState(false)

  useEffect(() => {
    if (onVideoCallStateChange) {
      onVideoCallStateChange(isVideoCallMode)
    }
  }, [isVideoCallMode, onVideoCallStateChange])
  const messagesEndRef = useRef(null)
  const prevMessagesLengthRef = useRef(0)
  const messageRefs = useRef({})
  const typingTimeoutRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const fileInputRef = useRef(null)
  const deleteMenuRef = useRef(null)
  const headerMenuRef = useRef(null)
  const inputRef = useRef(null)
  const currentUser = JSON.parse(sessionStorage.getItem("user"))

  const otherUser = chat.participants.find((p) => p._id !== currentUser.id)

  useEffect(() => {
    if (chat) {
      fetchMessages()
      joinChat()
    }

    const handleStartVideoCallEvent = (e) => {
      if (e.detail.chatId === chat?._id) {
        // Only start if user is online, though UserList might have checked already
        if (otherUserOnline) {
          setIncomingVideoCall(null)
          setIsVideoCallMode(true)
        }
      }
    }
    window.addEventListener("start-video-call", handleStartVideoCallEvent)

    return () => {
      window.removeEventListener("start-video-call", handleStartVideoCallEvent)
    }
  }, [chat, otherUserOnline])

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
            setMessages((prev) =>
              prev.map((msg) =>
                msg._id === data.messageId
                  ? { ...msg, isDeletedForAll: true }
                  : msg
              )
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
        
        // Ensure both users see the call log message instantly
        const isForThisChat = (String(data.callerId) === String(otherUser._id) && String(data.receiverId) === String(currentUser.id)) ||
                              (String(data.callerId) === String(currentUser.id) && String(data.receiverId) === String(otherUser._id));
                              
        if (isForThisChat) {
          setTimeout(() => {
            api.get(`/api/chats/${chat._id}/messages`)
              .then(res => setMessages(res.data.messages))
              .catch(err => console.error("Silent fetch error:", err))
          }, 500); // Small delay to allow the backend to save the call log message
        }
      })

      return () => {
        socket.off("video-call-offer")
        socket.off("video-call-end")
        socket.off("call:accepted-notification")
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
      
      // ONLY accept if autoAccept is true (meaning user clicked Accept on global screen)
      // Otherwise, let ChatApp show the global incoming call screen
      if (isForThisChat && globalIncomingCall.receiverId === currentUser.id && globalIncomingCall.autoAccept) {
        console.log("[ChatWindow] Global call accepted by user, entering video call mode")
        
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
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setShowHeaderMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom()
    }
    prevMessagesLengthRef.current = messages.length
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
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
        inputRef.current.style.overflowY = 'hidden'
      }
    } catch (error) {
      console.error("Send message error:", error)

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

    } catch (error) {
      console.error("File upload error:", error)

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
        setMessages((prev) => 
          prev.map((msg) => 
            msg._id === messageId 
              ? { ...msg, isDeletedForAll: true }
              : msg
          )
        )
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
          recipientId: otherUser._id,
        })
      }


      setShowDeleteMenu(null)
    } catch (error) {
      console.error("Delete message error:", error)

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
      alert("Video call can't be done, user is offline")
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

  const handleToggleEmojiPicker = (event) => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false)
    } else {
      // Use the button as the anchor, or fallback to input
      const anchorRect = event?.currentTarget?.getBoundingClientRect() || inputRef.current?.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const windowWidth = window.innerWidth
      
      const isMobile = windowWidth < 640
      // Reduced width and more padding for mobile as requested
      const pickerWidth = isMobile ? Math.min(windowWidth - 40, 320) : 350
      
      let top = 0
      let left = 0
      let height = 300

      if (anchorRect) {
        // Calculate available space
        const spaceAbove = anchorRect.top - 10
        const spaceBelow = windowHeight - anchorRect.bottom - 10
        const maxPickerHeight = 450
        
        // Prefer position with more space
        if (spaceAbove > spaceBelow) {
             // Position top
             height = Math.min(spaceAbove - 10, maxPickerHeight)
             // If height ends up too small, clamp it (might overlap, but better than unusable)
             height = Math.max(height, 250)
             top = anchorRect.top - height - 10
        } else {
             // Position bottom
             height = Math.min(spaceBelow - 10, maxPickerHeight)
             height = Math.max(height, 250)
             top = anchorRect.bottom + 10
        }

        // Horizontal positioning - Center relative to anchor
        const anchorCenter = anchorRect.left + (anchorRect.width / 2)
        left = anchorCenter - (pickerWidth / 2)

        // Strict clamp to screen edges
        if (left < 10) left = 10
        if (left + pickerWidth > windowWidth - 10) {
          left = windowWidth - pickerWidth - 10
        }
      }
      
      setPickerDimensions({ width: pickerWidth, height })
      setEmojiPickerPosition({ top, left })
      setShowEmojiPicker(true)
    }
  }

  const handleToggleReactionPicker = (messageId, event) => {
    if (showReactionPicker === messageId) {
      setShowReactionPicker(null)
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const windowWidth = window.innerWidth
      
      const isMobile = windowWidth < 640
      // Reduced width and more padding for mobile as requested
      const pickerWidth = isMobile ? Math.min(windowWidth - 40, 300) : 300
      
      let top = 0
      let left = 0
      let height = 300

      const spaceAbove = buttonRect.top - 10
      const spaceBelow = windowHeight - buttonRect.bottom - 10
      const maxPickerHeight = 350

      // Vertical positioning logic
      if (spaceAbove > spaceBelow && spaceAbove > 200) {
         // Go up
         height = Math.min(spaceAbove - 10, maxPickerHeight)
         top = buttonRect.top - height - 5
      } else {
         // Go down (or if forced)
         height = Math.min(spaceBelow - 10, maxPickerHeight)
         // Check if space below is really tiny, if so, force up even if it overlaps slightly or use max available
         if (height < 200 && spaceAbove > height) {
            height = Math.min(spaceAbove - 10, maxPickerHeight)
            top = buttonRect.top - height - 5
         } else {
             top = buttonRect.bottom + 5
         }
      }
      
      // Ensure min height
      height = Math.max(height, 250)

      // Horizontal positioning - Center relative to button
      const buttonCenter = buttonRect.left + (buttonRect.width / 2)
      left = buttonCenter - (pickerWidth / 2)
      
      // Boundary checks
      if (left < 10) left = 10
      if (left + pickerWidth > windowWidth - 10) {
        left = windowWidth - pickerWidth - 10
      }
      
      setPickerDimensions({ width: pickerWidth, height })
      setEmojiPickerPosition({ top, left })
      setShowReactionPicker(messageId)
    }
  }

  const handleShowReactionDetails = (messageId, event) => {
    const windowWidth = window.innerWidth
    const isMobile = windowWidth < 768
    if (isMobile) {
      setReactionDetailsPosition(null)
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const cardHeight = 250 // estimate
      let stylePosition = {}
      if (spaceBelow < cardHeight) {
        stylePosition.bottom = window.innerHeight - buttonRect.top + 5
      } else {
        stylePosition.top = buttonRect.bottom + 5
      }
      let left = buttonRect.left
      const cardWidth = 256 // w-64 is 16rem = 256px
      if (left + cardWidth > windowWidth - 10) {
        left = windowWidth - cardWidth - 10
      }
      stylePosition.left = left
      setReactionDetailsPosition(stylePosition)
    }
    setShowReactionDetails(messageId)
  }

  const handleToggleFullScreen = () => {
    setIsCallFullScreen(!isCallFullScreen)
  }

  // Identify the last few messages to open menu upwards
  const lastMessageIds = new Set(messages.slice(-4).map(m => m._id))

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedMessages([])
    setShowHeaderMenu(false)
  }

  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId)
      }
      return [...prev, messageId]
    })
  }

  const handleCopySelected = () => {
    const selectedTexts = messages
      .filter(m => selectedMessages.includes(m._id) && m.content && m.type !== "call")
      .map(m => m.content)
      .join('\n')
    if (selectedTexts) {
      navigator.clipboard.writeText(selectedTexts)
    }
    setIsSelectionMode(false)
    setSelectedMessages([])
  }

  const handleDeleteSelected = async () => {
    try {
      for (const msgId of selectedMessages) {
        await handleDeleteMessage(msgId, "me")
      }
    } catch (e) {
      console.error(e)
    }
    setSelectedMessages([])
  }

  const handleClearChat = async () => {
    try {
      await api.delete(`/api/chats/${chat._id}/clear`)
      setMessages([])
      setShowClearChatConfirm(false)
      setShowHeaderMenu(false)
    } catch (error) {
      console.error("Clear chat error:", error)
    }
  }

  const handleDownloadSelected = () => {
    messages
      .filter(m => selectedMessages.includes(m._id) && m.attachments && m.attachments.length > 0)
      .forEach(m => {
        m.attachments.forEach(attachment => {
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"
          const downloadUrl = `${API_URL}${attachment.fileUrl}`
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = downloadUrl
          document.body.appendChild(iframe)
          setTimeout(() => document.body.removeChild(iframe), 10000)
        })
      })
    setIsSelectionMode(false)
    setSelectedMessages([])
  }

  const selectedMessageObjects = selectedMessages.map(id => messages.find(msg => msg._id === id)).filter(Boolean)
  const hasDownloadable = selectedMessages.length > 0 && selectedMessageObjects.every(m => m.attachments && m.attachments.length > 0)
  const hasText = selectedMessages.length > 0 && selectedMessageObjects.every(m => (!m.attachments || m.attachments.length === 0) && m.type !== "call" && m.content && m.content.trim().length > 0)

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
      {isSelectionMode ? (
        <div className={`bg-[#202c33] h-[65px] text-white px-4 py-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0 ${isVideoCallMode && !isCallFullScreen ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => { setIsSelectionMode(false); setSelectedMessages([]); }} className="text-gray-300 hover:text-white transition">
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
            <span className="font-semibold">{selectedMessages.length} selected</span>
          </div>
          <div className="flex items-center gap-5">
            <button 
              onClick={handleCopySelected}
              disabled={!hasText}
              className={`${hasText ? 'text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'} transition`}
              title="Copy"
            >
              <FontAwesomeIcon icon={faCopy} className="text-lg" />
            </button>
            <button 
              onClick={() => selectedMessages.length > 0 && setShowDeleteConfirm(true)}
              disabled={selectedMessages.length === 0}
              className={`${selectedMessages.length > 0 ? 'text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'} transition`}
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrash} className="text-lg" />
            </button>
            <button 
              onClick={handleDownloadSelected}
              disabled={!hasDownloadable}
              className={`${hasDownloadable ? 'text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'} transition`}
              title="Download"
            >
              <FontAwesomeIcon icon={faDownload} className="text-lg" />
            </button>
          </div>
        </div>
      ) : (
      <div className={`bg-gray-50 h-[65px] px-4 py-3 flex items-center justify-between border-b border-gray-200 flex-shrink-0 ${isVideoCallMode && !isCallFullScreen ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden text-gray-600 hover:text-gray-800 transition"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
          </button>
          
          <div className="flex items-center gap-3">
            <div 
              className="cursor-pointer hover:opacity-85 transition flex-shrink-0"
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
            </div>
            
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
            onClick={onShowMedia}
            className="text-gray-600 hover:text-gray-800 transition"
            title="Shared Media"
          >
            <FontAwesomeIcon icon={faFolder} className="text-xl" />
          </button>
          <button
            onClick={handleStartVideoCall}
            className={`text-gray-600 hover:text-gray-800 transition ${!otherUserOnline ? "opacity-50 cursor-not-allowed" : ""}`}
            title={otherUserOnline ? "Video call" : "User is offline"}
            disabled={!otherUserOnline}
          >
            <FontAwesomeIcon icon={faVideo} className="text-xl" />
          </button>
          <div className="relative" ref={headerMenuRef}>
            <button 
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="text-gray-600 hover:text-gray-800 transition p-1"
            >
              <FontAwesomeIcon icon={faEllipsisV} className="text-xl" />
            </button>
            {showHeaderMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 py-1 overflow-hidden">
                <button 
                  onClick={handleToggleSelectionMode}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <FontAwesomeIcon icon={faCheckSquare} className="text-gray-400 w-4" />
                  <span>Select messages</span>
                </button>
                <button 
                  onClick={onBack}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-gray-400 w-4" />
                  <span>Close chat</span>
                </button>
                <button 
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowClearChatConfirm(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="text-red-400 w-4" />
                  <span>Delete chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      <div 
        className={`flex-1 overflow-y-auto bg-[#e5ddd5] p-2 sm:p-4 ${isVideoCallMode && !isCallFullScreen ? 'opacity-30 pointer-events-none' : ''}`}
        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundRepeat: 'repeat', backgroundSize: '400px' }}
        onScroll={() => {
          if (showEmojiPicker) setShowEmojiPicker(false)
          if (showReactionPicker) setShowReactionPicker(null)
          if (showDeleteMenu) setShowDeleteMenu(null)
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-gray-600">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center mb-6 shadow-sm">
              <FontAwesomeIcon icon={faUser} className="text-4xl text-gray-500" />
            </div>
            <h3 className="text-gray-800 text-xl font-bold mb-2">Say hello to {otherUser.username}</h3>
             <p className="text-gray-600 bg-white/60 px-4 py-1 rounded-full text-sm">Start a conversation now</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-6">
                  <div className="bg-white/90 backdrop-blur-sm shadow-sm text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wide">
                    {date}
                  </div>
                </div>

                {dateMessages.map((message, index) => {
                  const isOwn = message.sender._id === currentUser.id
                  const isSystem = message.isSystem
                  const isCallMessage = message.type === "call"
                  const messageStatus = !isCallMessage ? getMessageStatus(message) : null

                  return isSystem ? (
                    <div key={message._id} className="flex justify-center my-3">
                      <div className="bg-blue-50 text-blue-800 text-xs px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={message._id}
                      ref={(el) => (messageRefs.current[message._id] = el)}
                      onClick={(e) => {
                        if (isSelectionMode && !isSystem) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectMessage(message._id);
                        }
                      }}
                      className={`flex items-start ${!isCallMessage && message.reactions && message.reactions.length > 0 ? "mb-8" : "mb-3"} group relative ${isSelectionMode && !isSystem ? 'cursor-pointer hover:bg-black/5 rounded-lg px-2 -mx-2 transition-colors' : ''}`}
                      style={{ zIndex: showDeleteMenu === message._id ? 50 : 'auto', backgroundColor: selectedMessages.includes(message._id) ? 'rgba(0,0,0,0.1)' : '' }}
                      onMouseLeave={() => setShowDeleteMenu(null)}
                    >
                      {/* Checkbox strictly on the left */}
                      {isSelectionMode && !isSystem && (
                        <div className="flex-shrink-0 mr-4 w-6 flex items-center justify-center pt-2">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedMessages.includes(message._id) ? 'bg-[#00a884] border-[#00a884]' : 'border-gray-400 bg-white'}`}>
                            {selectedMessages.includes(message._id) && <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />}
                          </div>
                        </div>
                      )}
                      
                      {/* Message Bubble Container */}
                      <div className={`flex flex-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] md:max-w-[60%]`}>
                        <div className="relative">
                          {/* Message bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2 shadow-sm ${isOwn
                              ? "bg-[#d9fdd3] text-gray-800 rounded-tr-none"
                              : "bg-white text-gray-800 rounded-tl-none"
                            }`}
                          >
                            {isCallMessage ? (
                              <div className="flex items-center gap-3 py-1">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <FontAwesomeIcon icon={faVideo} className="text-gray-600 text-lg" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm text-gray-800">Video Call</p>
                                    <p className="text-xs text-gray-500 text-sm break-words whitespace-pre-wrap flex-1">
                                      {message.content}
                                    </p>
                                </div>
                              </div>
                            ) : message.isDeletedForAll ? (
                              <div className="flex items-center gap-2 py-1 text-gray-500 italic">
                                <FontAwesomeIcon icon={faBan} className="text-sm opacity-70" />
                                <span className="text-sm">
                                  {isOwn ? "You deleted this message" : "This message was deleted"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col relative min-w-[80px]">
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="space-y-2 mb-1">
                                    {message.attachments.map((attachment, idx) => {
                                      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"
                                      const downloadUrl = `${API_URL}${attachment.fileUrl}`
                                      return (
                                        <a
                                          key={idx}
                                          href={downloadUrl}
                                          download={attachment.fileName}
                                          className="flex items-center gap-3 bg-black/5 hover:bg-black/10 p-3 rounded-xl transition-all cursor-pointer border border-transparent hover:border-black/5"
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-xl">
                                            <FontAwesomeIcon 
                                              icon={getFileIcon(attachment.fileType)} 
                                              className={`${getFileIconColor(attachment.fileType)}`}
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                              {attachment.fileName}
                                            </p>
                                            <p className="text-[10px] text-gray-500 uppercase font-medium tracking-wide">
                                              {(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB • {attachment.fileType.split('/')[1] || 'FILE'}
                                            </p>
                                          </div>
                                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-500">
                                            <FontAwesomeIcon icon={faDownload} className="text-xs" />
                                          </div>
                                        </a>
                                      )
                                    })}
                                  </div>
                                )}
                                
                                {message.content && (
                                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap pr-2 pb-1">
                                    {message.content}
                                  </p>
                                )}
                                
                                {(message.content || (message.attachments && message.attachments.length > 0)) && (
                                  <div className="flex items-center justify-end gap-1.5 self-end -mt-1 ml-4 select-none">
                                    <span className="text-[10px] text-gray-500 min-w-fit">
                                      {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {messageStatus && (
                                      <FontAwesomeIcon 
                                        icon={messageStatus.icon} 
                                        className={`text-[10px] ${messageStatus.color}`}
                                        title={messageStatus.label}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reactions */}
                          {!isCallMessage && message.reactions && message.reactions.length > 0 && (
                            <div className={`absolute -bottom-5 ${isOwn ? 'right-0' : 'left-0'} z-10`}>
                                <div className="bg-white rounded-full shadow pl-1 pr-2 py-0.5 flex items-center gap-1 border border-gray-100">
                                  {Array.from(
                                    message.reactions.reduce((acc, r) => {
                                      acc.set(r.emoji, (acc.get(r.emoji) || 0) + 1)
                                      return acc
                                    }, new Map()),
                                  ).map(([emoji, count]) => (
                                    <button
                                      key={emoji}
                                      onClick={(e) => handleShowReactionDetails(message._id, e)}
                                      className="flex items-center hover:bg-gray-100 rounded-full px-1 transition-colors"
                                    >
                                      <span className="text-sm">{emoji}</span>
                                      {count > 1 && <span className="text-[10px] text-gray-500 font-medium ml-0.5">{count}</span>}
                                    </button>
                                  ))}
                                </div>
                            </div>
                          )}

                          {/* Message actions (Menu) */}
                          {!isCallMessage && !isSelectionMode && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 ${isOwn 
                              ? "left-0 -translate-x-full pr-2" 
                              : "right-0 translate-x-full pl-2"} opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center`}
                          >
                            <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-lg shadow-sm flex items-center p-0.5 gap-0.5">
                              <button
                                onClick={(e) => handleToggleReactionPicker(message._id, e)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-yellow-500"
                                title="React"
                              >
                                <FontAwesomeIcon icon={faSmile} className="text-xs" />
                              </button>

                              <div ref={deleteMenuRef} className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (showDeleteMenu === message._id) {
                                        setShowDeleteMenu(null)
                                      } else {
                                        // Smart positioning
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const spaceBelow = window.innerHeight - rect.bottom
                                        setDeleteMenuPosition(spaceBelow < 150 ? 'up' : 'down')
                                        setShowDeleteMenu(message._id)
                                      }
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-red-500"
                                    title="Delete"
                                  >
                                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>

                                {showDeleteMenu === message._id && (
                                  <div
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className={`absolute ${deleteMenuPosition === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} 
                                      ${isOwn 
                                        ? 'right-0 origin-top-right md:right-0 md:left-auto md:origin-top-right' 
                                        : 'left-0 origin-top-left md:left-0 md:right-auto md:origin-top-left'
                                      } 
                                      bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden py-1 ring-1 ring-black/5 mx-0
                                      w-32 md:w-48
                                      ${/* On mobile, shift if needed to stay on screen, but simpler to just align inwards */ ''}
                                      ${/* On mobile, shift if needed to stay on screen, but simpler to just align inwards */ ''}
                                      ${!isOwn ? 'right-0 left-auto origin-top-right md:left-0 md:right-auto md:origin-top-left' : ''}
                                      ${isOwn ? 'left-0 right-auto origin-top-left md:right-0 md:left-auto md:origin-top-right' : ''}
                                    `}
                                    style={{
                                      // Override base classes for specific mobile constraints if needed via inline styles
                                      maxWidth: 'calc(100vw - 40px)' 
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteMessage(message._id, "me")
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <FontAwesomeIcon icon={faTrashAlt} className="text-gray-400" />
                                      Delete for me
                                    </button>
                                    {isOwn && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteMessage(message._id, "everyone")
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <FontAwesomeIcon icon={faBan} className="text-red-500" />
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
            width={pickerDimensions.width}
            height={pickerDimensions.height}
            previewConfig={{ showPreview: false }}
            searchDisabled
            skinTonesDisabled
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl p-6 shadow-xl w-80 max-w-[90%]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Messages</h3>
            <p className="text-gray-600 mb-6 text-sm">Are you sure you want to delete the selected {selectedMessages.length} message{selectedMessages.length > 1 ? 's' : ''}? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteSelected();
                }}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearChatConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setShowClearChatConfirm(false)}>
          <div className="bg-white rounded-xl p-6 shadow-xl w-80 max-w-[90%]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Clear Chat History</h3>
            <p className="text-gray-600 mb-6 text-sm">Are you sure entire chat history will be deleted? This action cannot be undone and will only delete messages for you.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowClearChatConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearChat}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reaction Details Modal */}
      {showReactionDetails && (
        <div 
          className="fixed inset-0 z-[110]" 
          onClick={() => setShowReactionDetails(null)}
        >
          {/* Background overlay for mobile */}
          {!reactionDetailsPosition && <div className="absolute inset-0 bg-black/20" />}
          
          <div 
            className={`bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] w-64 max-w-sm overflow-hidden border border-gray-100 ${
              reactionDetailsPosition 
                ? 'absolute' 
                : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            }`}
            onClick={e => e.stopPropagation()}
            style={reactionDetailsPosition ? reactionDetailsPosition : {}}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800 text-sm">Reactions</h3>
              <button onClick={() => setShowReactionDetails(null)} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {messages.find(m => m._id === showReactionDetails)?.reactions?.map((reaction, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {reaction.user?.profileImage ? (
                      <img src={reaction.user.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                        {reaction.user?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {reaction.user?._id === currentUser.id ? 'You' : reaction.user?.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{reaction.emoji}</span>
                    {reaction.user?._id === currentUser.id && (
                      <button 
                        onClick={() => {
                          handleReaction(showReactionDetails, reaction.emoji);
                          setShowReactionDetails(null);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                        title="Remove reaction"
                      >
                         <FontAwesomeIcon icon={faTimes} className="text-xs" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

          <div className={`flex-1 relative bg-white border border-gray-300 rounded-2xl flex items-center pl-4 pr-2 py-1 ${selectedFile ? 'opacity-50' : 'focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'}`}>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) {
                    if (selectedFile) {
                      handleSendFile();
                    } else {
                      const pseudoEvent = { preventDefault: () => {} };
                      handleSendMessage(pseudoEvent);
                    }
                  }
                }
              }}
              placeholder="Type a message"
              rows={1}
              className="w-full py-2 bg-transparent focus:outline-none text-gray-800 placeholder-gray-500 text-sm resize-none min-h-[24px] max-h-[120px]"
              disabled={selectedFile !== null}
              style={{
                height: "auto",
                overflowY: "hidden"
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                const newHeight = Math.min(e.target.scrollHeight, 120);
                e.target.style.height = newHeight + 'px';
                e.target.style.overflowY = e.target.scrollHeight > 120 ? 'auto' : 'hidden';
              }}
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
                width={pickerDimensions.width}
                height={pickerDimensions.height}
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