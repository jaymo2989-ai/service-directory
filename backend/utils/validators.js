const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^2547\d{8}$|^2541\d{8}$/; // Kenyan format: 2547XXXXXXXX or 2541XXXXXXXX

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function isValidKenyanPhone(phone) {
  return typeof phone === 'string' && PHONE_RE.test(phone.trim());
}

function isStrongEnoughPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8;
}

/** Strips tags/scripts from free-text fields before storing — basic XSS mitigation. */
function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

module.exports = { isValidEmail, isValidKenyanPhone, isStrongEnoughPassword, sanitizeText };
