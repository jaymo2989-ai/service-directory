# Karibu Directory — Owner-Managed Service Directory

A complete, functional two-part project:

- **`backend/`** — the API: authentication, provider management, categories, search, reviews, favorites, inquiries, reports, admin dashboard endpoints. See `backend/README.md`.
- **`frontend/`** — the website: homepage, search, provider pages, customer accounts, and your admin panel. See `frontend/README.md`.

## Quick start

**1. Backend:**
```
cd backend
npm install
cp .env.example .env
# edit .env — set JWT secrets and your real admin email/password
npm start
```

**2. Frontend:** open `frontend/assets/js/api.js`, confirm `API_BASE` points to your backend (`http://localhost:3000/api` for local testing), then open `frontend/index.html` in a browser (or serve the folder with `npx serve frontend`).

**3. Log into the admin panel:** open `frontend/admin.html`, log in with the admin email/password from your `.env`, and add your first few providers.

## What's real and working vs. what needs a live credential

Everything in the spec is implemented and functional against the SQLite database — search, filters, reviews, favorites, inquiries, admin moderation, the works. Three things need a real external service plugged in before this handles real customers at scale (all documented with exact swap-in points in `backend/README.md`):

1. Email sending (currently logs to console instead of sending)
2. Cloud image storage (currently local disk, which most free hosts wipe on redeploy)
3. CORS restricted to your real domain (currently open for local development)

## Capacity
Built and tested against the numbers you gave: up to 600 providers, up to 50 categories. SQLite handles this scale comfortably with room to grow well beyond it before you'd need to consider a bigger database.
