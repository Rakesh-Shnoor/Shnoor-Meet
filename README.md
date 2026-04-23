# Shnoor Meetings

> A full-stack, real-time video conferencing platform built with WebRTC, FastAPI, and React.

---

## Table of Contents

- [Overview]
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
  - [Backend (`backend/.env`)](#backend-backendenv)
  - [Frontend (`frontend/.env`)](#frontend-frontendenv)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Features](#features)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

Shnoor Meetings is a production-ready video conferencing platform that enables real-time peer-to-peer video calls, meeting scheduling, in-meeting chat, live captions, and an AI-powered chatbot assistant — all within a premium, theme-customizable UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion |
| **Backend** | FastAPI, Uvicorn, WebSockets |
| **Database** | PostgreSQL (via psycopg2) |
| **Auth** | Google OAuth 2.0 (`@react-oauth/google`), Firebase |
| **Real-time** | WebRTC (via `useWebRTC` hook), WebSocket signaling |
| **AI / Captions** | Groq API, OpenRouter API (DeepSeek R1) |
| **Deployment** | Render.com |

---

## Project Structure

```
shnoor-meetings/
├── backend/                  # FastAPI server
│   ├── core/
│   │   ├── connection_manager.py   # WebSocket room management
│   │   └── database.py             # PostgreSQL connection & init
│   ├── routers/
│   │   ├── meeting.py              # Meeting CRUD endpoints
│   │   ├── signaling.py            # WebRTC signaling (WebSocket)
│   │   ├── calendar.py             # Calendar event endpoints
│   │   └── user.py                 # User profile endpoints
│   ├── schema.sql            # Full PostgreSQL schema
│   ├── requirements.txt
│   └── main.py               # App entrypoint
│
└── frontend/                 # React/Vite app
    ├── src/
    │   ├── components/       # Reusable UI components
    │   │   ├── VideoGrid.jsx
    │   │   ├── MeetingControls.jsx
    │   │   ├── MeetingHeader.jsx
    │   │   ├── MeetingSidebar.jsx
    │   │   ├── ChatbotPanel.jsx
    │   │   ├── CalendarHeader.jsx
    │   │   ├── CalendarSidebar.jsx
    │   │   ├── CalendarViews.jsx
    │   │   ├── EventModal.jsx
    │   │   ├── InviteModal.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── pages/            # Route-level pages
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── LobbyPage.jsx
    │   │   ├── MeetingRoom.jsx
    │   │   ├── CalendarPage.jsx
    │   │   ├── CallsPage.jsx
    │   │   ├── LeftMeetingPage.jsx
    │   │   └── Contact.jsx
    │   ├── hooks/
    │   │   └── useWebRTC.js  # Core WebRTC peer connection logic
    │   ├── services/
    │   │   ├── groqService.js
    │   │   ├── liveCaptionService.js
    │   │   ├── openRouterService.js
    │   │   └── userService.js
    │   └── utils/
    │       ├── api.js
    │       └── meetingUtils.js
    ├── index.html
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- **PostgreSQL** 14+

---

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialise the database schema
psql -U postgres -d shnoor_meetings -f schema.sql

# Start the server
python main.py
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API URLs and third-party keys

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgresql://postgres:postgres@127.0.0.1:5432/shnoor_meetings` |
| `POSTGRES_HOST` | Database host | `127.0.0.1` |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_DB` | Database name | `shnoor_meetings` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `FRONTEND_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:5173` |
| `PORT` | Server port (set automatically on Render) | `8000` |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend (e.g. `http://localhost:8000`) |
| `VITE_WS_BASE_URL` | WebSocket base URL (e.g. `ws://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `VITE_GROQ_API_KEY` | Groq API key for live captions |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key for AI chatbot |
| `VITE_OPENROUTER_MODEL` | Model to use (default: `deepseek/deepseek-r1-distill-qwen-32b`) |

---

## Database Schema

The PostgreSQL schema (in `backend/schema.sql`) defines the following tables:

| Table | Description |
|---|---|
| `users` | User profiles synced via Google OAuth |
| `sessions` | Auth session tokens with expiry |
| `meetings` | Meeting rooms with host, title, and status |
| `participants` | Per-meeting user join/leave records with role |
| `calendar_events` | Scheduled events linked to meetings |
| `messages` | In-meeting chat messages |
| `attachments` | Files shared during a meeting |

---

## API Overview

The FastAPI backend exposes the following route groups:

| Prefix | Router | Description |
|---|---|---|
| `/meetings` | `routers/meeting.py` | Create, fetch, and manage meeting rooms |
| `/signaling` | `routers/signaling.py` | WebSocket endpoint for WebRTC signaling |
| `/calendar` | `routers/calendar.py` | CRUD for calendar events |
| `/users` | `routers/user.py` | User profile management |

Full interactive documentation is auto-generated at `/docs` (Swagger UI) and `/redoc`.

---

## Features

- **Real-time Video Calls** — Peer-to-peer WebRTC connections managed by a custom `useWebRTC` hook with a FastAPI WebSocket signaling server.
- **Google OAuth** — One-click sign-in via `@react-oauth/google` with session persistence.
- **Meeting Lobby** — Camera/microphone preview and settings before joining a room.
- **In-meeting Controls** — Toggle audio/video, screen share, invite participants, and leave/end meeting.
- **In-meeting Chat** — Real-time message exchange persisted to PostgreSQL.
- **AI Chatbot** — Sidebar assistant powered by OpenRouter (DeepSeek R1) for meeting notes and Q&A.
- **Live Captions** — Real-time speech-to-text via the Groq API.
- **Calendar** — Schedule meetings, view upcoming events, and access meeting history.
- **Theme Support** — Premium color themes applied globally via `meetingUtils`.
- **Call History** — Dedicated calls page with a log of past meetings.

---

## Deployment

This project is configured for deployment to **Render.com**.

1. Push your branch to GitHub.
2. In the Render dashboard, create two services:
   - **Web Service** → `backend/` directory, build command `pip install -r requirements.txt`, start command `python main.py`.
   - **Static Site** → `frontend/` directory, build command `npm install && npm run build`, publish directory `dist`.
3. Add all environment variables listed above to each respective service in the Render dashboard.
4. Set `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` to your Render backend service URL before building.

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "feat: describe your change"`
3. Push to your fork and open a pull request against `main`.

Please keep PRs focused and include a clear description of what was changed and why.
