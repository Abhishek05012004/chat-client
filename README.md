# MERN Chat Application - Client

This is the front-end client interface for the MERN Chat Application, built with React, Vite, TailwindCSS, and Socket.io-client. It provides a real-time, responsive single-page chat environment complete with real-time text chat, file sharing, user profiles, friend management, and video/voice calls.

---

## 🚀 Tech Stack & Libraries

- **Framework & Tooling:** React (v19) + Vite (v7)
- **Styling:** TailwindCSS
- **Routing:** React Router DOM (v7)
- **Real-Time WebSockets:** Socket.io-client
- **HTTP Client:** Axios
- **Icons:** FontAwesome React Icons
- **Toast Notifications:** React Toastify
- **Emoji Library:** emoji-picker-react
- **PDF Rendering:** pdfjs-dist (for rendering PDF document files in the chat)
- **WebRTC Signaling & Stream APIs:** Built-in browser WebRTC APIs for video/voice calls

---

## 🛠️ Features Included

1. **Authentication Screens:**
   - Registration with email verification setup.
   - Secure login.
   - Forgot Password / Password Reset request UI.
2. **Dashboard & Sidebar:**
   - Sidebar to manage active chats, search users, and switch views.
   - Online status indicators for contacts.
3. **Chat Interface:**
   - Real-time text messaging with read/delivered states.
   - Fully integrated emoji picker.
   - Inline PDF file previews and document display.
   - Audio messaging and files, pictures gallery view.
4. **Social features:**
   - Send, accept, and decline friend requests.
   - List friends and search for new ones.
5. **Real-time Calls:**
   - Integrated voice/video call layout utilizing WebRTC.
   - Incoming call ring screens, ringtones, accept/decline actions.
6. **User Profile Settings:**
   - Edit custom avatar images, display names, and bio status.

---

## 📦 Project Directory Structure

```text
client/
├── public/             # Static public assets
├── src/
│   ├── assets/         # App images, logos, call sounds/ringtones
│   ├── components/     # React presentation and state components
│   │   ├── Login.jsx, Register.jsx, ForgotPassword.jsx
│   │   ├── ChatApp.jsx (Core dashboard shell)
│   │   ├── ChatWindow.jsx (Core message thread, inputs, files, calls control)
│   │   ├── VideoCall.jsx, IncomingCallScreen.jsx (WebRTC calls views)
│   │   ├── FriendRequests.jsx, UserList.jsx (Friend manager components)
│   │   └── ProfileModal.jsx, MediaGallery.jsx
│   ├── context/        # React context (e.g. user authentication, sockets state)
│   ├── utils/          # Utility scripts and HTTP configurations
│   ├── App.jsx         # App router and routes definition
│   ├── index.css       # TailwindCSS and custom CSS layers
│   └── main.jsx        # App entry point mounting React DOM
├── vercel.json         # Vercel SPA routing and security header rules
├── vite.config.js      # Vite compilation configurations
└── package.json        # Manifest, scripts, and dependencies
```

---

## ⚙️ Environment Variables Setup

Configure the client environment by specifying the server API base URL.

Create files in the `client` root directory:

### Development Environment: `.env.development`
```ini
VITE_API_URL=http://localhost:5000
```

### Production Environment: `.env`
```ini
VITE_API_URL=https://your-production-server-domain.com
```

---

## 🏃 Getting Started

### 1. Installation
Navigate to the `client/` directory and install the packages:
```bash
npm install
```

### 2. Start Development Server
Launches the development build on [http://localhost:5173](http://localhost:5173) with hot module replacement (HMR):
```bash
npm run dev
```

### 3. Build for Production
Generates the optimized static distribution bundle (stored under `/dist` folder):
```bash
npm run build
```

### 4. Preview Production Build Locally
Runs a local web server displaying the compiled build files to check production behavior:
```bash
npm run preview
```

---

## ☁️ Deployment

The project includes a [vercel.json](file:///c:/Users/ajha2/Desktop/chat/client/vercel.json) configuration file, making it ready to be deployed instantly onto **Vercel** with support for SPA router fallbacks and custom security headers.
Make sure you set the `VITE_API_URL` environment variable to your deployed API server link in the Vercel project environment configuration settings.
