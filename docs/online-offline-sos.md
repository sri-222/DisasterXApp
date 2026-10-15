# Online and offline SOS

DisasterX sends an SOS by whichever route works at that moment, and tells the
person exactly how far it got.

| Mode shown in the app | When | SOS route | What the app can promise |
|---|---|---|---|
| **Online** | `GET https://disasterx-backend.onrender.com/health` answers | `POST /sos` on the backend | "Received by DisasterX": the server stored it and the control room sees it |
| **Offline gateway** | Backend unreachable, `GET http://192.168.4.1/health` answers | `POST http://192.168.4.1/sos` (plain text), sent over LoRa | "Sent to the offline gateway" only. The gateway has no LoRa acknowledgement, so the app never says it was received |
| **No connection** | Neither answers | Saved on the phone | "Saved on this phone", retried automatically |

The mode is checked every 15 seconds by asking both servers directly, not by
trusting Android's "connected" flag (on the gateway Wi-Fi Android reports
"Connected, no internet").

## How one SOS moves

1. Tapping SOS saves it in the phone's outbox (`src/services/sosOutbox.ts`)
   with a unique `clientId`, the device id (`MOB-XXXX`), crisis type, GPS
   coordinates and time. Nothing after this can lose it.
2. If the backend answers, it is posted with that `clientId`. The backend
   makes the SOS id from the user and `clientId`, so a retry returns the same
   SOS (`duplicate: true`) instead of creating a second one.
3. If only the gateway answers, it is sent once as
   `SOS|MOB-4F2A|Flood. Need rescue at 13.08270,80.27070. Ref mg9x0abc-1a2b3c4d5e6f`.
   It is never resent over LoRa, because the radio side cannot tell repeats
   apart and each one would look like a new emergency.
4. Anything not yet on the server is retried every 15 seconds while the app
   is open, and on "Try sending now". An SOS that went over LoRa is still
   uploaded later with the same `clientId` and `channel: "lora"`, so the
   control room gets a record without a duplicate.

There is one retry loop for the whole app (`ConnectionProvider` at the app
root), so moving between screens or reopening the app never starts a second
one. The Alerts screen polls `GET /messages` every 5 seconds only while it
is open and the gateway is reachable.

## Files

| File | Why |
|---|---|
| `src/services/gateway.ts` | Gateway client: health, send SOS text, read and parse the latest message |
| `src/services/sosOutbox.ts` | Saved SOS queue, route choice, retries, duplicate protection |
| `src/services/ConnectionContext.tsx` | App-wide connection mode and retry loop |
| `src/services/pushNotifications.ts` | Firebase Cloud Messaging: `alerts` topic, personal SOS updates |
| `src/services/offlineCache.ts` | Last good copy of the alerts and earthquake feeds for offline viewing |
| `src/services/alertGuide.ts` | Plain-language meaning of each severity and magnitude |
| `src/component/GatewayInbox.tsx` | Radio messages heard by the gateway |
| `src/component/LocationMap.tsx` | OpenStreetMap map with a red pin on the SOS screen |
| `src/screens/SosScreen.tsx` | Mode badge, outbox status cards, retry |
| `src/screens/AlertsScreen.tsx` | "How to read this page", offline banner, radio messages |
| `android/app/src/main/res/xml/network_security_config.xml` | Allows plain HTTP to `192.168.4.1` only; everything else stays HTTPS in release |
| `android/app/src/debug/res/xml/network_security_config.xml` | Debug builds allow HTTP for Metro |
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

Automated (`npx jest`, all run): online send, gateway send, nothing
reachable then internet back, LoRa then server upload with the same
`clientId`, failed server attempt retried with the same `clientId`, server
down with gateway up falls back in the same tap, three concurrent retries
send once, outbox survives an app restart, gateway text format and parsing,
radio inbox de-duplication. Backend (`npm test`): repeated `clientId`
returns the same SOS and stores one record.

On the phone with the hardware (not run yet; needs the ESP32 boards):

1. Online: send SOS, badge green, "SOS received by DisasterX", appears in the control room.
2. Turn off mobile data, join `DisasterX` Wi-Fi: badge turns orange.
3. Send SOS: "Sent to the offline gateway"; the receiving LoRa board prints the `SOS|MOB-…` line.
4. Transmit from another LoRa sender: the gateway receives it.
5. Open Alerts: it appears under Radio messages within about 5 seconds.
6. Leave the Wi-Fi with mobile data off: badge red, a new SOS shows "Saved on this phone".
7. Turn mobile data on: within 15 seconds the saved SOS changes to received.
8. Check the control room: one record per SOS (LoRa ones marked `lora`), no duplicates.
9. Switch tabs and reopen the app a few times: the gateway sees one `/messages` request every 5 s, not more.
10. Log in, profile, location and weather still work.

## Limits of the current gateway firmware

The app works with the firmware as it is: `/health`, `/sos`, and `/messages`
holding only the latest message in RAM. That means:

- No delivery receipt over LoRa, so the app never says an offline SOS was received.
- Only the latest radio message is kept; the app remembers each one it sees, but messages that arrive while no phone is polling are lost.
- The gateway has no internet, so LoRa SOS reach the control room only when the sending phone later gets internet.

Firmware changes that would close these gaps (not made here; the firmware is
not in any of the repositories):

1. **Acknowledgements:** the receiver replies `ACK|<Ref>` over LoRa; the gateway exposes `GET /status?ref=<Ref>` returning `sent` or `acked`. The app can then show "Delivery confirmed" only for acked messages.
2. **History:** keep the last 20 messages in a ring buffer with an increasing id and serve `GET /messages?since=<id>` as JSON, so no message is lost between polls.
3. **Internet bridge:** if the receiver side has Wi-Fi or GSM, it forwards each SOS to `POST /sos` on the backend with the same `clientId` (the Ref at the end of the line), and the backend's duplicate protection keeps one record.
