/**
 * Database — plain JSON file storage (no native compilation required).
 * Swapped from better-sqlite3 to avoid needing Visual Studio Build Tools
 * on Windows. Fine for the scale described (≤600 providers, ≤50 categories).
 * Runs automatically on server start; safe to re-run.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
require('dotenv').config();

const DB_PATH = path.join(__dirname, 'directory.json');

const DEFAULT_DB = {
  users: [],
  admins: [],
  categories: [],
  providers: [],
  reviews: [],
  favorites: [],
  inquiries: [],
  reports: [],
  faqs: [],
  announcements: []
};

function ensureFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function read() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function write(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---------- Seed on first run ----------
ensureFile();
const db = read();

if (db.categories.length === 0) {
  const seedCategories = [
    ['Home Repairs & Maintenance', 'home-repairs', 'wrench'],
    ['Plumbing', 'plumbing', 'droplet'],
    ['Electrical Services', 'electrical', 'bolt'],
    ['Cleaning & Laundry', 'cleaning-laundry', 'sparkles'],
    ['Construction & Renovation', 'construction', 'hammer'],
    ['Painting & Decoration', 'painting', 'paint'],
    ['Carpentry & Furniture', 'carpentry', 'saw'],
    ['Moving & Transportation', 'moving', 'truck'],
    ['Beauty & Personal Care', 'beauty', 'scissors'],
    ['Photography & Videography', 'photography', 'camera'],
    ['Computer & IT Support', 'it-support', 'computer'],
    ['Graphic Design & Digital', 'graphic-design', 'pen'],
    ['Tutoring & Education', 'tutoring', 'book'],
    ['Events & Catering', 'events-catering', 'utensils'],
    ['Gardening & Landscaping', 'gardening', 'leaf'],
    ['Automotive Services', 'automotive', 'car'],
    ['Professional & Business Services', 'professional-services', 'briefcase']
  ];
  seedCategories.forEach(([name, slug, icon], i) => {
    db.categories.push({ id: uuid(), name, slug, icon, parent_id: null, sort_order: i, created_at: new Date().toISOString() });
  });
}

const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-now';
if (!db.admins.find(a => a.email === adminEmail)) {
  db.admins.push({
    id: uuid(),
    email: adminEmail,
    password_hash: bcrypt.hashSync(adminPassword, 12),
    created_at: new Date().toISOString()
  });
  console.log(`Admin account created: ${adminEmail}`);
}

if (db.faqs.length === 0) {
  db.faqs.push(
    { id: uuid(), question: 'How are providers vetted?', answer: 'Every provider is personally reviewed and approved by the platform owner before appearing on the site — nobody can list themselves.', sort_order: 0 },
    { id: uuid(), question: 'Is it free to search for a provider?', answer: 'Yes, browsing and contacting providers is completely free for customers.', sort_order: 1 },
    { id: uuid(), question: 'How do I get listed as a provider?', answer: "Contact the owner directly using the details in the footer — listings are added after a short conversation and a one-time or monthly fee.", sort_order: 2 }
  );
}

write(db);
console.log('Database ready.');

module.exports = { read, write };
