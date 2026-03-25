# Fresh Start 🌿

A serene Firefox new tab extension that replaces the default new tab page with a beautiful full-screen photo, a personalised greeting, and a live clock.

## Features

- **Live clock** – updates every second in HH:MM format
- **Personalised greeting** – "Good morning / afternoon / evening, [nickname]" based on the time of day
- **Beautiful backgrounds** – fetches 3 random photos from Unsplash and caches them for 24 hours
- **Photo rotation** – click 🔄 to cycle through the 3 cached photos
- **Fallback photos** – works offline or without an API key using curated placeholder images
- **Privacy-first** – all data stored locally in the browser; no backend required
- **Zero dependencies** – pure HTML, CSS, and JavaScript

---

## Folder Structure

```
FreshStart/
├── manifest.json
├── src/
│   ├── newtab.html      # New tab page
│   ├── newtab.css
│   ├── newtab.js
│   ├── options.html     # Settings page
│   ├── options.css
│   └── options.js
├── assets/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
└── README.md
```

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajaygtm/FreshStart.git
   cd FreshStart
   ```

2. **Open Firefox** and navigate to `about:debugging#/runtime/this-firefox`

3. Click **"Load Temporary Add-on…"** and select the `manifest.json` file inside the cloned folder.

4. Open a new tab – you should see the Fresh Start page.

> **Tip:** The extension stays loaded until Firefox restarts. Re-load it via `about:debugging` after each restart while testing.

---

## Configuration

### Set your nickname
1. Click the **⚙️ Settings** button (top-right corner of the new tab page).
2. Type your name (max 8 characters) in the **Nickname** field.
3. Click **Save Settings**.

### Add your Unsplash API key
1. Visit [https://unsplash.com/developers](https://unsplash.com/developers) and create a free account.
2. Create a new application to get an **Access Key**.
3. Open Settings (⚙️), paste the key in the **Unsplash API Key** field, and save.
4. Click **Clear Cache & Refresh Photos** to immediately load photos with your key.

---

## How Caching Works

| localStorage key      | Description                                    |
|-----------------------|------------------------------------------------|
| `cached_photos`       | JSON array of 3 photo URLs                    |
| `last_refresh`        | Unix timestamp (ms) of the last API fetch     |
| `current_photo_index` | Index of the photo currently displayed        |
| `user_nickname`       | Your display name                              |
| `unsplash_api_key`    | Your Unsplash Access Key                       |

- On every new tab open the cache age is checked.
- If the cache is **younger than 24 hours**, the stored photos are used (no API call).
- If the cache is **older than 24 hours**, fresh photos are fetched and the cache is updated.
- If the API call fails (no key, network error), 3 built-in fallback photos are used.
- Clicking 🔄 cycles through the 3 cached photos without making any new API requests.

---

## Greeting Logic

| Time of Day       | Greeting          |
|-------------------|-------------------|
| 05:00 – 11:59     | Good morning      |
| 12:00 – 17:59     | Good afternoon    |
| 18:00 – 04:59     | Good evening      |

---

## Testing Checklist

- [ ] Load the extension via `about:debugging`
- [ ] Open a new tab – greeting, clock, and photo display correctly
- [ ] Clock updates every second
- [ ] Greeting changes with the time of day
- [ ] Click ⚙️ – settings page opens
- [ ] Save a nickname – greeting updates on next new tab open
- [ ] Save an Unsplash API key, clear cache – new photos load
- [ ] Click 🔄 – photo cycles through the 3 cached photos
- [ ] Close and reopen Firefox, load the add-on, open a new tab – cached photo still shows
- [ ] Remove the API key, clear cache – fallback photos display
- [ ] Check the browser console (`F12`) for unexpected errors

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| New tab still shows Firefox default | Make sure the extension is loaded in `about:debugging` and no other "new tab" extension is active |
| Photos not loading | Check your Unsplash API key in Settings; open the console and look for network errors |
| Greeting shows "User" | Open Settings and save your nickname |
| Old photos keep showing | Click "Clear Cache & Refresh Photos" in Settings |

---

## Future Features

- [ ] Multi-source photo providers (Pexels, Pixabay)
- [ ] Custom background upload
- [ ] Widget: weather, tasks / to-do list
- [ ] Theme toggle (dark / light overlay intensity)
- [ ] Keyboard shortcut to refresh photo
- [ ] Favourite photos

---

## License

MIT © [ajaygtm](https://github.com/ajaygtm)
