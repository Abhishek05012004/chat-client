"use client"

import { useState, useEffect } from "react"

export default function IncomingCallScreen({ incomingCall, onAccept, onReject, callerInfo }) {
  const [timeLeft, setTimeLeft] = useState(30) // 30 seconds timeout

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onReject() // Auto reject after timeout
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onReject])

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-6 md:p-8 text-center max-w-sm w-full mx-auto shadow-2xl border border-gray-700">
        <div className="mb-4 md:mb-6">
          {callerInfo?.profileImage ? (
            <img
              src={callerInfo.profileImage || "/placeholder.svg"}
              alt={callerInfo?.username}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover mx-auto border-4 border-green-500 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-4xl md:text-5xl font-bold mx-auto border-4 border-green-500 shadow-lg">
              {callerInfo?.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 truncate px-2">{callerInfo?.username}</h2>

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
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-full font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-3 text-lg shadow-lg active:scale-95"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
            Accept
          </button>
          <button
            onClick={onReject}
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