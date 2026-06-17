# Weatharr Feature List

Weatharr is a premium, self-hosted, highly customizable weather dashboard designed for visual excellence, performance, and flexibility. Below is a comprehensive catalog of all capabilities built into the Weatharr application.

---

## 1. Visual Design & User Experience
* **Premium Dark Glassmorphism**: Tailored styling using dynamic CSS variables for transparency (`rgba` overlays), modern border glow effects, and deep backdrops (`backdrop-filter: blur`).
* **Dynamic Typography System**: Instantly switch the entire dashboard's typeface using Google Fonts integrations:
  * **Outfit**: Modern geometric sans-serif (Default).
  * **Inter**: Clean, high-legibility interface typeface.
  * **JetBrains Mono**: High-tech developer aesthetic.
  * **Lora**: Classic serif style.
  * **Playfair Display**: Elegant editorial layout.
  * **Syne**: Futuristic art style.
* **Canvas Edit-Lock Mode**: Safety toggle to lock widget drag-and-drop / resizing actions to prevent accidental layout updates during daily use. Supports admin PIN/password locks via the `ADMIN_PIN` environment variable to prevent unauthorized tampering.
* **Global Measurement Settings**: Support for **Metric**, **Imperial**, and **UK Metric** (combining Celsius temperature with Imperial wind speeds) across all modules.

---

## 2. Advanced Grid & Canvas Layouts
* **React Grid Layout Integration**: Drag, drop, and resize individual cards to design your ultimate custom weather layout.
* **Smart Packing Algorithms**:
  * **Dense Grid Pack**: Repositions active widgets into their optimal, smallest visual footprint while packing them together.
  * **Portrait Stack (9:16)**: Instantly aligns all widgets vertically in a 12-column mobile layout for smartphones or vertical displays.
* **Layout Profiles Manager**: Create and name multiple custom grid presets. Save them to the server to swap layouts or cities in one click.

---

## 3. Location Hub & Navigation
* **Multi-Location Tab Bar**: Open several location tabs simultaneously to monitor multiple cities. Swap, close, or add locations instantly.
* **SEO-Friendly URL Routing**: Tab updates are synchronized with the browser address bar via SEO-friendly slug strings (e.g., `/london` or `/san-francisco`). Direct access loads the tab state and queries local weather records immediately.
* **GPS Coordinate Autolocation**: One-click GPS search triggers browser Geolocation APIs and queries reverse-geocoding engines to locate the nearest station.

---

* **Personal API Key integration**: Secure API key entry box in the Control Center. The key is stored safely on the server and is masked (`••••••••`) when returned to the browser to prevent leakage.
* **Network Query Protection**: The OWM API key is resolved entirely on the server-side, preventing it from appearing in client-side URL parameter requests or browser network inspector logs.
* **Hybrid Data Layer**: When an OWM API key is supplied, Weatharr queries real-time observational metrics (exact current temperature, wind speed, pressure, humidity) and blends them directly into the forecast model coordinates.

---

## 5. Rich Weather Widgets
* **Current Weather Card**: Displays real-time temperature, condition text, daily highs/lows, and wind/humidity trends.
* **Hourly Trend SVG Chart**: Custom-drawn, responsive SVG line chart featuring:
  * Multi-axis normalization to display Temperature, Rain, UV, and Wind concurrently.
  * Interactive overlay tooltip tracking exact coordinates.
  * Live timeline marker indicating the user's current progress through the day.
* **Sunrise & Sunset Tracker**: Renders solar position along a responsive, animated horizon tracking daylight hours.
* **Barometric Pressure Sparkline**: Details pressure trends across an expanded **144-hour timeline** (72 hours of historical records + 72 hours of forecast data) to track low and high-pressure systems.
* **Air Quality Index (AQI) Guide**: Analyzes current PM2.5, PM10, Ozone, and Nitrogen Dioxide readings, mapping them to USDA/EPA scale levels accompanied by layman-friendly hazard explanations.
* **7-Day Forecast Bars**: Weekly projection using horizontal bars showing min/max ranges, expected weather conditions, and optional sunrise/sunset toggle switches.
* **This Time Last Year**: Pulls historical model records for the exact coordinates 365 days ago, letting you compare today's readings with last year's conditions.

---

## 6. Dashboard Sharing & JSON Configuration
* **JSON Export**: Instantly serializes the active dashboard configuration—including widget layout coordinates, unit preferences, active city geocodes, fonts, and API keys—and copies it to the system clipboard, prompting a success toast.
* **JSON Import**: Paste a config string to restore layout structures, locations, and dashboard settings.
* **Green Success Toasts**: Custom UI toast notifications to confirm copying, imports, and profile creations without intrusive popup dialogs.

---

## 7. Architecture & Offline Sync
* **Node.js Express Proxy API**: Acts as a lightweight proxy to cache geocodes, handle OWM credentials safely, and route traffic to the Open-Meteo backend.
* **Self-Hosted Open-Meteo Engine**: A standalone Docker service parsing global models (e.g., NCEP GFS 0.25°) locally. Includes zero-downtime transparent fallback to the public `api.open-meteo.com` endpoint if the local dataset goes offline, updates, or fails.
* **Cron-like Background Sync**: Periodically fetches and updates the local weather database every 3 hours to guarantee off-grid operation.
* **Geocoding & Weather Cache**: Keeps local query caches for 15 minutes to maximize page load times and respect API limits.

---

## 8. IoT & Static Display Integrations
* **JSON Observational API**: The self-hosted backend exposes clean REST endpoints (e.g., `/api/weather` and `/api/air_quality`) that cache data, bypass CORS, and require no authorization headers.
* **Low-Refresh Display Compatibility**: Ideal for exporting metrics to Magic Mirrors, ESP32-powered e-ink dashboards, or Raspberry Pi kiosk displays without rate-limit constraints or firmware-level API key exposures.
