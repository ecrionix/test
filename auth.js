const crypto = require('node:crypto');

const ITERATIONS = 100000;
const KEYLEN = 64;
const DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateResetToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateResetToken
};
