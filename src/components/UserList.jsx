"use client"

import { useState, useEffect } from "react"
import api from "../utils/api"
import { toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faComment, 
  faUserFriends, 
  faUsers, 
  faCircle,
  faVideo,
  faMessage,
  faUserPlus,
  faEllipsisV,
  faSpinner
} from "@fortawesome/free-solid-svg-icons"

export default function UserList({ selectedChat, onSelectChat, socket, onOpenProfile, searchQuery = "" }) {
  const [users, setUsers] = useState([])
  const [friends, setFriends] = useState([])
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("chats")
  const [userStatuses, setUserStatuses] = useState({})
  const [typingUsers, setTypingUsers] = useState({})
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchData()
  }, [activeTab])

  useEffect(() => {
    if (socket) {
      const handleUserStatusChanged = (data) => {
        const uid = String(data.userId)
        const status = data.status
        setUserStatuses((prev) => ({ ...prev, [uid]: status }))

        setUsers((prevUsers) =>
          prevUsers.map((user) => (String(user._id) === uid ? { ...user, status } : user)),
        )
        setFriends((prevFriends) =>
          prevFriends.map((friend) => (String(friend._id) === uid ? { ...friend, status } : friend)),
        )
        setChats((prevChats) =>
          prevChats.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              String(p._id) === uid ? { ...p, status } : p
            ),
          })),
        )
      }

      socket.on("user-status-changed", handleUserStatusChanged)

      socket.on("user-typing", (data) => {
        setTypingUsers((prev) => ({ ...prev, [data.chatId]: true }))
      })

      socket.on("user-stop-typing", (data) => {
        setTypingUsers((prev) => {
          const newState = { ...prev }
          delete newState[data.chatId]
          return newState
        })
      })

      // Refresh data on message events to keep unread counts and last messages in sync
      const handleRefresh = () => {
        // Simple debounce could be added here if needed, but for now direct fetch is reliable
        fetchData() 
      }

      socket.on("receive-message", handleRefresh)
      socket.on("message-seen-update", handleRefresh)
      socket.on("unread-count-changed", handleRefresh)

      return () => {
        socket.off("user-status-changed", handleUserStatusChanged)
        socket.off("user-typing")
        socket.off("user-stop-typing")
        socket.off("receive-message", handleRefresh)
        socket.off("message-seen-update", handleRefresh)
        socket.off("unread-count-changed", handleRefresh)
      }
    }
  }, [socket, activeTab]) // Added activeTab to dependency to ensure fetchData uses correct tab

  const fetchData = async () => {
    // Don't show full loading spinner for background updates
    if (users.length === 0 && chats.length === 0 && friends.length === 0) {
      setLoading(true)
    }
    
    try {
      if (activeTab === "chats") {
        const response = await api.get("/api/chats")
        const chats = response.data.chats
        setChats(chats)
        // Seed userStatuses from participants so online status shows immediately
        const statuses = {}
        chats.forEach((chat) => {
          chat.participants.forEach((p) => {
            if (p._id) statuses[String(p._id)] = p.status || "offline"
          })
        })
        setUserStatuses((prev) => ({ ...prev, ...statuses }))
      } else if (activeTab === "friends") {
        const response = await api.get("/api/friends")
        const friends = response.data.friends
        setFriends(friends)
        const statuses = {}
        friends.forEach((f) => {
          if (f._id) statuses[String(f._id)] = f.status || "offline"
        })
        setUserStatuses((prev) => ({ ...prev, ...statuses }))
      } else {
        const response = await api.get("/api/users")
        setUsers(response.data.users)
      }
    } catch (error) {
      console.error("[v0] Fetch data error:", error)
      // Only show error toast on initial load failure, not background refresh
      if (loading) toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleSendFriendRequest = async (userId) => {
    setActionLoading({ ...actionLoading, [userId]: 'friend' })
    try {
      await api.post("/api/friends/request", { receiverId: userId })
      toast.success("Friend request sent!")
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send friend request")
    } finally {
      setActionLoading({ ...actionLoading, [userId]: null })
    }
  }

  const handleStartChat = async (userId) => {
    setActionLoading({ ...actionLoading, [userId]: 'chat' })
    try {
      const response = await api.post("/api/chats/create", { userId })
      onSelectChat(response.data.chat)
      setActiveTab("chats")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start chat")
    } finally {
      setActionLoading({ ...actionLoading, [userId]: null })
    }
  }

  const getOtherParticipant = (chat) => {
    return chat.participants.find((p) => p._id !== JSON.parse(sessionStorage.getItem("user")).id)
  }

  // Filter data based on active tab and search query
  const filterData = () => {
    if (activeTab === "users") {
      return users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    } else if (activeTab === "friends") {
      return friends.filter(
        (friend) =>
          friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          friend.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    } else if (activeTab === "chats") {
      return chats.filter((chat) => {
        const otherUser = getOtherParticipant(chat)
        return (
          otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          otherUser.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })
    }
    return []
  }

  const filteredData = filterData()

  return (
    <div className="flex flex-col h-full">
      {/* Clean Tabs - No counts */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === "chats" 
              ? "text-indigo-600 border-b-2 border-indigo-600" 
              : "text-gray-600 hover:text-indigo-500"
          }`}
        >
          <FontAwesomeIcon icon={faComment} />
          <span className="hidden sm:inline">Chats</span>
        </button>
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === "friends" 
              ? "text-indigo-600 border-b-2 border-indigo-600" 
              : "text-gray-600 hover:text-indigo-500"
          }`}
        >
          <FontAwesomeIcon icon={faUserFriends} />
          <span className="hidden sm:inline">Friends</span>
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === "users" 
              ? "text-indigo-600 border-b-2 border-indigo-600" 
              : "text-gray-600 hover:text-indigo-500"
          }`}
        >
          <FontAwesomeIcon icon={faUsers} />
          <span className="hidden sm:inline">Users</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xl text-gray-400 mb-2" />
            <p className="text-gray-500 text-xs">Loading...</p>
          </div>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-gray-400 text-sm">
                  {searchQuery ? "No results found" : `No ${activeTab} yet`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTab === "chats" && filteredData.map((chat) => {
                  const otherUser = getOtherParticipant(chat)
                  // FIXED: Prioritize real-time status from socket
                  const statusFromSocket = userStatuses[String(otherUser._id)]
                  const isOnline = statusFromSocket 
                    ? statusFromSocket === "online" 
                    : otherUser.status === "online"
                  
                  const isTyping = typingUsers[chat._id]
                  const unreadCount = chat.unreadCount || 0
                  const lastMessage = chat.lastMessage
                  const isSelected = selectedChat?._id === chat._id

                  return (
                    <div
                      key={chat._id}
                      onClick={() => onSelectChat(chat)}
                      className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200' 
                          : 'bg-white border border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* User info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative flex-shrink-0">
                            {otherUser.profileImage && otherUser.profileImage !== "" ? (
                              <img
                                src={otherUser.profileImage || "/placeholder.svg"}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border border-gray-300"
                                />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {otherUser.username[0].toUpperCase()}
                              </div>
                            )}
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-gray-800 truncate text-sm">
                                {otherUser.username}
                              </h3>
                              {unreadCount > 0 && (
                                <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                              )}
                            </div>
                            {isTyping ? (
                              <p className="text-xs text-indigo-600 italic">typing...</p>
                            ) : lastMessage ? (
                              <p className="text-xs text-gray-500 truncate">
                                {lastMessage.content.length > 25 
                                  ? `${lastMessage.content.substring(0, 25)}...` 
                                  : lastMessage.content}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Action buttons - Icons only */}
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenProfile(otherUser._id, false)
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600"
                            title="Profile"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {activeTab === "friends" && filteredData.map((friend) => {
                  // FIXED: Prioritize real-time status from socket
                  const statusFromSocket = userStatuses[String(friend._id)]
                  const isOnline = statusFromSocket 
                    ? statusFromSocket === "online" 
                    : friend.status === "online"
                  const isLoading = actionLoading[friend._id]

                  return (
                    <div 
                      key={friend._id} 
                      className="p-3 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:bg-gray-50 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        {/* User info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative flex-shrink-0">
                            {friend.profileImage && friend.profileImage !== "" ? (
                              <img
                                src={friend.profileImage || "/placeholder.svg"}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border border-gray-300"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                                {friend.username[0].toUpperCase()}
                              </div>
                            )}
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-gray-800 truncate text-sm">
                                {friend.username}
                              </h3>
                              <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                                <FontAwesomeIcon icon={faCircle} className="text-[6px]" />
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {isOnline ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons - Icons only */}
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={() => handleStartChat(friend._id)}
                            disabled={isLoading}
                            className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg disabled:opacity-50"
                            title="Chat"
                          >
                            <FontAwesomeIcon icon={faMessage} className="text-xs" />
                          </button>
                          <button
                            onClick={() => {}}
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg"
                            title="Video Call"
                          >
                            <FontAwesomeIcon icon={faVideo} className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {activeTab === "users" && filteredData.map((user) => {
                  const isLoading = actionLoading[user._id]

                  return (
                    <div 
                      key={user._id} 
                      className="p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-gray-50 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        {/* User info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {user.profileImage && user.profileImage !== "" ? (
                              <img
                                src={user.profileImage || "/placeholder.svg"}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border border-gray-300"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {user.username[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-gray-800 truncate text-sm">
                                {user.username}
                              </h3>
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                User
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons - Icons only */}
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={() => handleSendFriendRequest(user._id)}
                            disabled={isLoading}
                            className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg disabled:opacity-50"
                            title="Add Friend"
                          >
                            <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
                          </button>
                          <button
                            onClick={() => onOpenProfile(user._id, false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600"
                            title="Profile"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}