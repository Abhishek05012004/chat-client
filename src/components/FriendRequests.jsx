"use client"

import { useState, useEffect } from "react"
import api from "../utils/api"
import { toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faUserPlus, 
  faPaperPlane, 
  faCheck, 
  faTimes, 
  faClock,
  faSpinner,
  faUser,
  faEnvelope,
  faUserCheck,
  faUserClock
} from "@fortawesome/free-solid-svg-icons"

export default function FriendRequests({ onOpenProfile, onRequestHandled, searchQuery = "" }) {
  const [receivedRequests, setReceivedRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [activeTab, setActiveTab] = useState("received")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    fetchRequests()
  }, [activeTab])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      if (activeTab === "received") {
        const response = await api.get("/api/friends/requests/received")
        setReceivedRequests(response.data.friendRequests)
      } else {
        const response = await api.get("/api/friends/requests/sent")
        setSentRequests(response.data.friendRequests)
      }
    } catch (error) {
      console.error("Fetch requests error:", error)
      toast.error("Failed to load friend requests")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requestId) => {
    setActionLoading({ ...actionLoading, [requestId]: 'accept' })
    try {
      await api.post(`/api/friends/request/${requestId}/accept`)
      toast.success("Friend request accepted!")
      if (onRequestHandled) onRequestHandled()
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept request")
    } finally {
      setActionLoading({ ...actionLoading, [requestId]: null })
    }
  }

  const handleReject = async (requestId) => {
    setActionLoading({ ...actionLoading, [requestId]: 'reject' })
    try {
      await api.post(`/api/friends/request/${requestId}/reject`)
      toast.info("Friend request rejected")
      if (onRequestHandled) onRequestHandled()
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request")
    } finally {
      setActionLoading({ ...actionLoading, [requestId]: null })
    }
  }

  const handleCancel = async (requestId) => {
    setActionLoading({ ...actionLoading, [requestId]: 'cancel' })
    try {
      await api.post(`/api/friends/request/${requestId}/cancel`)
      toast.info("Friend request cancelled")
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel request")
    } finally {
      setActionLoading({ ...actionLoading, [requestId]: null })
    }
  }

  // Filter requests based on search query
  const filterRequests = (requests, isReceived) => {
    if (!searchQuery.trim()) return requests;
    
    return requests.filter(request => {
      const user = isReceived ? request.sender : request.receiver;
      return (
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };

  const filteredReceived = filterRequests(receivedRequests, true);
  const filteredSent = filterRequests(sentRequests, false);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("received")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === "received" 
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" 
              : "text-gray-600 hover:text-indigo-500 hover:bg-gray-50"
          }`}
        >
          <FontAwesomeIcon icon={faUserPlus} className={activeTab === "received" ? "text-indigo-600" : "text-gray-500"} />
          <span>Received</span>
          {receivedRequests.length > 0 && (
            <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {receivedRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === "sent" 
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" 
              : "text-gray-600 hover:text-indigo-500 hover:bg-gray-50"
          }`}
        >
          <FontAwesomeIcon icon={faPaperPlane} className={activeTab === "sent" ? "text-indigo-600" : "text-gray-500"} />
          <span>Sent</span>
          {sentRequests.length > 0 && (
            <span className="bg-gray-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {sentRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl text-gray-400 mb-4" />
            <p className="text-gray-500 text-sm">Loading friend requests...</p>
          </div>
        ) : (
          <>
            {activeTab === "received" && (
              <>
                {filteredReceived.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                      <FontAwesomeIcon icon={faUserPlus} className="text-2xl text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Friend Requests</h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                      {searchQuery ? "No matching friend requests found" : "You don't have any pending friend requests"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReceived.map((request) => {
                      const user = request.sender;
                      const isLoading = actionLoading[request._id];
                      
                      return (
                        <div 
                          key={request._id} 
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            {/* Left side - User info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className="cursor-pointer relative flex-shrink-0"
                                onClick={() => onOpenProfile(user._id, false)}
                              >
                                {user.profileImage ? (
                                  <img
                                    src={user.profileImage || "/placeholder.svg"}
                                    alt="Profile"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                    {user.username[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <FontAwesomeIcon icon={faUserPlus} className="text-white text-xs" />
                                </div>
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 
                                    className="font-semibold text-gray-800 truncate text-sm sm:text-base cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={() => onOpenProfile(user._id, false)}
                                  >
                                    {user.username}
                                  </h3>
                                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                    New Request
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                  <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                                  {user.email}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">
                                    Sent {new Date(request.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right side - Action buttons */}
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <button
                                onClick={() => handleAccept(request._id)}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading === 'accept' ? (
                                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faCheck} />
                                )}
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleReject(request._id)}
                                disabled={isLoading}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading === 'reject' ? (
                                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faTimes} />
                                )}
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === "sent" && (
              <>
                {filteredSent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <FontAwesomeIcon icon={faPaperPlane} className="text-2xl text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sent Requests</h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                      {searchQuery ? "No matching sent requests found" : "You haven't sent any friend requests"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSent.map((request) => {
                      const user = request.receiver;
                      const isLoading = actionLoading[request._id];
                      
                      return (
                        <div 
                          key={request._id} 
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            {/* Left side - User info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className="cursor-pointer relative flex-shrink-0"
                                onClick={() => onOpenProfile(user._id, false)}
                              >
                                {user.profileImage ? (
                                  <img
                                    src={user.profileImage || "/placeholder.svg"}
                                    alt="Profile"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                    {user.username[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <FontAwesomeIcon icon={faClock} className="text-white text-xs" />
                                </div>
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 
                                    className="font-semibold text-gray-800 truncate text-sm sm:text-base cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={() => onOpenProfile(user._id, false)}
                                  >
                                    {user.username}
                                  </h3>
                                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <FontAwesomeIcon icon={faClock} className="text-xs" />
                                    Pending
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                  <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                                  {user.email}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">
                                    Sent {new Date(request.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right side - Cancel button */}
                            <div className="flex items-center ml-3 flex-shrink-0">
                              <button
                                onClick={() => handleCancel(request._id)}
                                disabled={isLoading}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading === 'cancel' ? (
                                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                ) : (
                                  <FontAwesomeIcon icon={faTimes} />
                                )}
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FontAwesomeIcon icon={faUserPlus} className="text-indigo-600" />
              <span className="text-lg font-bold text-gray-800">{receivedRequests.length}</span>
            </div>
            <p className="text-xs text-gray-500">Received</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FontAwesomeIcon icon={faPaperPlane} className="text-gray-600" />
              <span className="text-lg font-bold text-gray-800">{sentRequests.length}</span>
            </div>
            <p className="text-xs text-gray-500">Sent</p>
          </div>
        </div>
      </div>
    </div>
  )
}