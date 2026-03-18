# NexusFinance — Jack AI Expense Tracker

A full-stack personal finance tracker with a futuristic dark UI, video backgrounds, real-time analytics, and **Jack** — an AI chatbot powered by Google Gemini that speaks Kannada, Hindi, Telugu, and 9 other languages.

## Tech Stack

| Layer    | Technology                                  |
|----------|---------------------------------------------|
| Frontend | React 18, Vite, React Router v6             |
| Backend  | Node.js, Express                            |
| Database | PostgreSQL 16                               |
| Auth     | JWT (jsonwebtoken + bcrypt)                 |
| AI       | Google Gemini 2.5 Flash                     |
| Hosting  | Vercel (frontend) + Render (backend)        |

## Features

- JWT authentication (register / login)
- Full CRUD for transactions and categories
- Dashboard with income / expense / savings metrics
- Reports with pie chart, bar chart, and net balance line chart
- **Jack AI chatbot** — floating assistant, multilingual (EN, HI, KN, TE, ES, FR, DE, ZH, AR, PT, JA, KO)
- Profile page — save display name, pick language (auto-saved)
- Futuristic dark UI with animated video backgrounds
- Intro splash screen after login
- Fully responsive — desktop sidebar + mobile top-nav

## Project Structure

```
expense-tracker/
├── client/                  # React frontend (Vite)
│   ├── public/videos/       # Background videos (login, intro, dashboard)
│   └── src/
│       ├── api/             # Axios client
│       ├── components/      # AppLayout, JackChat, ProtectedRoute, CursorEffect
│       ├── context/         # AuthContext
│       └── pages/           # Dashboard, Transactions, Categories, Reports, Profile, Login, Register
└── server/                  # Express backend
    ├── db/
    │   ├── migrations/      # SQL schema
    │   └── seeds/           # Default categories
    ├── middleware/           # Auth, error handling
    └── routes/              # auth, transactions, categories, summary, chat
```

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 16
- Google Gemini API key (free at https://aistudio.google.com/app/apikey)

### 1. Database

```bash
psql -U postgres
CREATE DATABASE expense_tracker;
\q

psql -U postgres -d expense_tracker -f server/db/migrations/001_init.sql
psql -U postgres -d expense_tracker -f server/db/seeds/categories.sql
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm install
node server.js
# Runs on http://localhost:3001
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
# Runs on http://localhost:3000
```

## Environment Variables (server/.env)

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/expense_tracker
JWT_SECRET=your_jwt_secret_here
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

## Deployment

- **Frontend** → Vercel (auto-deploys from `main`, config in `client/vercel.json`)
- **Backend** → Render (config in `render.yaml`)
- **Database** → Supabase or Render PostgreSQL

Set `VITE_API_URL` in Vercel to your Render backend URL.

## Jack AI

Jack is a floating chatbot (🤖 button, bottom-right) powered by Gemini 2.5 Flash.
- Responds in the user's language automatically
- Understands Kannada (ಕನ್ನಡ), Hindi (हिन्दी), Telugu (తెలుగు) and more
- Helps navigate the app, explains finances, gives budgeting tips
- Language preference saved in Profile page
