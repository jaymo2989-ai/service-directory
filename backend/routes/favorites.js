const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const store = db.read();
  const rows = store.favorites
    .filter(f => f.user_id === req.user.id)
    .map(f => {
      const provider = store.providers.find(p => p.id === f.provider_id && p.status === 'approved');
      if (!provider) return null;
      const cat = store.categories.find(c => c.id === provider.category_id);
      return { ...provider, category_name: cat ? cat.name : '' };
    })
    .filter(Boolean);
  res.json(rows);
});

router.post('/:providerId', requireAuth, (req, res) => {
  const store = db.read();
  const provider = store.providers.find(p => p.id === req.params.providerId && p.status === 'approved');
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  if (store.favorites.find(f => f.user_id === req.user.id && f.provider_id === req.params.providerId)) {
    return res.json({ message: 'Already saved' });
  }

  store.favorites.push({ id: uuid(), user_id: req.user.id, provider_id: req.params.providerId, created_at: new Date().toISOString() });
  db.write(store);
  res.status(201).json({ message: 'Saved to favorites' });
});

router.delete('/:providerId', requireAuth, (req, res) => {
  const store = db.read();
  store.favorites = store.favorites.filter(f => !(f.user_id === req.user.id && f.provider_id === req.params.providerId));
  db.write(store);
  res.json({ message: 'Removed from favorites' });
});

module.exports = router;
