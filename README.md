# Wertech Monorepo

Wertech is split into:

- `wertech-app` (React frontend)
- `server` (Express + MongoDB backend)

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB 6+ (local or hosted)

## Environment Setup

1. Backend env:

```bash
cd server
cp .env.example .env
```

Required backend vars in `server/.env`:

- `PORT` (default: `5000`)
- `MONGODB_URI`
- `CORS_ORIGINS` (comma-separated)
- `JWT_SECRET`

2. Frontend env:

```bash
cd wertech-app
cp .env.example .env
```

Required frontend vars in `wertech-app/.env`:

- `REACT_APP_API_BASE_URL` (example: `http://localhost:5000`)
- Optional:
- `REACT_APP_FETCH_TIMEOUT_MS` (default `12000`)
- `REACT_APP_FETCH_RETRY_COUNT` (default `1`, GET-only retries)

## Install

```bash
# backend
cd server
npm ci

# frontend
cd ../wertech-app
npm ci
```

## Run Locally

1. Start backend:

```bash
cd server
npm start
```

2. Start frontend (new terminal):

```bash
cd wertech-app
npm start
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000` by default.

## Test + Lint

Backend:

```bash
cd server
npm run lint
npm test
```

Frontend:

```bash
cd wertech-app
npm run lint
npm run test:ci
npm run build
```

## Test Accounts + Seed

Seed script creates/updates one admin and one standard user:

```bash
cd server
npm run seed:test-accounts
```

Default accounts:

- Admin:
- `email`: `admin@wertech.local`
- `username`: `admin_test`
- `password`: `Admin@12345`
- User:
- `email`: `user@wertech.local`
- `username`: `user_test`
- `password`: `User@12345`

Override via env vars before running:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_EMAIL`
- `SEED_USER_USERNAME`
- `SEED_USER_PASSWORD`

## API Documentation

- OpenAPI: [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- Postman: [`docs/api/postman_collection.json`](docs/api/postman_collection.json)

Import the Postman collection and set:

- `base_url` (example `http://localhost:5000`)
- `access_token` (JWT from `/api/auth/login`)

## Deployment

GitHub Actions workflows:

- CI: `.github/workflows/ci.yml`
- Deploy: `.github/workflows/deploy.yml`

Deploy behavior:

- Push `develop` => staging deploy hooks
- Push `main`/`master` => production deploy hooks
- Manual dispatch supports staging/production target

Required repo secrets for deploy hooks:

- `STAGING_FRONTEND_DEPLOY_HOOK_URL`
- `STAGING_BACKEND_DEPLOY_HOOK_URL`
- `PRODUCTION_FRONTEND_DEPLOY_HOOK_URL`
- `PRODUCTION_BACKEND_DEPLOY_HOOK_URL`

## Backup / Restore

MongoDB operational plan is documented in:

- `server/BACKUP_RESTORE_PLAN.md`

Scripts:

```bash
cd server
npm run backup:db
npm run restore:db
```
