# Online and offline SOS

DisasterX sends an SOS by whichever route works at that moment, and tells the
person exactly how far it got.

| Mode shown in the app | When | SOS route | What the app can promise |
|---|---|---|---|
| **Online** | `GET https://disasterx-backend.onrender.com/health` answers | `POST /sos` on the backend | "Received by DisasterX": the server stored it and the control room sees it |
| **Offline gateway** | Backend unreachable, `GET http://192.168.4.1/health` answers | `POST http://192.168.4.1/api/sos` (JSON; v1 firmware: `POST /sos` plain text) | "Received by the gateway · not yet confirmed by DisasterX", with the gateway's event ID. Never "delivered" |
| **No connection** | Neither answers | Saved on the phone | "Saved on this phone", retried automatically |

The mode is checked every 15 seconds by asking both servers directly, not by
trusting Android's "connected" flag (on the gateway Wi-Fi Android reports
"Connected, no internet").

## How one SOS moves

1. Tapping SOS saves it in the phone's outbox (`src/services/sosOutbox.ts`)
   with a unique `clientId` (`DX-<base36 time>-<12 hex>`; it is also the
   gateway's `messageId`, the same id on every route and retry), the device id (`MOB-XXXX`), crisis type, GPS
   coordinates and time. Nothing after this can lose it.
2. If the backend answers, it is posted with that `clientId`. The backend
   makes the SOS id from the user and `clientId`, so a retry returns the same
   SOS (`duplicate: true`) instead of creating a second one.
3. If only the gateway answers, it is posted to `POST /api/sos` as JSON
   (see below). A 2xx means the gateway stored it, nothing more: the SOS
   becomes `delivery_unconfirmed` and the screen shows the gateway's event ID.
   If `/api/sos` answers 404 (v1 firmware), it is sent once as the old text
   line `SOS|MOB-4F2A|Flood. Need rescue at 13.08270,80.27070. Ref DX-mg9x0abc-1a2b3c4d5e6f`.
   An SOS the gateway accepted or refused is never sent to the gateway again.
4. Anything not yet on the server is retried every 15 seconds while the app
   is open, and on "Try sending now". An SOS that went over LoRa is still
   uploaded later with the same `clientId` and `channel: "lora"`, so the
   control room gets a record without a duplicate.

## Gateway API (contract v2)

Base URL `http://192.168.4.1`, Wi-Fi `DisasterX` / `12345678`, no internet.
Client: `src/services/gateway.ts` (also exported as `esp32Service`:
`checkGateway`, `getGatewayStatus`, `sendSOS`, `getEvents`).

| Endpoint | App reads | v1 fallback (only on 404) |
|---|---|---|
| `GET /health` | Reachable on any 200, unless it is JSON whose `status` is not `"ok"`. Reads `mode`, `gateway`, `firmware`, `radio`; result cached for `getGatewayStatus()` | Same endpoint; a plain `OK` counts |
| `POST /api/sos` | Body: `messageId`, `kind:"SOS"`, `type` and `emergencyType` (e.g. `"Medical Emergency"`), `name`, `phone` (from the saved profile, empty if none), `message`/`details`, `location` (`"lat,lon"` or `"Location unavailable"`), `latitude`/`longitude` (or `null`, never invented), `createdAt`, `transport:"offline-wifi"`, `deviceId`. Kept under 1024 bytes. Success = any 2xx; `eventId = eventId ?? id ?? event.id`; `duplicate` | `POST /sos` text line |
| `GET /api/events` | `{events:[...]}`, `{data:[...]}` or a bare array; sorted newest first by the phone | `GET /messages` (latest only) |

Errors are typed: `GatewayTimeoutError` (outcome unknown),
`GatewayNetworkError` (could not connect, not received), `GatewayHttpError`
(the gateway answered with an error; 400 and 413 are definite refusals),
`GatewayMalformedError` (unreadable `/api/events` reply). A 2xx with an
unreadable body on `/api/sos` still counts as accepted, so the SOS is not sent
twice.

## SOS states

| State | Meaning | Shown as |
|---|---|---|
| `pending` | Saved on the phone, not accepted anywhere yet | "Saved on this phone" |
| `pending` + gateway `unknown` | The gateway timed out: it may or may not have it | "Gateway did not answer in time" |
| `delivery_unconfirmed` | The gateway answered 2xx (`received_by_gateway`, or `sent_to_remote` if it reported a radio transmit); no server receipt | "Received by the gateway · not yet confirmed by DisasterX" + event ID |
| `delivered` | The DisasterX server stored it | "SOS received by DisasterX" |
| `failed` | The gateway refused it for good (400/413) | "The gateway refused this SOS"; still uploaded to the server later |

Only a server response makes an SOS `delivered`. Items saved by earlier app
versions load as: `queued` -> `pending`, `gateway_accepted` ->
`delivery_unconfirmed`, `server_accepted` -> `delivered`.

A gateway timeout does not send the SOS by another route as a new SOS. It
stays `pending`; when the internet is back it is uploaded once with the same
`clientId` and `channel: "lora"`, and the server de-duplicates it. Trying the
gateway again is allowed only after a timeout on `/api/sos`, which
de-duplicates by `messageId`; after a timeout on the v1 `/sos` text endpoint it
is never resent to the gateway.

There is one retry loop for the whole app (`ConnectionProvider` at the app
root), so moving between screens or reopening the app never starts a second
one. The Alerts screen polls `GET /api/events` (or `/messages` on v1 firmware)
every 5 seconds only while it is open and the gateway is reachable.

## Files

| File | Why |
|---|---|
| `src/services/gateway.ts` | Gateway client: health, JSON SOS, event history, v1 fallback, typed errors |
| `src/services/sosOutbox.ts` | Saved SOS queue, route choice, retries, duplicate protection |
| `src/services/ConnectionContext.tsx` | App-wide connection mode and retry loop |
| `src/services/pushNotifications.ts` | Firebase Cloud Messaging: `alerts` topic, personal SOS updates |
| `src/services/offlineCache.ts` | Last good copy of the alerts and earthquake feeds for offline viewing |
| `src/services/alertGuide.ts` | Plain-language meaning of each severity and magnitude |
| `src/component/GatewayInbox.tsx` | Events held by the gateway (`/api/events`) |
| `src/component/LocationMap.tsx` | OpenStreetMap map with a red pin on the SOS screen |
| `src/screens/SosScreen.tsx` | Mode badge, outbox status cards, retry |
| `src/screens/AlertsScreen.tsx` | "How to read this page", offline banner, radio messages |
| `android/app/src/main/res/xml/network_security_config.xml` | Allows plain HTTP to `192.168.4.1` only; everything else stays HTTPS in release |
| `android/app/src/debug/res/xml/network_security_config.xml` | Debug builds allow HTTP for Metro |
| `ios/DisasterXApp/Info.plist` | ATS: `NSAllowsLocalNetworking` plus an `NSExceptionDomains` entry allowing HTTP to `192.168.4.1` only (no `NSAllowsArbitraryLoads`) |
| `MainApplication.kt` | Creates the `alerts` and `sos` notification channels |

Backend (sri-222/DisasterX-backend): `POST/DELETE /me/push-token`, push on new
alerts and SOS status changes, optional `clientId` and `channel` on `POST /sos`.

## Configuration

No new environment variables. The app uses the existing backend URL in
`src/screens/api.ts` and the existing `android/app/google-services.json`
(Firebase project `diaster-x`, the same project as the backend's service
account). The gateway address is fixed in `src/services/gateway.ts`:
SSID `DisasterX`, base URL `http://192.168.4.1`.

## Commands

Backend (merge its PR into `deploy` first; Render redeploys by itself):

```
cd C:\disaster-x\disaster-backend
git pull origin deploy
npm install
npm test
```

App (native packages changed, so a full rebuild is needed, not just Metro):

```
cd C:\disaster-x\DisasterXApp
git pull origin main
npm install
cd android && gradlew clean && cd ..
npx react-native run-android
```

For a release APK: `cd android && gradlew assembleRelease`, then uninstall the
old app and install `android\app\build\outputs\apk\release\app-release.apk`.

## Using the offline gateway

1. Power the ESP32 gateway. Join the `DisasterX` Wi-Fi (password `12345678`).
2. When Android says the network has no internet, choose **Stay connected**.
3. If mobile data is on and working, the app uses the internet route
   (Online), which is the better one. If mobile data is on but the gateway
   still shows as unreachable, turn mobile data off: some phones send all
   traffic over mobile data when Wi-Fi has no internet.
4. The SOS badge turns orange, **Offline gateway**.

## Test scenarios

Automated (`npx jest`, all run): gateway client against a mocked `fetch`
(v2 health, JSON SOS body, eventId shapes, v1 fallback on 404 for SOS and
events, timeout, network error, 400/503, malformed JSON, 1024-byte limit),
outbox transitions (gateway accept -> `delivery_unconfirmed` -> server upload
-> `delivered`, timeout stays `pending` and is uploaded once with the same
`clientId`, 400 -> `failed`, old saved states migrate), online send, gateway send, nothing
reachable then internet back, LoRa then server upload with the same
`clientId`, failed server attempt retried with the same `clientId`, server
down with gateway up falls back in the same tap, three concurrent retries
send once, outbox survives an app restart, gateway text format and parsing,
radio inbox de-duplication. Backend (`npm test`): repeated `clientId`
returns the same SOS and stores one record.

On the phone with the hardware (not run yet; needs the ESP32 boards):

1. Online: send SOS, badge green, "SOS received by DisasterX", appears in the control room.
2. Turn off mobile data, join `DisasterX` Wi-Fi: badge turns orange.
3. Send SOS: "Received by the gateway · not yet confirmed by DisasterX" with an event ID; `GET http://192.168.4.1/api/events` lists it with the same `messageId`.
4. Transmit from another LoRa sender: the gateway receives it.
5. Open Alerts: it appears under Radio messages within about 5 seconds.
6. Leave the Wi-Fi with mobile data off: badge red, a new SOS shows "Saved on this phone".
7. Turn mobile data on: within 15 seconds the saved SOS changes to received.
8. Check the control room: one record per SOS (LoRa ones marked `lora`), no duplicates.
9. Switch tabs and reopen the app a few times: the gateway sees one `/api/events` request every 5 s, not more.
10. Log in, profile, location and weather still work.

## Limits of the gateway

The v2 firmware has not been inspected yet; the app reads every reply
tolerantly and falls back to v1 (`/sos`, `/messages`) on 404. Still:

- No delivery receipt over LoRa (`radio.acks` is false), so the app never says an offline SOS was delivered.
- Events live in the gateway's RAM and are lost on reboot; the phone keeps each one it has seen.
- The ESP32 may have no real clock; times before 2020 are replaced by when the phone first saw the event.
- The gateway has no internet, so gateway SOS reach the control room only when the sending phone later gets internet (same `clientId`, server de-duplicates).
