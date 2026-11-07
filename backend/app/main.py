from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import Base, engine
from app import models  # noqa: registers tables
from app.api.routes import router

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Roster Management System")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}