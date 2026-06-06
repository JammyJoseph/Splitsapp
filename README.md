# 🔒 Tracklock

**Lock your splits before the song leaves the room.**

Tracklock is a mobile-first split-locking platform for music collaborators.
Create a track, add collaborators, set the publishing splits, send it for
review, collect legally-meaningful electronic confirmations, and generate a
locked, timestamped Split Confirmation Agreement that every party can see and
download.

> One track. One split. Everyone signed.

This repository is the **private-beta MVP**.

---

## What it does (v1 scope)

- Email / password **and** magic-link authentication (Supabase Auth).
- Collaborators can sign from a **secure invite link without an account**.
- Dashboard buckets: _Awaiting you · Waiting on others · Changes requested ·
  Drafts · Locked · Archived_.
- **New Split** flow with live **"100% ready to send"** validation.
- **Review → Send to Lock** → secure per-collaborator signing links by email.
- **Accept & Sign** (typed legal name + three confirmations) or **Request
  Change**.
- Automatic **locking** once everyone signs, with a unique reference and a
  generated **Split Confirmation Agreement PDF**.
- **Immutable, version-controlled Standard Protection Terms** attached to each
  agreement at send time.
- Every material change creates a **new version**; old versions stay in the
  version history.
- Full **audit trail** and a basic **admin panel** (users, tracks, agreements,
  audit log, legal-template management).

Out of scope for v1 (roadmap only): sync, publishing admin, royalty analytics,
audio hosting, label services, marketplace, management CRM, Stripe billing,
DocuSign integrations, SMS/WhatsApp.

> ⚠️ **Legal:** Tracklock is a technology provider, not a law firm, and does
> not provide legal advice. The bundled Standard Protection Terms (v1.0) are a
> **placeholder and must be reviewed by a qualified music/IP lawyer before
> public launch** — see `supabase/seed.sql`.

---

## Tech stack

- **Next.js 15** (App Router, Server Actions) · **React 19** · **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Row-Level Security
- **pdf-lib** — server-side PDF generation
- **Resend** — transactional email (logs to console when unconfigured)
- Deployable to **Vercel**

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

In the [Supabase dashboard](https://supabase.com/dashboard) create a project,
then run the migrations and seed (in order) using the SQL editor or the
Supabase CLI:

```
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_immutability.sql
supabase/seed.sql
```

With the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push          # applies migrations
supabase db execute -f supabase/seed.sql
```

> **Auth tip:** for the smoothest beta, you can disable "Confirm email" in
> Supabase Auth settings so password sign-ups can log in immediately. Magic
> links and email confirmation both redirect through `/auth/callback`.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server only — never exposed) |
| `NEXT_PUBLIC_APP_URL` | Public base URL (used to build signing links) |
| `RESEND_API_KEY` | Optional. If unset, emails print to the server console |
| `EMAIL_FROM` | Verified Resend sender, e.g. `Tracklock <splits@you.com>` |
| `TRACKLOCK_ADMIN_EMAILS` | Comma-separated admin emails (access to `/admin`) |

### 4. Run

```bash
npm run dev
# http://localhost:3000
```

`npm run build` / `npm run typecheck` to validate.

---

## How locking works

A split **locks automatically** the moment the last collaborator signs, when
all of these hold:

1. Track title exists
2. At least one collaborator
3. Publishing splits total exactly **100%**
4. Every collaborator has signed
5. No unresolved change requests

On lock the system sets the agreement to `locked`, stamps `locked_at`,
generates a unique reference (`TL-XXXX-XXXX`), records `agreement_locked` +
`pdf_generated` audit events, emails all parties, and exposes the PDF at
`/api/pdf/[agreementId]`.

**Locked means locked.** Database triggers (`0003_immutability.sql`) physically
prevent edits to locked agreements, signed signatures, audit events and the
substance of legal templates. Any change creates a new version that everyone
must re-sign; superseded versions remain in the version history.

---

## Security model

- **Row-Level Security** on every table. Users see only tracks they created,
  tracks for an organisation they belong to, tracks where they are a
  collaborator (matched by email), or — for invitees — a single agreement via a
  secure signing token.
- Public signing and locking run server-side with the **service-role key**
  (never shipped to the browser); tokens are 256-bit, URL-safe and unique.
- Admins (`user_type = 'admin'` or listed in `TRACKLOCK_ADMIN_EMAILS`) can view
  everything but **cannot edit a locked agreement**.

---

## Project structure

```
supabase/migrations/   SQL schema, RLS policies, immutability triggers
supabase/seed.sql      Standard Protection Terms v1.0 (placeholder)
src/lib/               Supabase clients, auth, audit, email, pdf, lock logic
src/app/               App Router pages, server actions, API routes
src/components/        UI + interactive client components
```

## Deploy to Vercel

1. Push this repo and import it into Vercel.
2. Add the environment variables above in the Vercel project settings.
3. Set the Supabase Auth **Site URL** and redirect URLs to your Vercel domain
   (`https://your-app.vercel.app/auth/callback`).
4. Deploy.

---

## Billing

Billing is stubbed (`subscriptions` table) for future Stripe integration. Plans
intended: Free creator · Creator Pro · Manager · Label/Publisher. The app runs
in private beta without payments.
