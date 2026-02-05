"use client"

import { useState, useEffect, useRef } from "react"
import api from "../utils/api"
import { toast } from "react-toastify"
import { useAuth } from "../context/AuthContext"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faTimes, 
  faEdit, 
  faCamera, 
  faSave, 
  faBan,
  faEnvelope,
  faPhone,
  faCalendar,
  faUser,
  faInfoCircle,
  faGlobe,
  faCheckCircle,
  faCircle,
  faSpinner,
  faShareAlt,
  faComment,
  faVideo,
  faEllipsisH,
  faExternalLinkAlt
} from "@fortawesome/free-solid-svg-icons"

export default function ProfileModal({ isOpen, onClose, userId, isOwnProfile }) {
  const { updateUser, user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState("")
  const [username, setUsername] = useState("")
  const [imagePreview, setImagePreview] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState(false)
  const toastShownRef = useRef(false)

  useEffect(() => {
    if (isOpen && userId) {
      toastShownRef.current = false
      fetchProfile()
    }
  }, [isOpen, userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const endpoint = isOwnProfile ? "/api/profile" : `/api/profile/${userId}`
      const response = await api.get(endpoint)
      setProfile(response.data)
      setBio(response.data.bio || "")
      setUsername(response.data.username || "")
      setImagePreview(response.data.profileImage || "")
      setImageError(false)
      toastShownRef.current = false
    } catch (error) {
      console.error("Error fetching profile:", error)
      if (!toastShownRef.current) {
        toast.error("Failed to load profile")
        toastShownRef.current = true
      }
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5000000) {
        toast.error("Image size should be less than 5MB")
        return
      }

      setUploadingImage(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setUploadingImage(false)
        setImageError(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      const response = await api.put("/api/profile", {
        profileImage: imagePreview,
        bio: bio,
        username: username,
      })
      
      toast.success("Profile updated successfully!")
      setEditing(false)

      updateUser({
        username: response.data.user.username,
        profileImage: response.data.user.profileImage,
        bio: response.data.user.bio,
      })

      const socket = window.socketInstance
      if (socket) {
        socket.emit("profile-updated", {
          userId: response.data.user._id,
          profileImage: response.data.user.profileImage,
          bio: response.data.user.bio,
          username: response.data.user.username,
        })
      }

      fetchProfile()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(error.response?.data?.message || "Failed to update profile")
    }
  }

  const handleCopyToClipboard = (text) => {
    if (text) {
      navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard!")
    }
  }

  const handleSendMessage = () => {
    if (profile && currentUser) {
      toast.info(`Starting chat with ${profile.username}`)
      console.log("Start chat with:", profile._id)
      onClose()
    }
  }

  const handleVideoCall = () => {
    if (profile && window.socketInstance) {
      toast.info(`Calling ${profile.username}`)
      
      window.socketInstance.emit("video-call-initiate", {
        callerId: currentUser.id,
        callerName: currentUser.username,
        callerProfile: {
          profileImage: currentUser.profileImage,
        },
        receiverId: profile._id,
        receiverName: profile.username,
        callType: "video"
      })
      
      onClose()
    }
  }

  const handleMoreOptions = () => {
    toast.info("More options for " + profile.username)
    console.log("More options for:", profile._id)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FontAwesomeIcon icon={faUser} className="text-white text-sm sm:text-base" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-white">
                  {isOwnProfile ? "My Profile" : "User Profile"}
                </h2>
                <p className="text-white/80 text-xs hidden sm:block">
                  {isOwnProfile ? "Manage your profile information" : "View user details"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition text-lg sm:text-xl"
                title="Close"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-500"></div>
              <p className="mt-3 text-gray-600 text-sm">Loading profile...</p>
            </div>
          ) : (
            <div>
              {/* Profile Header - Fixed image cutting issue */}
              <div className="flex flex-col items-center mb-4 sm:mb-6">
                <div className="relative -mt-10 sm:-mt-16">
                  <div className="relative">
                    {/* Profile Image Container - Fixed to prevent cutting */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                      {imagePreview && imagePreview !== "" && !imageError ? (
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={() => setImageError(true)}
                        />
                      ) : null}
                      
                      {/* Fallback Avatar - Shows when image fails or doesn't exist */}
                      <div 
                        className={`w-full h-full flex items-center justify-center ${
                          !imagePreview || imagePreview === "" || imageError ? 'flex' : 'hidden'
                        }`}
                      >
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl sm:text-5xl md:text-6xl font-bold">
                          {profile && profile.username ? profile.username[0].toUpperCase() : "U"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="absolute bottom-2 right-2">
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white ${
                        profile && profile.status === "online" 
                          ? "bg-green-500 animate-pulse" 
                          : "bg-gray-400"
                      }`}></div>
                    </div>
                  </div>

                  {/* Edit Photo Button */}
                  {isOwnProfile && editing && (
                    <label className="absolute bottom-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 sm:p-3 rounded-full cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition shadow-lg">
                      {uploadingImage ? (
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xs sm:text-sm" />
                      ) : (
                        <FontAwesomeIcon icon={faCamera} className="text-xs sm:text-sm" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>

                {/* Username & Status */}
                <div className="mt-3 sm:mt-4 text-center">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center justify-center gap-2 flex-wrap">
                    {isOwnProfile && editing ? (
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="px-3 py-2 border-2 border-indigo-200 rounded-lg text-base sm:text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center"
                        placeholder="Username"
                      />
                    ) : (
                      <>
                        {profile ? profile.username : "User"}
                        {profile && profile.verified && (
                          <FontAwesomeIcon icon={faCheckCircle} className="text-blue-500 text-sm" />
                        )}
                      </>
                    )}
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile && profile.status === "online" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      <FontAwesomeIcon 
                        icon={profile && profile.status === "online" ? faCheckCircle : faCircle} 
                        className="text-xs mr-1"
                      />
                      {profile && profile.status === "online" ? "Online" : "Offline"}
                    </span>
                    {profile && profile.role && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        {profile.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Email */}
                <div className="bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
                      <span className="text-xs font-semibold uppercase">Email</span>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(profile ? profile.email : "")}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                      Copy
                    </button>
                  </div>
                  <p className="text-sm sm:text-base text-gray-800 font-medium truncate">
                    {profile ? profile.email : "Not provided"}
                  </p>
                </div>

                {/* Phone */}
                <div className="bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FontAwesomeIcon icon={faPhone} className="text-sm" />
                      <span className="text-xs font-semibold uppercase">Phone</span>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(profile ? profile.phoneNumber : "")}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                      Copy
                    </button>
                  </div>
                  <p className="text-sm sm:text-base text-gray-800 font-medium">
                    {profile ? (profile.phoneNumber || "Not provided") : "Not provided"}
                  </p>
                </div>

                {/* Member Since */}
                <div className="bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <FontAwesomeIcon icon={faCalendar} className="text-sm" />
                    <span className="text-xs font-semibold uppercase">Member Since</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-800 font-medium">
                    {profile && profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>

                {/* Last Active */}
                <div className="bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <FontAwesomeIcon icon={faGlobe} className="text-sm" />
                    <span className="text-xs font-semibold uppercase">Last Active</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-800 font-medium">
                    {profile && profile.lastActive
                      ? new Date(profile.lastActive).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recently"}
                  </p>
                </div>
              </div>

              {/* Bio Section */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-sm" />
                  <span className="text-xs font-semibold uppercase">About</span>
                </div>
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-3 sm:p-4 rounded-xl border border-indigo-100">
                  {isOwnProfile && editing ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={200}
                      className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base bg-white"
                      rows="3"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <>
                      <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap">
                        {profile ? (profile.bio || "No bio added yet") : "No bio added yet"}
                      </p>
                      {profile && !profile.bio && !isOwnProfile && (
                        <p className="text-xs text-gray-500 mt-1">This user hasn't added a bio yet.</p>
                      )}
                    </>
                  )}
                  {isOwnProfile && editing && (
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>Brief description about yourself</span>
                      <span>{bio.length}/200</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats (for own profile) */}
              {isOwnProfile && (
                <div className="mt-4 sm:mt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl text-center border border-blue-200">
                      <p className="text-lg sm:text-xl font-bold text-blue-600">12</p>
                      <p className="text-xs text-blue-700 mt-1">Friends</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl text-center border border-green-200">
                      <p className="text-lg sm:text-xl font-bold text-green-600">48</p>
                      <p className="text-xs text-green-700 mt-1">Chats</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl text-center border border-purple-200">
                      <p className="text-lg sm:text-xl font-bold text-purple-600">156</p>
                      <p className="text-xs text-purple-700 mt-1">Messages</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-xl text-center border border-orange-200">
                      <p className="text-lg sm:text-xl font-bold text-orange-600">7</p>
                      <p className="text-xs text-orange-700 mt-1">Files</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons - Updated with icons and functionality */}
              <div className="mt-6 sm:mt-8">
                {isOwnProfile ? (
                  editing ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleSave}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faSave} className="text-sm" />
                        <span className="text-sm">Save Changes</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false)
                          setBio(profile ? profile.bio : "")
                          setUsername(profile ? profile.username : "")
                          setImagePreview(profile ? profile.profileImage : "")
                        }}
                        className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:from-gray-300 hover:to-gray-400 transition font-semibold flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faBan} className="text-sm" />
                        <span className="text-sm">Cancel</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => setEditing(true)}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-sm" />
                        <span className="text-sm">Edit Profile</span>
                      </button>
                      <button
                        onClick={() => handleCopyToClipboard(window.location.href)}
                        className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-600 py-3 px-4 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition font-semibold border border-indigo-200 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faShareAlt} className="text-sm" />
                        <span className="text-sm">Share Profile</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={handleSendMessage}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faComment} className="text-sm" />
                      <span className="text-sm">Send Message</span>
                    </button>
                    <button
                      onClick={handleVideoCall}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faVideo} className="text-sm" />
                      <span className="text-sm">Video Call</span>
                    </button>
                    <button
                      onClick={handleMoreOptions}
                      className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:from-gray-200 hover:to-gray-300 transition font-semibold border border-gray-300 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faEllipsisH} className="text-sm" />
                      <span className="text-sm">More Options</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Profile ID: {profile && profile._id ? profile._id.substring(0, 8) + "..." : "..."} • 
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}