# Setline

Setline is a mobile-first, installable workout log for push, pull, legs, core, and cardio.

One workout can mix exercises from any category. It also supports per-set weight and reps, copy-down controls for both, cardio intervals and notes, current body weight, removable library exercises, previous-performance recall, and complete workout history.

The **Data** tab provides per-exercise analytics: an expanding working-weight chart, the latest weight used, complete set history, and compounded average monthly growth. Working weight is the highest weight logged for that exercise in each workout; repetitions do not affect the graph or growth rate.

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

Clearing the browser's site data also clears locally stored workouts unless a backup has been exported.
