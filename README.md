# 🌍 TerraWatch

A self-hosted real-time seismic and volcanic activity monitor. Watch earthquakes and volcanoes as they happen, define regional alert areas, and get notified via email, SMS, or push notification.

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed)](https://docker.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://postgresql.org)
[![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.x-319795)](https://chakra-ui.com)

---

## Features

- **Live world map** — earthquakes sized and coloured by magnitude, volcano markers with alert level colour coding
- **Real-time data** — powered by the USGS Earthquake API and USGS HANS Volcano API, refreshed every 2 minutes
- **Regional alert regions** — draw a rectangle on the map to define a monitoring area
- **Multi-channel notifications** — email (SMTP), SMS (Twilio), and browser push notifications
- **Configurable thresholds** — set minimum earthquake magnitude and minimum volcano alert level per region
- **Alert history** — full log of every notification sent
- **User accounts** — email/password auth with JWT, each user manages their own regions
- **Admin panel** — user management, alert region overview, sent alerts log, system settings
- **Dark-themed UI** — built with Chakra UI 2.x, React 18, Vite

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Chakra UI 2.x, Leaflet, React Query |
| Backend | Python 3.12, FastAPI, APScheduler |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) + bcrypt |
| Notifications | SMTP email, Twilio SMS, Web Push (VAPID) |
| Data sources | USGS Earthquake Catalog API, USGS HANS Volcano API |
| Infrastructure | Docker Compose, Nginx |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/devoidx/terrawatch.git
   cd terrawatch
```

2. **Create your `.env` file**
```bash
   cp .env.example .env
```
   Generate a secret key:
```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
```

3. **Build and start**
```bash
   docker compose up --build
```

4. **Access the app**

   | Service | URL |
   |---|---|
   | Frontend | http://localhost:3001 |
   | API docs | http://localhost:8000/docs |

5. **Log in with the default admin account**

   | Field | Value |
   |---|---|
   | Username | `admin` |
   | Password | `changeme` |

   > ⚠️ Change the admin password immediately after first login via the **Profile** page.

---

## Configuration

All configuration is via `.env`. See `.env.example` for all available options.

### Notifications

| Channel | Required env vars |
|---|---|
| Email (SMTP) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` |
| SMS (Twilio) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Push (Web Push) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` |

Notifications are optional — the app works without any configured. Channels are only used if enabled in user notification preferences.

### Generating VAPID keys
```bash
python3 -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print('PUBLIC:', v.public_key); print('PRIVATE:', v.private_key)"
```

---

## Development
```bash
docker compose up                        # Start all services
docker compose up --build frontend       # Rebuild frontend
docker compose logs -f backend           # View backend logs
docker compose exec db psql -U terrawatch -d terrawatch  # DB shell
docker compose down -v && docker compose up              # Fresh start
```

---

## Data Sources

| Source | URL | Refresh |
|---|---|---|
| USGS Earthquake Catalog | https://earthquake.usgs.gov/fdsnws/event/1/ | Every 2 min |
| USGS HANS Volcano API | https://volcanoes.usgs.gov/hans-public/api/volcano/ | Every 5 min |

Both APIs are free with no authentication required.

---

## License

MIT
