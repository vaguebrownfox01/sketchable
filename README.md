# Sketchable

Sketchable is a local-first gallery app for sketch practice. It indexes your photo folders, extracts date/time from image names, and gives you a clean dark-mode UI for selecting references, running a timer, and tracking completed sketches.

## Features in v1

- Gallery view with thumbnails
- Search by filename, folder, and parsed date/time
- Date/time extraction from names like `IMG_20221103_194503.jpg`
- Available vs Sketched tabs
- Fullscreen image viewing
- Resizable two-pane layout on desktop
- Stopwatch controls (start, pause, stop)
- Mark image as sketched/available
- Persistent local state for sketch records

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

`http://localhost:3100`

## Notes

- The app scans this project directory recursively for image files.
- Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`.
- State is stored in `data/sketch-state.json`.
