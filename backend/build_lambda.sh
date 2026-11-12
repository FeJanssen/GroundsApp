#!/bin/bash
# Baut das Lambda-Paket OHNE Docker:
# Installiert alle Abhängigkeiten als Linux-arm64-Wheels in .build/ und kopiert den Code dazu.
set -e
cd "$(dirname "$0")"

PIP=../.venv/bin/pip

rm -rf .build
mkdir -p .build

echo "→ Installiere Linux-arm64-Abhängigkeiten…"
$PIP install -q \
  --target .build \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  -r requirements-lambda.txt

echo "→ Kopiere Quellcode…"
cp *.py .build/
rm -f .build/lambda_handler.py && cp lambda_handler.py .build/

echo "✅ Fertig: backend/.build ($(du -sh .build | cut -f1))"
