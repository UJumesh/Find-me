# Product Requirements Document: Find Me
### AI-Powered Hyperlocal Service Marketplace (S-Commerce Platform)

**Version:** 1.0 (Draft)
**Status:** For internal review
**Owner:** Umesh

---

## 1. Executive Summary

Find Me is an AI-powered marketplace that connects customers who need local services with the most suitable available service provider, at the right time, location, and price. Rather than making users search, compare, and contact providers manually, Find Me interprets natural-language requirements and drives the experience toward a fast, transparent booking.

This PRD translates the problem statement into a buildable product: personas, journeys, requirements, an MVP-first roadmap, and the operational, trust, and technical considerations needed to ship responsibly.

---

## 2. Product Vision

**Vision statement:** *Find Me is the intelligent concierge for everyday local services — customers say what they need, and Find Me handles discovery, matching, booking, and follow-through end to end.*

The product will not compete by listing more categories than existing directories. It differentiates through **understanding intent** ("water leaking under my sink" → plumber, urgent) and **matching quality** (right provider, not just any provider).

The experience evolves along this arc:

`Search → Compare → Contact → Wait → Decide → Book` (legacy directories)
→ `Tell Find Me what you need → Find Me understands → Find Me matches → Book → Track → Complete` (Find Me)

---

## 3. Personas

### 3.1 Customer Personas

| Persona | Description | Key needs |
|---|---|---|
| **Urgent Uma** | Needs a service *now* (AC broken, car won't start, burst pipe) | Speed, availability certainty, trust signals, live tracking |
| **Planner Priya** | Booking a scheduled or recurring service (monthly cleaning, tutor, event vendor) | Comparison, reviews, price transparency, scheduling flexibility |
| **Occasional Omkar** | Rare, high-stakes bookings (wedding photographer, home renovation) | Portfolio/reviews depth, negotiation, multi-vendor coordination |
| **Busy Bhavna** | Wants zero-effort delegation; prefers describing the problem, not picking a category | Conversational AI assistant, minimal decisions, "just handle it" |

### 3.2 Provider Personas

| Persona | Description | Key needs |
|---|---|---|
| **Solo Technician (Suresh)** | Independent electrician/plumber/mechanic, one-person operation | Simple app, fast lead notification, low commission, easy payments |
| **Small Business Owner (Sanjana)** | Runs a cleaning/beauty/repair team with 2–10 staff | Job/staff assignment, scheduling, multi-worker calendar, analytics |
| **Specialist Professional (Rakesh)** | Tutor, photographer, consultant — appointment/portfolio-driven | Profile showcase, calendar sync, client communication, reviews |

### 3.3 Admin Persona

**Platform Operator (Ops Admin):** Manages provider verification, disputes, fraud flags, category taxonomy, payments reconciliation, and marketplace health dashboards.

---

## 4. Core User Journeys

### 4.1 Customer Journey — Urgent Service
1. Opens app → describes problem in natural language or voice ("AC not cooling, need someone today").
2. AI assistant classifies intent, asks 1–2 clarifying questions if needed (location confirmation, urgency, budget range).
3. System surfaces ranked, available providers with ETA, price estimate, rating.
4. Customer selects/confirms → booking created → provider notified.
5. Provider accepts → customer sees live status/tracking.
6. Service completed → in-app payment → rating/review prompt.

### 4.2 Customer Journey — Planned/Recurring Service
1. Customer searches or browses category (e.g., "home cleaning").
2. Filters by price, rating, availability, distance.
3. Views provider profile, past reviews, portfolio.
4. Selects date/time slot → transparent price breakdown shown.
5. Confirms booking → reminder notifications → service delivered → payment → review.
6. Optionally sets up recurrence (weekly/monthly).

### 4.3 Provider Journey
1. Provider onboards → verification (ID, business docs, skill/category proof).
2. Sets service categories, pricing, service area, availability calendar.
3. Receives matched leads/booking requests via notification.
4. Accepts/declines/counter-offers within SLA window.
5. Executes job, updates status (on the way / in progress / completed).
6. Receives payment payout, sees rating and analytics.

### 4.4 Admin Journey
1. Reviews new provider verification queue.
2. Monitors disputes/fraud flags dashboard.
3. Moderates reviews flagged as fake/abusive.
4. Tracks marketplace KPIs (liquidity, conversion, cancellation rate).
5. Manages category taxonomy and pricing guardrails.

---

## 5. User Stories (Representative Sample)

**Customer**
- As a customer, I want to describe my problem in plain language so that I don't need to know the correct service category.
- As a customer, I want to see estimated price before booking so that I'm not surprised by cost.
- As a customer, I want to know a provider is actually available now, not just "usually available."
- As a customer, I want to track my provider's arrival so I know when to expect them.
- As a customer, I want to message my provider in-app so I don't have to share my personal phone number.
- As a customer, I want to rate and review after service so future customers can trust the marketplace.

**Provider**
- As a provider, I want to receive only leads that match my skills, location, and availability so I don't waste time on irrelevant requests.
- As a provider, I want a simple calendar to manage my availability across multiple bookings.
- As a provider, I want fast, reliable payouts so I trust the platform with my income.
- As a provider, I want visibility into why I lost a match/lead so I can improve my profile or pricing.

**Admin**
- As an admin, I want a verification workflow so that unqualified or fraudulent providers can't onboard.
- As an admin, I want a dispute resolution queue so that customer/provider conflicts are resolved fairly and quickly.
- As an admin, I want analytics dashboards so I can monitor marketplace health in real time.

---

## 6. Functional Requirements

### 6.1 Customer App
- Natural-language / voice service request input
- AI clarification dialogue (follow-up questions when intent is ambiguous)
- Location detection (GPS + manual address entry)
- Provider discovery: ranked list with price estimate, ETA, rating, distance
- Filters: price range, rating, distance, availability, verified badge
- Provider profile view: portfolio, reviews, certifications, response time, completion rate
- Transparent booking summary before confirmation (price, cancellation policy, provider identity)
- In-app chat with providers
- Real-time booking status + live tracking (where applicable, e.g., on-the-way ETA)
- In-app payments (cards, UPI, wallets) + digital receipt
- Post-service rating/review
- Booking history and re-booking shortcut
- Emergency/urgent request mode (priority matching + surcharge disclosure)

### 6.2 Provider App
- Onboarding & verification flow (identity, skill proof, business documents)
- Service/category and pricing configuration
- Availability calendar (single and multi-staff)
- Lead/booking request inbox with accept/decline/counter-offer, SLA countdown
- Job status updates (accepted → en route → in progress → completed)
- In-app chat with customers
- Earnings dashboard + payout management
- Ratings/reviews view + performance analytics (acceptance rate, response time, repeat customers)
- Dispute submission flow

### 6.3 Admin Console
- Provider verification queue and approval workflow
- User and provider account management (suspend, ban, reinstate)
- Category/taxonomy management
- Dispute and fraud case management
- Review moderation queue
- Payments reconciliation dashboard
- Marketplace analytics (liquidity, conversion, cancellation, NPS)
- Configurable pricing guardrails and surge/urgency rules

### 6.4 AI Engine
- Intent classification (map free text/voice → service category + urgency + attributes)
- Clarification question generation for ambiguous requests
- Provider ranking/matching model (skill fit, distance, availability, rating, price, response history)
- Dynamic price estimation model
- Fraud/anomaly detection signals (fake reviews, suspicious cancellation patterns)
- Conversational assistant for booking completion and FAQs

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Provider match results returned within 2–3 seconds for 95th percentile requests |
| **Availability** | 99.9% uptime for core booking flow |
| **Scalability** | Architecture must support horizontal scaling per microservice and per city/region |
| **Security** | Encryption in transit and at rest; role-based access control for admin console |
| **Privacy** | Phone-number masking between customer/provider; PII minimization; consent-based location tracking |
| **Localization** | Multi-language support (starting with English + Hindi/regional languages) |
| **Accessibility** | Mobile-first, low-bandwidth tolerant UI; support for degraded network conditions |
| **Auditability** | Full audit trail for bookings, payments, disputes, and admin actions |
| **Compliance** | Adherence to local payment regulations (e.g., RBI guidelines for payment aggregation in India), data protection law (DPDP Act) |

---

## 8. System / Technical Architecture (High-Level)

**Frontend apps (3):**
1. Customer app (mobile-first, React Native or Flutter)
2. Provider app (mobile-first)
3. Admin console (web dashboard)

**Backend microservices (indicative):**
- Auth & Identity Service
- User/Profile Service
- Provider Service (onboarding, verification, availability)
- Discovery & Search Service
- Matching Engine Service (consumes AI ranking outputs)
- Booking Lifecycle Service
- Payments & Payouts Service
- Notification Service (push/SMS/email)
- Chat/Messaging Service
- Reviews & Ratings Service
- Trust & Safety / Fraud Service
- Analytics & Reporting Service
- Admin/Ops Service

**AI Engine modules:**
- NLU/Intent Classification module
- Recommendation/Matching module
- Pricing Estimation module
- Fraud/Anomaly Detection module
- Conversational Assistant orchestration layer

**Cross-cutting infrastructure:**
- API Gateway
- Message queue/event bus (for booking state transitions, notifications)
- Centralized logging & monitoring
- Feature flagging for gradual rollout
- Geo-indexing service (for proximity search)

*(Note: This section is intentionally high-level. Detailed service contracts, data schemas, and infra choices belong in a separate Technical Design Document once monorepo scaffolding is finalized.)*

---

## 9. Booking Lifecycle (State Machine)

```
REQUESTED → MATCHING → OFFERED → ACCEPTED → EN_ROUTE → IN_PROGRESS → COMPLETED → REVIEWED
                 ↓            ↓                                    ↓
             NO_MATCH     DECLINED/EXPIRED                     DISPUTED
                 ↓            ↓                                    ↓
             CANCELLED    CANCELLED                          RESOLVED/REFUNDED
```

Key rules:
- Provider has a bounded SLA (e.g., 60–120 seconds for urgent, longer for scheduled) to accept/decline before the offer expires and re-routes to next best match.
- Cancellations after ACCEPTED trigger policy-based fees (customer or provider side) recorded transparently.
- Disputes can be raised up to X hours/days post-COMPLETED, freezing final payout until resolved.

---

## 10. Trust & Safety

- **Provider verification:** ID proof, address proof, skill/trade certification where applicable, background check tier for sensitive categories (e.g., in-home services).
- **Review integrity:** Reviews only permitted post-completed booking; anomaly detection for review manipulation.
- **Fraud detection:** Pattern detection for fake bookings, collusion, repeated cancellations, price manipulation.
- **Dispute resolution:** SLA-bound admin workflow with evidence submission (chat logs, photos, timestamps).
- **Safety features:** In-app emergency contact/share-trip-status option, masked communication, provider photo/vehicle confirmation for in-person services.

---

## 11. Payments & Monetization

**Flows:**
- Customer pays in-app (escrow-style hold until service completion, or pay-on-completion depending on category).
- Platform commission deducted from provider payout.
- Provider payouts on a scheduled cycle (e.g., T+1/T+2) with an earnings ledger.
- Refund/partial-refund flow tied to dispute resolution outcomes.

**Monetization directions (evaluate post-MVP):**
- Commission per completed booking (primary)
- "Find Me Prime" subscription (customer side: priority matching, discounts; provider side: lead priority, lower commission tiers)
- Featured/boosted provider placement (must not compromise match relevance/trust)
- Value-added services (verified badges, premium analytics for providers)

---

## 12. Notifications

| Trigger | Customer | Provider |
|---|---|---|
| Booking requested | Confirmation | New lead alert |
| Match found / offer sent | — | Accept/decline prompt with SLA timer |
| Provider accepted | Confirmation + ETA | — |
| Provider en route | Live status update | — |
| Service started/completed | Status update | Completion confirmation prompt |
| Payment processed | Receipt | Payout notice |
| Review requested | Prompt | Rating received |
| Dispute opened/resolved | Status updates | Status updates |
| Booking cancelled/expired | Reason + rebooking suggestion | Lead expired notice |

---

## 13. Edge Cases & Failure States

- No provider available nearby → offer to widen radius, waitlist, or notify when available.
- Provider accepts but cannot complete (breakdown, emergency) → auto re-match, customer notified transparently.
- Payment failure post-service → retry flow + fallback manual settlement path.
- Customer no-show → provider compensation policy (partial fee).
- Ambiguous/multi-intent requests ("I need cleaning and an electrician") → AI splits into multiple service requests.
- Location spoofing or GPS failure → fallback to manual address confirmation.
- Provider double-booking conflict → calendar validation before offer is sent.
- Network/connectivity loss mid-booking → idempotent booking creation with retry-safe design.

---

## 14. Analytics & KPIs

**Marketplace health:**
- Search-to-booking conversion rate
- Time from request to provider match
- Provider acceptance rate
- Provider response time
- Booking completion rate
- Cancellation rate (customer vs. provider initiated)
- Marketplace liquidity (requests fulfilled vs. unfulfilled per category/region)
- Provider utilization rate

**Quality & trust:**
- Customer satisfaction (CSAT/NPS)
- Repeat booking rate
- Dispute rate and average resolution time
- Fraud/fake-review detection rate

**AI performance:**
- Intent classification accuracy
- Match acceptance rate (proxy for match quality)
- Price estimate accuracy vs. final price

---

## 15. Roadmap: MVP → V1 → V2 → Long-Term

### MVP (Prove core loop works)
- Customer app: category browse + basic natural-language request → simple keyword/category-based matching (AI ranking can start rule-based, not full ML)
- Provider app: onboarding, availability toggle, accept/decline booking, basic chat
- Booking lifecycle: REQUESTED → ACCEPTED → COMPLETED → REVIEWED (no advanced dispute automation yet)
- Payments: basic in-app payment integration (single method)
- Admin: manual provider verification, basic dispute handling
- Single city/region launch, 3–5 service categories

**Goal:** validate that customers will book through the app and providers will fulfill reliably.

### V1 (Strengthen the marketplace)
- AI-powered intent understanding + clarification questions
- Real matching engine (multi-factor ranking: distance, rating, price, availability)
- Live tracking for in-person services
- Ratings/reviews with anti-fraud checks
- Expanded categories and multi-city support
- Provider analytics dashboard
- Notification system (push/SMS)

### V2 (Differentiate and scale)
- Dynamic pricing/estimation model
- Recurring bookings and scheduling automation
- Multi-provider bookings (e.g., event: photographer + decorator together)
- Advanced trust & safety (background checks, fraud ML models)
- Dispute automation with evidence workflows
- Provider growth tools (performance coaching, demand forecasting)

### Long-Term Vision
- Full conversational AI concierge across all categories
- "Find Me Prime" membership ecosystem
- Predictive service needs (e.g., proactive AC servicing reminders)
- Cross-category bundling and personalized recommendations
- Expansion into B2B/enterprise facility-management use cases
- Deep integration with IoT/smart-home signals for automatic service triggers (opt-in)

---

## 16. Feature Prioritization Framework

Each proposed capability should be scored (1–5) on:
1. Customer value
2. Provider value
3. Technical feasibility (given current team/timeline)
4. Marketplace liquidity effect
5. Trust & safety impact
6. Business/monetization impact

Only features scoring high on customer/provider value **and** feasibility should enter MVP. Trust & safety features are treated as non-negotiable minimums, not "nice to have," regardless of score elsewhere.

---

## 17. Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Cold-start problem (no providers → no customers, and vice versa) | Launch hyperlocal (single city/category first), manually recruit and incentivize initial providers |
| AI matching quality poor at launch (little data) | Start with rule-based/heuristic matching, layer ML as data accumulates |
| Provider trust in payouts | Fast, transparent payout cycle from day one; clear fee disclosure |
| Fraudulent providers/customers | Verification gates before go-live in a category; fraud monitoring from MVP |
| Regulatory (payments, data privacy) | Legal review of payment aggregator compliance and data protection law before launch |
| Provider supply-demand imbalance by category/time | Real-time liquidity dashboards; targeted provider acquisition campaigns |

**Dependencies:** payment gateway integration, SMS/push notification provider, maps/geolocation API, identity verification/KYC provider, cloud infrastructure provider.

---

## 18. Acceptance Criteria (Sample — MVP Booking Flow)

- Given a customer submits a service request with location and category, when at least one provider is available within the configured radius, then the system returns a ranked provider list within 3 seconds.
- Given a provider receives a booking offer, when they do not respond within the SLA window, then the offer automatically expires and re-routes to the next best-ranked provider.
- Given a booking reaches COMPLETED status, when the customer has not submitted a review within 48 hours, then a reminder notification is sent once.
- Given a payment fails during checkout, when the customer retries, then the booking is not duplicated (idempotent booking creation).
- Given a provider is not verified, when they attempt to go "available," then the system blocks visibility to customers until verification is approved.

---

## 19. Open Questions for Further Discovery

- Which city/category should the pilot launch target, and why (existing provider density, competitive gap)?
- What is the initial monetization model — commission-only, or commission + subscription from day one?
- Should MVP support cash-on-completion alongside in-app payment, or in-app-only to enforce trust/traceability?
- What is the minimum viable verification bar per category (e.g., electrician vs. home tutor likely need different rigor)?
- Build vs. buy decision for identity verification (KYC) and payment aggregation providers.

---

## 20. Next Steps

1. Validate MVP category and city choice with light market research or provider interviews.
2. Finalize monorepo structure and service boundaries aligned to Section 8's microservice list.
3. Define data models for core entities: User, Provider, ServiceCategory, Booking, Payment, Review, Dispute.
4. Build MVP booking lifecycle end-to-end (even with rule-based matching) before investing in ML-based matching.
5. Establish trust & safety minimums (verification + basic fraud checks) before any public pilot launch.
