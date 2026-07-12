# Jigsaw Maker — deploy & analytics setup

## Analytics: Google Analytics 4

The app uses **GA4** (Measurement ID: `G-EJ22395JR7`). No images, text, or personal data are sent — only anonymous event names.

| Event | When it fires |
|---|---|
| `app_opened` | Someone opens the app |
| `photo_uploaded` | User selects a photo successfully |
| `puzzle_started` | User taps **Start** (includes `grid_choice`, e.g. `3x3`) |
| `puzzle_completed` | Last puzzle piece snaps into place |
| `decorate_done` | User taps **Save** on the Play screen (enters Decorate) |
| `share_clicked` | User taps **Share to Story** |
| `image_saved` | User successfully downloads the export |

> Events are **not** sent on `localhost` / `127.0.0.1` so local testing won’t pollute your data.

### View metrics in GA4

1. Go to [analytics.google.com](https://analytics.google.com)
2. **Reports → Engagement → Events** — see all custom events
3. **Reports → Acquisition → User acquisition** — active users

To mark events as key conversions: **Admin → Events → Mark as conversion**.

---

## Deploy to GitHub Pages

```bash
cd "/Users/pornnatcha/Downloads/Jigsaw Maker"
git init
git add .
git commit -m "Initial commit — Jigsaw Maker"
```

Create a repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/jigsaw-maker.git
git branch -M main
git push -u origin main
```

Enable **Settings → Pages → branch `main`**, folder `/ (root)`.

Your app will be live at: `https://YOUR_USERNAME.github.io/jigsaw-maker/`
