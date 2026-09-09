# RFCM CBT Software

Computer-based testing platform for Reconciled Family of Christ Mission (R.F.C.M) Sunday school students.

## Design system

Built around the church's actual visual identity, not a generic theme:

| Role | Color |
|---|---|
| Primary (buttons, logo accents, active states) | RFCM Red `#C41E2B` |
| Secondary (text, headers, admin sidebar) | Charcoal `#1C1A17` |
| Accent (highlights, badges) | Warm Yellow `#F4D35E` |
| Background | Warm Cream `#FFFBF2` |

Headings use Playfair Display (serif, premium feel); body text uses Inter. The church logo (`public/logo.jpg`) and name appear at the top of every student-facing page, with "© Reconciled Family of Christ Mission. All rights reserved. Designed and developed by RFCM IT Department @2026" in the footer.

**Two completely separate worlds, on purpose**: students never see a login, register, teacher portal, or any admin UI — their entire experience is exam code → verify → instructions → exam → (later) check result. Admin/teacher tools live under `/dashboard`, styled as a distinct working tool (dark sidebar, dense layout) with no link from anywhere a student would go.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase Postgres (database only — not Supabase Auth)
- Custom name + password auth (bcrypt + JWT session cookie) for admins/teachers
- Vercel for deployment

## Student flow

1. **Landing (`/`)** — enter an exam code (e.g. `RFCM-Q3-2026`), or go to "Check My Result"
2. **Verify (`/exam/verify`)** — name, class (pre-scoped from the exam code), optional student ID
3. **Instructions (`/exam/instructions`)** — question count, time limit, rules, "Start Exam"
4. **Take (`/exam/take`)** — one question at a time, a navigator grid (answered / unanswered / marked for review), a server-enforced countdown, autosave (debounced + on reconnect), a connection-loss banner, and a submit-review modal before final submission
5. **Check result (`/check-results`)** — exam code + name, only shows a result once released

## Admin/teacher flow (`/dashboard`, login-protected)

- **Classes** — add classes (this was the missing piece before; exam creation now uses a dropdown instead of a raw class ID)
- **Examinations** — create an exam (auto-generates an exam code like `RFCM-Q3-2026` or accept a custom one), add questions one at a time (mcq / true-false / fill-blank / essay), then Activate it so students can enter its code
- **Manual Grading** — queue of ungraded essay answers, score + auto-recompute the attempt's total once all essays for it are scored
- **Results** — load a test's results, select graded ones, release them (only then do they appear on the public checker)
- **Admins & Teachers** — superadmin adds more admins/teachers by name + password (no email)

## What's genuinely new since the last version

- Full RFCM brand redesign (red/charcoal/yellow/cream, logo, footer notice) replacing the earlier navy/gold placeholder theme
- Exam-code-based student flow replacing raw test-ID links
- One-question-at-a-time exam UI with a question navigator, mark-for-review, and a submit-review confirmation modal
- Debounced autosave to the server (`attempts.draft_answers`) plus a connection-loss/reconnect banner
- The missing **Classes** management page
- A **test detail / question builder** page (`/dashboard/tests/[id]`) with an Activate/Close toggle — this didn't exist before, and without it there was no way to add questions or open an exam to students
- Results are now shown to students as a percentage + letter grade (A/B/C/D/F), computed from question points, not a raw score
- **Excel-template question upload** — download a fixed-column template (`/api/questions/template`), fill it in, upload it on a test's detail page; malformed rows are rejected with a row-by-row error report rather than silently skipped
- **Real PDF export** — worksheet and result PDFs are now actually generated (`@react-pdf/renderer`), branded with the church name and footer notice, both single-student (from the Results page) and bulk-zipped per test (`/api/export/bulk`)
- **Grading dashboard filtering + superadmin override** — filter the grading queue by test ID; superadmin can toggle "show already-graded" to re-score an essay for dispute resolution

## Explicitly deferred to Phase 2 (per your own prioritization)

- **Question Bank** (reusable question library with search/filters across exams) — questions currently belong to one exam only
- **Free-form Word/PDF question parsing** — deliberately not built; the fixed Excel template is the supported upload path, exactly as scoped
- **Results dashboard analytics** (average/highest/lowest score, pass rate)
- **Activity/security log**
- **Role-scoped class assignments** — `class_assignments` table exists but isn't enforced yet; every admin/teacher currently sees every class

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local`, fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`
3. Run `supabase/migrations/0001_init.sql` then `0002_exam_code_and_autosave.sql` in the Supabase SQL editor, replacing `<bcrypt-hash-generated-at-setup>` in `0001_init.sql` with a real hash of your `CIPHER` password (generate it with `hashPassword()` from `lib/auth.ts`)
4. `npm run dev`, log in at `/login` as `CIPHER`, go to `/dashboard/classes` to add your first class, then `/dashboard/tests/new` to create and activate an exam
