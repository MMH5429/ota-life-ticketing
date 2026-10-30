# Assignment submission checklist

Status is based on the repository review and local build/type checks. Items requiring a personal screen recording or GitHub account are left for the author.

## Assignment scope

- [x] Expo + React Native TypeScript app and Node/Express + TypeScript + MySQL/Prisma API.
- [x] No payment flow, login flow, app-store build, or deployment added; these were explicitly out of scope.

## Backend requirements

- [x] Identify the demo user with the `X-User-Id` request header; seed three users.
- [x] `GET /events` returns upcoming event name, venue, date, price, and tickets remaining.
- [x] `POST /events/:id/book` accepts an integer quantity from 1 to 4 and creates tickets for that user.
- [x] Prevent overselling in the implementation: lock the event row, count sold tickets, and create tickets in one transaction.
- [x] Seed a fresh database with an event whose capacity is two tickets. Existing ticket rows are retained by the upsert seed, so a previously used local database can show this event as sold out.
- [x] `GET /me/tickets` returns the user's tickets with event information and check-in status.
- [x] `POST /checkins` allows one check-in; repeated check-ins return HTTP 409 and the original check-in timestamp.
- [x] Validate booking quantity and check-in code; use non-success status codes for invalid requests and unavailable inventory.
- [x] Generate random ticket codes instead of exposing auto-increment IDs.
- [x] Prisma schema, migration, seed script, and `api/.env.example` are present.

## App requirements

- [x] Events screen lists event name, date, venue, price, and tickets left.
- [x] Select and book between one and four tickets, with quantities above current inventory disabled.
- [x] Search events by name or venue and filter by Live, Jazz, or Film.
- [x] My Tickets screen displays a QR code for each ticket, event details, and a checked-in badge.
- [x] Loading, error, retry, success, empty, and sold-out states are implemented.
- [x] App is responsive to narrow screens and supports Expo Web or Expo Go.
- [x] `EXPO_PUBLIC_API_URL` can be set through `app/.env.example` for web, emulator, or phone use.

## Required handoff materials

- [x] Repository contains `api/` and `app/` projects.
- [x] README has setup steps, API curl examples, and an explanation of overselling protection.
- [ ] Record the requested 1–2 minute video showing event browsing, booking, and the resulting QR ticket.
- [ ] Push/share the repository on GitHub and include the video with the assignment submission.

## Self-check performed

- [x] Reviewed the PDF requirements against the API, app, schema, migration, seed, and README.
- [x] API TypeScript build passes (`npm run build` from `api/`).
- [x] App TypeScript check passes (`npm run typecheck` from `app/`).
- [x] Local API health/root endpoints respond; invalid booking quantity and empty check-in requests return HTTP 400.
- [x] Fresh Expo Web bundle on port 8081 contains the updated layout, event search, and category filters.
- [ ] Record the final user flow on the platform you will submit. This requires the author's screen and is not marked complete here.

## Final run-through for the recording

1. Start MySQL and the API; confirm `http://localhost:3000/health` responds.
2. Start the app with `cd app; npm run web` and open Expo's printed URL (normally `http://localhost:8081`).
3. Show event details and inventory, choose an available event and quantity, then book.
4. Open My Tickets and show the generated QR code and ticket details.
5. Keep the recording between one and two minutes, then upload it with the GitHub repository link.
