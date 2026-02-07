"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { initializeSocket, disconnectSocket } from "../utils/socket";
import UserList from "./UserList";
import ChatWindow from "./ChatWindow";
import FriendRequests from "./FriendRequests";
import ProfileModal from "./ProfileModal";
import MediaGallery from "./MediaGallery";
import IncomingCallScreen from "./IncomingCallScreen";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faFolder, 
  faComments, 
  faUserFriends, 
  faSignOutAlt, 
  faVideo,
  faPhone,
  faEllipsisV
} from "@fortawesome/free-solid-svg-icons";

export default function ChatApp() {
  const { user, logout } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);
  const [showGlobalCallScreen, setShowGlobalCallScreen] = useState(false);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const [callTimers, setCallTimers] = useState({});

  useEffect(() => {
    if (user) {
      const socketInstance = initializeSocket(user.id);
      setSocket(socketInstance);
      window.socketInstance = socketInstance;

      socketInstance.on("user-status-changed", (data) => {
        console.log("User status changed:", data);
      });

        socketInstance.on("friend-request-received", (data) => {
        toast.info(`${data.senderUsername} sent you a friend request!`, {
          toastId: `friend-req-${data.senderId}`,
          autoClose: 3000,
        });
        setUnreadRequests(prev => prev + 1);
      });

      socketInstance.on("friend-request-accepted", (data) => {
        toast.success(
          `${data.acceptedByUsername} accepted your friend request!`,
          {
            toastId: `friend-accept-${data.userId}`,
            autoClose: 3000,
          },
        );
      });

      socketInstance.on("user-profile-updated", (data) => {
        console.log("[v0] Profile updated event received:", data);
        window.dispatchEvent(
          new CustomEvent("profile-updated", { detail: data }),
        );
      });

      // Handle incoming calls - only use ONE handler to avoid duplicates
      socketInstance.on("call:incoming", (data) => {
        console.log("[ChatApp] Incoming call received:", data);
        console.log("[ChatApp] Current user ID:", user.id, "Receiver ID:", data.receiverId);
        
        if (data.receiverId === user.id) {
          console.log("[ChatApp] This call is for current user, setting global incoming call");
          
          // Clear any existing call timers
          if (callTimers[data.callerId]) {
            clearTimeout(callTimers[data.callerId]);
          }
          
          // Check if we're already in a chat with the caller
          const isFromCurrentChat = selectedChat && 
            (selectedChat._id === data.chatId || 
             selectedChat.userId === data.callerId || 
             selectedChat.participants?.some(p => p._id === data.callerId));
          
          // If we're in the chat with the caller, we should NOT show the global screen
          // because the VideoCall component will handle it
          if (isFromCurrentChat) {
            console.log("[ChatApp] Call is from current chat, letting ChatWindow handle it");
            // Just set the globalIncomingCall but don't show the global screen
            setGlobalIncomingCall(data);
            // DO NOT set showGlobalCallScreen to true
          } else {
            // Show global incoming call screen
            setGlobalIncomingCall(data);
            setShowGlobalCallScreen(true);
            
            // Set timeout to auto-reject after 30 seconds
            const timer = setTimeout(() => {
              if (showGlobalCallScreen && globalIncomingCall?.callerId === data.callerId) {
                console.log("[ChatApp] Call auto-rejecting due to timeout");
                handleGlobalRejectCall();
              }
            }, 30000);
            
            setCallTimers(prev => ({
              ...prev,
              [data.callerId]: timer
            }));
          }
        }
      });

      socketInstance.on("call:rejected", (data) => {
        console.log("[ChatApp] Call rejected:", data);
        
        // Clear the call timer
        if (callTimers[data.callerId]) {
          clearTimeout(callTimers[data.callerId]);
          setCallTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[data.callerId];
            return newTimers;
          });
        }
        
        if (data.callerId === user.id) {
          toast.warning(
            `Call rejected by ${data.receiverName || "the other user"}`,
          );
        }
        setGlobalIncomingCall(null);
        setShowGlobalCallScreen(false);
      });

      socketInstance.on("call:ended", (data) => {
        console.log("[ChatApp] Call ended:", data);
        
        // Clear the call timer
        if (callTimers[data.callerId]) {
          clearTimeout(callTimers[data.callerId]);
          setCallTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[data.callerId];
            return newTimers;
          });
        }
        
        setGlobalIncomingCall(null);
        setShowGlobalCallScreen(false);
      });

      socketInstance.on("call:busy", (data) => {
        console.log("[ChatApp] User is busy:", data);
        toast.warning(data.message || "Sorry, the other user is already on a video call with someone else", {
          autoClose: 5000,
        });
      });

      socketInstance.on("call:user-offline", (data) => {
        console.log("[ChatApp] User is offline:", data);
        toast.error(data.message || "User is offline");
      });

      return () => {
        // Clear all timers on cleanup
        Object.values(callTimers).forEach(timer => {
          if (timer) clearTimeout(timer);
        });
        disconnectSocket();
        window.socketInstance = null;
      };
    }
  }, [user]);

  const handleLogout = () => {
    // Clear all call timers
    Object.values(callTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    setCallTimers({});
    
    // Emit user-offline so server marks us offline immediately (before socket disconnect)
    if (socket && user?.id) {
      socket.emit("user-offline", String(user.id));
    }
    disconnectSocket();
    logout();
  };

  const handleOpenProfile = (userId, isOwn) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const handleGlobalAcceptCall = async () => {
    console.log("[ChatApp] Global call accepted, finding and opening chat");
    if (!globalIncomingCall || !socket) return;
    
    // Clear the timer
    if (callTimers[globalIncomingCall.callerId]) {
      clearTimeout(callTimers[globalIncomingCall.callerId]);
      setCallTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[globalIncomingCall.callerId];
        return newTimers;
      });
    }
    
    try {
      // Import api to fetch/create chat
      const api = (await import("../utils/api")).default;
      
      let chatToSelect = null;
      
      // Try to find chat by chatId first
      if (globalIncomingCall.chatId) {
        try {
          const chatsResponse = await api.get("/api/chats");
          chatToSelect = chatsResponse.data.chats.find(
            (chat) => chat._id === globalIncomingCall.chatId
          );
        } catch (error) {
          console.error("[ChatApp] Error fetching chats:", error);
        }
      }
      
      // If chat not found by chatId, try to find or create by callerId
      if (!chatToSelect && globalIncomingCall.callerId) {
        try {
          const response = await api.post("/api/chats/create", {
            userId: globalIncomingCall.callerId,
          });
          chatToSelect = response.data.chat;
        } catch (error) {
          console.error("[ChatApp] Error creating chat:", error);
          toast.error("Failed to open chat");
          return;
        }
      }
      
      if (chatToSelect) {
        // Mark the call as auto-accept so VideoCall will accept it automatically
        const callDataWithAutoAccept = {
          ...globalIncomingCall,
          autoAccept: true
        };
        setGlobalIncomingCall(callDataWithAutoAccept);
        setSelectedChat(chatToSelect);
        setShowFriendRequests(false);
        setShowGlobalCallScreen(false); // Close the global call screen
        
        // Clear global call state since ChatWindow will handle it
        setTimeout(() => {
          setGlobalIncomingCall(null);
        }, 100);
      } else {
        toast.error("Could not find or create chat");
        setShowGlobalCallScreen(false);
      }
    } catch (error) {
      console.error("[ChatApp] Error in handleGlobalAcceptCall:", error);
      toast.error("Failed to accept call");
      setShowGlobalCallScreen(false);
    }
  };

  const handleGlobalRejectCall = () => {
    if (socket && globalIncomingCall) {
      // Clear the timer
      if (callTimers[globalIncomingCall.callerId]) {
        clearTimeout(callTimers[globalIncomingCall.callerId]);
        setCallTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[globalIncomingCall.callerId];
          return newTimers;
        });
      }
      
      socket.emit("call:reject", {
        callerId: globalIncomingCall.callerId,
        receiverId: user.id,
        reason: "rejected_by_user",
        receiverName: user.username,
      });
    }
    setGlobalIncomingCall(null);
    setShowGlobalCallScreen(false);
  };

  const handleToggleFriendRequests = () => {
    setShowFriendRequests(!showFriendRequests);
    if (!showFriendRequests) {
      setUnreadRequests(0);
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Global incoming call screen - Show ONLY when no chat is selected or call is not from current chat */}
      {showGlobalCallScreen && globalIncomingCall && !selectedChat && (
        <IncomingCallScreen
          incomingCall={globalIncomingCall}
          onAccept={handleGlobalAcceptCall}
          onReject={handleGlobalRejectCall}
          callerInfo={{
            username: globalIncomingCall.callerName,
            profileImage: globalIncomingCall.callerProfile?.profileImage,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${selectedChat ? "hidden md:flex" : "flex w-full"}
          md:w-96 bg-white border-r border-gray-200 flex-col transition-all duration-300
        `}
      >
        {/* Header */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 h-16 shadow-sm">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
            onClick={() => handleOpenProfile(user.id, true)}
          >
            <div className="relative">
              {user?.profileImage && user.profileImage !== "" ? (
                <img
                  src={user.profileImage || "/placeholder.svg"}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            {/* Username only visible on slightly larger screens if sidebar is narrow, but here sidebar is fixed width on desktop */}
            <div className="hidden sm:block">
               <h2 className="font-semibold text-gray-800 text-sm truncate max-w-[120px]">
                 {user?.username}
               </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
             <button
               onClick={handleToggleFriendRequests}
               className={`p-2 rounded-full hover:bg-gray-100 transition relative ${showFriendRequests ? "text-indigo-600 bg-indigo-50" : "text-gray-600"}`}
               title="Friend Requests"
             >
               <FontAwesomeIcon icon={faUserFriends} />
               {unreadRequests > 0 && (
                 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                   {unreadRequests}
                 </span>
               )}
             </button>
             
             {selectedChat && (
              <button
                onClick={() => setShowMediaGallery(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
                title="Shared Media"
              >
                <FontAwesomeIcon icon={faFolder} />
              </button>
             )}

             <button
               onClick={handleLogout}
               className="p-2 rounded-full hover:bg-red-50 text-red-500 transition"
               title="Logout"
             >
               <FontAwesomeIcon icon={faSignOutAlt} />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showFriendRequests ? (
            <FriendRequests 
              onOpenProfile={handleOpenProfile} 
              onRequestHandled={() => setUnreadRequests(prev => Math.max(0, prev - 1))}
            />
          ) : (
            <UserList
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
              socket={socket}
              onOpenProfile={handleOpenProfile}
            />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`
          ${selectedChat ? "fixed inset-0 z-50 md:static md:flex" : "hidden md:flex"}
          flex-1 flex-col bg-white transition-all duration-300
        `}
      >
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            socket={socket}
            onOpenProfile={handleOpenProfile}
            globalIncomingCall={globalIncomingCall}
            onGlobalCallAccepted={handleGlobalAcceptCall}
            onGlobalCallRejected={handleGlobalRejectCall}
            setGlobalIncomingCall={setGlobalIncomingCall}
            setShowGlobalCallScreen={setShowGlobalCallScreen}
            onBack={handleBackToChats}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white p-4">
            <div className="text-center max-w-md px-4">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faComments}
                    className="text-4xl sm:text-5xl text-indigo-600"
                  />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <FontAwesomeIcon icon={faVideo} className="text-white text-sm" />
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
                Welcome to MERN Chat
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Select a friend from the sidebar to start chatting, 
                make video calls, and share files securely.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <FontAwesomeIcon icon={faVideo} className="text-indigo-600 text-lg mb-2" />
                  <h3 className="font-semibold text-gray-800 text-sm">Video Calls</h3>
                  <p className="text-xs text-gray-500">HD quality calls</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <FontAwesomeIcon icon={faPhone} className="text-green-600 text-lg mb-2" />
                  <h3 className="font-semibold text-gray-800 text-sm">Secure Chat</h3>
                  <p className="text-xs text-gray-500">End-to-end encrypted</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>👈 Click on any contact to start chatting</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          isOwnProfile={selectedUserId === user.id}
        />
      )}

      {/* Media Gallery Modal */}
      {selectedChat && (
        <MediaGallery
          chat={selectedChat}
          isOpen={showMediaGallery}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

      {/* Add custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 20px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}