# Smart Farm

A four-zone smart farming demo: ESP32 zone nodes, Firebase, and a web app that works as an installable PWA.

Each zone has its own ESP32 with a soil moisture sensor, a relay and an LED. The web app shows live readings and history, switches zones on and off, runs automatic irrigation, raises alerts, and produces reports.

Built for the dissertation *Smart Farming System using IoT Sensors and Mobile Monitoring* (Horizon Campus, 2026). It demonstrates the sense, decide and act path of that system. Nothing here waters a plant: the relay and LED stand in for the irrigation pump.

```
Web app (PWA)  <-->  Firebase  <-->  Wi-Fi  <-->  4x ESP32 zone nodes
```

## Features

**Nodes (firmware)**
- Soil moisture every 5 s, calibrated to 0-100%. Zone 1 also reads temperature, humidity and (when fitted) light.
- **Manual mode:** the node follows an on/off command from Firebase.
- **Auto mode:** the node turns the relay on below a low moisture level and off at a high one. It keeps working without internet.
- Safety: output off when Wi-Fi is lost, when the soil sensor is faulty, or after 30 minutes of continuous running.
- Raises alerts itself (soil too dry, sensor fault, high temperature) and saves one history record a minute.

**Web app**
- Email and password accounts with registration and password reset.
- **Overview:** live zone cards, climate, weather tile, summary tiles.
- **Irrigation:** per-zone on/off with confirmation, Manual/Auto with thresholds, emergency stop.
- **Analytics:** soil moisture per zone, zone comparison, temperature, humidity and light history (1 hour, 24 hours, 7 days).
- **Alerts:** live problems plus a saved history with read and unread.
- **Weather:** current conditions and a 5-day forecast from Open-Meteo, with a simple irrigation hint.
- **Reports:** daily and weekly PDF (summary, trends, alerts, recommendations, weather, pump usage) and CSV export.
- **Disease scanner:** leaf photo analysed by Gemini, through a server route that keeps the API key private.
- **Settings:** zone name, crop, icon and alert thresholds. Installable on a phone.

## Repository layout

| Folder | What it holds |
|---|---|
| `firmware/` | ESP32 code (PlatformIO, Arduino framework), one build per zone |
| `firebase/` | Realtime Database security rules |
| `web/` | Next.js 16 app (TypeScript, Tailwind, shadcn/ui, Recharts, jsPDF) |

## Hardware

Per zone: ESP32 DevKit (38-pin), capacitive soil moisture sensor, 5 V relay module with optocoupler, LED with a 220 ohm resistor, and a USB power supply. Zone 1 also has a DHT22 and a BH1750 light sensor.

| Part | Pin on ESP32 |
|---|---|
| Soil sensor AOUT | GPIO34 (ADC1) |
| Relay IN | GPIO26 |
| LED (through 220 ohm) | GPIO27 |
| DHT22 data (zone 1) | GPIO4 |
| BH1750 SDA / SCL (zone 1) | GPIO21 / GPIO22 |

Sensors run on 3V3. The relay module runs on the 5 V pin. The soil sensor must use an ADC1 pin, because ADC2 doesn't work while Wi-Fi is on. The relay is active-low: the pin goes low to switch it on. Never connect mains voltage to the relay terminals.

## Setup

### 1. Firebase
1. Create a project and enable **Authentication** (Email/Password) and a **Realtime Database**.
2. Paste `firebase/database.rules.json` into the database **Rules** tab and publish.
3. Create one user for the nodes and one for yourself in Authentication.

### 2. Firmware
Requires [PlatformIO](https://platformio.org/).

```bash
cd firmware
cp include/secrets.example.h include/secrets.h   # then fill in Wi-Fi and Firebase values
pio run -e zone1 -t upload                       # flash one board at a time
```

Use `zone1` to `zone4` for the four boards. The zone number sets the node ID (`ESP32_NODE_001` to `ESP32_NODE_004`). `secrets.h` is git-ignored. Soil calibration (`DRY_RAW`, `WET_RAW`) and the other settings are in `include/config.h`. Open the serial output with `pio device monitor`.

### 3. Web app
```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. The Firebase web config is in `web/lib/firebase-config.ts`. It is public configuration, protected by sign-in and the database rules. Replace it with your own project's values.

For the disease scanner, create `web/.env.local`:

```
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash   # optional
```

Restart the dev server after changing it. Everything except the scanner works without a key.

## Data in Firebase

| Path | Written by | Contents |
|---|---|---|
| `/sensors/<node>` | node | latest soil, temperature, humidity, light, status, mode, relay state, timestamp |
| `/pump/active/<node>` | web app (node in auto mode) | on/off command for the zone |
| `/zones/<node>` | web app | name, crop, icon, alert thresholds, mode, auto thresholds |
| `/history/<node>/<id>` | node | one reading a minute for charts and reports |
| `/alerts/<id>` | node | alert type, value, time, read flag |

## Limitations

- **Demo hardware.** A relay and LED stand in for a water pump. There is no water volume and no real irrigation.
- **Wi-Fi only.** The dissertation also designs a LoRa gateway for out-of-range plots. It isn't built here.
- **Auto mode** uses soil moisture only. There is no schedule and no rain skip. The weather hint is advice, not an input to the nodes.
- **Access control.** Any registered user can switch zones. A real deployment needs an owner or operator role.
- **Alerts** show in the app only. There are no push notifications.
- **Zone count is fixed** at four, tied to the four boards. Zones can be renamed but not added.
- **Soil calibration** depends on the soil. Real thresholds should come from an agricultural officer.
- **Scanner results** are AI suggestions, not a diagnosis.
- Not built from the dissertation: voice assistant, task manager, crop calendar, farm map.

## Differences from the dissertation

- A Next.js web app (PWA) replaces the Flutter Android app.
- An LED and relay replace the water pump.
- Zone settings and alerts live in the Realtime Database instead of Firestore, so the nodes can read them.
- DHT22 and BH1750 are on zone 1 only.
- PlatformIO replaces the Arduino IDE.
