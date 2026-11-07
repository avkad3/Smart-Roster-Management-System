from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import Base, engine, SessionLocal
from app import models  # noqa: registers tables
from app.api.routes import router
from app.services.seed_data import seed_database

# Create all tables on startup
Base.metadata.create_all(bind=engine)

# Auto-seed database if empty (no shell required on cloud hosts)
try:
    with SessionLocal() as db:
        seed_database(db, force=False)
except Exception as e:
    print(f"Auto-seed check: {e}")

app = FastAPI(title="Smart Roster Management System")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
