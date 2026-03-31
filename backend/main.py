import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from database import engine, SessionLocal
import models
from routers import auth, users, alerts, data, admin
import jobs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Create tables (init.sql handles seed data, SQLAlchemy handles schema) ─────
models.Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()


async def run_alert_check():
    db: Session = SessionLocal()
    try:
        await jobs.check_and_notify(db)
    except Exception as e:
        logger.error(f"Alert check error: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background polling on startup
    scheduler.add_job(run_alert_check, "interval", seconds=120, id="alert_check")
    scheduler.start()
    logger.info("✅ TerraWatch scheduler started (polling every 120s)")
    yield
    scheduler.shutdown()
    logger.info("🛑 TerraWatch scheduler stopped")


app = FastAPI(
    title="TerraWatch API",
    description="Real-time seismic and volcanic activity monitoring",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create limiter — uses client IP as key
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(alerts.router)
app.include_router(data.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "TerraWatch API"}
