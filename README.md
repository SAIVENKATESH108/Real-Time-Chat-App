# Real-Time-Chat-App (chatO PRO)

A modern, full-stack, enterprise-grade real-time chat application inspired by Discord, Telegram, and WhatsApp. Built with **React 18**, **Node.js**, **Express**, **Socket.io**, **Prisma ORM**, and **PostgreSQL**.

---

## 🌟 Key Features

### 💬 Real-Time Messaging & Direct Communication
- **1-to-1 Direct Messages (DMs)**: Search and message users with `@username` or display name search.
- **Saved Notes / Message Yourself**: Self-messaging support for personal notes and cloud file storage.
- **Public & Private Channels**: Multi-user group channels with invite link sharing (`/join/:roomId`).
- **Sub-Channels Hierarchy**: Create nested sub-channels (e.g. `💬-general`, `📢-announcements`, `🎮-gaming`) with expandable tree navigation.
- **Rich Chat Features**:
  - Voice notes recorder with animated waveforms.
  - Image/photo file attachments with full-screen lightbox modal.
  - Tenor GIF search & animated picker.
  - Emoji picker and live message reactions with user attribution.
  - Quoted message replies and message deletion.
  - Double blue delivery ticks (`✓✓`) and real-time typing indicators.
  - In-conversation message search.

### 📞 Live WebRTC Audio & Video Calling
- Peer-to-peer audio and video calls using Google STUN servers.
- Bidirectional SDP Offer/Answer signaling over Socket.io.
- Automatic ringtone termination on answer.
- Screen sharing, camera flip, and live microphone mute/unmute.
- Graceful camera fallback to high-clarity voice-only mode.

### 🛡️ Channel Administration & Moderation
- **Channel Settings Modal**: Rename channels, edit topics, and toggle visibility.
- **Member Management**: List all members with role badges (`Owner`, `Admin`, `Member`).
- **Kick Members**: Remove disruptive members with real-time socket disconnection.
- **Role Assignment**: Appoint trusted members to Channel Admin / Moderator.

### 🎨 OLED Pitch Black Dark Theme & Rich Aesthetics
- Pure pitch black (`#000000`) OLED dark mode with electric blue accents.
- Sub-transparent border system (`rgba(255, 255, 255, 0.08)`) with subtle neon glow on hover.
- Completely invisible smooth-scrolling scrollbars across all panels.
- Top active presence story avatars carousel with glowing live status rings (🟢 Online, 🟡 Idle, 🔴 DND, ⚪ Offline).
- Pinned sidebar bottom user profile and logout bar.
- Dynamic chat wallpapers (Cyberpunk, Sunset, Aurora, Deep Space, Emerald, Matrix Grid).
- Mobile-first responsive layout with bottom navigation drawer.

---

## 🔐 Security Architecture

- **httpOnly Session Cookies**: JWTs are transmitted exclusively in `httpOnly`, `sameSite: 'lax'`, `secure` cookies to eliminate token theft via XSS.
- **Strict Input Sanitization**: HTML tags and scripts are stripped/sanitized before database storage.
- **SQL Injection Immune**: Prisma parameterized queries prevent SQL injection.
- **Password Security**: Passwords hashed using `bcrypt` with high salt rounds.
- **Role-Based Access Control (RBAC)**: All sensitive administration routes verify admin/creator permissions.
- **Strict CORS & Payload Limits**: CORS restricted to configured client origins with 10MB payload thresholds.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Icons**: Lucide React
- **Audio/WebRTC**: WebRTC `RTCPeerConnection`, MediaStream API, Web Audio API
- **Styling**: Vanilla CSS (CSS Variables, Glassmorphism, Responsive Grid/Flexbox)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Real-Time Engine**: Socket.io
- **Database ORM**: Prisma ORM (Multi-Schema PostgreSQL)
- **Authentication**: JSON Web Tokens (JWT) + bcryptjs + cookie-parser
- **Testing**: Vitest + Supertest

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/SAIVENKATESH108/Real-Time-Chat-App.git
cd Real-Time-Chat-App
```

### 2. Configure Environment Variables
In `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://username:password@host:5432/dbname?schema=chato&sslmode=require"
JWT_SECRET="your_jwt_secret_key_here"
```

### 3. Install Dependencies & Push Database Schema
```bash
# Backend
cd backend
npm install
npx prisma db push

# Frontend
cd ../frontend
npm install
```

### 4. Run Locally
```bash
# Start backend (from /backend)
npm run dev

# Start frontend (from /frontend)
npm run dev
```

Visit **http://localhost:5173** to start chatting!

---

## 🧪 Testing

Run the full integration test suite:
```bash
cd backend
npm test
```

---

## 📄 License
MIT License
