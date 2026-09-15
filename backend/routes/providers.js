const express = require('express');
const db = require('../db/init');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

function withCategory(provider, store) {
  const cat = store.categories.find(c => c.id === provider.category_id);
  return {
    ...provider,
    category_name: cat ? cat.name : '',
    category_slug: cat ? cat.slug : '',
    daysAvailable: provider.days_available || []
  };
}

router.get('/', (req, res) => {
  const store = db.read();
  const { q, category, town, area, priceMin, priceMax, minRating, verified, day, sort = 'relevance', page = 1, limit = 12 } = req.query;

  let results = store.providers.filter(p => p.status === 'approved');

  if (category) {
    const cat = store.categories.find(c => c.slug === category || c.id === category);
    if (cat) results = results.filter(p => p.category_id === cat.id);
    else results = [];
  }
  if (town) {
    const t = town.toLowerCase();
    results = results.filter(p => (p.location_town || '').toLowerCase().includes(t));
  }
  if (area) {
    const a = area.toLowerCase();
    results = results.filter(p => (p.service_area || '').toLowerCase().includes(a) || (p.location_estate || '').toLowerCase().includes(a));
  }
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(p => {
      const cat = store.categories.find(c => c.id === p.category_id);
      return p.name.toLowerCase().includes(query) || (p.bio || '').toLowerCase().includes(query) || (cat && cat.name.toLowerCase().includes(query));
    });
  }
  if (priceMin) results = results.filter(p => p.price_max == null || p.price_max >= Number(priceMin));
  if (priceMax) results = results.filter(p => p.price_min == null || p.price_min <= Number(priceMax));
  if (minRating) results = results.filter(p => (p.rating_avg || 0) >= Number(minRating));
  if (verified === 'true') results = results.filter(p => p.verified);
  if (day) results = results.filter(p => (p.days_available || []).includes(day));

  if (sort === 'rating') results.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0) || (b.rating_count || 0) - (a.rating_count || 0));
  else if (sort === 'price') results.sort((a, b) => (a.price_min || 0) - (b.price_min || 0));
  else if (sort === 'newest') results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else results.sort((a, b) => (b.featured - a.featured) || ((b.rating_avg || 0) - (a.rating_avg || 0)));

  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit) || 12));
  const total = results.length;
  const start = (pageNum - 1) * pageSize;
  const pageResults = results.slice(start, start + pageSize).map(p => withCategory(p, store));

  res.json({
    results: pageResults,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
  });
});

router.get('/featured', (req, res) => {
  const store = db.read();
  const rows = store.providers
    .filter(p => p.status === 'approved' && p.featured)
    .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
    .slice(0, 8)
    .map(p => withCategory(p, store));
  res.json(rows);
});

router.get('/top-rated', (req, res) => {
  const store = db.read();
  const rows = store.providers
    .filter(p => p.status === 'approved' && (p.rating_count || 0) >= 1)
    .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0) || (b.rating_count || 0) - (a.rating_count || 0))
    .slice(0, 8)
    .map(p => withCategory(p, store));
  res.json(rows);
});

router.get('/recent', (req, res) => {
  const store = db.read();
  const rows = store.providers
    .filter(p => p.status === 'approved')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)
    .map(p => withCategory(p, store));
  res.json(rows);
});

router.get('/:id', optionalAuth, (req, res) => {
  const store = db.read();
  const provider = store.providers.find(p => p.id === req.params.id && p.status === 'approved');
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const reviews = store.reviews
    .filter(r => r.provider_id === req.params.id && r.status === 'published')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(r => {
      const user = store.users.find(u => u.id === r.user_id);
      return {
        id: r.id, rating: r.rating, text: r.text, verified: r.verified,
        provider_response: r.provider_response, created_at: r.created_at,
        reviewer_name: user ? user.name : 'Former user'
      };
    });

  let isFavorited = false;
  if (req.user) {
    isFavorited = !!store.favorites.find(f => f.user_id === req.user.id && f.provider_id === req.params.id);
  }

  res.json({ ...withCategory(provider, store), reviews, isFavorited });
});

module.exports = router;
