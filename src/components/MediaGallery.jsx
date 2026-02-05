"use client"

import { useState, useEffect } from "react"
import api from "../utils/api"
import { toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faTimes, 
  faDownload, 
  faFileImage, 
  faFilePdf, 
  faFileWord, 
  faFileExcel,
  faFileAlt,
  faFilter,
  faCalendar,
  faImage,
  faFile,
  faSearch,
  faRedo,
  faSort,
  faChevronDown,
  faChevronUp
} from "@fortawesome/free-solid-svg-icons"

export default function MediaGallery({ chat, isOpen, onClose }) {
  const [media, setMedia] = useState([])
  const [filteredMedia, setFilteredMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortOrder, setSortOrder] = useState("newest")

  useEffect(() => {
    if (isOpen && chat) {
      fetchMedia()
    }
  }, [isOpen, chat])

  useEffect(() => {
    applyFilters()
  }, [media, filterType, startDate, endDate, sortOrder])

  const fetchMedia = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/uploads/${chat._id}/media`)
      setMedia(response.data.media || [])
    } catch (error) {
      console.error("[v0] Fetch media error:", error)
      toast.error("Failed to load media")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...media]

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((msg) =>
        msg.attachments.some((att) => {
          if (filterType === "images") return att.fileType.startsWith("image/")
          if (filterType === "documents") return att.fileType.includes("pdf") || att.fileType.includes("word") || att.fileType.includes("excel")
          if (filterType === "pdf") return att.fileType.includes("pdf")
          if (filterType === "videos") return att.fileType.startsWith("video/")
          return true
        }),
      )
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate)
      filtered = filtered.filter((msg) => new Date(msg.createdAt) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((msg) => new Date(msg.createdAt) <= end)
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt)
      const dateB = new Date(b.createdAt)
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })

    setFilteredMedia(filtered)
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return faFileImage
    if (fileType.includes("pdf")) return faFilePdf
    if (fileType.includes("word") || fileType.includes("document")) return faFileWord
    if (fileType.includes("excel") || fileType.includes("sheet")) return faFileExcel
    if (fileType.startsWith("video/")) return faFileAlt
    return faFile
  }

  const getFileIconColor = (fileType) => {
    if (fileType.startsWith("image/")) return "text-green-500"
    if (fileType.includes("pdf")) return "text-red-500"
    if (fileType.includes("word")) return "text-blue-500"
    if (fileType.includes("excel")) return "text-emerald-500"
    if (fileType.startsWith("video/")) return "text-purple-500"
    return "text-gray-500"
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const resetFilters = () => {
    setFilterType("all")
    setStartDate("")
    setEndDate("")
    setSortOrder("newest")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FontAwesomeIcon icon={faImage} className="text-indigo-600 text-sm sm:text-base" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-gray-800">Shared Media</h2>
              <p className="text-xs text-gray-500 hidden sm:block">Files and media shared in this chat</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 sm:px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1 sm:gap-2"
              title="Toggle Filters"
            >
              <FontAwesomeIcon icon={faFilter} className="text-gray-600 text-sm" />
              <span className="hidden sm:inline text-xs font-medium">Filters</span>
              <FontAwesomeIcon 
                icon={showFilters ? faChevronUp : faChevronDown} 
                className="text-gray-500 text-xs hidden sm:block" 
              />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <FontAwesomeIcon icon={faTimes} className="text-base sm:text-lg" />
            </button>
          </div>
        </div>

        {/* Filters - Collapsible on mobile */}
        <div className={`border-b border-gray-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 transition-all duration-300 overflow-hidden ${
          showFilters ? "max-h-96" : "max-h-0"
        }`}>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* File Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faFile} className="text-xs" />
                  File Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Files</option>
                  <option value="images">Images</option>
                  <option value="videos">Videos</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="documents">Documents</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendar} className="text-xs" />
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendar} className="text-xs" />
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                />
              </div>

              {/* Sort & Actions */}
              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSort} className="text-xs" />
                    Sort By
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={resetFilters}
                    className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 sm:gap-2"
                    title="Reset Filters"
                  >
                    <FontAwesomeIcon icon={faRedo} className="text-xs" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-b border-gray-100 bg-white px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {filteredMedia.length} {filteredMedia.length === 1 ? 'item' : 'items'}
              </span>
              {filterType !== "all" && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </span>
              )}
            </div>
            {filteredMedia.length > 0 && (
              <span className="text-gray-500">
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mb-3 sm:mb-4"></div>
              <p className="text-sm text-gray-500">Loading media...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <FontAwesomeIcon icon={faSearch} className="text-2xl sm:text-3xl text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">
                {media.length === 0 ? "No shared files yet" : "No files match your filters"}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {media.length === 0 
                  ? "Share files and images in your chat to see them here."
                  : "Try adjusting your filters to see more results."}
              </p>
              {media.length === 0 && (
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Start Sharing
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
              {filteredMedia.map((message) =>
                message.attachments.map((attachment, idx) => (
                  <div
                    key={`${message._id}-${idx}`}
                    className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-indigo-300 hover:scale-[1.02]"
                  >
                    {/* Preview */}
                    {attachment.fileType.startsWith("image/") ? (
                      <div className="aspect-square relative">
                        <img
                          src={attachment.fileUrl || "/placeholder.svg"}
                          alt={attachment.fileName}
                          className="w-full h-full object-cover cursor-pointer transition duration-300 group-hover:scale-105"
                          onClick={() => setSelectedFile(attachment)}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    ) : (
                      <div
                        className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center cursor-pointer p-4"
                        onClick={() => setSelectedFile(attachment)}
                      >
                        <FontAwesomeIcon 
                          icon={getFileIcon(attachment.fileType)} 
                          className={`text-3xl sm:text-4xl mb-2 ${getFileIconColor(attachment.fileType)}`}
                        />
                        <span className="text-xs text-gray-600 text-center font-medium truncate w-full px-2">
                          {attachment.fileName.split('.').pop().toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* File Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-xs font-medium truncate mb-1">
                        {attachment.fileName}
                      </p>
                      <div className="flex items-center justify-between text-white/80 text-xs">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        <span>
                          {new Date(message.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={attachment.fileUrl}
                        download={attachment.fileName}
                        className="w-8 h-8 bg-white hover:bg-indigo-50 rounded-full flex items-center justify-center shadow-md transition"
                        title="Download"
                      >
                        <FontAwesomeIcon icon={faDownload} className="text-indigo-600 text-sm" />
                      </a>
                    </div>
                  </div>
                )),
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faImage} className="text-gray-400" />
              <span>Media Gallery • {chat?.username || "Chat"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Total: {media.length} files</span>
              <span>•</span>
              <span>Filtered: {filteredMedia.length} files</span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedFile && selectedFile.fileType.startsWith("image/") && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-2 sm:p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedFile.fileUrl || "/placeholder.svg"}
              alt={selectedFile.fileName}
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-lg"
            />
            
            {/* Controls */}
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex items-center gap-2">
              <a
                href={selectedFile.fileUrl}
                download={selectedFile.fileName}
                className="p-2 sm:p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition flex items-center justify-center"
                title="Download"
              >
                <FontAwesomeIcon icon={faDownload} className="text-gray-700 text-sm sm:text-base" />
              </a>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 sm:p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition"
                title="Close"
              >
                <FontAwesomeIcon icon={faTimes} className="text-gray-700 text-base sm:text-lg" />
              </button>
            </div>

            {/* File Info */}
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 sm:px-4 py-2 rounded-lg backdrop-blur-sm max-w-[90vw]">
              <p className="text-xs sm:text-sm font-medium truncate">{selectedFile.fileName}</p>
              <div className="flex items-center justify-between text-xs text-white/80 mt-1">
                <span>{formatFileSize(selectedFile.fileSize)}</span>
                <span>•</span>
                <span>
                  {new Date(selectedFile.uploadedAt || Date.now()).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}