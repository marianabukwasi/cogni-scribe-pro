# Kloer.ai

> AI-powered session assistant for professionals — doctors, lawyers, therapists, and NGO caseworkers. Records, transcribes, and generates structured documents from live consultations.

---

## Features

- **Live Session Transcription** — Real-time speech-to-text via Deepgram with multi-language support
- **AI Suggestion Engine** — Profession-adaptive real-time suggestions (diagnoses, legal strategies, safeguarding alerts)
- **Smart Document Generation** — SOAP notes, BIRP progress notes, prescriptions, referral letters, case summaries
- **Multi-Profession Support** — Medical doctors, therapists, lawyers, NGO caseworkers, social workers
- **Alert System** — Critical warning detection with visual flash, phone vibration, and smartwatch haptic (coming soon)
- **Decision Gate** — Post-session data retention control (keep everything, summary only, or purge)
- **Knowledge Base** — Upload guidelines, protocols, and templates that personalise AI suggestions
- **Client Management** — Profession-specific client profiles with session history and documents
- **Intake Templates** — Customisable intake forms with shareable links for clients
- **Grant Reporting** — Anonymised statistics dashboard for NGO grant applications
- **Consent Screen** — Multi-language consent flow (EN, FR, DE, LU, HU) with audit logging
- **Privacy Kill Switch** — Scrub sensitive information from transcripts during sessions
- **PWA** — Installable progressive web app with offline caching
- **Demo Mode** — Fully functional demo with realistic simulated data for all professions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | React Query, React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | Lovable AI Gateway (Google Gemini / OpenAI GPT-5) |
| Transcription | Deepgram WebSocket API |
| PWA | vite-plugin-pwa, Workbox |

## Setup Instructions

### Prerequisites
- Node.js 18+ or Bun
- A Supabase project (or Lovable Cloud)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd kloer-ai
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in your Supabase URL and publishable key. Edge function secrets (Deepgram, Lovable API key) are configured in your Supabase dashboard or Lovable Cloud.

### 3. Database Setup

Apply the schema to your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually run supabase-schema.sql in the SQL editor
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Demo Mode

Click "View Demo" on the sign-in page to explore the full application without API keys.

## Deployment

### Vercel

```bash
npm run build
# Deploy the `dist` folder to Vercel
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Lovable

The app auto-deploys via Lovable's publish feature.

## API Keys Required

| Key | Where to Get | Used For |
|---|---|---|
| Supabase URL + Key | [supabase.com](https://supabase.com) | Database, auth, edge functions |
| Deepgram API Key | [deepgram.com](https://deepgram.com) | Live speech-to-text transcription |
| Lovable API Key | Auto-provisioned by Lovable Cloud | AI suggestions, document generation, chat |
| Stripe Keys | [stripe.com](https://stripe.com) | Payments (not yet implemented) |

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, TopNav
│   ├── ui/              # shadcn/ui components
│   ├── MobileSessionTabs.tsx
│   ├── NavLink.tsx
│   └── PWAInstallPrompt.tsx
├── contexts/
│   ├── AuthContext.tsx   # Authentication state
│   └── DemoContext.tsx   # Demo mode toggle
├── hooks/
│   ├── useAIChat.ts
│   ├── useAISuggestions.ts
│   ├── useAlertSystem.ts
│   ├── useDeepgramTranscription.ts
│   └── use-mobile.tsx
├── integrations/
│   └── supabase/        # Auto-generated client & types
├── pages/
│   ├── Dashboard.tsx
│   ├── LiveSession.tsx   # Main session recording screen
│   ├── PostSession.tsx   # Post-session review & summary
│   ├── DocumentReview.tsx # Document generation & approval
│   ├── Clients.tsx
│   ├── ClientProfile.tsx
│   ├── Sessions.tsx
│   ├── SessionNew.tsx    # Session setup & consent
│   ├── KnowledgeBase.tsx
│   ├── SettingsPage.tsx
│   ├── IntakeTemplates.tsx
│   ├── IntakeForm.tsx    # Client-facing intake form
│   ├── GrantReporting.tsx
│   ├── Billing.tsx
│   ├── Pricing.tsx
│   └── ...
├── lib/
│   └── utils.ts
└── index.css             # Design system tokens
supabase/
├── config.toml
├── functions/
│   ├── ai-chat/          # Streaming AI chat
│   ├── ai-suggestions/   # Real-time suggestion engine
│   ├── ai-post-session/  # Post-session summary generation
│   ├── ai-documents/     # Document generation
│   └── deepgram-token/   # Deepgram auth token proxy
└── migrations/           # Database migrations
```

## Known Gaps & Developer TODOs

See [GAPS.md](./GAPS.md) for the full gap analysis. Key items:

### P0 — Critical for MVP
1. Test Deepgram integration with real API key
2. Test AI edge functions with real session data
3. Implement Knowledge Base file storage (Supabase Storage + PDF parsing)
4. Implement proper PDF export (replace `window.print()`)
5. Add session recovery for interrupted sessions

### P1 — Important for Launch
6. Implement i18n (react-intl or i18next) for full UI localisation
7. Stripe payment integration
8. PWA background sync for offline session data
9. Server-side auto-purge of transcript data
10. Wire Knowledge Base items into AI prompt context

### P2 — Nice to Have
11. Mobile swipe gestures on client cards
12. White label branding backend
13. Team management & invitations
14. eSanté prescription compliance review
15. AI-powered chaos-to-chronology timeline for NGO intake

## Database

See [supabase-schema.sql](./supabase-schema.sql) for the complete database schema including all tables, enums, functions, triggers, and RLS policies.

## License

Proprietary — All rights reserved.

## Contact

For questions about this codebase, refer to the GAPS.md document and inline code comments.
