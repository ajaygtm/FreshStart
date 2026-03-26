/**
 * Fresh Start – New Tab Script
 *
 * localStorage keys
 *   cached_photos           JSON array of {url, author, authorUrl} objects
 *   last_refresh            Unix timestamp (ms) of last API fetch
 *   current_photo_index     Index of the currently displayed photo
 *   user_nickname           User's display name (max 8 chars)
 *   unsplash_api_key        Unsplash access key
 *   unsplash_collection_id  Optional Unsplash collection ID
 *   user_location           {latitude, longitude} from Geolocation API
 *   cached_weather          {temperature, weather_code, location_name}
 *   last_weather_update     Unix timestamp (ms) of last weather fetch
 *   user_todos              JSON array of {id, text, completed, created_at}
 */

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const WEATHER_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const TEMPERATURE_UNIT = 'fahrenheit'; // change to 'celsius' if preferred
const PHOTO_COUNT = 3;
const UNSPLASH_ENDPOINT = 'https://api.unsplash.com/photos/random';
const UNSPLASH_COLLECTION_ENDPOINT = 'https://api.unsplash.com/collections';
const COLLECTION_PHOTO_COUNT = 20;
const IMG_PARAMS = '?w=1920&h=1080&fit=crop';
const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const REVERSE_GEOCODE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

// Each photo is stored as {url, author, authorUrl} – author/authorUrl are null for fallbacks
const FALLBACK_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e' + IMG_PARAMS, author: null, authorUrl: null },
  { url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b' + IMG_PARAMS, author: null, authorUrl: null },
  { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' + IMG_PARAMS, author: null, authorUrl: null },
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
const popupCollectionInput = document.getElementById('popup-collection-id');
const popupSaveBtn = document.getElementById('popup-save-btn');
const photoCreditEl = document.getElementById('photo-credit');
const photoCreditAuthorEl = document.getElementById('photo-credit-author');
const todoBtn = document.getElementById('todo-btn');
const todoCountBadge = document.getElementById('todo-count');
const todoPopup = document.getElementById('todo-popup');
const todoListEl = document.getElementById('todo-list');
const todoInput = document.getElementById('todo-input');
const todoAddBtn = document.getElementById('todo-add-btn');

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
    const data = JSON.parse(localStorage.getItem('cached_photos'));
    if (!data || !data.length) return null;
    // Backward compat: old format was a plain string[]
    if (typeof data[0] === 'string') {
      return data.map((url) => ({ url, author: null, authorUrl: null }));
    }
    return data;
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

  const collectionId = (localStorage.getItem('unsplash_collection_id') || '').trim();
  let url;
  if (collectionId) {
    url = `${UNSPLASH_COLLECTION_ENDPOINT}/${encodeURIComponent(collectionId)}/photos` +
          `?page=1&per_page=${COLLECTION_PHOTO_COUNT}&order_by=latest&client_id=${encodeURIComponent(apiKey)}`;
  } else {
    url = `${UNSPLASH_ENDPOINT}?count=${PHOTO_COUNT}&client_id=${encodeURIComponent(apiKey)}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unsplash error ${res.status}`);

  const data = await res.json();
  return data.map((p) => ({
    url: p.urls.raw + IMG_PARAMS,
    author: p.user?.name || null,
    authorUrl: p.user?.links?.html
      ? `${p.user.links.html}?utm_source=freshstart&utm_medium=referral`
      : null,
  }));
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

/** Updates the photographer credit overlay. Hides it when author is unknown. */
function updatePhotoCredit(author, authorUrl) {
  if (!author) {
    photoCreditEl.hidden = true;
    return;
  }
  photoCreditAuthorEl.textContent = author;
  photoCreditAuthorEl.href = authorUrl || 'https://unsplash.com/?utm_source=freshstart&utm_medium=referral';
  photoCreditEl.hidden = false;
}

/** Displays a photo object {url, author, authorUrl} as the background. */
function showPhoto(photo) {
  const img = new Image();
  img.onload = () => {
    bgEl.style.backgroundImage = `url("${photo.url}")`;
    bgEl.classList.add('loaded');
    updatePhotoCredit(photo.author, photo.authorUrl);
  };
  img.onerror = () => {
    bgEl.classList.add('loaded');
    updatePhotoCredit(null, null);
  };
  img.src = photo.url;
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
  popupCollectionInput.value = localStorage.getItem('unsplash_collection_id') || '';
  settingsPopup.hidden = false;
  popupNicknameInput.focus();
}

function closeSettingsPopup() {
  settingsPopup.hidden = true;
}

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (settingsPopup.hidden) {
    closeTodoPopup();
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

  const newCollectionId = popupCollectionInput.value.trim();
  const oldCollectionId = localStorage.getItem('unsplash_collection_id') || '';
  if (newCollectionId !== oldCollectionId) {
    localStorage.setItem('unsplash_collection_id', newCollectionId);
    // Clear photo cache so the next open fetches from the new collection
    localStorage.removeItem('cached_photos');
    localStorage.removeItem('last_refresh');
    localStorage.setItem('current_photo_index', '0');
    initPhoto();
  }

  popupSaveBtn.textContent = 'Saved ✓';
  popupSaveBtn.disabled = true;
  setTimeout(() => {
    popupSaveBtn.textContent = 'Save';
    popupSaveBtn.disabled = false;
    closeSettingsPopup();
  }, 800);
});

popupNicknameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') popupSaveBtn.click();
  if (e.key === 'Escape') closeSettingsPopup();
});

popupCollectionInput.addEventListener('keydown', (e) => {
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

refreshBtn.addEventListener('click', () => {
  const photos = getCachedPhotos() || FALLBACK_PHOTOS;
  bgEl.classList.remove('loaded');
  const next = advanceIndex(photos);
  // Small delay so the fade-out is visible
  setTimeout(() => showPhoto(photos[next]), 150);
});

// ── To-Do ─────────────────────────────────────────────────────────────────────

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem('user_todos')) || [];
  } catch {
    return [];
  }
}

function saveTodosData(todos) {
  localStorage.setItem('user_todos', JSON.stringify(todos));
}

function updateTodoCount() {
  const count = loadTodos().filter((t) => !t.completed).length;
  todoCountBadge.textContent = count > 0 ? String(count) : '';
  todoCountBadge.hidden = count === 0;
}

function createEditInput(li, todo) {
  const span = li.querySelector('.todo-text');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-text-input';
  input.value = todo.text;
  input.maxLength = 200;
  span.replaceWith(input);
  input.focus();
  input.select();

  function commitEdit() {
    const newText = input.value.trim();
    if (newText && newText !== todo.text) {
      saveTodosData(loadTodos().map((t) => t.id === todo.id ? { ...t, text: newText } : t));
    }
    renderTodos();
  }

  input.addEventListener('blur', commitEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') {
      e.stopPropagation(); // don't close the popup
      input.removeEventListener('blur', commitEdit);
      renderTodos();
    }
  });
}

function renderTodos() {
  const todos = loadTodos();
  todoListEl.innerHTML = '';
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => {
      saveTodosData(loadTodos().map((t) => t.id === todo.id ? { ...t, completed: checkbox.checked } : t));
      updateTodoCount();
      renderTodos();
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text' + (todo.completed ? ' todo-text--done' : '');
    textSpan.textContent = todo.text;
    textSpan.addEventListener('click', () => createEditInput(li, todo));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'todo-delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => {
      saveTodosData(loadTodos().filter((t) => t.id !== todo.id));
      updateTodoCount();
      renderTodos();
    });

    li.append(checkbox, textSpan, deleteBtn);
    todoListEl.appendChild(li);
  });
  updateTodoCount();
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const todos = loadTodos();
  todos.push({ id: crypto.randomUUID(), text: trimmed, completed: false, created_at: Date.now() });
  saveTodosData(todos);
  renderTodos();
}

function openTodoPopup() {
  renderTodos();
  todoPopup.hidden = false;
  todoInput.focus();
}

function closeTodoPopup() {
  todoPopup.hidden = true;
}

todoBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (todoPopup.hidden) {
    closeSettingsPopup();
    openTodoPopup();
  } else {
    closeTodoPopup();
  }
});

todoAddBtn.addEventListener('click', () => {
  addTodo(todoInput.value);
  todoInput.value = '';
  todoInput.focus();
});

todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { addTodo(todoInput.value); todoInput.value = ''; }
  if (e.key === 'Escape') closeTodoPopup();
});

document.addEventListener('click', (e) => {
  if (!todoPopup.hidden && !todoPopup.contains(e.target) && !todoBtn.contains(e.target)) {
    closeTodoPopup();
  }
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
updateTodoCount();
