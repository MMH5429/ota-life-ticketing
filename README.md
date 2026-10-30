# Ota Life ticketing app

A small full-stack event ticketing demo for Ota Tokyo. The app lets a fan browse events, book one to four tickets, and show each ticket as a QR code. Staff can check a ticket in through the API.

## Project layout

- `api/` — Express, TypeScript, Prisma, and MySQL API.
- `app/` — Expo and React Native app.
- `AGENTS.md` — project guidance for coding assistants.
- `SUBMISSION_CHECKLIST.md` — assignment requirements and handoff checklist.

## Requirements

- Node.js and npm.
- MySQL running locally. The example connection uses port `3307`; edit `api/.env` if your MySQL uses a different port or credentials.

## Run on Windows

Use three PowerShell terminals: one for MySQL if it is not already running, one for the API, and one for Expo.

### 1. Configure and start the API

From the project root:

```powershell
if (!(Test-Path api/.env)) { Copy-Item api/.env.example api/.env }
```

Edit `api/.env` and set `DATABASE_URL` for your MySQL account. Create the database once if it does not exist:

```sql
CREATE DATABASE ota_life;
```

Then start the API:

```powershell
cd api
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Check that `http://localhost:3000/health` returns `{"ok":true,"service":"ota-life-api"}`.

### 2. Configure and start the app

In a second PowerShell terminal, from the project root:

```powershell
if (!(Test-Path app/.env)) { Copy-Item app/.env.example app/.env }
```

For the web demo, `app/.env` can use `EXPO_PUBLIC_API_URL=http://localhost:3000`. For a physical phone, replace `localhost` with your computer's LAN IP, such as `http://192.168.1.20:3000`. Android Emulator uses `http://10.0.2.2:3000`.

Then run Expo Web:

```powershell
cd app
npm install
npm run web -- --clear
```

Open the URL Expo prints. Expo normally uses port `8081`; if it is occupied, it may select another port such as `8082`. Port `3000` is the API; it is not the app screen. If the app was already open while code changed, refresh the Expo page with `Ctrl+Shift+R`.

## Assignment demo video (1–2 minutes)

1. Start MySQL, the API, and Expo Web using the steps above.
2. Open the app and show the event list, dates, venues, prices, and remaining tickets.
3. Select a quantity and book an available event. Show the success message and updated inventory.
4. Open **My Tickets** and show the new ticket's QR code and event details.
5. Keep the recording focused on the user flow; a scanner screen is optional and was not required.

The existing local database may already have sold out the seeded two-ticket event. For the video, choose another event with tickets left, or use a fresh disposable database if you want to show the two-ticket event before anyone has booked it. Do not delete your current database just to reset the demo.

### Browser console note

Opening port `3000` shows the API response, not the app UI. Chrome Autofill logs and requests for `/.well-known/appspecific/com.chrome.devtools.json` are browser tooling messages; they are not ticketing API failures. Check `/health` and the Expo screen if you need to tell whether the app itself is working.

### Windows troubleshooting

- `ERR_CONNECTION_REFUSED` for `localhost:3000` means the API is not running or the app's `EXPO_PUBLIC_API_URL` points at the wrong host/port. Start `npm run dev` in `api/` and check `/health`.
- `EADDRINUSE` on port `3000` means an API process is already listening. Reuse that process, or stop it with `Ctrl+C` in its API terminal before starting another one. To identify the listener, run `Get-NetTCPConnection -LocalPort 3000 -State Listen`.
- Prisma `EPERM` renaming `query_engine-windows.dll.node` usually means an API watcher still has the generated client loaded. Stop the API with `Ctrl+C`, run `npx prisma generate`, then restart it.
- If the project's MySQL data folder is in use but port `3307` is not listening, start its local server in a separate PowerShell window (adjust the paths if MySQL is installed elsewhere):

  ```powershell
  & 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe' --defaults-file='C:\ProgramData\MySQL\MySQL Server 8.0\my.ini' '--datadir=D:\OTA LIFE\mysql_data' '--port=3307' '--bind-address=127.0.0.1' --console
  ```

- `npm install` audit notices are separate from startup errors. Review them with `npm audit`; avoid `npm audit fix --force` unless you are ready to handle potentially breaking dependency upgrades.

## API examples

```bash
# List upcoming events
curl -H "X-User-Id: user-1" http://localhost:3000/events

# Book one ticket
curl -X POST http://localhost:3000/events/event-1/book \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{"quantity":1}'

# List my tickets
curl -H "X-User-Id: user-1" http://localhost:3000/me/tickets

# Check in a ticket (replace with a real code from My Tickets)
curl -X POST http://localhost:3000/checkins \
  -H "Content-Type: application/json" \
  -d '{"code":"OTA-XXXX-YYYY"}'
```

## Inventory and check-in rules

Booking obtains a MySQL row lock on the event with `SELECT ... FOR UPDATE`, then counts sold tickets and creates the tickets inside the same Prisma transaction. Simultaneous bookings for one event are serialized, and a request above remaining inventory receives HTTP 409. Check-in updates only tickets whose `checkedInAt` is null, so a repeated scan receives HTTP 409 and the first check-in timestamp.

## Before sharing the repository

- Keep `api/.env` and `app/.env` private. Commit the `.env.example` files instead.
- Do not include `node_modules/`, `api/dist/`, or `mysql_data/`.
- Include the requested 1–2 minute video with your submission.
- Push the project with `api/`, `app/`, `README.md`, and the Prisma migration/seed files.

Optional local checks:

```powershell
# from api/
npm run build

# from app/
npm run typecheck
```
