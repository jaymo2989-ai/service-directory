const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/validators');

const router = express.Router();

function recalcRating(store, providerId) {
  const published = store.reviews.filter(r => r.provider_id === providerId && r.status === 'published');
  const provider = store.providers.find(p => p.id === providerId);
  if (!provider) return;
  provider.rating_count = published.length;
  provider.rating_avg = published.length ? published.reduce((sum, r) => sum + r.rating, 0) / published.length : 0;
}

router.post('/providers/:providerId/reviews', requireAuth, (req, res) => {
  const { providerId } = req.params;
  const rating = parseInt(req.body.rating);
  const text = sanitizeText(req.body.text || '');
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  const store = db.read();
  const provider = store.providers.find(p => p.id === providerId && p.status === 'approved');
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  if (store.reviews.find(r => r.provider_id === providerId && r.user_id === req.user.id)) {
    return res.status(409).json({ error: 'You have already reviewed this provider. You can edit your existing review instead.' });
  }

  const hasInquiry = !!store.inquiries.find(i => i.provider_id === providerId && i.user_id === req.user.id);

  const review = {
    id: uuid(), provider_id: providerId, user_id: req.user.id, rating, text,
    verified: hasInquiry, status: 'published', provider_response: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
  store.reviews.push(review);
  recalcRating(store, providerId);
  db.write(store);

  res.status(201).json({ message: 'Review submitted', id: review.id, verified: hasInquiry });
});

router.patch('/reviews/:id', requireAuth, (req, res) => {
  const store = db.read();
  const review = store.reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own review' });

  if (req.body.rating) review.rating = parseInt(req.body.rating);
  if (req.body.text !== undefined) review.text = sanitizeText(req.body.text);
  review.updated_at = new Date().toISOString();

  recalcRating(store, review.provider_id);
  db.write(store);
  res.json({ message: 'Review updated' });
});

router.delete('/reviews/:id', requireAuth, (req, res) => {
  const store = db.read();
  const review = store.reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own review' });

  store.reviews = store.reviews.filter(r => r.id !== req.params.id);
  recalcRating(store, review.provider_id);
  db.write(store);
  res.json({ message: 'Review deleted' });
});

module.exports = router;
