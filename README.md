# sketchable

sketchable is a local-first sketch reference app. it indexes your image folders, extracts date/time from filenames, and gives you a modern dark ui for finding references, timing sketch sessions, and tracking progress.

## current features (v1 + v2)

### gallery and filtering
- thumbnail gallery with search
- month-based filters (`all`, `jan` ... `dec`, `undated`)
- available vs sketched tabs
- date-first card labels for quick browsing
- random image pick with animation

### sketch workflow
- start / pause / stop timer
- free mode and drill mode
- drill presets + custom duration + rounds
- auto-next option after stop
- focus modal for distraction-free reference view

### queue and navigation
- add selected image to queue
- compact queue list with thumbnails
- queue reorder with up/down controls
- queue prev/next navigation

### tracking and insights
- persistent local state in `data/sketch-state.json`
- per-image sketch status + duration + history
- timeline modal with mode/month filters
- dashboard modal with summary stats and activity bars

### keyboard shortcuts
- `space`: start/pause
- `s`: stop
- `q`: add selected image to queue
- `n` / `p`: queue next / prev
- `r`: random image
- `f`: open focus view
- `t`: open timeline
- `d`: open dashboard
- `esc`: close open modals

## run locally

1. install dependencies

```bash
npm install
```

2. start server

```bash
npm start
```

3. open app

`http://localhost:3100`

## run in production mode

use this for lan access and production-like behavior (compression, caching, explicit host bind):

```bash
npm run start:prod
```

then open from another device on your network (example):

`http://192.168.1.42:3100`

optional process manager (pm2):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

## notes

- image scanning is recursive from the project root.
- supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`.
- excluded folders include `cwooks`, `node_modules`, `public`, `data`, and `.git`.
- state schema includes settings, queue, sessions, and per-image records.

> opencode -s ses_2a7b327b7ffegnVySESOny1zCW