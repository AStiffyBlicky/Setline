# Setline

Setline is a mobile-first, installable workout log for push, pull, legs, core, full-body, and cardio sessions.

One workout can include exercises from any category while keeping the workout type chosen at the start. It also supports per-set weight and reps (including assisted negative weights), remembered exercise defaults, copy-down controls for both, cardio intervals and notes, permanent exercise notes, current body weight, removable library exercises, previous-performance recall, and complete workout history.

The **Data** tab provides strength, cardio, and body-weight analytics. Strength analytics include an expanding working-weight chart, the latest weight used, complete set history, and monthly or biweekly growth. Cardio charts can show total interval time or interval count. Body-weight analytics include two-week percentage change plus lifetime low and high values. Graphs can show all time, the last 12 months, the last month, or an individual year.

History can be filtered by category, year, month, or an exact from/through date range. The app uses a light purple theme by default, with optional dark mode in Settings.

All app assets are included locally. Setline does not load third-party fonts, analytics, scripts, or other remote resources. Once installed and cached, it works without an internet connection.

## Use it on a phone

This is a static progressive web app. Publish the contents of this folder to any HTTPS static host (such as Netlify, Cloudflare Pages, or GitHub Pages), then open that URL on your phone.

- **iPhone:** Open the site in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** Open the site in Chrome and choose **Install app** or **Add to Home screen**.

For a local preview, serve this folder rather than opening the HTML file directly:

```powershell
python -m http.server 8123
```

Then open `http://127.0.0.1:8123`.

## Data and backups

Workout data is private to the device and browser where Setline is used. It does not require an account or send data to a server. Use **Library → Export backup** periodically; **Import backup** restores that JSON file on another device.

Clearing the browser's site data also clears locally stored workouts unless a backup has been exported. No browser-managed offline database can survive an intentional site-data deletion.
