#!/usr/bin/env bash
set -e

echo "==> Running database seed..."
python seed/sample_data.py || echo "Seed already applied or skipped"

echo "==> Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
