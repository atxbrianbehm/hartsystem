# API v1 Endpoints

Base URL: `/api/v1`

## Auth
- `POST /login`
- `GET /users/me`

## Sites
- `GET /sites`
- `POST /sites` (admin only)

## Assets
- `GET /assets`
- `GET /assets/:id`
- `POST /assets`
- `PUT /assets/:id`
- `DELETE /assets/:id` (admin only)
- `POST /scan/asset`

## Seed Credentials
- Admin: `admin@fieldops.local` / `Password123!`
- Field User: `field@north.local` / `Password123!`
- Viewer: `viewer@ops.local` / `Password123!`
