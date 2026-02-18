'use client';

import { useState, useEffect, useRef } from "react"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faMicrophone,
  faMicrophoneSlash,
  faVideo,
  faVideoSlash,
  faPhoneSlash,
  faExpand,
  faCompress,
  faUser
} from "@fortawesome/free-solid-svg-icons"

const CALL_STATES = {
  IDLE: "idle",
  CALLING: "calling",
  RINGING: "ringing",
  CONNECTED: "connected",
  ENDED: "ended",
}

export default function VideoCall({ 
  chat, 
  socket, 
  otherUser, 
  currentUser, 
  onCallEnd, 
  onCallLog,
  isVisible, 
  incomingCallData: incomingCallDataProp,
  isFullScreen = false,
  onToggleFullScreen
}) {
  const [callState, setCallState] = useState(CALL_STATES.IDLE)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [incomingCallData, setIncomingCallData] = useState(null)
  const [isCallInitiator, setIsCallInitiator] = useState(false)
  const [isCallAccepted, setIsCallAccepted] = useState(false)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true)
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true)
  const [isLocalMain, setIsLocalMain] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30) // 30 seconds timeout for incoming calls

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const callTimerRef = useRef(null)
  const missedCallTimerRef = useRef(null)
  const iceCandidatesQueueRef = useRef([])
  const remoteDescriptionSetRef = useRef(false)
  const callStateRef = useRef(CALL_STATES.IDLE)
  const callDurationRef = useRef(0)

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ],
    iceCandidatePoolSize: 10,
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Cleanup all resources
  const cleanupCall = () => {
    console.log("[VideoCall] Cleaning up call resources")
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      localStreamRef.current = null
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      remoteStreamRef.current = null
    }

    if (peerConnectionRef.current && peerConnectionRef.current.connectionState !== "closed") {
      peerConnectionRef.current.close()
    }
    peerConnectionRef.current = null

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }

    if (missedCallTimerRef.current) {
      clearTimeout(missedCallTimerRef.current)
      missedCallTimerRef.current = null
    }

    setCallDuration(0)
    setIsMuted(false)
    setIsVideoOn(true)
    setIsCallAccepted(false)
    setHasRemoteStream(false)
    setRemoteVideoReady(false)
    setRemoteVideoEnabled(true)
    setRemoteAudioEnabled(true)
    iceCandidatesQueueRef.current = []
    remoteDescriptionSetRef.current = false
  }

  // Helper to get user ID
  const getUserId = (user) => {
    return user?._id || user?.id || null
  }

  // Get local media stream and update video element
  const getLocalMediaStream = async () => {
    try {
      console.log("[VideoCall] Requesting local media stream")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        },
      })

      console.log("[VideoCall] Got local stream with tracks:", 
        `Video: ${stream.getVideoTracks().length}, Audio: ${stream.getAudioTracks().length}`)
      
      // Store the stream reference
      localStreamRef.current = stream
      
      // Update the local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        console.log("[VideoCall] Local video element updated")
        
        // Ensure the video plays
        localVideoRef.current.play().catch(error => {
          console.error("[VideoCall] Error playing local video:", error)
        })
      }

      return stream
    } catch (error) {
      console.error("[VideoCall] Error getting local media:", error)

      throw error
    }
  }

  // Initialize peer connection
  const initializePeerConnection = async (isInitiator = false) => {
    try {
      console.log("[VideoCall] Initializing peer connection as", isInitiator ? "initiator" : "receiver")
      
      // Get local media stream FIRST
      const stream = await getLocalMediaStream()
      localStreamRef.current = stream

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = peerConnection

      // Add all tracks to peer connection
      console.log("[VideoCall] Adding local tracks to peer connection")
      stream.getTracks().forEach((track) => {
        console.log(`[VideoCall] Adding track: ${track.kind} - ${track.enabled ? 'enabled' : 'disabled'}`)
        peerConnection.addTrack(track, stream)
      })

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[VideoCall] ICE candidate generated:", event.candidate.type)
          const toUserId = isCallInitiator ? getUserId(otherUser) : incomingCallData?.callerId
          if (socket && toUserId) {
            socket.emit("ice-candidate", {
              fromUserId: getUserId(currentUser),
              toUserId: toUserId,
              candidate: event.candidate,
            })
          }
        } else {
          console.log("[VideoCall] ICE gathering complete")
        }
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log("[VideoCall] Remote track received:", event.track.kind, 
          "id:", event.track.id, "enabled:", event.track.enabled)
        
        // Create a new MediaStream if we don't have one
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream()
          console.log("[VideoCall] Created new remote MediaStream")
        }
        
        // Add the track to our remote stream
        remoteStreamRef.current.addTrack(event.track)
        setHasRemoteStream(true)
        
        console.log("[VideoCall] Added track to remote stream. Total tracks:", 
          remoteStreamRef.current.getTracks().length)
        
        // Set the remote video source
        if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
          
          // Force play the video with audio
          const playVideo = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play()
                .then(() => {
                  console.log("[VideoCall] Remote video playing successfully")
                  setRemoteVideoReady(true)
                })
                .catch(error => {
                  console.error("[VideoCall] Error playing remote video:", error)
                  setTimeout(playVideo, 100)
                })
            }
          }
          
          playVideo()
        }
        
        // Update connection state
        if (callStateRef.current !== CALL_STATES.CONNECTED) {
          setCallState(CALL_STATES.CONNECTED)
          callStateRef.current = CALL_STATES.CONNECTED

        }
      }

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        console.log("[VideoCall] Connection state changed to:", state)
        
        if (state === "connected") {
          console.log("[VideoCall] Peer connection established!")
          setCallState(CALL_STATES.CONNECTED)
          callStateRef.current = CALL_STATES.CONNECTED

        } else if (state === "failed" || state === "disconnected") {
          console.log("[VideoCall] Connection failed/disconnected")
          if (callStateRef.current !== CALL_STATES.IDLE) {

          }
        } else if (state === "closed") {
          console.log("[VideoCall] Connection closed")
        }
      }

      // Monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState
        console.log("[VideoCall] ICE connection state:", state)
        
        if (state === "connected" || state === "completed") {
          console.log("[VideoCall] ICE connection successful")
        } else if (state === "failed") {
          console.log("[VideoCall] ICE connection failed")

        } else if (state === "disconnected") {
          console.log("[VideoCall] ICE disconnected")
        }
      }

      console.log("[VideoCall] Peer connection initialized successfully")
      return peerConnection
    } catch (error) {
      console.error("[VideoCall] Error initializing peer connection:", error)

      return null
    }
  }

  // Initiate a call (caller side)
  const initiateCall = async () => {
    try {
      console.log("[VideoCall] Initiating call...")
      
      if (!socket) {

        return
      }

      const callerId = getUserId(currentUser)
      const receiverId = getUserId(otherUser)

      if (!callerId || !receiverId) {

        console.error("[VideoCall] Missing user IDs - callerId:", callerId, "receiverId:", receiverId)
        return
      }

      setCallState(CALL_STATES.CALLING)
      callStateRef.current = CALL_STATES.CALLING
      setIsCallInitiator(true)

      // Initialize peer connection and get media
      const pc = await initializePeerConnection(true)
      if (!pc) {

        setCallState(CALL_STATES.IDLE)
        callStateRef.current = CALL_STATES.IDLE
        return
      }

      // Create and send offer
      console.log("[VideoCall] Creating offer...")
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      
      console.log("[VideoCall] Setting local description")
      await pc.setLocalDescription(offer)

      // Emit call initiation to receiver
      console.log("[VideoCall] Sending call initiation from", callerId, "to", receiverId)
      socket.emit("call:initiate", {
        offer,
        callerId: callerId,
        callerName: currentUser.username,
        callerProfile: {
          profileImage: currentUser.profileImage,
        },
        receiverId: receiverId,
        chatId: chat?._id,
      })

      // Set timeout for call
      missedCallTimerRef.current = setTimeout(() => {
        if (callStateRef.current === CALL_STATES.CALLING) {
          console.log("[VideoCall] Call timeout - no answer")

          if (chat?._id && onCallLog) {
            onCallLog(chat._id, "no_answer", getUserId(currentUser))
          }
          endCall()
        }
      }, 30000)
      

    } catch (error) {
      console.error("[VideoCall] Error initiating call:", error)

      setCallState(CALL_STATES.IDLE)
      callStateRef.current = CALL_STATES.IDLE
    }
  }

  // Accept incoming call
  const acceptCall = async () => {
    try {
      console.log("[VideoCall] Accepting call...")
      
      if (!incomingCallData) {

        return
      }

      if (missedCallTimerRef.current) {
        clearTimeout(missedCallTimerRef.current)
        missedCallTimerRef.current = null
      }

      setIsCallAccepted(true)

      // Initialize peer connection and get media FIRST
      // This ensures local video is set up before anything else
      const pc = await initializePeerConnection(false)
      if (!pc) {

        return
      }

      // Set remote offer
      console.log("[VideoCall] Setting remote description from incoming offer")
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer))
      remoteDescriptionSetRef.current = true

      // Process any queued ICE candidates
      console.log("[VideoCall] Processing queued ICE candidates:", iceCandidatesQueueRef.current.length)
      for (const candidate of iceCandidatesQueueRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error("[VideoCall] Error adding queued ICE candidate:", error)
        }
      }
      iceCandidatesQueueRef.current = []

      // Create and send answer
      console.log("[VideoCall] Creating answer...")
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await pc.setLocalDescription(answer)

      // Send acceptance notification to caller
      socket?.emit("call:accept", {
        answer,
        callerId: incomingCallData.callerId,
        receiverId: getUserId(currentUser),
        receiverName: currentUser.username,
      })

      // Ensure local video is playing
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        localVideoRef.current.muted = true
        localVideoRef.current.play().catch(error => {
          console.error("[VideoCall] Error playing local video after accept:", error)
        })
      }


    } catch (error) {
      console.error("[VideoCall] Error accepting call:", error)

      rejectCall()
    }
  }

  // Reject incoming call
  const rejectCall = () => {
    console.log("[VideoCall] Rejecting call")
    
    if (missedCallTimerRef.current) {
      clearTimeout(missedCallTimerRef.current)
      missedCallTimerRef.current = null
    }

    socket?.emit("call:reject", {
      callerId: incomingCallData?.callerId,
      receiverId: getUserId(currentUser),
      reason: "rejected_by_user",
      receiverName: currentUser.username,
    })

    cleanupCall()
    setCallState(CALL_STATES.IDLE)
    callStateRef.current = CALL_STATES.IDLE
    setIncomingCallData(null)
    onCallEnd?.()

  }

  useEffect(() => {
    callDurationRef.current = callDuration
  }, [callDuration])

  // End call
  const endCall = () => {
    console.log("[VideoCall] Ending call")
    
    if (callStateRef.current === CALL_STATES.IDLE) return

    const currentUserId = getUserId(currentUser)
    let callerId, receiverId
    
    if (isCallInitiator) {
      callerId = currentUserId
      receiverId = getUserId(otherUser)
    } else {
      callerId = incomingCallData?.callerId
      receiverId = currentUserId
    }
    
    // Log completed call in chat (WhatsApp-style) - from caller's side, with duration
    if (callStateRef.current === CALL_STATES.CONNECTED && chat?._id && onCallLog && callerId) {
      const duration = callDurationRef.current || callDuration
      onCallLog(chat._id, "completed", callerId, duration)
    }

    if (socket && callerId && receiverId) {
      console.log("[VideoCall] Emitting call:end - callerId:", callerId, "receiverId:", receiverId)
      socket.emit("call:end", {
        callerId: callerId,
        receiverId: receiverId,
        reason: "ended_by_user",
      })
    }

    cleanupCall()
    setCallState(CALL_STATES.IDLE)
    callStateRef.current = CALL_STATES.IDLE
    setIncomingCallData(null)
    onCallEnd?.()

  }

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      const newMuteState = !isMuted
      
      if (audioTracks.length > 0) {
        audioTracks.forEach((track) => {
          track.enabled = !newMuteState // If muted (true), enabled should be false
          console.log(`[VideoCall] Audio track ${track.id} enabled: ${track.enabled}`)
        })
        
        setIsMuted(newMuteState)
        
        // Notify other user
        const otherUserId = isCallInitiator ? getUserId(otherUser) : incomingCallData?.callerId
        if (socket && otherUserId) {
           socket.emit("call:toggle-media", {
             toUserId: otherUserId,
             type: 'audio',
             enabled: !newMuteState
           })
        }
      } else {
        console.error("[VideoCall] No audio tracks found")
      }
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      const newVideoState = !isVideoOn
      
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = newVideoState
          console.log(`[VideoCall] Video track ${track.id} enabled: ${track.enabled}`)
        })
        
        setIsVideoOn(newVideoState)

        // Notify other user
        const otherUserId = isCallInitiator ? getUserId(otherUser) : incomingCallData?.callerId
        if (socket && otherUserId) {
           socket.emit("call:toggle-media", {
             toUserId: otherUserId,
             type: 'video',
             enabled: newVideoState
           })
        }
      } else {
        console.error("[VideoCall] No video tracks found")
      }
    }
  }

  // Handle incoming call data
  useEffect(() => {
    if (incomingCallDataProp && !incomingCallData) {
      console.log("[VideoCall] Setting incoming call data:", incomingCallDataProp)
      setIncomingCallData(incomingCallDataProp)
      setCallState(CALL_STATES.RINGING)
      callStateRef.current = CALL_STATES.RINGING
      setTimeLeft(30) // Reset timer for incoming call
    }
  }, [incomingCallDataProp])

  // Timer for incoming call timeout
  useEffect(() => {
    if (callState === CALL_STATES.RINGING && incomingCallData && !incomingCallData.autoAccept) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            rejectCall() // Auto reject after timeout
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [callState, incomingCallData])

  // Reset timeLeft when call state changes
  useEffect(() => {
    if (callState !== CALL_STATES.RINGING) {
      setTimeLeft(30)
    }
  }, [callState])

  // Auto-accept call if autoAccept flag is set (from global call screen)
  useEffect(() => {
    if (incomingCallData && incomingCallData.autoAccept && callStateRef.current === CALL_STATES.RINGING && socket && isVisible) {
      console.log("[VideoCall] Auto-accepting call from global screen")
      // Small delay to ensure component is fully ready and socket is connected
      const timer = setTimeout(async () => {
        try {
          if (!incomingCallData) {
            console.log("[VideoCall] No incoming call data for auto-accept")
            return
          }

          if (missedCallTimerRef.current) {
            clearTimeout(missedCallTimerRef.current)
            missedCallTimerRef.current = null
          }

          setIsCallAccepted(true)

          // Initialize peer connection and get media FIRST
          const pc = await initializePeerConnection(false)
          if (!pc) {

            return
          }

          // Set remote offer
          console.log("[VideoCall] Setting remote description from incoming offer (auto-accept)")
          await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer))
          remoteDescriptionSetRef.current = true

          // Process any queued ICE candidates
          console.log("[VideoCall] Processing queued ICE candidates:", iceCandidatesQueueRef.current.length)
          for (const candidate of iceCandidatesQueueRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
              console.error("[VideoCall] Error adding queued ICE candidate:", error)
            }
          }
          iceCandidatesQueueRef.current = []

          // Create and send answer
          console.log("[VideoCall] Creating answer (auto-accept)...")
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
          await pc.setLocalDescription(answer)

          // Send acceptance notification to caller
          socket?.emit("call:accept", {
            answer,
            callerId: incomingCallData.callerId,
            receiverId: getUserId(currentUser),
            receiverName: currentUser.username,
          })

          // Ensure local video is playing
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
            localVideoRef.current.muted = true
            localVideoRef.current.play().catch(error => {
              console.error("[VideoCall] Error playing local video after auto-accept:", error)
            })
          }


        } catch (error) {
          console.error("[VideoCall] Error in auto-accept:", error)

          rejectCall()
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [incomingCallData, socket, isVisible, currentUser])

  // Auto-initiate call when component becomes visible (for caller)
  useEffect(() => {
    if (isVisible && callStateRef.current === CALL_STATES.IDLE && socket && !incomingCallData && otherUser) {
      console.log("[VideoCall] Auto-initiating call as caller")
      initiateCall()
    }

    return () => {
      if (callStateRef.current !== CALL_STATES.IDLE) {
        cleanupCall()
      }
    }
  }, [isVisible])

  // Call duration timer
  useEffect(() => {
    if (callState === CALL_STATES.CONNECTED) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
        callTimerRef.current = null
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [callState])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleAnswerReceived = async (data) => {
      console.log("[VideoCall] Received answer from", data.receiverId, "for caller", data.callerId)
      const currentUserId = getUserId(currentUser)
      
      // Verify this answer is for the current call (only check if we're the initiator)
      if (isCallInitiator) {
        if (data.callerId !== currentUserId) {
          console.log("[VideoCall] Answer not for this call - callerId mismatch:", data.callerId, "vs", currentUserId)
          return
        }
        if (data.receiverId !== getUserId(otherUser)) {
          console.log("[VideoCall] Answer not for this call - receiverId mismatch:", data.receiverId, "vs", getUserId(otherUser))
          return
        }
      }
      
      // If peer connection doesn't exist yet, wait a bit and try again (max 3 attempts)
      let attempts = 0
      const maxAttempts = 6
      const checkAndProcess = async () => {
        attempts++
        if (!peerConnectionRef.current) {
          if (attempts < maxAttempts) {
            console.log(`[VideoCall] Peer connection not ready, attempt ${attempts}/${maxAttempts}, waiting...`)
            setTimeout(checkAndProcess, 500)
            return
          } else {
            console.error("[VideoCall] Peer connection not ready after max attempts")
            return
          }
        }
        
        if (peerConnectionRef.current && data.answer && peerConnectionRef.current.signalingState !== "closed") {
          try {
            console.log("[VideoCall] Setting remote description from answer")
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            )
            remoteDescriptionSetRef.current = true
            console.log("[VideoCall] Remote description set from answer")
            
            // Process any queued ICE candidates
            console.log("[VideoCall] Processing queued ICE candidates:", iceCandidatesQueueRef.current.length)
            for (const candidate of iceCandidatesQueueRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
              } catch (error) {
                console.error("[VideoCall] Error adding queued ICE candidate:", error)
              }
            }
            iceCandidatesQueueRef.current = []
            
            setCallState(CALL_STATES.CONNECTED)
            callStateRef.current = CALL_STATES.CONNECTED

          } catch (error) {
            console.error("[VideoCall] Error setting remote description:", error)

          }
        } else {
          console.warn("[VideoCall] Peer connection not ready or closed")
          if (!peerConnectionRef.current) {
            console.log("[VideoCall] Peer connection is null")
          } else if (peerConnectionRef.current.signalingState === "closed") {
            console.log("[VideoCall] Peer connection is closed")
          }
        }
      }
      
      checkAndProcess()
    }

    const handleIncomingCall = (data) => {
      console.log("[VideoCall] Incoming call from", data.callerId)
      if (!incomingCallData) {
        setIncomingCallData(data)
        setCallState(CALL_STATES.RINGING)
        callStateRef.current = CALL_STATES.RINGING
        setTimeLeft(30)
      }
    }

    const handleCallAccepted = (data) => {
      console.log("[VideoCall] Call accepted notification received")
      if (callStateRef.current === CALL_STATES.CALLING) {
        setCallState(CALL_STATES.CONNECTED)
        callStateRef.current = CALL_STATES.CONNECTED

      }
    }

    const handleCallRejected = (data) => {
      console.log("[VideoCall] Call rejected by", data.receiverId)

      if (chat?._id && onCallLog && isCallInitiator) {
        onCallLog(chat._id, "rejected", getUserId(currentUser))
      }
      endCall()
    }

    const handleCallEnded = (data) => {
      console.log("[VideoCall] Call ended event received:", data)
      const currentUserId = getUserId(currentUser)
      const otherUserId = isCallInitiator ? getUserId(otherUser) : incomingCallData?.callerId
      
      // Only end the call if this event is for the current active call (use String() for ID comparison)
      const isForCurrentCall = (String(data.callerId) === String(currentUserId) && String(data.receiverId) === String(otherUserId)) ||
                               (String(data.callerId) === String(otherUserId) && String(data.receiverId) === String(currentUserId))
      
      if (!isForCurrentCall) {
        console.log("[VideoCall] Call ended event not for current call, ignoring")
        console.log("[VideoCall] Current call - callerId:", isCallInitiator ? currentUserId : otherUserId, "receiverId:", isCallInitiator ? otherUserId : currentUserId)
        console.log("[VideoCall] Event - callerId:", data.callerId, "receiverId:", data.receiverId)
        return
      }
      
      console.log("[VideoCall] Call ended for current call")
      if (callStateRef.current !== CALL_STATES.IDLE) {
        cleanupCall()
        setCallState(CALL_STATES.IDLE)
        callStateRef.current = CALL_STATES.IDLE
        setIncomingCallData(null)
        onCallEnd?.()

      }
    }

    const handleIceCandidate = async (data) => {
      console.log("[VideoCall] Received ICE candidate from", data.fromUserId)
      if (data.toUserId !== getUserId(currentUser)) return

      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== "closed") {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          )
          console.log("[VideoCall] ICE candidate added")
        } catch (error) {
          console.error("[VideoCall] Error adding ICE candidate:", error)
          if (!remoteDescriptionSetRef.current) {
            console.log("[VideoCall] Queueing ICE candidate")
            iceCandidatesQueueRef.current.push(data.candidate)
          }
        }
      } else {
        console.log("[VideoCall] Peer connection not ready, queueing ICE candidate")
        iceCandidatesQueueRef.current.push(data.candidate)
      }
    }

    socket.on("call:answer-received", handleAnswerReceived)
    socket.on("call:incoming", handleIncomingCall)
    socket.on("call:accepted-notification", handleCallAccepted)
    socket.on("call:rejected", handleCallRejected)
    socket.on("call:ended", handleCallEnded)
    socket.on("call:ended", handleCallEnded)
    socket.on("ice-candidate", handleIceCandidate)
    
    socket.on("call:toggle-media", ({ type, enabled }) => {
      console.log(`[VideoCall] Peer toggled ${type} to ${enabled}`)
      if (type === 'video') {
        setRemoteVideoEnabled(enabled)
      } else if (type === 'audio') {
        setRemoteAudioEnabled(enabled)
      }
    })

    socket.on("call:user-offline", (data) => {
      console.log("[VideoCall] User offline:", data)

      endCall()
    })

    socket.on("call:busy", (data) => {
      console.log("[VideoCall] User busy:", data)

      endCall()
    })

    return () => {
      socket.off("call:answer-received", handleAnswerReceived)
      socket.off("call:incoming", handleIncomingCall)
      socket.off("call:accepted-notification", handleCallAccepted)
      socket.off("call:rejected", handleCallRejected)
      socket.off("call:ended", handleCallEnded)
      socket.off("call:ended", handleCallEnded)
      socket.off("ice-candidate", handleIceCandidate)
      socket.off("call:toggle-media")
      socket.off("call:user-offline")
      socket.off("call:busy")
    }
  }, [socket, isCallInitiator, currentUser, incomingCallData])

  // Update remote video when stream changes
  useEffect(() => {
    if (remoteStreamRef.current && remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
      remoteVideoRef.current.play()
        .then(() => {
          console.log("[VideoCall] Remote video started playing")
          setRemoteVideoReady(true)
        })
        .catch(console.error)
    }
  }, [hasRemoteStream])

  // Ensure local video is always updated when stream is available
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      if (!localVideoRef.current.srcObject || localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        localVideoRef.current.muted = true
        localVideoRef.current.play().catch(console.error)
      }
    }
  }, [localStreamRef.current])

  // If not visible, don't render
  if (!isVisible) return null

  // If call is idle and no incoming call, don't render
  if (callState === CALL_STATES.IDLE && !incomingCallData) return null

  // Incoming call screen (for receiver) - Don't show if autoAccept is set
  if (callState === CALL_STATES.RINGING && incomingCallData && !incomingCallData.autoAccept) {
    return (
      <div className={`${isFullScreen ? 'fixed inset-0' : 'absolute inset-0'} bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm p-4`}>
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-6 md:p-8 text-center max-w-sm w-full mx-auto shadow-2xl border border-gray-700">
          <div className="mb-4 md:mb-6">
            {incomingCallData.callerProfile?.profileImage ? (
              <img
                src={incomingCallData.callerProfile.profileImage || "/placeholder.svg"}
                alt={incomingCallData.callerName}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover mx-auto border-4 border-green-500 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-4xl md:text-5xl font-bold mx-auto border-4 border-green-500 shadow-lg">
                {incomingCallData.callerName?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 truncate px-2">{incomingCallData.callerName}</h2>

          <div className="flex items-center justify-center gap-2 text-green-400 mb-4 md:mb-6">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <p className="text-lg md:text-xl font-semibold">Incoming Video Call</p>
          </div>

          {/* Animated ringing indicator */}
          <div className="flex justify-center gap-3 mb-6 md:mb-8">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-200"></div>
          </div>

          {/* Timeout counter */}
          <div className="mb-6 md:mb-8">
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              ></div>
            </div>
            <p className="text-gray-400 text-sm">
              Auto declines in <span className="font-bold text-white">{formatTime(timeLeft)}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={acceptCall}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-full font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-lg shadow-lg active:scale-95"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
              </svg>
              Accept
            </button>
            <button
              onClick={rejectCall}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-full font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-lg shadow-lg active:scale-95"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
              Decline
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active call screen (for both caller and receiver)
  if (callState === CALL_STATES.CALLING || callState === CALL_STATES.CONNECTED) {
    return (
      <div className={`${isFullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0'} bg-black flex flex-col`}>
        {/* Fullscreen toggle button */}
        {!isFullScreen && (
          <button
            onClick={onToggleFullScreen}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-black/50 text-white p-2 md:p-3 rounded-full hover:bg-black/70 transition"
            title="Expand to full screen"
          >
            <FontAwesomeIcon icon={faExpand} className="text-sm md:text-base" />
          </button>
        )}
        
        {isFullScreen && (
          <button
            onClick={onToggleFullScreen}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-black/50 text-white p-2 md:p-3 rounded-full hover:bg-black/70 transition"
            title="Exit full screen"
          >
            <FontAwesomeIcon icon={faCompress} className="text-sm md:text-base" />
          </button>
        )}

        {/* Remote video - main display */}
        {/* Video Containers (Swappable) */}
        
        {/* Remote Video Container */}
        <div 
          onClick={() => isLocalMain && setIsLocalMain(false)}
          className={
            !isLocalMain 
              ? "flex-1 relative bg-black flex items-center justify-center overflow-hidden" // Full Screen (Default)
              : `absolute z-20 cursor-pointer transition-all duration-300 ease-in-out
                 ${isFullScreen 
                   ? 'bottom-6 right-6 w-32 h-42 md:w-40 md:h-52' 
                   : 'bottom-3 right-3 w-20 h-26 sm:w-24 sm:h-32 md:w-28 md:h-36'
                 } 
                 bg-black border-2 md:border-3 border-gray-800 rounded-lg md:rounded-xl overflow-hidden shadow-2xl` // PIP
          }
        >
          {callState === CALL_STATES.CONNECTED && hasRemoteStream ? (
            <div className="relative w-full h-full">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log("[VideoCall] Remote video metadata loaded")
                }}
                onCanPlay={() => {
                  console.log("[VideoCall] Remote video can play")
                  setRemoteVideoReady(true)
                }}
                onPlaying={() => {
                  console.log("[VideoCall] Remote video is playing")
                  setRemoteVideoReady(true)
                }}
                onError={(e) => {
                  console.error("[VideoCall] Remote video error:", e)
                }}
              />
              
              {!remoteVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl md:text-3xl font-bold mx-auto mb-4 animate-pulse">
                      <FontAwesomeIcon icon={faUser} className="animate-spin" />
                    </div>
                    <p className="text-white font-semibold text-sm md:text-base">Loading video...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl md:text-5xl font-bold mx-auto mb-4">
                  {otherUser.username?.[0]?.toUpperCase()}
                </div>
                <p className="text-white text-xl md:text-2xl font-bold truncate max-w-full px-2">{otherUser.username}</p>
                <p className="text-gray-300 mt-2 text-base md:text-lg">
                  {callState === CALL_STATES.CALLING ? "Calling..." : "Connecting..."}
                </p>
                {callState === CALL_STATES.CALLING && (
                  <div className="flex justify-center mt-4 md:mt-6 gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Remote Video Disabled Placeholder */}
          {callState === CALL_STATES.CONNECTED && !remoteVideoEnabled && (
             <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white text-4xl md:text-5xl font-bold mx-auto mb-4 border-4 border-gray-500">
                    {otherUser.username?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-white font-semibold text-lg md:text-xl">{otherUser.username}</p>
                  <p className="text-gray-400 text-sm mt-2">Camera is off</p>
                </div>
             </div>
          )}
          
          {/* Call duration (Only show on remote main view or if local is main, need logic) */}
          {/* Actually, it's simpler to just show duration on whichever is main, or always floating center top */}
          {callState === CALL_STATES.CONNECTED && !isLocalMain && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 md:px-6 md:py-3 rounded-full backdrop-blur-sm z-30">
              <p className="text-white font-bold text-base md:text-lg">{formatTime(callDuration)}</p>
            </div>
          )}
        </div>

        {/* Local Video Container */}
        <div 
          onClick={() => !isLocalMain && setIsLocalMain(true)}
          className={
            isLocalMain 
             ? "flex-1 relative bg-black flex items-center justify-center overflow-hidden" // Full Screen (local became main)
             : `absolute z-20 cursor-pointer transition-all duration-300 ease-in-out
                ${isFullScreen 
                  ? 'bottom-6 right-6 w-32 h-42 md:w-40 md:h-52' 
                  : 'bottom-3 right-3 w-20 h-26 sm:w-24 sm:h-32 md:w-28 md:h-36'
                } 
                bg-black border-2 md:border-3 border-gray-800 rounded-lg md:rounded-xl overflow-hidden shadow-2xl` // PIP (Default)
          }
        >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                console.log("[VideoCall] Local video metadata loaded")
              }}
              onPlaying={() => {
                console.log("[VideoCall] Local video is playing")
              }}
              onError={(e) => {
                console.error("[VideoCall] Local video error:", e)
              }}
            />
            <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black/0 px-2 py-1 rounded text-xs text-white font-semibold">
              {/* Removed overlay status */}
            </div>
            
            {/* Show duration if local is main */}
            {callState === CALL_STATES.CONNECTED && isLocalMain && (
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 md:px-6 md:py-3 rounded-full backdrop-blur-sm z-30">
                  <p className="text-white font-bold text-base md:text-lg">{formatTime(callDuration)}</p>
                </div>
            )}
        </div>

        {/* Controls - Fixed responsive bottom bar */}
        <div className="bg-gray-900/90 backdrop-blur-sm px-4 py-3 md:px-8 md:py-5 flex items-center justify-center gap-4 md:gap-8 w-full">
          <button
            onClick={toggleMute}
            className={`p-3 md:p-4 rounded-full transition-all ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"} shadow-lg transform hover:scale-105`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            <FontAwesomeIcon
              icon={isMuted ? faMicrophoneSlash : faMicrophone}
              className="text-white text-lg md:text-xl"
            />
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 md:p-4 rounded-full transition-all ${!isVideoOn ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"} shadow-lg transform hover:scale-105`}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            <FontAwesomeIcon
              icon={!isVideoOn ? faVideoSlash : faVideo}
              className="text-white text-lg md:text-xl"
            />
          </button>

          <button
            onClick={endCall}
            className="p-3 md:p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all shadow-lg transform hover:scale-105"
            title="End call"
          >
            <FontAwesomeIcon icon={faPhoneSlash} className="text-white text-lg md:text-xl" />
          </button>
        </div>
      </div>
    )
  }

  return null
}