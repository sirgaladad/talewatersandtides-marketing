# FACILITATOR — First Contact

> Host guide for running a First Contact / Prompt Play night. This page is intentionally low-key in participant navigation (it is `noindex`), so bookmark this doc.

---

## Where it lives

| What | URL |
|------|-----|
| Live facilitator dashboard | https://talewatersandtides.com/first-contact/facilitator/ |
| Participant page (the room) | https://talewatersandtides.com/first-contact/ |
| Guest dashboard (self-serve) | https://talewatersandtides.com/first-contact/dashboard/ |

A faded **Facilitator** link also sits in the participant page footer, and a **Facilitator login** link in the guest dashboard footer.

---

## Access

- Sign in is by **magic link** — enter your email, tap the link **on the device you'll run the night from**.
- Access is restricted to an **allowlist** defined in `first-contact/facilitator/index.html` (`const ALLOW`):
  - `cboelkens@gmail.com`
  - `corey@talewatersandtides.com`
- Any other signed-in email lands on a "not a facilitator account" screen. To add a host, add their email to `ALLOW` and redeploy.

---

## Who signed in

The dashboard's **Leads** table is the "who signed in" view:

- One row per registered participant (and email subscribers), de-duplicated by email.
- Columns: **Email · Name · Source · Wants more · When**.
- **Export CSV** button downloads the current list (`first-contact-leads-YYYY-MM-DD.csv`).

It also shows a live **Tonight's room** topline: checked-in count (of 25), how many want a deeper session, and average rating — plus experience mix, roles, goals, the prompt log, and ratings/comments. It polls every ~5s while the tab is visible.

---

## Running the jam

Use **Run the jam** to drive what the room sees:

1. Pick the **Live step** — `welcome → problems → vote → hmw → solutions → prioritize → gallery → reflect`.
2. Optionally set the **How-Might-We** text shown to the room.
3. **Save & broadcast** — participant pages pick it up within ~5s (the matching section highlights; the HMW banner appears).

The visibility panels (Problems, Top ideas, Gallery, Reflections) mirror what participants are submitting in real time.

---

## Notes

- All writes are governed by Supabase **Row Level Security** — the shipped anon key is safe; RLS is the control.
- Participant self-service (edit registration, clear this device, remove registration) lives on the **guest dashboard**, not here.
