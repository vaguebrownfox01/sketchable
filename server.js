const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3100;

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const STATE_FILE = path.join(DATA_DIR, "sketch-state.json");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const EXCLUDED_DIRS = new Set(["node_modules", "public", "data", ".git", "cwooks"]);
const FILENAME_DATE_REGEX = /^IMG_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i;

const DEFAULT_SETTINGS = {
  autoAdvance: true,
  soundEnabled: false,
  defaultDrillSeconds: 120,
};

app.use(express.json());

function createImageId(relativePath) {
  return crypto.createHash("sha1").update(relativePath).digest("hex").slice(0, 16);
}

function createSessionId() {
  return crypto.randomBytes(8).toString("hex");
}

function toIsoLocalFromParts(parts) {
  const [year, month, day, hour, minute, second] = parts.map((value) => Number(value));
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function parseDateFromFileName(fileName) {
  const match = fileName.match(FILENAME_DATE_REGEX);
  if (!match) {
    return null;
  }

  const isoDateTime = toIsoLocalFromParts(match.slice(1, 7));
  if (!isoDateTime) {
    return null;
  }

  return {
    isoDateTime,
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}:${match[6]}`,
  };
}

async function walkDirectory(dirPath, rootPath, output) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      await walkDirectory(fullPath, rootPath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }

    const relativePath = path.relative(rootPath, fullPath);
    const parsedDate = parseDateFromFileName(entry.name);

    output.push({
      id: createImageId(relativePath),
      relativePath,
      fileName: entry.name,
      folder: relativePath.split(path.sep)[0] || "",
      extension,
      parsedDate,
    });
  }
}

async function indexImages() {
  const images = [];
  await walkDirectory(ROOT_DIR, ROOT_DIR, images);

  images.sort((a, b) => {
    const aValue = a.parsedDate?.isoDateTime || "";
    const bValue = b.parsedDate?.isoDateTime || "";
    if (aValue && bValue) {
      return aValue < bValue ? 1 : -1;
    }
    return a.fileName.localeCompare(b.fileName);
  });

  return images;
}

function normalizeState(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  return {
    schemaVersion: 2,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(base.settings && typeof base.settings === "object" ? base.settings : {}),
    },
    queue: Array.isArray(base.queue) ? base.queue : [],
    sessions: Array.isArray(base.sessions) ? base.sessions : [],
    imageMeta: base.imageMeta && typeof base.imageMeta === "object" ? base.imageMeta : {},
    images: base.images && typeof base.images === "object" ? base.images : {},
  };
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const normalized = normalizeState(parsed);
    if (parsed.schemaVersion !== 2) {
      await saveState(normalized);
    }
    return normalized;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return normalizeState({});
  }
}

async function saveState(state) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function getElapsedMs(record) {
  const timer = record?.timer;
  if (!timer) {
    return 0;
  }

  const elapsed = Number(timer.elapsedMs || 0);
  if (!timer.isRunning || !timer.runningSince) {
    return elapsed;
  }

  return elapsed + Math.max(0, Date.now() - Number(timer.runningSince));
}

function withRecordDefaults(record) {
  return {
    isSketched: Boolean(record?.isSketched),
    sketchedAt: record?.sketchedAt || null,
    durationMs: Number(record?.durationMs || 0),
    history: Array.isArray(record?.history) ? record.history : [],
    timer: {
      isRunning: Boolean(record?.timer?.isRunning),
      runningSince: record?.timer?.runningSince || null,
      elapsedMs: Number(record?.timer?.elapsedMs || 0),
    },
  };
}

function mergeImageWithState(image, state) {
  const record = withRecordDefaults(state.images[image.id]);
  return {
    ...image,
    imageUrl: `/image/${encodeURIComponent(image.relativePath)}`,
    isSketched: record.isSketched,
    sketchedAt: record.sketchedAt,
    durationMs: record.durationMs,
    timer: {
      isRunning: record.timer.isRunning,
      elapsedMs: getElapsedMs(record),
    },
    history: record.history,
  };
}

function validateImage(imagesById, imageId) {
  if (!imageId || typeof imageId !== "string") {
    return { ok: false, error: "imageId is required" };
  }

  if (!imagesById.has(imageId)) {
    return { ok: false, error: "imageId not found" };
  }

  return { ok: true };
}

function pushSession({ state, image, imageId, durationMs, stoppedAt, mode, drillConfig }) {
  state.sessions.push({
    id: createSessionId(),
    imageId,
    imageFileName: image.fileName,
    imageDateTime: image.parsedDate?.isoDateTime || null,
    stoppedAt,
    durationMs,
    mode,
    drillConfig: drillConfig || null,
  });
}

function getQueueImageIds(state) {
  return state.queue.map((item) => item.imageId);
}

function findNeighborQueueImageId(state, currentId, direction = 1) {
  const queueIds = getQueueImageIds(state);
  if (!queueIds.length) {
    return null;
  }

  const index = queueIds.indexOf(currentId);
  if (index === -1) {
    return queueIds[0];
  }

  const nextIndex = (index + direction + queueIds.length) % queueIds.length;
  return queueIds[nextIndex];
}

app.get("/api/images", async (_req, res) => {
  try {
    const [images, state] = await Promise.all([indexImages(), loadState()]);
    const enriched = images.map((image) => mergeImageWithState(image, state));
    res.json({ images: enriched });
  } catch (error) {
    res.status(500).json({ error: "Failed to load images", detail: error.message });
  }
});

app.get("/api/state", async (_req, res) => {
  try {
    const state = await loadState();
    res.json({
      schemaVersion: state.schemaVersion,
      settings: state.settings,
      queue: state.queue,
      sessions: state.sessions,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load state", detail: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const state = await loadState();
    state.settings = {
      ...state.settings,
      ...req.body,
    };
    await saveState(state);
    res.json({ ok: true, settings: state.settings });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings", detail: error.message });
  }
});

app.get("/api/queue", async (_req, res) => {
  try {
    const state = await loadState();
    res.json({ queue: state.queue });
  } catch (error) {
    res.status(500).json({ error: "Failed to load queue", detail: error.message });
  }
});

app.post("/api/queue/add", async (req, res) => {
  try {
    const images = await indexImages();
    const imagesById = new Map(images.map((item) => [item.id, item]));
    const imageId = req.body?.imageId;
    const validation = validateImage(imagesById, imageId);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const state = await loadState();
    if (!state.queue.some((item) => item.imageId === imageId)) {
      state.queue.push({ imageId, addedAt: new Date().toISOString() });
      await saveState(state);
    }
    return res.json({ ok: true, queue: state.queue });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add queue item", detail: error.message });
  }
});

app.post("/api/queue/remove", async (req, res) => {
  try {
    const imageId = req.body?.imageId;
    const state = await loadState();
    state.queue = state.queue.filter((item) => item.imageId !== imageId);
    await saveState(state);
    return res.json({ ok: true, queue: state.queue });
  } catch (error) {
    return res.status(500).json({ error: "Failed to remove queue item", detail: error.message });
  }
});

app.post("/api/queue/clear", async (_req, res) => {
  try {
    const state = await loadState();
    state.queue = [];
    await saveState(state);
    return res.json({ ok: true, queue: [] });
  } catch (error) {
    return res.status(500).json({ error: "Failed to clear queue", detail: error.message });
  }
});

app.post("/api/queue/reorder", async (req, res) => {
  try {
    const from = Number(req.body?.fromIndex);
    const to = Number(req.body?.toIndex);
    const state = await loadState();

    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= state.queue.length || to >= state.queue.length) {
      return res.status(400).json({ error: "Invalid queue reorder indices" });
    }

    const [item] = state.queue.splice(from, 1);
    state.queue.splice(to, 0, item);
    await saveState(state);
    return res.json({ ok: true, queue: state.queue });
  } catch (error) {
    return res.status(500).json({ error: "Failed to reorder queue", detail: error.message });
  }
});

app.post("/api/queue/next", async (req, res) => {
  try {
    const state = await loadState();
    const nextImageId = findNeighborQueueImageId(state, req.body?.currentImageId, 1);
    return res.json({ ok: true, imageId: nextImageId });
  } catch (error) {
    return res.status(500).json({ error: "Failed to pick next queue image", detail: error.message });
  }
});

app.post("/api/queue/prev", async (req, res) => {
  try {
    const state = await loadState();
    const prevImageId = findNeighborQueueImageId(state, req.body?.currentImageId, -1);
    return res.json({ ok: true, imageId: prevImageId });
  } catch (error) {
    return res.status(500).json({ error: "Failed to pick previous queue image", detail: error.message });
  }
});

app.post("/api/sketch/start", async (req, res) => {
  try {
    const images = await indexImages();
    const imagesById = new Map(images.map((item) => [item.id, item]));
    const imageId = req.body?.imageId;
    const validation = validateImage(imagesById, imageId);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const state = await loadState();
    const record = withRecordDefaults(state.images[imageId]);
    if (!record.timer.isRunning) {
      record.timer.isRunning = true;
      record.timer.runningSince = Date.now();
    }
    state.images[imageId] = record;

    await saveState(state);
    return res.json({ ok: true, timer: { isRunning: true, elapsedMs: getElapsedMs(record) } });
  } catch (error) {
    return res.status(500).json({ error: "Failed to start timer", detail: error.message });
  }
});

app.post("/api/sketch/pause", async (req, res) => {
  try {
    const images = await indexImages();
    const imagesById = new Map(images.map((item) => [item.id, item]));
    const imageId = req.body?.imageId;
    const validation = validateImage(imagesById, imageId);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const state = await loadState();
    const record = withRecordDefaults(state.images[imageId]);

    if (record.timer.isRunning) {
      record.timer.elapsedMs = getElapsedMs(record);
      record.timer.isRunning = false;
      record.timer.runningSince = null;
    }

    state.images[imageId] = record;
    await saveState(state);

    return res.json({ ok: true, timer: { isRunning: false, elapsedMs: getElapsedMs(record) } });
  } catch (error) {
    return res.status(500).json({ error: "Failed to pause timer", detail: error.message });
  }
});

app.post("/api/sketch/stop", async (req, res) => {
  try {
    const images = await indexImages();
    const imagesById = new Map(images.map((item) => [item.id, item]));
    const imageId = req.body?.imageId;
    const validation = validateImage(imagesById, imageId);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const markSketched = req.body?.markSketched !== false;
    const mode = req.body?.mode === "drill" ? "drill" : "free";
    const drillConfig = req.body?.drillConfig || null;

    const state = await loadState();
    const record = withRecordDefaults(state.images[imageId]);
    const finalDurationMs = getElapsedMs(record);
    const stoppedAt = new Date().toISOString();
    const image = imagesById.get(imageId);

    record.timer = { isRunning: false, runningSince: null, elapsedMs: 0 };
    record.durationMs = finalDurationMs;
    record.sketchedAt = stoppedAt;
    record.history = [
      ...(Array.isArray(record.history) ? record.history : []),
      {
        stoppedAt,
        durationMs: finalDurationMs,
        mode,
      },
    ];
    if (markSketched) {
      record.isSketched = true;
    }

    state.images[imageId] = record;
    pushSession({ state, image, imageId, durationMs: finalDurationMs, stoppedAt, mode, drillConfig });
    await saveState(state);

    return res.json({
      ok: true,
      durationMs: finalDurationMs,
      sketchedAt: stoppedAt,
      isSketched: record.isSketched,
      autoAdvance: Boolean(state.settings.autoAdvance),
      nextQueueImageId: state.settings.autoAdvance ? findNeighborQueueImageId(state, imageId, 1) : null,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to stop timer", detail: error.message });
  }
});

app.post("/api/sketch/mark", async (req, res) => {
  try {
    const images = await indexImages();
    const imagesById = new Map(images.map((item) => [item.id, item]));
    const imageId = req.body?.imageId;
    const validation = validateImage(imagesById, imageId);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const isSketched = Boolean(req.body?.isSketched);
    const state = await loadState();
    const record = withRecordDefaults(state.images[imageId]);
    record.isSketched = isSketched;
    if (!isSketched) {
      record.sketchedAt = null;
      record.durationMs = 0;
      record.timer = { isRunning: false, runningSince: null, elapsedMs: 0 };
    }
    state.images[imageId] = record;
    await saveState(state);

    return res.json({ ok: true, isSketched: record.isSketched });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update sketch status", detail: error.message });
  }
});

app.get("/image/*", async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params[0]);
    const absolutePath = path.resolve(ROOT_DIR, relativePath);

    if (!absolutePath.startsWith(ROOT_DIR + path.sep)) {
      return res.status(400).json({ error: "Invalid image path" });
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(404).json({ error: "Image not found", detail: error.message });
  }
});

app.use(express.static(PUBLIC_DIR));

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Sketchable running on http://localhost:${PORT}`);
});
