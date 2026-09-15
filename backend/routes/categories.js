const express = require('express');
const db = require('../db/init');

const router = express.Router();

router.get('/', (req, res) => {
  const store = db.read();
  const countApproved = (catId) => store.providers.filter(p => p.category_id === catId && p.status === 'approved').length;

  const topLevel = store.categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const result = topLevel.map(cat => ({
    ...cat,
    providerCount: countApproved(cat.id),
    subcategories: store.categories
      .filter(c => c.parent_id === cat.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(sub => ({ ...sub, providerCount: countApproved(sub.id) }))
  }));

  res.json(result);
});

router.get('/:slug', (req, res) => {
  const store = db.read();
  const category = store.categories.find(c => c.slug === req.params.slug);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
});

module.exports = router;
