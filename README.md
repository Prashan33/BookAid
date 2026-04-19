# BookAID

**Turn any PDF book into a real-time voice conversation with an AI that actually knows the book.**

BookAID is a full-stack Next.js application that ingests user-uploaded PDFs, indexes their contents into a searchable knowledge base, and lets readers hold natural spoken conversations about the material through a low-latency voice pipeline. Upload a book, pick a voice, and start talking — the assistant pulls real passages from the book as it answers.

---

## Key Highlights

- **Real-time voice AI over private content** — conversational voice calls powered by Vapi with retrieval grounded in the user's own uploaded book.
- **Client-side PDF ingestion pipeline** — PDFs are parsed, segmented, and cover-generated directly in the browser with `pdfjs-dist` before secure upload to Vercel Blob.
- **Retrieval-augmented tool calling** — the voice assistant calls a server endpoint mid-conversation to query a MongoDB text index (with regex fallback) and respond with grounded context.
- **Production-grade SaaS plumbing** — Clerk authentication, Clerk Billing with tiered plans, per-user quotas, billing-period usage metering, and server-enforced limits.
- **Typed end-to-end** — TypeScript, Zod validation, Mongoose schemas, and React Hook Form for a strict boundary between client input and persisted state.

---

## Why This Project Matters

Reading long-form content is high-effort, and traditional summaries lose the reader's ability to ask follow-up questions. Static chatbots also struggle because they don't actually know the book you're reading. BookAID solves this by combining three pieces into a single experience:

1. A controlled ingestion pipeline that turns a PDF into a structured, searchable knowledge base scoped to the signed-in user.
2. A retrieval layer the voice assistant can call live, so answers cite real passages instead of hallucinating.
3. A voice interface built on Vapi + ElevenLabs so the interaction feels like a conversation with a well-read human, not a chatbot.

The result is a focused reading companion — useful for students reviewing textbooks, professionals digesting long reports, or readers exploring non-fiction hands-free.

---

## Key Features

- **Private PDF Library** — sign-in-gated uploads (up to 50 MB) with per-user ownership enforced at the database and action layer.
- **Automatic Text Extraction & Chunking** — PDFs are parsed in the browser, split into ~500-word overlapping segments, and written to MongoDB with page-aware indexes.
- **Auto-Generated Book Covers** — when no cover is supplied, the first page of the PDF is rendered to a canvas and uploaded as the cover image.
- **Voice Conversations with the Book** — a full-duplex voice session via Vapi, with real-time transcription, status (listening / thinking / speaking), and duration tracking.
- **Selectable AI Personas** — five configurable ElevenLabs voices (Rachel, Sarah, Dave, Daniel, Chris) with tuned stability and similarity-boost settings.
- **Retrieval Tool for the Assistant** — a Vapi webhook endpoint the assistant calls during a conversation to pull the most relevant book segments for the user's question.
- **Subscription Tiers (Free / Standard / Pro)** — rendered live through Clerk's `<PricingTable />` with billing-period aware enforcement of book count, monthly session count, and per-session duration.
- **Library Search** — debounced title/author search at the library level, regex-escaped and case-insensitive.
- **Graceful Error Surfacing** — voice-session errors (mic permissions, missing env vars, assistant misconfiguration, inactivity timeouts) are translated into actionable hints in the UI.

---

## Tech Stack

Each tool here is load-bearing — nothing was added for show.

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Server Components, Server Actions, and Route Handlers in one runtime. |
| UI | **React 19**, **Tailwind CSS v4**, **shadcn/ui**, **Radix UI**, **lucide-react** | Accessible primitives and a consistent, utility-first design system. |
| Forms & Validation | **React Hook Form** + **Zod** (`@hookform/resolvers`) | One schema validates the client form and types the upload payload. |
| Auth | **Clerk (`@clerk/nextjs`)** | Hosted sign-in / sign-up, session management, middleware route protection. |
| Billing | **Clerk Billing** (`<PricingTable />` + `has({ plan })`) | Plan entitlements checked on the server for every gated action. |
| Database | **MongoDB + Mongoose** | `Book`, `BookSegment`, and `VoiceSession` collections with compound and text indexes. |
| File Storage | **Vercel Blob** (`@vercel/blob/client`) | Signed, size-limited, content-type-restricted direct client uploads. |
| PDF Processing | **pdfjs-dist** | Browser-side text extraction and first-page cover rendering. |
| Voice AI | **Vapi Web SDK** (`@vapi-ai/web`) | WebRTC voice transport, transcription events, and tool-call orchestration. |
| TTS | **ElevenLabs** (via Vapi voice config) | Natural-sounding voices with tuned conversational settings. |
| Notifications | **sonner** | Toasts for optimistic UX feedback. |
| Language | **TypeScript** (strict types across actions, models, and components) | End-to-end type safety. |
| Deployment | **Vercel** | Native Next.js hosting plus Vercel Blob for storage. |

---

## How It Works

```
┌────────────┐   1. Upload PDF      ┌──────────────────┐   2. Extract text +  ┌──────────────┐
│  Browser   │ ───────────────────▶ │ pdfjs-dist (web) │ ───  render cover ─▶ │ Vercel Blob  │
└────────────┘                      └──────────────────┘     segments (~500w) └──────────────┘
      │                                                                                │
      │ 3. createBook + saveBookSegments (Server Action, Clerk-auth'd)                 │
      ▼                                                                                │
┌────────────┐      ┌───────────────────────────────────────┐                         │
│  MongoDB   │ ◀──  │  Book, BookSegment (text index),       │  ◀───── file URLs ─────┘
│  (Mongoose)│      │  VoiceSession                          │
└────────────┘      └───────────────────────────────────────┘
      ▲
      │ 6. Vapi calls /api/vapi/search-book (RAG tool) ── $text search + regex fallback
      │
┌────────────┐   4. Start voice session (quota-checked)   ┌─────────────────────┐
│  Browser   │ ────────────────────────────────────────▶  │  Vapi Web SDK       │
│ (VapiCtrls)│ ◀─ 5. transcripts, status, audio ────────  │  + ElevenLabs voice │
└────────────┘                                            └─────────────────────┘
```

**Walkthrough:**

1. **Auth** — Clerk middleware protects all non-static routes; Server Actions re-check `auth()` before any mutation.
2. **Upload** — the client gets a scoped upload token from `/api/upload` (Clerk-auth'd, size- and MIME-limited) and streams the PDF directly to Vercel Blob.
3. **Ingestion** — `pdfjs-dist` extracts the text and renders page 1 to a canvas for an auto-cover; `splitIntoSegments` chunks the text into overlapping 500-word segments.
4. **Persistence** — `createBook` and `saveBookSegments` write to MongoDB under the authenticated `clerkId`, with a unique slug and a compound `(bookId, segmentIndex)` index.
5. **Plan enforcement** — before creating a book or starting a session, the server reads the Clerk plan via `has({ plan })`, looks up `PLAN_LIMITS`, and returns a structured billing error if the user is over quota.
6. **Voice session** — on the book page, `useVapi` starts a session against a pre-configured Vapi assistant, wires transcript/status events to React state, and runs a duration timer that stops the call at the plan's max minutes.
7. **Retrieval** — during the call, the assistant invokes the `searchBook` tool, which hits `/api/vapi/search-book`. That endpoint runs a MongoDB `$text` search scoped to the current book, falls back to a keyword regex when the text score is empty, and returns the top segments for grounding.
8. **Session metering** — `VoiceSession` records are written at call start and updated at call end with final duration, keyed by `billingPeriodKey` for reliable monthly usage counting.

---

## Project Structure

```
bookaid/
├── app/
│   ├── (root)/
│   │   ├── page.tsx                # Library homepage (search + recent books)
│   │   ├── books/
│   │   │   ├── new/page.tsx        # Upload form
│   │   │   └── [slug]/page.tsx     # Book detail + voice session
│   │   └── subscriptions/page.tsx  # Clerk Billing pricing table
│   ├── api/
│   │   ├── upload/route.ts         # Vercel Blob signed upload handler
│   │   └── vapi/search-book/route.ts # Vapi tool-call endpoint (RAG)
│   └── layout.tsx                  # Clerk provider + global chrome
├── components/
│   ├── VapiControls.tsx            # Voice session UI (mic, status, transcript)
│   ├── Transcript.tsx              # Live message stream
│   ├── VoiceSelector.tsx           # ElevenLabs persona picker
│   ├── UploadForm.tsx              # PDF intake + form validation
│   ├── FileUploader.tsx            # Drag/drop file field
│   ├── HeroSection.tsx, BookCard.tsx, Navbar.tsx, Search.tsx, LoadingOverlay.tsx
│   └── ui/                         # shadcn/ui primitives (button, form, input, …)
├── hooks/
│   ├── useVapi.ts                  # Voice session state machine + session lifecycle
│   └── useSubscription.ts          # Client-side plan + limits accessor
├── lib/
│   ├── actions/
│   │   ├── book.actions.ts         # createBook, getAllBooks, saveBookSegments, searchBookSegments
│   │   └── session.actions.ts      # startVoiceSession, endVoiceSession (quota-checked)
│   ├── subscription.ts             # Pure plan resolution helpers
│   ├── subscription.server.ts      # Server-only plan resolution via Clerk auth()
│   ├── subscription-constants.ts   # PLAN_LIMITS, billing period helpers
│   ├── utils.ts                    # PDF parsing, segmentation, slug, regex escape
│   ├── zod.ts                      # Upload schema
│   └── constants.ts                # Voice catalog, Vapi config, Clerk theming
├── database/
│   ├── mongoose.ts                 # Cached Mongoose connection (serverless-safe)
│   └── models/
│       ├── book.model.ts
│       ├── book-segment.model.ts   # Text + compound indexes
│       └── voice-session.model.ts  # Billing-period indexes
├── types.d.ts                      # Shared TypeScript contracts
├── proxy.ts                        # Clerk middleware + matcher config
└── next.config.ts                  # Remote image hosts, 100 MB server action body limit
```

---

## Screenshots / Demo

> _Placeholder — drop screenshots or a GIF of the upload flow and an active voice session here._

- **Library** — `/`
- **Upload** — `/books/new`
- **Voice session** — `/books/[slug]`
- **Pricing** — `/subscriptions`

---

## Installation & Setup

### Prerequisites

- Node.js 20+
- A MongoDB database (Atlas or self-hosted)
- A Clerk application (with Billing enabled if you want the live pricing table)
- A Vercel Blob store
- A Vapi account with a configured assistant and a `searchBook` tool pointed at `/api/vapi/search-book`

### 1. Clone and install

```bash
git clone <your-fork-url> bookaid
cd bookaid
npm install
```

### 2. Environment variables

Create a `.env.local` at the project root:

```bash
# Database
MONGODB_URI=mongodb+srv://<user>:<url-encoded-password>@<cluster>/bookaid

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_BILLING_ENABLED=true   # set to "true" after enabling Billing in Clerk

# Vercel Blob
bookaid_READ_WRITE_TOKEN=vercel_blob_rw_...

# Vapi
NEXT_PUBLIC_VAPI_API_KEY=...
NEXT_PUBLIC_ASSISTANT_ID=...
```

> The Mongo connection helper also accepts `MONGODB_URL`, `MONGO_URL`, or `mongo_url` as fallbacks. Special characters in credentials must be URL-encoded.

### 3. Clerk Billing (optional but recommended)

Enable Billing in the Clerk Dashboard and create two plans with slugs `standard` and `pro` (the free tier is the default). Limits for each plan live in [lib/subscription-constants.ts](lib/subscription-constants.ts).

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 5. Build for production

```bash
npm run build
npm start
```

---

## Usage

1. Sign up or sign in from the navbar.
2. Go to **Add New**, drag in a PDF, pick a cover (or let the app generate one from page 1), enter title and author, and select a voice persona.
3. On submit, the PDF is parsed, uploaded, indexed, and you're redirected to the book page.
4. Tap the microphone on the book page to start a voice session — the assistant opens with a short intro, you speak, and it replies using retrieved passages from your book.
5. The session ends when you tap again, when you hit your plan's per-session duration cap, or when the browser disconnects.

---

## Future Improvements

- **Per-book sharing and collaboration** — invite links with scoped read access.
- **Session history and transcripts** — already reserved in the `hasSessionHistory` plan flag; UI to follow.
- **Vector search** — swap the MongoDB `$text` index for semantic embeddings for higher-recall retrieval on longer books.
- **Streaming ingestion for very large PDFs** — move parsing off the browser thread with a web worker or server-side parse to handle 100+ MB files.
- **Multi-language support** — both for PDF extraction and for Vapi voice selection.
- **Analytics** — the upload route already has a TODO hook for PostHog event wiring.

---

## Why This Project Stands Out

- **It's a complete, deployable SaaS**, not a snippet: authentication, billing, quotas, persistence, external APIs, and a real-time interface all live behind one cohesive codebase.
- **Non-trivial integration surface** — four third-party services (Clerk, Vapi, ElevenLabs, Vercel Blob) are coordinated safely, with server-side auth re-checks on every mutation.
- **Careful engineering details**: cached Mongoose connections for serverless, compound + text indexes tuned for the actual query patterns, client-side PDF parsing to keep server cost predictable, billing-period keys so monthly counts stay correct across month boundaries, and defensive UX around mic permissions and missing env vars.
- **Pragmatic RAG** — instead of shipping a heavy vector DB for a portfolio project, it uses MongoDB's native text search with a regex fallback, proving you can ground an LLM on user content with the stack you already have.
- **Production posture** — Clerk middleware, strict upload MIME/size limits, URL-encoded credential checks, and Server Action authorization guards all demonstrate an awareness of where real apps break.

---

## Author

*Prashan Adhikari*

Built as a portfolio project to demonstrate full-stack engineering across real-time voice AI, retrieval, authentication, billing, and modern Next.js patterns.

- Email: prashanadhikari2486@gmail.com

---

## Repo Description (short)

> Voice-first reading companion — upload a PDF, talk to it. Next.js 16, Clerk, MongoDB, Vercel Blob, Vapi + ElevenLabs, with retrieval-grounded answers and tiered subscription billing.

---

## Resume-Ready Project Summary

> **BookAID** — Full-stack Next.js 16 + TypeScript application that turns user-uploaded PDFs into real-time voice conversations. Built an end-to-end pipeline covering Clerk auth and billing, browser-side PDF parsing with `pdfjs-dist`, Vercel Blob uploads, MongoDB text-indexed retrieval, and a Vapi + ElevenLabs voice interface that calls a custom RAG tool during calls. Enforces per-plan quotas (books, monthly sessions, per-session duration) with billing-period-aware usage metering.
