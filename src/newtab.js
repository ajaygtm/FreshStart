/**
 * Fresh Start – New Tab Script
 *
 * localStorage keys
 *   cached_photos        JSON array of photo URLs
 *   last_refresh         Unix timestamp (ms) of last API fetch
 *   current_photo_index  Index of the currently displayed photo
 *   user_nickname        User's display name (max 8 chars)
 *   unsplash_api_key     Unsplash access key
 *   user_location        {latitude, longitude} from Geolocation API
 *   cached_weather       {temperature, weather_code, location_name}
 *   last_weather_update  Unix timestamp (ms) of last weather fetch
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const WEATHER_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const TEMPERATURE_UNIT = 'fahrenheit'; // change to 'celsius' if preferred
const PHOTO_COUNT = 3;
const UNSPLASH_ENDPOINT = 'https://api.unsplash.com/photos/random';
const IMG_PARAMS = '?w=1920&h=1080&fit=crop';
const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const REVERSE_GEOCODE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e' + IMG_PARAMS,
  'https://images.unsplash.com/photo-1501854140801-50d01698950b' + IMG_PARAMS,
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' + IMG_PARAMS,
];

// ── DOM references ───────────────────────────────────────────────────────────

const bgEl = document.getElementById('bg');
const greetingEl = document.getElementById('greeting');
const clockEl = document.getElementById('clock');
const weatherEl = document.getElementById('weather');
const settingsBtn = document.getElementById('settings-btn');
const refreshBtn = document.getElementById('refresh-btn');
const settingsPopup = document.getElementById('settings-popup');
const popupNicknameInput = document.getElementById('popup-nickname');
const popupNicknameCount = document.getElementById('popup-nickname-count');
const popupSaveBtn = document.getElementById('popup-save-btn');

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

// ── Settings popup ───────────────────────────────────────────────────────────

function openSettingsPopup() {
  popupNicknameInput.value = localStorage.getItem('user_nickname') || '';
  popupNicknameCount.textContent = `${popupNicknameInput.value.trim().slice(0, 8).length}/8`;
  settingsPopup.hidden = false;
  popupNicknameInput.focus();
}

function closeSettingsPopup() {
  settingsPopup.hidden = true;
}

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (settingsPopup.hidden) {
    openSettingsPopup();
  } else {
    closeSettingsPopup();
  }
});

popupNicknameInput.addEventListener('input', () => {
  popupNicknameCount.textContent = `${popupNicknameInput.value.trim().slice(0, 8).length}/8`;
});

popupSaveBtn.addEventListener('click', () => {
  const nickname = popupNicknameInput.value.trim().slice(0, 8);
  localStorage.setItem('user_nickname', nickname);
  updateGreeting();
  closeSettingsPopup();
});

popupNicknameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') popupSaveBtn.click();
  if (e.key === 'Escape') closeSettingsPopup();
});

// Close popup when clicking outside of it
document.addEventListener('click', (e) => {
  if (!settingsPopup.hidden && !settingsPopup.contains(e.target) && !settingsBtn.contains(e.target)) {
    closeSettingsPopup();
  }
});

// ── Buttons ──────────────────────────────────────────────────────────────────

refreshBtn.addEventListener('click', async () => {
  const photos = getCachedPhotos() || FALLBACK_PHOTOS;
  bgEl.classList.remove('loaded');
  const next = advanceIndex(photos);
  // Small delay so the fade-out is visible
  setTimeout(() => showPhoto(photos[next]), 150);
});

// ── Weather ───────────────────────────────────────────────────────────────────

/**
 * Maps an Open-Meteo WMO weather interpretation code to an emoji.
 * Full code list: https://open-meteo.com/en/docs#weathervariables
 */
function weatherCodeToEmoji(code) {
  if (code === 0)                    return '☀️';
  if (code <= 2)                     return '🌤️';
  if (code === 3)                    return '☁️';
  if (code === 45 || code === 48)    return '🌫️';
  if (code >= 51 && code <= 55)      return '🌦️';
  if (code >= 61 && code <= 65)      return '🌧️';
  if (code >= 71 && code <= 77)      return '❄️';
  if (code >= 80 && code <= 82)      return '🌦️';
  if (code === 85 || code === 86)    return '🌨️';
  return '⛈️'; // 95, 96, 99 – thunderstorm
}

function isWeatherCacheValid() {
  const ts = parseInt(localStorage.getItem('last_weather_update'), 10);
  if (!ts) return false;
  return Date.now() - ts < WEATHER_CACHE_DURATION_MS;
}

function getCachedWeather() {
  try {
    return JSON.parse(localStorage.getItem('cached_weather')) || null;
  } catch {
    return null;
  }
}

function saveWeatherCache(data) {
  localStorage.setItem('cached_weather', JSON.stringify(data));
  localStorage.setItem('last_weather_update', String(Date.now()));
}

/** Resolves with {latitude, longitude}. Reads from cache or prompts the user. */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    try {
      const cached = JSON.parse(localStorage.getItem('user_location'));
      if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number' &&
        cached.latitude >= -90 && cached.latitude <= 90 &&
        cached.longitude >= -180 && cached.longitude <= 180) {
        resolve(cached);
        return;
      }
    } catch { /* ignore parse errors */ }

    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        localStorage.setItem('user_location', JSON.stringify(coords));
        resolve(coords);
      },
      (err) => reject(err),
      { timeout: 10000 }
    );
  });
}

/** Returns a city/locality name for the given coordinates, or null on failure. */
async function getLocationName(lat, lon) {
  try {
    const url = `${REVERSE_GEOCODE_ENDPOINT}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocode error ${res.status}`);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || null;
  } catch (err) {
    console.warn('Fresh Start: reverse geocode failed.', err);
    return null;
  }
}

/** Fetches current weather from Open-Meteo. Returns {temperature, weather_code}. */
async function fetchWeather(lat, lon) {
  const url =
    `${OPEN_METEO_ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code&temperature_unit=${TEMPERATURE_UNIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  const data = await res.json();
  if (!data.current || data.current.temperature_2m == null || data.current.weather_code == null) {
    throw new Error('Unexpected weather API response structure');
  }
  return {
    temperature: Math.round(data.current.temperature_2m),
    weather_code: data.current.weather_code,
  };
}

function displayWeather(data) {
  const unit = TEMPERATURE_UNIT === 'celsius' ? '°C' : '°F';
  const emoji = weatherCodeToEmoji(data.weather_code);
  const location = data.location_name ? ` • ${data.location_name}` : '';
  weatherEl.textContent = `${emoji} ${data.temperature}${unit}${location}`;
  weatherEl.classList.remove('weather--loading', 'weather--error');
}

async function initWeather() {
  weatherEl.textContent = '📍 Loading weather…';

  // Show valid cached weather immediately without fetching
  if (isWeatherCacheValid()) {
    const cached = getCachedWeather();
    if (cached) {
      displayWeather(cached);
      return;
    }
  }

  try {
    const { latitude, longitude } = await getUserLocation();
    const [weatherData, locationName] = await Promise.all([
      fetchWeather(latitude, longitude),
      getLocationName(latitude, longitude),
    ]);
    const data = { ...weatherData, location_name: locationName };
    saveWeatherCache(data);
    displayWeather(data);
  } catch (err) {
    console.warn('Fresh Start: weather unavailable.', err);
    weatherEl.classList.add('weather--error');
    weatherEl.classList.remove('weather--loading');
    // GeolocationPositionError.PERMISSION_DENIED === 1
    if (err && err.code === 1) {
      weatherEl.textContent = '📍 Location access denied';
    } else {
      weatherEl.textContent = '⚠️ Weather unavailable';
    }
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

startClock();
initPhoto();
initWeather();
