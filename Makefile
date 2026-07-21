SHELL := /bin/bash

.PHONY: install dev api web test lint eval compose-up compose-down

install:
	python3.13 -m venv .venv
	.venv/bin/python -m pip install -e '.[dev,postgres,telemetry]'
	npm --prefix apps/web install

dev:
	docker compose up --build

api:
	.venv/bin/uvicorn engtrace.main:app --app-dir apps/api --reload --port 8000

web:
	NEXT_PUBLIC_API_URL=http://localhost:8000 npm --prefix apps/web run dev

test:
	.venv/bin/pytest --cov=engtrace --cov-report=term-missing
	npm --prefix apps/web run test

lint:
	.venv/bin/ruff check apps/api
	.venv/bin/ruff format --check apps/api
	npm --prefix apps/web run lint

eval:
	.venv/bin/engtrace-eval

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down
