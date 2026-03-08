# Kloer.ai — Gaps Document

> Updated: 2026-03-08

---

## Feature Gap Analysis

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **Pre-appointment intake template builder** | DONE | `IntakeTemplates.tsx` — full CRUD, question library per profession, drag reorder, preview, Supabase persistence. |
| 2 | **Live session — real-time transcript** | DONE | `LiveSession.tsx` — Deepgram WebSocket integration with demo fallback. Utterances display with speaker labels and language badges per line. |
| 3 | **Live session — speaker labels** | DONE | Each utterance shows "Professional" or "Client" label. |
| 4 | **Live session — language badges per utterance** | DONE | Each utterance displays a language badge (EN, FR, DE, etc.) inline. |
| 5 | **Clickable suggestion cards** | DONE | Live session shows AI-generated suggestion cards grouped by section (warnings, diagnoses, actions, referrals, follow-ups). Cards are clickable to add to basket. |
| 6 | **Generation basket** | DONE | Basket panel collects selected suggestions + custom items. Basket contents passed to post-session for document generation. |
| 7 | **Decision Gate modal** | DONE | Three retention options (summary only, transcript + summary, keep everything) with auto-purge countdown timer. Saves decision to Supabase. |
| 8 | **Auto-purge timer in Decision Gate** | DONE | Configurable countdown (default from profile `auto_purge_minutes`). Auto-selects "summary only" when timer reaches zero. |
| 9 | **Post-session — Summary tab** | DONE | Configurable fields per profession. Editable inline. Regenerate via AI edge function. Fields configurable in Settings. |
| 10 | **Post-session — Points to Note tab** | DONE | Flags with severity levels (critical, important, info, safeguarding). Review/dismiss/add-to-notes actions per flag. |
| 11 | **Post-session — Way Forward tab** | DONE | Clickable forward-planning cards with categories. Custom items can be added. Selected items feed into document generation. |
| 12 | **Persistent chat panel (post-session)** | DONE | Chat panel alongside the three tabs. Demo mode uses static responses; live mode streams via `ai-chat` edge function with SSE. |
| 13 | **Document generation — SOAP notes** | DONE | `ai-documents` edge function generates SOAP-format clinical notes. `DocumentReview.tsx` displays sections with edit, approve, audit trail. |
| 14 | **Document generation — BIRP notes** | DONE | Progress note with BIRP format option. Profession-adaptive — therapist profile generates BIRP by default. |
| 15 | **Document generation — Prescriptions** | DONE | Prescription generation via edge function. Demo data includes medication details (name, dosage, form, frequency, duration, quantity, instructions). |
| 16 | **Prescription — Luxembourg eSanté format** | PARTIAL | Prescription template adapts to Luxembourg format in demo. Actual eSanté electronic prescription compliance (XML schema, CNS codes) not implemented — needs developer review. |
| 17 | **Prescription — Hungary NEAK format** | PARTIAL | Hungary/NEAK is a selectable country format option. Template adapts labels but actual NEAK compliance (EESZT integration, OEP codes) not implemented. |
| 18 | **Referral letter generation** | DONE | Referral letters generated via `ai-documents` edge function. Language selector available. `DocumentReview.tsx` has referral-specific UI with specialty, urgency, anonymisation toggle. |
| 19 | **Referral letter — language selector** | DONE | Document output language selector in post-session. Referral letters can be generated in selected language. |
| 20 | **Knowledge base upload** | PARTIAL | `KnowledgeBase.tsx` has upload UI and category/tag management. Files are added to local state + Supabase table metadata. **Actual file storage** (Supabase Storage bucket) and **file parsing** (PDF/DOCX text extraction) not implemented. |
| 21 | **Knowledge base management** | DONE | Full UI: search, filter by category, view/edit items, add manual entries. Supabase CRUD with RLS. |
| 22 | **Knowledge base — AI context integration** | MISSING | KB items are not injected into AI suggestion or document generation prompts. Edge functions do not query the knowledge_base_items table. |
| 23 | **NGO intake interview mode** | DONE | `NGOIntake.tsx` — dedicated intake flow with extended language support (Tigrinya, Somali, Dari, Pashto, Arabic), trauma-informed consent, guided interview sections, vulnerability flags. |
| 24 | **Chaos-to-chronology timeline** | MISSING | No AI processing to reorder non-linear accounts into chronological timeline. Post-session NGO demo has a static timeline in summary but no actual reordering logic. |
| 25 | **Privacy Kill Switch** | PARTIAL | Scrub dialog exists in `LiveSession.tsx` — user can enter text to scrub. Removes from local state only. **Does not scrub from Supabase** after session is saved. No "kill all recording" emergency button. |
| 26 | **Pilot agreement generator** | DONE | `PilotAgreement.tsx` — form to configure pilot details, preview generated agreement, download via `window.print()`. |
| 27 | **White label settings** | PARTIAL | Settings page has white label tab with fields for custom logo URL, primary colour, footer text, organisation name. **No backend logic** applies the branding to the app. Values are saved to profile but never consumed by the UI. |
| 28 | **Grant reporting dashboard** | DONE | `GrantReporting.tsx` — stats cards, case breakdown, needs categories, language distribution. Demo data only — not wired to real session/client aggregation queries. |
| 29 | **Grant reporting — real data** | MISSING | Dashboard shows hardcoded demo stats. No Supabase queries aggregate actual session/client data for reporting. |
| 30 | **Alert system — corner flash** | DONE | `useAlertSystem.ts` implements corner flash animation triggered by critical findings during live session. |
| 31 | **Alert system — phone vibration** | DONE | Uses Vibration API (`navigator.vibrate`) when alert fires. Configurable in settings (silent flash, vibrate, sound). |
| 32 | **Alert system — smartwatch** | MISSING | Marked as "coming soon" in settings UI. No smartwatch integration. |
| 33 | **Audit trail** | DONE | `DocumentReview.tsx` tracks all edits with before/after values, timestamps. Stored as JSON in documents table `audit_trail` column. |
| 34 | **Audit trail — export to PDF** | PARTIAL | "Export Audit Trail" button exists but uses `window.print()`. No proper PDF generation (e.g., jsPDF or server-side rendering). |
| 35 | **Stripe subscription tiers** | MISSING | `Billing.tsx` and `Pricing.tsx` exist as static UI pages with plan cards and mock invoices. **No Stripe integration** — no checkout, no subscription management, no webhook handling. |
| 36 | **PDF export (all documents)** | PARTIAL | "Download PDF" buttons exist throughout the app but all use `window.print()` popup. No proper PDF generation library. |
| 37 | **Session recovery** | MISSING | Auto-save to Supabase every 60s is implemented in `LiveSession.tsx`. Recovery prompt on next visit (detect interrupted session) is not implemented. |
| 38 | **UI localisation (i18n)** | MISSING | UI language selector exists in settings. Consent screens have translations (EN, FR, DE, LB, HU). All other UI strings are hardcoded English. No i18n framework (react-intl, i18next) in place. |
| 39 | **Client-facing intake form** | PARTIAL | `IntakeForm.tsx` exists with token-based access. RLS policies allow public read/submit by token. Full client-facing experience (sending link, mobile-optimised form) needs testing. |
| 40 | **Auto-purge (server-side)** | MISSING | `auto_purge_minutes` setting exists in profile. Decision Gate uses it as countdown. **No server-side cron/trigger** to actually delete transcript data after the configured time. |
| 41 | **Data deletion / GDPR** | PARTIAL | "Delete Account" button exists in settings. Calls `supabase.auth.admin.deleteUser` which requires server-side implementation. No cascade delete of all user data. |
| 42 | **Team management** | PARTIAL | Settings shows a mock team member list with "Invite" button. No actual invitation system, no shared knowledge base, no team roles. |
| 43 | **Background sync (PWA)** | PARTIAL | PWA manifest and basic service worker caching via vite-plugin-pwa. No background sync for offline session data. |
| 44 | **Swipe gestures on client cards** | MISSING | No touch gesture library. Client cards use standard click interactions only. |

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 21 |
| PARTIAL | 13 |
| MISSING | 10 |

## Priority Order

### P0 — Critical for MVP
1. Test Deepgram + AI edge functions end-to-end with real API keys
2. Implement Knowledge Base file storage (Supabase Storage) + text extraction
3. Wire Knowledge Base content into AI prompts
4. Implement proper PDF export (replace `window.print()`)
5. Add session recovery (detect interrupted sessions)

### P1 — Important for Launch
6. Stripe integration for subscription billing
7. i18n framework for full UI localisation
8. Server-side auto-purge of transcript data
9. Privacy Kill Switch — scrub from Supabase + emergency stop
10. Grant reporting with real aggregated data

### P2 — Nice to Have
11. eSanté / NEAK prescription compliance
12. Chaos-to-chronology AI timeline for NGO
13. White label backend (apply branding from settings)
14. Team management + invitations
15. Smartwatch alert integration
16. Swipe gestures on mobile
17. Background sync for offline sessions
