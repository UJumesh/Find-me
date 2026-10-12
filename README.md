<<<<<<< HEAD
# ⚡ Find Me: AI-Powered Hyperlocal Service Marketplace (S-Commerce)

> **Vision:** *The intelligent concierge for everyday local services — customers say what they need in plain natural language, and Find Me handles discovery, intent classification, multi-factor provider matching, booking, real-time tracking, and follow-through end to end.*

---

## 🌟 Core Highlights & Capabilities

1. **🧠 AI-Powered Intent Understanding & Entity Extraction (`server/src/ai/intentEngine.ts`)**:
   - Parses unstructured natural language / simulated voice prompts (*"AC leaking and not cooling", "Kitchen pipe burst under sink"*) into structured service categories, urgency level, and estimated price ranges.
   - Generates dynamic clarification questions when customer intent is ambiguous.
2. **⚡ Multi-Factor Provider Matching Engine (`server/src/ai/matchingEngine.ts`)**:
   - Scores nearby available service providers on **Proximity/Distance**, **Rating & Review volume**, **Verified Skill & Experience**, **Response Reliability**, and **Price Competitiveness**.
   - Calculates dynamic ETA based on distance and urgency.
3. **📱 Customer Web & Mobile Experience (`client/`)**:
   - High-aesthetic dark/light UI with glassmorphism and modern typography.
   - Conversational AI prompt bar with voice recording simulation & quick prompt chips.
   - Instant booking dispatch with 90-second SLA countdown.
   - Real-time live status tracking (`REQUESTED` -> `ACCEPTED` -> `EN_ROUTE` -> `IN_PROGRESS` -> `COMPLETED`).
   - In-app masked real-time chat with assigned provider.
   - Escrow-protected payment checkout & digital receipt generator.
   - Post-service star rating & review submission.
4. **👷 Worker / Service Provider App (`worker_app/`)**:
   - Online/Offline availability toggle.
   - Real-time incoming lead modal with audio/visual pulse and 90s SLA countdown timer.
   - Step-by-step job execution pipeline (*"Start Route"*, *"Arrived & Start Work"*, *"Complete Job"*).
   - Real-time in-app chat with customer.
   - Daily earnings ledger with 15% platform commission breakdown and instant UPI payout request.
5. **🛡️ Admin & Operations Console (`admin_panel/`)**:
   - Real-time KPI metrics: Gross Merchandise Value (GMV), Platform Revenue, Active Bookings, Liquidity Rate %, and SLA Match Speed.
   - Provider Verification & KYC queue with 1-Click Approve / Reject.
   - Customer & Provider Dispute Resolution Center.
   - Taxonomy & Dynamic Pricing Guardrail management.

---

## 🏗️ Architecture & Monorepo Structure

```
Find me/
├── client/                     # Customer Web Application
│   ├── index.html              # Customer UI with AI prompt, booking modal & tracking
│   ├── css/style.css           # Modern design system, glassmorphism, responsive grid
│   └── js/app.js               # Frontend application logic & Socket.IO events
│
├── worker_app/                 # Service Provider Operations Portal
│   ├── index.html              # Provider dashboard, SLA countdown & active job console
│   ├── css/worker.css          # High-contrast operational styling
│   └── js/worker.js            # Provider socket handlers, job advancement & earnings
│
├── admin_panel/                # Platform Operator Command Center
│   ├── index.html              # Executive dashboard, verification queue & dispute center
│   ├── css/admin.css           # Operator data tables & KPI cards
│   └── js/admin.js             # Admin analytics, KYC approval & dispute handlers
│
├── server/                     # Backend API & WebSocket Server
│   ├── src/
│   │   ├── ai/                 # AI Intent Classifier & Multi-Factor Matching Algorithm
│   │   │   ├── intentEngine.ts
│   │   │   └── matchingEngine.ts
│   │   ├── db/                 # SQLite Schema, Database Connection & Seed Data
│   │   │   ├── schema.sql
│   │   │   ├── database.ts
│   │   │   └── seed.ts
│   │   ├── routes/             # REST API Routes
│   │   │   ├── authRoutes.ts
│   │   │   ├── categoryRoutes.ts
│   │   │   ├── aiRoutes.ts
│   │   │   ├── bookingRoutes.ts
│   │   │   ├── providerRoutes.ts
│   │   │   ├── adminRoutes.ts
│   │   │   ├── reviewRoutes.ts
│   │   │   └── paymentRoutes.ts
│   │   ├── sockets/            # Real-time WebSocket handlers
│   │   │   └── socketHandler.ts
│   │   └── index.ts            # Express server entrypoint & static client hosting
│   ├── package.json
│   └── tsconfig.json
│
├── database/                   # SQLite Database File (auto-created)
│   └── find_me.db
│
├── find-me-prd.md              # Product Requirements Document
└── package.json                # Root launcher configuration
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies & Seed Database
```bash
# In project root or server folder
cd server
npm install
npm run seed
```

### 2. Start the Server
```bash
npm run dev
```

The unified backend will start on **`http://localhost:3000`** and automatically serve all 3 portals:

- **📱 Customer App:** [http://localhost:3000/](http://localhost:3000/)
- **👷 Worker / Provider App:** [http://localhost:3000/worker/](http://localhost:3000/worker/)
- **🛡️ Admin Console:** [http://localhost:3000/admin/](http://localhost:3000/admin/)
- **🔌 REST & WebSockets:** [http://localhost:3000/api/](http://localhost:3000/api/)

---

## 👥 Demo Personas for Instant Testing

| Persona | Role | Email | Password | Details |
|---|---|---|---|---|
| **Urgent Uma** | Customer | `uma@example.com` | `password123` | Needs urgent repairs (burst pipe, AC broken) |
| **Planner Priya** | Customer | `priya@example.com` | `password123` | Booking planned home cleaning & servicing |
| **Suresh Kumar** | Provider | `suresh@findme.com` | `password123` | Master Plumber • 4.9⭐ • Indiranagar |
| **Rajesh Sharma** | Provider | `rajesh@findme.com` | `password123` | HVAC Aircon Expert • 4.8⭐ • Koramangala |
| **Ramesh Gowda** | Provider | `ramesh@findme.com` | `password123` | Master Electrician • 4.9⭐ • HSR Layout |
| **Platform Admin** | Admin | `admin@findme.com` | `admin123` | Operator managing verifications & disputes |

---

## 🔄 End-to-End Booking Lifecycle Simulation

1. **Submit Request (Customer):** Open `http://localhost:3000/`, type *"Water leaking heavily under sink in Indiranagar"*, review the AI intent classification & top ranked plumbers, and click **Book Instantly**.
2. **Accept Lead (Provider):** Open `http://localhost:3000/worker/` in a second tab. The incoming lead alert appears with a 90s SLA timer. Click **Accept Booking Now**.
3. **Execute & Track:** Provider clicks *"Start Route"* -> Customer sees provider icon moving on the live map and status change to `EN_ROUTE`. Provider clicks *"Arrived"* -> *"Complete Job"*.
4. **Pay & Review:** Customer opens digital receipt, simulates escrow checkout, and leaves a 5-star review.
5. **Admin Oversight:** Open `http://localhost:3000/admin/` to see updated GMV, provider utilization, and verify pending onboarding requests.
=======
# Find-me
S-commerce platform for local services, connecting customers with verified professionals through smart booking and real-time tracking.
>>>>>>> origin/main
