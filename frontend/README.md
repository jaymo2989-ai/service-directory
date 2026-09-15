# Service Directory — Frontend

Plain HTML/CSS/JS — no build step, no framework. Every page talks to the backend via `fetch`.

## Pages
- `index.html` — homepage (search, categories, featured/top-rated/recent)
- `search.html` — full search with filters, sorting, pagination
- `provider.html?id=...` — provider detail, reviews, contact, favoriting
- `login.html` / `register.html` / `forgot-password.html` / `reset-password.html` / `verify-email.html` — customer account flow
- `dashboard.html` — customer's private area (profile, saved providers, inquiry history, account deletion request)
- `admin.html` — your admin panel (providers, categories, reviews, reports, inquiries, customers, FAQs/announcements)

## Before you run it: point it at your backend
Open `assets/js/api.js` and change the first line if needed:
```js
const API_BASE = window.API_BASE || 'http://localhost:3000/api';
```
Once your backend is deployed (Render/Railway), change this to your live URL, e.g. `https://your-app.onrender.com/api`.

## Running locally
Any static file server works — e.g. from this folder:
```
npx serve .
```
Or just open `index.html` directly in a browser (some browsers restrict `fetch` from `file://` — a local server avoids that).

## Deploying for free
Same options as your earlier site: **Netlify**, **Vercel**, **Cloudflare Pages**, or **GitHub Pages** — drag-and-drop this whole `frontend` folder (not just one file, since there are multiple pages now).

## Design notes
- Color and type system lives entirely in `assets/css/style.css` as CSS variables at the top — change the palette in one place.
- Category icons are inline SVG in `assets/js/api.js` (the `ICONS` object) — add more by adding an entry there and picking that icon name when creating a category in the admin panel.
- The admin panel (`admin.html`) is a single page with tab-based navigation — no separate page loads, so it stays fast even as you add more providers.

## What to test before sharing this with real customers
1. Log into `admin.html` with the credentials from your backend's `.env` and add 2-3 real providers with photos
2. Browse the homepage and search page to confirm they appear correctly
3. Create a customer account, leave a review, save a favorite, submit a quote request — confirm each shows up correctly in both the customer dashboard and the admin panel
4. Check the mobile view (resize your browser or open on your phone) — everything is responsive, but always worth a real look before launch
