/**
 * Email sending — NOT connected to a real provider yet.
 *
 * To go live: sign up for SendGrid, Mailgun, or AWS SES (all have free
 * tiers big enough for this), install their SDK, and replace the body of
 * `sendEmail` below with their send call. Nothing else in the codebase
 * needs to change — every route just calls sendEmail(to, subject, body).
 *
 * Until then, emails are printed to the server console so verification
 * and password-reset links are still usable during setup and testing —
 * copy the link from the console/logs and open it manually.
 */

async function sendEmail(to, subject, body) {
  console.log('\n--- EMAIL (not actually sent — see utils/email.js) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
  console.log('--- END EMAIL ---\n');
  return true;
}

module.exports = { sendEmail };
