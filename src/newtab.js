/**
 * Fresh Start – New Tab Script
 *
 * localStorage keys
 *   cached_photos        JSON array of photo URLs
 *   last_refresh         Unix timestamp (ms) of last API fetch
 *   current_photo_index  Index of the currently displayed photo
 *   user_nickname        User's display name (max 8 chars)
 *   unsplash_api_key     Unsplash access key
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const PHOTO_COUNT = 3;
const UNSPLASH_ENDPOINT = 'https://api.unsplash.com/photos/random';
const IMG_PARAMS = '?w=1920&h=1080&fit=crop';

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e' + IMG_PARAMS,
  'https://images.unsplash.com/photo-1501854140801-50d01698950b' + IMG_PARAMS,
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' + IMG_PARAMS,
];

// ── DOM references ───────────────────────────────────────────────────────────

const bgEl = document.getElementById('bg');
const greetingEl = document.getElementById('greeting');
const clockEl = document.getElementById('clock');
const settingsBtn = document.getElementById('settings-btn');
const refreshBtn = document.getElementById('refresh-btn');

// ── Clock & Greeting ─────────────────────────────────────────────────────────

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

function getNickname() {
  const saved = localStorage.getItem('user_nickname') || '';
  return saved.trim().slice(0, 8) || 'User';
}

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  clockEl.textContent = `${hh}:${mm}`;
}

function updateGreeting() {
  const hour = new Date().getHours();
  const tod = getTimeOfDay(hour);
  const name = getNickname();
  greetingEl.textContent = `Good ${tod}, ${name}`;
}

function startClock() {
  updateClock();
  updateGreeting();

  // Update clock every second
  setInterval(updateClock, 1000);

  // Update greeting every minute
  setInterval(updateGreeting, 60 * 1000);
}

// ── Photo caching ────────────────────────────────────────────────────────────

function getCachedPhotos() {
  try {
    return JSON.parse(localStorage.getItem('cached_photos')) || null;
  } catch {
    return null;
  }
}

function isCacheValid() {
  const ts = parseInt(localStorage.getItem('last_refresh'), 10);
  if (!ts) return false;
  return Date.now() - ts < CACHE_DURATION_MS;
}

function saveCache(photos) {
  localStorage.setItem('cached_photos', JSON.stringify(photos));
  localStorage.setItem('last_refresh', String(Date.now()));
  localStorage.setItem('current_photo_index', '0');
}

async function fetchPhotos() {
  const apiKey = localStorage.getItem('unsplash_api_key') || '';
  if (!apiKey) throw new Error('No API key');

  const url = `${UNSPLASH_ENDPOINT}?count=${PHOTO_COUNT}&client_id=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unsplash error ${res.status}`);

  const data = await res.json();
  return data.map((p) => p.urls.raw + IMG_PARAMS);
}

async function getPhotos() {
  if (isCacheValid()) {
    const cached = getCachedPhotos();
    if (cached && cached.length) return cached;
  }

  try {
    const photos = await fetchPhotos();
    saveCache(photos);
    return photos;
  } catch (err) {
    console.warn('Fresh Start: could not fetch photos, using fallbacks.', err);
    // Save fallbacks as cache so subsequent opens are fast
    const existing = getCachedPhotos();
    if (!existing || !existing.length) {
      saveCache(FALLBACK_PHOTOS);
    }
    return getCachedPhotos() || FALLBACK_PHOTOS;
  }
}

// ── Photo display ────────────────────────────────────────────────────────────

function showPhoto(url) {
  const img = new Image();
  img.onload = () => {
    bgEl.style.backgroundImage = `url("${url}")`;
    bgEl.classList.add('loaded');
  };
  img.onerror = () => {
    // If image fails, still show (CSS gradient will show)
    bgEl.classList.add('loaded');
  };
  img.src = url;
}

function getCurrentIndex() {
  return parseInt(localStorage.getItem('current_photo_index'), 10) || 0;
}

function advanceIndex(photos) {
  const next = (getCurrentIndex() + 1) % photos.length;
  localStorage.setItem('current_photo_index', String(next));
  return next;
}

async function initPhoto() {
  const photos = await getPhotos();
  const idx = getCurrentIndex();
  showPhoto(photos[Math.min(idx, photos.length - 1)]);
}

// ── Buttons ──────────────────────────────────────────────────────────────────

refreshBtn.addEventListener('click', async () => {
  const photos = getCachedPhotos() || FALLBACK_PHOTOS;
  bgEl.classList.remove('loaded');
  const next = advanceIndex(photos);
  // Small delay so the fade-out is visible
  setTimeout(() => showPhoto(photos[next]), 150);
});

settingsBtn.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

// ── Bootstrap ────────────────────────────────────────────────────────────────

startClock();
initPhoto();
