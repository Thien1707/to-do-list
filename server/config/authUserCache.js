'use strict';

const TTL_MS = parseInt(process.env.AUTH_USER_CACHE_TTL_MS, 10) || 90_000;
const cache = new Map();

function getCachedUser(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.user;
}

function setCachedUser(user) {
  if (!user?.id) return;
  cache.set(user.id, { at: Date.now(), user });
}

function invalidateAuthUser(userId) {
  if (userId) cache.delete(userId);
}

module.exports = { getCachedUser, setCachedUser, invalidateAuthUser };
