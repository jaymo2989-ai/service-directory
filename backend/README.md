# Service Directory — Backend

An owner-managed local services directory API. You (the admin) are the only one who can add, edit, approve, or remove provider listings — customers browse, search, review, save favorites, and contact providers, but never self-list.

## Setup

```
npm install
cp .env.example .env
```
Edit `.env`: set `JWT_SECRET`, `ADMIN_JWT_SECRET` (any long random strings), and your real `ADMIN_EMAIL` / `ADMIN_PASSWORD` — this creates your first admin login on first run.

```
npm start
```
The database (`db/directory.json`) is created automatically the first time the server runs, seeded with the categories from your spec and your admin account.

Server runs at `http://localhost:3000`. Health check: `GET /api/health`.

## Architecture at a glance

- **Database:** a plain JSON file (`db/directory.json`), read and written directly by Node — no database server, no native modules to compile, works the same on Windows/Mac/Linux with just `npm install`. More than sufficient for ≤600 providers / ≤50 categories.
- **Auth:** JWT tokens. Customers and admins have completely separate login systems (`/api/auth/*` vs `/api/admin/login`) with different secrets, so an admin token can never be used on a customer endpoint or vice versa.
- **Passwords:** hashed with bcrypt (cost factor 12), never stored or logged in plain text.
- **File uploads:** provider photos via `multer`, validated by type and capped at 3MB, stored in `/uploads`.
- **Rate limiting:** three tiers — strict on auth endpoints (brute-force protection), moderate on reviews/inquiries/reports (spam prevention), loose baseline on everything else.
- **Input sanitization:** free-text fields are stripped of HTML tags before storage.
- **Security headers:** `helmet` is applied globally.

## Full endpoint reference

### Public
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/categories` | Categories + subcategories, each with a live provider count |
| GET | `/api/providers` | Search — see query params below |
| GET | `/api/providers/featured` | Homepage: featured providers |
| GET | `/api/providers/top-rated` | Homepage: highest rated |
| GET | `/api/providers/recent` | Homepage: recently added |
| GET | `/api/providers/:id` | Full detail + published reviews |
| POST | `/api/providers/:id/inquiries` | Quote request / call-click / WhatsApp-click logging |
| POST | `/api/reports` | Report a provider or review |
| GET | `/api/content/faqs` | FAQ list |
| GET | `/api/content/announcement` | Active site banner, if any |
| GET | `/api/content/owner` | Owner contact info for the footer |

**Search params on `GET /api/providers`:** `q`, `category` (slug), `town`, `area`, `priceMin`, `priceMax`, `minRating`, `verified=true`, `day`, `sort` (`relevance`/`rating`/`price`/`newest`), `page`, `limit`.

### Customer (requires `Authorization: Bearer <token>` from `/api/auth/login`)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` / `/login` / `/verify-email` / `/forgot-password` / `/reset-password` | Account lifecycle |
| GET/PATCH/DELETE | `/api/auth/me` | Profile view/edit/deletion request |
| POST/PATCH/DELETE | `/api/providers/:id/reviews`, `/api/reviews/:id` | Reviews |
| GET/POST/DELETE | `/api/favorites`, `/api/favorites/:id` | Saved providers |
| GET | `/api/inquiries/mine` | Your inquiry history |

### Admin (requires `Authorization: Bearer <token>` from `/api/admin/login`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard overview |
| GET/POST/PATCH/DELETE | `/api/admin/providers*` | Full provider management (image upload on POST/PATCH via `multipart/form-data`, field name `image`) |
| GET/POST/PATCH/DELETE | `/api/admin/categories*` | Category & subcategory management (50-category cap enforced) |
| GET/PATCH | `/api/admin/reviews*` | Moderate, remove, or respond to reviews on a provider's behalf |
| GET/PATCH | `/api/admin/reports*` | Handle abuse reports |
| GET/PATCH | `/api/admin/inquiries*` | View all customer inquiries |
| GET/PATCH/DELETE | `/api/admin/users*` | Manage customer accounts, process deletion requests |
| POST/DELETE | `/api/admin/faqs*`, `/api/admin/announcements*` | Site content |

## Before real launch — three things to plug in

1. **Email delivery** — `utils/email.js` currently logs emails to the console instead of sending them. Sign up for SendGrid/Mailgun/SES (all free at this scale) and replace the function body — nothing else changes.
2. **Cloud image storage** — `/uploads` is local disk, which most free hosts wipe on redeploy. Swap `middleware/upload.js` for a Cloudinary or S3 integration before you're relying on it for real listings.
3. **CORS** — currently wide open (`app.use(cors())`) for easy local development. Restrict it to your actual frontend domain before going live: `cors({ origin: 'https://yourdomain.com' })`.

## Deploying

Same approach as your other backend: push to GitHub, deploy on Render or Railway free tier, set the environment variables from `.env` in their dashboard, build command `npm install`, start command `npm start`.
