# Kloer.ai — Gaps Document

> Generated: 2026-03-08 — For developer handoff with GitHub export

---

## 1. Features Working in Demo Mode (Need Real API Integration)

| Feature | Current State | Developer Work Needed |
|---|---|---|
| **Live Transcription** | Uses Deepgram — demo mode simulates transcript line by line | Deepgram API key required. Connection logic implemented (`useDeepgramTranscription`). Needs testing with real key. |
| **AI Suggestions** | Edge function `ai-suggestions` calls Lovable AI gateway | Working — needs end-to-end testing with real sessions. |
| **AI Chat** | Edge function `ai-chat` streams responses via SSE | Working — uses Lovable AI gateway. Needs testing. |
| **AI Post-Session Summary** | Edge function `ai-post-session` generates summaries | Working — needs testing with real transcript data. |
| **AI Document Generation** | Edge function `ai-documents` generates clinical notes, prescriptions, referrals | Working — needs testing with real data and profession-specific prompts. |
| **Knowledge Base File Upload** | Files are added to local state only | **NEEDS WORK**: Implement Supabase Storage bucket, actual file parsing (PDF/DOCX text extraction), and storage of parsed content for AI context. |
| **Knowledge Base AI Context** | Demo items shown per profession | **NEEDS WORK**: Wire uploaded KB items into the AI suggestion and document generation prompts. |

## 2. Features Missing from the UI

| Feature | SRS Reference | Status |
|---|---|---|
| **Chaos-to-Chronology Timeline** (NGO) | NGO intake should auto-build a chronological timeline from non-linear accounts | **NOT IMPLEMENTED** — Would require AI processing of transcript to reorder events chronologically. Post-session summary for NGO has a static timeline in demo data. |
| **Privacy Kill Switch — Selective Scrub** | During live session, ability to scrub specific words/phrases from transcript | **PARTIALLY IMPLEMENTED** — UI exists for scrubbing but only removes from local state. Does not scrub from Supabase after save. |
| **Session Recovery** | If browser closes mid-session, offer to recover from last auto-save | **NOT IMPLEMENTED** — Auto-save to Supabase every 60 seconds is implemented, but recovery prompt on next open is not. |
| **Intake Form — Client-Facing** | Clients should be able to fill intake forms via a shared link | **PARTIALLY IMPLEMENTED** — `IntakeForm.tsx` exists with token-based access, but the UI for sending the link to clients and the full client-facing form experience needs testing. |
| **UI Localisation** | Full UI in French, German, Luxembourgish, Hungarian | **NOT IMPLEMENTED** — UI language setting exists but no i18n framework is in place. All UI strings are English. Consent screen has translations. |
| **Stripe Payments** | Billing page with subscription management | **NOT IMPLEMENTED** — `Billing.tsx` and `Pricing.tsx` exist as static pages. No Stripe integration. |
| **PDF/Document Export** | Download generated documents as PDF | **NOT IMPLEMENTED** — "Download PDF" buttons exist but use `window.print()`. Needs proper PDF generation (e.g., `jsPDF` or server-side PDF rendering). |
| **eSanté Prescription Format** | Luxembourg-specific electronic prescription format | **DEMO ONLY** — Prescription template adapts to Luxembourg format in demo but actual eSanté compliance needs developer review. |
| **White Label Branding** | Custom logo, colours, footer text for organisations | **UI EXISTS** — Settings tab shows white label options but no backend logic applies the branding. |
| **Team Management** | Invite team members, shared knowledge base | **UI EXISTS** — Settings shows mock team list. No actual team/invitation system implemented. |
| **Background Sync (PWA)** | Service worker background sync for offline data | **NOT IMPLEMENTED** — PWA manifest and basic caching are set up. Background sync for session data requires service worker implementation. |
| **Swipe Gestures on Client Cards** | Mobile: swipe left to reveal actions | **NOT IMPLEMENTED** — Would require a touch gesture library (e.g., `react-swipeable`). |

## 3. Features That Work But Need Polish

| Feature | Issue |
|---|---|
| **Demo Mode Supabase Calls** | ✅ FIXED — Dashboard, Sessions, Clients now skip Supabase calls in demo mode. Other pages (SessionNew, ClientProfile) may still attempt Supabase calls with demo user ID if accessed directly. |
| **Post-Session Chat** | Works in demo with pre-built responses. Live mode uses AI edge function. Typing indicator present. |
| **Alert System** | Corner flash, vibration API, and test button all work. Smartwatch marked as "coming soon". Alert log shows in Post-Session. |
| **Document Approval & Audit Trail** | Works in demo mode with local state. Real mode saves to Supabase `documents` table. Audit trail stored as JSON. |
| **Mobile Layout** | Bottom tab bar on live session works. Some pages may need additional mobile testing for edge cases. |
| **Onboarding Upload** | Upload areas exist but are non-functional (no file handling). |

## 4. Security Considerations for Developer

| Item | Notes |
|---|---|
| **RLS Policies** | All tables have RLS enabled with `professional_id = auth.uid()` policies. Properly restrictive. |
| **Edge Function Auth** | Edge functions check for `LOVABLE_API_KEY`. JWT verification varies — review `config.toml` for each function. |
| **Consent Logging** | Consent given/refused is logged to sessions table with timestamp. |
| **Data Retention** | Decision Gate saves retention decision. Auto-purge timer exists in UI but actual purge logic (delete transcript after X minutes) is not implemented server-side. |
| **GDPR Compliance** | Data deletion via "Delete Account" in settings calls `supabase.auth.admin.deleteUser` — needs server-side implementation. |

## 5. Developer TODO List (Priority Order)

### P0 — Critical for MVP
1. **Test Deepgram integration** with real API key — verify live transcription works end-to-end
2. **Test AI edge functions** with real sessions — verify suggestions, summaries, and documents generate correctly
3. **Implement Knowledge Base storage** — Supabase Storage bucket for file uploads, PDF/DOCX text extraction
4. **Implement PDF export** — Replace `window.print()` with proper PDF generation
5. **Add session recovery** — Check localStorage/Supabase on session page load for interrupted sessions

### P1 — Important for Launch
6. **Implement i18n** — Use `react-intl` or `i18next` for full UI localisation
7. **Stripe integration** — Connect Billing/Pricing pages to Stripe subscriptions
8. **Background sync** — Service worker background sync for offline session data
9. **Implement auto-purge** — Server-side cron/trigger to delete transcript data after configured minutes
10. **Wire Knowledge Base into AI prompts** — Include relevant KB items in suggestion/document generation context

### P2 — Nice to Have
11. **Swipe gestures** on mobile client cards
12. **White label backend** — Apply custom branding from settings
13. **Team management** — Invitation system, shared KB
14. **eSanté compliance review** — Verify prescription format meets Luxembourg requirements
15. **Chaos-to-chronology** — AI-powered timeline reordering for NGO intake

## 6. Architecture Notes

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — PostgreSQL + Auth + Edge Functions
- **AI**: Lovable AI Gateway (Google Gemini / OpenAI GPT-5) via edge functions
- **Transcription**: Deepgram WebSocket API via browser
- **PWA**: vite-plugin-pwa with workbox
- **State**: React Query for server state, React Context for auth/demo

## 7. Environment Variables Required

```
DEEPGRAM_API_KEY=        # Deepgram.com — live transcription
LOVABLE_API_KEY=         # Auto-provisioned by Lovable Cloud — AI features
SUPABASE_URL=            # Auto-provisioned
SUPABASE_ANON_KEY=       # Auto-provisioned
SUPABASE_SERVICE_ROLE_KEY= # Auto-provisioned
```

## 8. Test Scenarios Status

| Scenario | Status |
|---|---|
| Medical (Luxembourg Neurologist) | ✅ All UI flows work in demo. Signup → Onboarding → Client creation → Session → Post-session → Documents → Client profile. AI needs real API testing. |
| NGO (Asylum Intake) | ✅ All UI flows work in demo. Grant reporting dashboard functional. Chaos-to-chronology not implemented. Pilot agreement page exists. |
| Therapist (Hungary) | ✅ All UI flows work in demo. BIRP progress note generates correctly. Hungarian UI language not localised (English only). |
