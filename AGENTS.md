# Ota Life project guidance

This file gives coding assistants, including Copilot, context for working in this repository.

## Project layout

- `api/` is an Express, TypeScript, Prisma, and MySQL API.
- `app/` is an Expo and React Native TypeScript app.
- `api/prisma/schema.prisma` defines users, events, and tickets. The migration and seed script are under `api/prisma/`.
- `Ota_Life_Full_Stack_Intern_Assignment.pdf` is the source assignment. `README.md` contains setup and API examples.

Do not edit `node_modules/` or `mysql_data/`. Keep credentials in ignored `.env` files; update `.env.example` files when configuration changes.

## Assignment requirements

- `GET /events` returns upcoming events with venue, date, price, and remaining inventory.
- `POST /events/:id/book` accepts an integer quantity from 1 to 4 and must never oversell.
- `GET /me/tickets` returns the current user's tickets and event details.
- `POST /checkins` checks a ticket in once; another scan must return HTTP 409 and the first check-in time.
- The app has Events and My tickets screens, supports booking 1–4 tickets, displays ticket QR codes, and indicates check-in status.
- Users are identified with the `X-User-Id` header; authentication and payments are out of scope.

## Important implementation details

- Booking uses a MySQL `SELECT ... FOR UPDATE` lock on the event row inside a Prisma transaction before it counts sold tickets. Keep the inventory check and ticket creation in that same transaction.
- Check-in uses a conditional update matching `checkedInAt: null`. Preserve this atomic behavior so concurrent scans cannot both succeed.
- Ticket codes are generated with Node's cryptographic random bytes and stored in a unique database column.
- The app reads `EXPO_PUBLIC_API_URL`; use a reachable host address for a physical phone and `10.0.2.2` for Android Emulator.
- Keep `README.md` accurate when API behavior, setup, or inventory protection changes.

## Useful commands

Run these from the relevant project directory:

```sh
# api/
npm run build
npm run dev
npm run prisma:seed

# app/
npm run typecheck
npm start
```

The API requires MySQL configured through `api/.env`. The app's public API URL can be configured in `app/.env` using `app/.env.example` as a starting point.

## Code conventions

- Keep TypeScript strict and prefer explicit request validation and useful HTTP status codes.
- Preserve existing API response shapes unless there is a clear reason to change them; update the app and README together when they do change.
- Keep UI loading, error, and empty states understandable, and disable actions that cannot succeed with current inventory.
- Avoid adding dependencies for small changes that can use the existing stack.
