# 🏗️ Civic Architect

**AI-powered civic issue reporting platform** — citizens report infrastructure problems, AI auto-categorizes them, admins track and resolve them.

Built for the III Hackathon by **Sourish, John Dick, Onkit & Debo**.

---

## What This Thing Does

| Role | What they can do |
|------|-----------------|
| **Citizen** | Report issues (snap photo → AI fills in details), upvote, browse public feed & map |
| **Admin** | Change issue statuses, add admin notes, delete reports, create reports from map |
| **Dev** | All admin powers + mock data generator, bulk JSON insert, database purge |

### Key Features
- 📸 **AI Image Analysis** — snap a photo, Gemini AI auto-fills title, description, category & severity
- 🗺️ **Live Map** — Leaflet map with marker clustering, click-to-report
- 🔍 **Duplicate Detection** — haversine distance + text similarity to catch duplicate reports
- 📍 **Reverse Geocoding** — auto-resolves lat/lng to a real street address (Nominatim)
- 🔐 **Google Auth** — Firebase Authentication with role-based access (citizen/admin/dev)
- ⚡ **Real-time** — Firestore `onSnapshot` listeners, everything updates live

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Build | Vite 6 |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Cloud Firestore (real-time) |
| AI | Gemini 3.1 Pro (`@google/genai`) |
| Maps | Leaflet + react-leaflet + marker clustering |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |

---

## 🚀 Setup (Read This Carefully)

### Prerequisites
- **Node.js** v18+ ([download](https://nodejs.org))
- **A Firebase project** with Firestore & Auth enabled
- **A Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Step 1: Clone & Install

```bash
git clone https://github.com/LooninS/civic-architect.git
cd civic-architect
npm install
```

### Step 2: Firebase Config

You need a `firebase-applet-config.json` in the project root (it's gitignored for security). Create it:

```bash
touch firebase-applet-config.json
```

Paste this structure and fill in YOUR project's values:

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "appId": "YOUR_APP_ID",
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "firestoreDatabaseId": "YOUR_FIRESTORE_DB_ID",
  "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
  "messagingSenderId": "YOUR_SENDER_ID",
  "measurementId": ""
}
```

> **Where to get these values:** Firebase Console → Project Settings → General → Your apps → Web app config. The `firestoreDatabaseId` is usually `"(default)"` unless you created a named database.

### Step 3: Gemini API Key

```bash
cp .env.example .env.local
```

Open `.env.local` and replace `MY_GEMINI_API_KEY` with your actual key:

```
GEMINI_API_KEY="AIzaSy..."
```

### Step 4: Deploy Firestore Rules

The security rules are in `firestore.rules`. Deploy them to your Firebase project:

```bash
npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Or just copy-paste the contents of `firestore.rules` into the Firebase Console → Firestore → Rules tab.

### Step 5: Run

```bash
npm run dev
```

App runs at **http://localhost:3000**

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ConfirmDialog.tsx    # Generic confirmation modal
│   ├── EmptyState.tsx       # Empty list placeholder
│   ├── IssueMap.tsx         # Leaflet map with markers
│   ├── Navbar.tsx           # Top navigation bar
│   ├── RegistrationModal.tsx # Role selection on first login
│   ├── StatusBadge.tsx      # Status pill (Pending/In Progress/Resolved)
│   └── Toast.tsx            # Global toast notifications
│
├── hooks/
│   └── useAuth.ts           # Firebase auth hook (login/logout/register)
│
├── lib/                 # Shared utilities
│   ├── constants.ts         # Categories, statuses, severities (single source of truth)
│   ├── firebase.ts          # Firebase app init, Firestore/Auth exports
│   ├── gemini.ts            # Gemini AI image analysis
│   └── utils.ts             # Status colors, date formatting, haversine, geocoding
│
├── pages/               # Route pages
│   ├── Home.tsx             # Hero + public feed with upvotes, sort & filter
│   ├── PublicMap.tsx         # Full-screen map with sidebar
│   ├── QuickReport.tsx      # 3-step report wizard (category → photo → confirm)
│   ├── IssueDetail.tsx      # Single issue view with upvote, share, mini map
│   ├── AdminDashboard.tsx   # Issue management table, map view, admin notes
│   └── DevDashboard.tsx     # Mock generator, bulk insert, DB purge, console
│
├── App.tsx              # Router + layout
├── main.tsx             # Entry point
└── index.css            # Tailwind theme (colors, fonts)
```

---

## 🔑 How Auth & Roles Work

1. User clicks **Sign In** → Google OAuth popup
2. First login → **RegistrationModal** asks to pick a role: `citizen`, `admin`, or `dev`
3. Role is saved to `users/{uid}` in Firestore
4. Route guards check `userData.role` before rendering admin/dev pages

**The email `sourish3108dps@gmail.com` is auto-elevated to `dev` role** (hardcoded in `useAuth.ts` and `firestore.rules`). If you need to make someone else a dev, either:
- Change the email in those two files, or
- Manually set their role to `"dev"` in Firestore console

---

## 🗄️ Firestore Data Model

### `users/{uid}`
```
uid: string
email: string
displayName: string
photoURL: string
role: "citizen" | "admin" | "dev"
createdAt: ISO string
```

### `issues/{issueId}`
```
title: string
description: string
category: "Road Damage" | "Waste Issue" | "Street Light" | "Vandalism" | "Water Leak" | "Other Issue"
severity: "Low" | "Moderate" | "Critical"
status: "Pending" | "Investigating" | "In Progress" | "Resolved"
location: string
address: string
lat: number
lng: number
reportedAt: ISO string
reportedBy: string (uid)
authorName: string
imageUrl: string (base64 data URL)
resolutionImageUrl: string
adminNote: string
upvotes: number
upvotedBy: string[] (array of uids)
```

---

## 🧠 How AI Analysis Works

When a citizen uploads a photo in QuickReport:

1. Image is read as base64
2. Sent to **Gemini 3.1 Pro** with a system prompt asking it to:
   - Identify the category (Road Damage, Waste Issue, etc.)
   - Generate a title
   - Write a description
   - Estimate severity (Low/Moderate/Critical)
3. Response is JSON-parsed and auto-fills the form
4. User can edit any field before submitting

The AI config is in `src/lib/gemini.ts`. It uses structured output (`responseMimeType: "application/json"` + `responseSchema`) so the response is always valid JSON.

---

## 🤝 How to Contribute (for John Dick, Onkit & Debo)

### Git Workflow

```bash
# 1. Pull latest main
git pull origin main

# 2. Create your branch
git checkout -b feat/your-feature-name

# 3. Make your changes

# 4. Commit with a descriptive message
git add -A
git commit -m "feat: add dark mode toggle"

# 5. Push your branch
git push origin feat/your-feature-name

# 6. Open a Pull Request on GitHub
```

### Commit Message Format

```
feat: add something new
fix: fix a bug
style: UI/CSS only changes
refactor: code cleanup, no behavior change
docs: documentation changes
```

### Where to Add What

| You want to... | Go to... |
|----------------|----------|
| Add a new page | `src/pages/` — create the component, add a `<Route>` in `App.tsx` |
| Add a new reusable component | `src/components/` |
| Add a new category/status/severity | `src/lib/constants.ts` (ONE file, updates everywhere) |
| Change status badge colors | `src/lib/utils.ts` → `getStatusClasses()` |
| Modify Firestore security rules | `firestore.rules` |
| Add a new Firestore collection | Also update `firebase-blueprint.json` |

### Important Patterns

**Toast notifications** — fire from anywhere:
```tsx
import { toast } from '../components/Toast';
toast('Something happened!', 'success'); // or 'error' or 'info'
```

**Status badges** — don't do inline color logic, use the component:
```tsx
import StatusBadge from '../components/StatusBadge';
<StatusBadge status={issue.status} />
```

**Confirmation dialogs** — don't build custom modals:
```tsx
import ConfirmDialog from '../components/ConfirmDialog';
<ConfirmDialog
  open={showModal}
  title="Are you sure?"
  message="This will delete everything."
  onConfirm={handleDelete}
  onCancel={() => setShowModal(false)}
/>
```

### Don't

- ❌ Don't push `firebase-applet-config.json` — it has API keys
- ❌ Don't push `.env.local` — it has the Gemini key
- ❌ Don't hardcode status/category strings — use `constants.ts`
- ❌ Don't write inline status color logic — use `StatusBadge` or `getStatusClasses()`
- ❌ Don't build custom confirmation modals — use `ConfirmDialog`

---

## 📜 Available Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | TypeScript type-check (no emit) |
| `npm run clean` | Delete `dist/` folder |

---

## 🐛 Common Issues

**"Please check your Firebase configuration"**
→ Your `firebase-applet-config.json` is wrong or missing. Double-check all values.

**Firestore permission denied**
→ Deploy the `firestore.rules` to your project. Or check that you're logged in.

**AI analysis fails / returns empty**
→ Check your `GEMINI_API_KEY` in `.env.local`. Make sure it's a valid key with Gemini API access.

**Map not showing**
→ Leaflet CSS is loaded from CDN in `index.html`. Check your internet connection.

**"auth/popup-closed-by-user"**
→ Your browser blocked the Google sign-in popup. Allow popups for localhost.
