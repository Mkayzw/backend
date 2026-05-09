# Web Push + Real-Time Streaming (SSE) — Design

Date: 2026-05-09  
Repo: `C:\Users\ishea\backend`  
Scope: Add **true Web Push notifications** + **real-time streaming** for alerts in the web app.

## Goals

1. **True push notifications**
   - Clinicians/admins can opt-in to browser push notifications.
   - Push notifications can arrive even when the web app tab is closed (browser-dependent).
2. **Real-time updates in the UI**
   - When an alert is created, connected clinician/admin dashboards update automatically without refresh.
3. **Owner-based delivery**
   - Push notifications go to the **owners of the alert**:
     - All clinician users with an **ACTIVE** `Assignment` to the alert’s `patientId`.
     - Admins are not automatically notified unless they subscribe and we choose to include them (default: only assigned clinicians). (See decision below.)

Non-goals:
- Patient push notifications (not needed for the current alert model; patients don’t currently view alerts in the UI).
- Guaranteed delivery (web push is best-effort; browsers can drop notifications).

## Current State (Observed)

- Backend: FastAPI app in `main.py`, routes in `app/routes/*`, services in `app/services/*`.
- Alerts are created in `app/services/alert_service.py` and triggered by `app/services/symptom_report.py`.
- Alert access:
  - Clinicians and admins can list alerts (`/alerts`).
  - Patient-specific alerts route uses `checkDataAccess(...)`.
- Frontend: Vite + React in `frontend/`.
  - JWT stored in `localStorage` as `rpm_token`.
  - API calls go through `frontend/src/api/client.js` using `Authorization: Bearer ...`.

## Approach Options Considered

### Option A: SSE (via fetch stream) + Web Push (Recommended)

- Real-time: Server-Sent Events (SSE) using `text/event-stream`.
  - Use `fetch()` streaming on the client so we can pass the `Authorization` header (native `EventSource` cannot set headers).
- Push: Standard Web Push using VAPID + service worker.
  - Backend sends to push service endpoints using `pywebpush`.

Pros:
- Simple server model for “fan-out” events (alerts) and live dashboard updates.
- Works well with current JWT auth approach.
- Keeps the backend stateless beyond in-memory event subscribers.

Cons:
- Push requires HTTPS in production (localhost is a special-case “secure context” for many APIs).
- SSE is server → client only (fine for this use case).

### Option B: WebSockets + Web Push

Pros:
- Bi-directional channel.
Cons:
- More moving parts; auth typically pushes tokens into query/cookie flows or requires custom subprotocol handling.

### Option C: External push provider (FCM)

Pros:
- Mature tooling.
Cons:
- More external setup and credentials; not necessary for a school prototype/demo.

## Decisions

1. **Realtime transport:** SSE (via `fetch()` readable stream) for clinician/admin UIs.
2. **Push transport:** Web Push with VAPID + `pywebpush`.
3. **Default notification recipients:** Assigned clinicians for the alert’s patient (ACTIVE assignments).
   - Admins can optionally subscribe and also receive push; if desired we can add a toggle later.

## High-Level Architecture

### Data model addition

Add a Prisma model to store browser subscriptions:

- `PushSubscription`
  - `id`
  - `userId` (FK to `User`)
  - `endpoint` (unique)
  - `p256dh`
  - `auth`
  - `createdAt`, `updatedAt`

Reasoning:
- A user can have multiple browsers/devices. We can support multiple rows per user by keeping uniqueness on `endpoint`.

### Backend modules

1. **Push settings**
   - Add env-configurable VAPID settings:
     - `VAPID_PUBLIC_KEY`
     - `VAPID_PRIVATE_KEY`
     - `VAPID_SUBJECT`
2. **Routes**
   - `GET /api/push/public-key` (auth optional): returns VAPID public key.
   - `POST /api/push/subscriptions` (auth required): upsert subscription for current user.
3. **Push sending service**
   - Function to:
     - resolve alert owners (active assignments → clinician → clinician.userId)
     - fetch their stored push subscriptions
     - send push payload via `pywebpush`
     - remove subscriptions that are invalid (410/404 scenarios) to prevent repeated failures
4. **Realtime (SSE)**
   - `GET /api/realtime/stream` (auth required; roles: CLINICIAN/ADMIN)
   - In-memory broker:
     - each connected client gets an async queue
     - publish events (e.g., `alert.created`) to all authorized clients
   - Since this is a prototype, in-memory is acceptable; multi-worker deployments would need Redis/pubsub later.

### Alert creation integration

Change `app/services/alert_service.py`:
- After creating the alert in `generateAlert(...)`:
  - publish `alert.created` to the SSE broker
  - send push notifications to the owners (assigned clinicians)

### Frontend changes

1. **Service worker**
   - Add `frontend/public/sw.js` with:
     - `push` handler → `registration.showNotification(title, options)`
     - `notificationclick` handler → focus/open app route (default `/clinician/alerts`)
2. **Push enablement UI**
   - Add a small component/button on clinician/admin dashboards:
     - register service worker
     - request Notification permission
     - fetch VAPID public key
     - subscribe via `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
     - POST subscription JSON to backend
3. **Realtime client**
   - Add a lightweight SSE-over-fetch client:
     - `fetch('/api/realtime/stream', { headers: { Authorization: 'Bearer ...' } })`
     - parse `text/event-stream` framing
     - on `alert.created`, update:
       - `alerts` list (prepend)
       - unread count in `NotificationContext`
       - optional toast

## API Contracts

### `GET /api/push/public-key`

Response:
```json
{ "publicKey": "..." }
```

### `POST /api/push/subscriptions`

Request body (as returned from `pushManager.subscribe()`):
```json
{
  "endpoint": "https://...",
  "keys": { "p256dh": "...", "auth": "..." }
}
```

Response:
```json
{ "ok": true }
```

### `GET /api/realtime/stream`

Response:
- `Content-Type: text/event-stream`
- Events:
  - `event: alert.created`
  - `data: { ...alertPayload... }`

## Security & Privacy Notes

- JWT remains the auth mechanism for:
  - creating subscriptions
  - connecting to SSE stream
- Push payload should be minimal:
  - avoid including sensitive health details
  - include alert type/priority + patient label already visible to assigned clinician

## Testing / Verification Plan

- Backend:
  - Unit-ish sanity checks for:
    - subscription upsert
    - owner resolution for an alert (ACTIVE assignments)
    - SSE emits for alert creation
  - Manual:
    - Start backend, create a report that triggers alert, verify:
      - SSE stream receives event
      - push sent (browser devtools “Push” / notification permission)
- Frontend:
  - Manual:
    - Enable push, confirm subscription registered server-side.
    - Trigger new alert, confirm:
      - realtime UI update
      - system notification displayed, click navigates to alerts.

## Follow-ups (Optional)

- “Manage push” UI: unsubscribe/remove subscription from server.
- Admin broadcast mode (admins receive all HIGH alerts).
- Durable realtime via Redis pub/sub for multi-process deployments.

