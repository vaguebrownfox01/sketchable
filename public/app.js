const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const state = {
  images: [],
  filtered: [],
  selectedId: null,
  activeTab: "available",
  activeRange: "all",
  query: "",
  timerInterval: null,
  mode: "free",
  drillSeconds: 120,
  queue: [],
  sessions: [],
  settings: {
    autoAdvance: true,
    defaultDrillSeconds: 120,
  },
  timelineMode: "all",
  timelineMonth: "all",
  isStoppingFromDrillTick: false,
  lastTapImageId: null,
  lastTapAt: 0,
  isOfflineSnapshot: false,
  deferredInstallPrompt: null,
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  rangeTabs: Array.from(document.querySelectorAll(".range-tab")),
  randomBtn: document.getElementById("randomBtn"),
  galleryCount: document.getElementById("galleryCount"),
  galleryPanel: document.getElementById("galleryPanel"),
  viewerPanel: document.getElementById("viewerPanel"),
  jumpFabBtn: document.getElementById("jumpFabBtn"),
  queueFabBtn: document.getElementById("queueFabBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  authStatus: document.getElementById("authStatus"),
  galleryGrid: document.getElementById("galleryGrid"),
  cardTemplate: document.getElementById("cardTemplate"),
  emptyViewer: document.getElementById("emptyViewer"),
  viewerContent: document.getElementById("viewerContent"),
  viewerTitle: document.getElementById("viewerTitle"),
  viewerSubtitle: document.getElementById("viewerSubtitle"),
  viewerImage: document.getElementById("viewerImage"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  viewerFavoriteStar: document.getElementById("viewerFavoriteStar"),
  focusBtn: document.getElementById("focusBtn"),
  favoriteBtn: document.getElementById("favoriteBtn"),
  markBtn: document.getElementById("markBtn"),
  actionBtn: document.getElementById("actionBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  timerDisplay: document.getElementById("timerDisplay"),
  historyMeta: document.getElementById("historyMeta"),
  splitLayout: document.getElementById("splitLayout"),
  resizeHandle: document.getElementById("resizeHandle"),
  focusModal: document.getElementById("focusModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  modalTitle: document.getElementById("modalTitle"),
  modalSubtitle: document.getElementById("modalSubtitle"),
  modalImage: document.getElementById("modalImage"),
  modalTimerDisplay: document.getElementById("modalTimerDisplay"),
  modalActionBtn: document.getElementById("modalActionBtn"),
  modalPauseBtn: document.getElementById("modalPauseBtn"),
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
  presetButtons: Array.from(document.querySelectorAll(".preset-btn")),
  customSecondsInput: document.getElementById("customSecondsInput"),
  autoAdvanceToggle: document.getElementById("autoAdvanceToggle"),
  queueAddBtn: document.getElementById("queueAddBtn"),
  queuePrevBtn: document.getElementById("queuePrevBtn"),
  queueNextBtn: document.getElementById("queueNextBtn"),
  timelineBtn: document.getElementById("timelineBtn"),
  dashboardBtn: document.getElementById("dashboardBtn"),
  helpBtn: document.getElementById("helpBtn"),
  queueRemoveBtn: document.getElementById("queueRemoveBtn"),
  queueClearBtn: document.getElementById("queueClearBtn"),
  queueCount: document.getElementById("queueCount"),
  queueList: document.getElementById("queueList"),
  timelineModal: document.getElementById("timelineModal"),
  closeTimelineBtn: document.getElementById("closeTimelineBtn"),
  clearSessionsBtn: document.getElementById("clearSessionsBtn"),
  timelineModeFilter: document.getElementById("timelineModeFilter"),
  timelineMonthFilter: document.getElementById("timelineMonthFilter"),
  timelineBody: document.getElementById("timelineBody"),
  helpModal: document.getElementById("helpModal"),
  installPwaBtn: document.getElementById("installPwaBtn"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
  dashboardModal: document.getElementById("dashboardModal"),
  closeDashboardBtn: document.getElementById("closeDashboardBtn"),
  clearSessionsDashboardBtn: document.getElementById("clearSessionsDashboardBtn"),
  clearCacheDashboardBtn: document.getElementById("clearCacheDashboardBtn"),
  resetAllDashboardBtn: document.getElementById("resetAllDashboardBtn"),
  dashTotalTime: document.getElementById("dashTotalTime"),
  dashAvgTime: document.getElementById("dashAvgTime"),
  dashLongestTime: document.getElementById("dashLongestTime"),
  dashThisMonth: document.getElementById("dashThisMonth"),
  dashSketchedCount: document.getElementById("dashSketchedCount"),
  dashAvailableCount: document.getElementById("dashAvailableCount"),
  dashModeBars: document.getElementById("dashModeBars"),
  dashMonthBars: document.getElementById("dashMonthBars"),
  dashInsights: document.getElementById("dashInsights"),
};

function formatDuration(durationMs) {
  const totalSeconds = Math.floor((durationMs || 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTimerDisplayMs(elapsedMs) {
  const value = Number(elapsedMs || 0);
  if (state.mode !== "drill") {
    return value;
  }
  const remaining = state.drillSeconds * 1000 - value;
  return Math.max(0, remaining);
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "unknown";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  return date.toLocaleString().toLowerCase();
}

let toastTimer = null;
let toastEl = null;

function showToast(message) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "app-toast";
    document.body.appendChild(toastEl);
  }

  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  toastEl.textContent = message;
  toastEl.classList.add("is-visible");

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, 2600);
}

function updateInstallButtonVisibility() {
  if (!elements.installPwaBtn) {
    return;
  }
  const canPrompt = Boolean(state.deferredInstallPrompt);
  elements.installPwaBtn.disabled = !canPrompt;
  elements.installPwaBtn.textContent = canPrompt ? "install sketchable app" : "install from browser menu";
}

function readSnapshot(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallbackValue;
    }
    return JSON.parse(raw);
  } catch (_error) {
    return fallbackValue;
  }
}

function writeSnapshot(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    return;
  }
}

function getDisplayDate(image) {
  if (!image?.parsedDate) {
    return "undated reference";
  }
  return `${image.parsedDate.date} ${image.parsedDate.time}`;
}

function getSelectedImage() {
  return state.images.find((item) => item.id === state.selectedId) || null;
}

function isImageInQueue(imageId) {
  return state.queue.some((item) => item.imageId === imageId);
}

function isSelectedInQueue() {
  const selected = getSelectedImage();
  if (!selected) {
    return false;
  }
  return isImageInQueue(selected.id);
}

function inSelectedRange(image) {
  if (state.activeRange === "all") {
    return true;
  }
  if (state.activeRange === "undated") {
    return !image.parsedDate;
  }
  if (!image.parsedDate?.date) {
    return false;
  }
  const month = Number(image.parsedDate.date.split("-")[1]);
  const targetMonth = MONTHS[state.activeRange];
  return month === targetMonth;
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const isSketchedView = state.activeTab === "sketched";

  state.filtered = state.images.filter((image) => {
    if (state.activeTab === "favorites") {
      if (!image.isFavorite) {
        return false;
      }
    } else if (isSketchedView ? !image.isSketched : image.isSketched) {
      return false;
    }
    if (!inSelectedRange(image)) {
      return false;
    }
    if (!query) {
      return true;
    }

    const haystack = [
      image.fileName,
      image.folder,
      image.parsedDate?.date,
      image.parsedDate?.time,
      image.parsedDate?.isoDateTime,
      image.sketchedAt,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function ensureSelection() {
  const stillVisible = state.filtered.some((item) => item.id === state.selectedId);
  if (stillVisible) {
    return;
  }
  state.selectedId = state.filtered[0]?.id || null;
}

function syncGalleryActiveState() {
  const cards = elements.galleryGrid.querySelectorAll(".image-card");
  cards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.imageId === state.selectedId);
  });
}

function renderSelectionOnly() {
  syncGalleryActiveState();
  renderViewer();
  renderQueue();
  renderDashboard();
  refreshTimerTicker();
}

function attachTimerResetHandlers(element) {
  if (!element) {
    return;
  }
  element.addEventListener("click", resetSketchTimer);
  element.addEventListener("touchend", (event) => {
    event.preventDefault();
    resetSketchTimer();
  }, { passive: false });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      resetSketchTimer();
    }
  });
}

function renderGallery() {
  elements.galleryGrid.innerHTML = "";

  state.filtered.forEach((image) => {
    const fragment = elements.cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".image-card");
    const button = fragment.querySelector(".thumb-wrap");
    const thumb = fragment.querySelector(".thumb");
    const title = fragment.querySelector(".card-title");
    const subtitle = fragment.querySelector(".card-subtitle");
    const detail = fragment.querySelector(".card-detail");

    if (image.id === state.selectedId) {
      card.classList.add("is-active");
    }

    if (image.isFavorite) {
      card.classList.add("is-favorite");
    }

    card.dataset.imageId = image.id;
    thumb.src = image.thumbUrl || image.imageUrl;
    thumb.decoding = "async";
    if (image.isFavorite) {
      const badge = document.createElement("span");
      badge.className = "favorite-badge";
      badge.textContent = "★";
      button.appendChild(badge);
    }
    title.textContent = image.parsedDate ? image.parsedDate.date : "undated";
    subtitle.textContent = `- ${image.folder}`;
    detail.textContent = isImageInQueue(image.id)
      ? "in queue"
      : state.activeTab === "sketched"
        ? `done: ${formatDateTime(image.sketchedAt)} · ${formatDuration(image.durationMs)}`
        : "";

    let pressTimer = null;
    let longPressed = false;

    const clearPressTimer = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      longPressed = false;
      clearPressTimer();
      pressTimer = setTimeout(() => {
        longPressed = true;
        state.selectedId = image.id;
        renderSelectionOnly();
        openFocusModal();
      }, 450);
    });

    button.addEventListener("pointerup", clearPressTimer);
    button.addEventListener("pointerleave", clearPressTimer);
    button.addEventListener("pointercancel", clearPressTimer);

    button.addEventListener("click", () => {
      if (longPressed) {
        longPressed = false;
        return;
      }

      const now = Date.now();
      const isDoubleTap = state.lastTapImageId === image.id && now - state.lastTapAt < 320;
      state.lastTapImageId = image.id;
      state.lastTapAt = now;

      if (isDoubleTap) {
        state.lastTapImageId = null;
        state.lastTapAt = 0;
        state.selectedId = image.id;
        renderSelectionOnly();
        openFocusModal();
        return;
      }

      state.selectedId = image.id;
      renderSelectionOnly();
    });

    elements.galleryGrid.appendChild(fragment);
  });

  elements.galleryCount.textContent = `${state.filtered.length} image${state.filtered.length === 1 ? "" : "s"} in ${state.activeTab}`;
}

function toggleSelectedFavoriteStatus() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }
  performAction((image) => apiPost("/api/favorite/toggle", { imageId: image.id, isFavorite: !image.isFavorite }));
}

function renderModalContent(image) {
  elements.modalTitle.textContent = getDisplayDate(image);
  elements.modalSubtitle.textContent = `${image.fileName} · ${image.folder}`;
  elements.modalImage.src = image.imageUrl;
  elements.modalTimerDisplay.textContent = formatDuration(getTimerDisplayMs(image.timer?.elapsedMs || 0));
  const isRunning = Boolean(image.timer?.isRunning);
  elements.modalTimerDisplay.classList.toggle("is-running", isRunning);
  elements.modalTimerDisplay.classList.toggle("is-drill-running", isRunning && state.mode === "drill");
  elements.modalActionBtn.textContent = isRunning ? "■ stop" : "▷ start";
  elements.modalActionBtn.classList.toggle("is-stop", isRunning);
}

function renderViewer() {
  const image = getSelectedImage();
  const hasSelection = Boolean(image);
  elements.emptyViewer.classList.toggle("is-hidden", hasSelection);
  elements.viewerContent.classList.toggle("is-hidden", !hasSelection);

  if (!image) {
    return;
  }

  elements.viewerTitle.textContent = getDisplayDate(image);
  const queuePosition = state.queue.findIndex((item) => item.imageId === image.id);
  elements.viewerSubtitle.textContent = `${image.fileName} · ${image.folder}${queuePosition >= 0 ? ` · Queue #${queuePosition + 1}` : ""}`;
  elements.viewerImage.src = image.imageUrl;
  elements.timerDisplay.textContent = formatDuration(getTimerDisplayMs(image.timer?.elapsedMs || 0));
  const isRunning = Boolean(image.timer?.isRunning);
  elements.timerDisplay.classList.toggle("is-running", isRunning);
  elements.timerDisplay.classList.toggle("is-drill-running", isRunning && state.mode === "drill");
  elements.actionBtn.textContent = isRunning ? "■ stop" : "▷ start";
  elements.actionBtn.classList.toggle("is-stop", isRunning);
  elements.viewerFavoriteStar.classList.toggle("is-hidden", !image.isFavorite);
  elements.fullscreenBtn.textContent = document.fullscreenElement ? "⤢" : "⛶";
  elements.favoriteBtn.textContent = image.isFavorite ? "★ favorite" : "☆ favorite";
  elements.favoriteBtn.classList.toggle("is-on", image.isFavorite);
  elements.queueFabBtn.textContent = isImageInQueue(image.id) ? "−" : "＋";
  elements.markBtn.textContent = image.isSketched ? "mark available" : "mark sketched";

  if (image.isSketched) {
    elements.historyMeta.textContent = `sketched at ${formatDateTime(image.sketchedAt)} · duration ${formatDuration(image.durationMs)}`;
  } else {
    const last = image.history?.[image.history.length - 1];
    elements.historyMeta.textContent = last
      ? `last session: ${formatDateTime(last.stoppedAt)} · ${formatDuration(last.durationMs)} · ${last.mode || "free"}`
      : "no completed sketch sessions yet.";
  }

  renderModalContent(image);
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    const target = document.documentElement;
    if (target.requestFullscreen) {
      await target.requestFullscreen();
    }
  } catch (_error) {
    showToast("fullscreen not available on this device");
  } finally {
    renderViewer();
  }
}

function renderQueue() {
  elements.queueList.innerHTML = "";
  elements.queueCount.textContent = `${state.queue.length} image${state.queue.length === 1 ? "" : "s"}`;

  state.queue.forEach((item, index) => {
    const image = state.images.find((entry) => entry.id === item.imageId);
    if (!image) {
      return;
    }

    const row = document.createElement("div");
    row.className = "queue-item";

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = "queue-thumb-btn";
    if (image.isFavorite) {
      selectBtn.classList.add("is-favorite");
    }
    selectBtn.title = `${index + 1}. ${image.fileName}`;

    const thumb = document.createElement("img");
    thumb.className = "queue-thumb";
    thumb.src = image.thumbUrl || image.imageUrl;
    thumb.alt = image.fileName;
    thumb.loading = "lazy";
    thumb.decoding = "async";
    selectBtn.appendChild(thumb);

    const badge = document.createElement("span");
    badge.className = "queue-index";
    badge.textContent = String(index + 1);
    selectBtn.appendChild(badge);

    selectBtn.addEventListener("click", () => {
      state.selectedId = image.id;
      renderSelectionOnly();
    });

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "queue-mini";
    upBtn.textContent = "↑";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", async () => {
      await apiPost("/api/queue/reorder", { fromIndex: index, toIndex: index - 1 });
      await loadRemoteState();
      renderQueue();
      renderViewer();
    });

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "queue-mini";
    downBtn.textContent = "↓";
    downBtn.disabled = index === state.queue.length - 1;
    downBtn.addEventListener("click", async () => {
      await apiPost("/api/queue/reorder", { fromIndex: index, toIndex: index + 1 });
      await loadRemoteState();
      renderQueue();
      renderViewer();
    });

    row.appendChild(selectBtn);
    row.appendChild(upBtn);
    row.appendChild(downBtn);
    elements.queueList.appendChild(row);
  });
}

function renderTimeline() {
  const modeFilter = state.timelineMode;
  const monthFilter = state.timelineMonth;
  const imageById = new Map(state.images.map((image) => [image.id, image]));
  const rows = [...state.sessions]
    .reverse()
    .filter((session) => {
      if (modeFilter !== "all" && session.mode !== modeFilter) {
        return false;
      }
      if (monthFilter === "all") {
        return true;
      }
      const source = session.imageDateTime || session.stoppedAt;
      const month = Number(new Date(source).getMonth()) + 1;
      return month === Number(monthFilter);
    });

  elements.timelineBody.innerHTML = "";
  rows.forEach((session) => {
    const tr = document.createElement("tr");
    const image = imageById.get(session.imageId);
    const imageCell = image
      ? `<button class="timeline-thumb-btn ${image.isFavorite ? "is-favorite" : ""}" type="button" data-image-id="${image.id}" title="open image"><img class="timeline-thumb" loading="lazy" decoding="async" src="${image.thumbUrl || image.imageUrl}" alt="timeline image" /></button>`
      : `<span class="timeline-missing">missing</span>`;
    tr.innerHTML = `<td>${formatDateTime(session.stoppedAt)}</td><td>${formatDateTime(session.imageDateTime)}</td><td>${formatDuration(session.durationMs)}</td><td>${session.mode}</td><td>${imageCell}</td>`;
    elements.timelineBody.appendChild(tr);

    const thumbBtn = tr.querySelector(".timeline-thumb-btn");
    if (thumbBtn) {
      thumbBtn.addEventListener("click", () => {
        state.selectedId = session.imageId;
        closeTimelineModal();
        renderSelectionOnly();
      });
    }
  });

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="5">no sessions for this filter.</td>';
    elements.timelineBody.appendChild(tr);
  }
}

function renderBarList(container, items) {
  container.innerHTML = "";
  const max = Math.max(1, ...items.map((item) => item.value));

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    const width = item.value <= 0 ? 0 : Math.max(6, Math.round((item.value / max) * 100));
    row.innerHTML = `<span>${item.label}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><strong>${item.value}</strong>`;
    container.appendChild(row);
  });
}

function renderDashboard() {
  const sessions = state.sessions || [];
  const images = state.images || [];

  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, session) => sum + Number(session.durationMs || 0), 0);
  const avgDuration = totalSessions ? Math.floor(totalDuration / totalSessions) : 0;
  const longestDuration = sessions.reduce((max, session) => Math.max(max, Number(session.durationMs || 0)), 0);

  const now = new Date();
  const thisMonthCount = sessions.filter((session) => {
    const date = new Date(session.stoppedAt);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const freeCount = sessions.filter((session) => session.mode === "free").length;
  const drillCount = sessions.filter((session) => session.mode === "drill").length;

  const monthCounts = Array.from({ length: 12 }, (_, index) => ({
    label: Object.keys(MONTHS)[index],
    value: 0,
  }));

  sessions.forEach((session) => {
    const source = session.imageDateTime || session.stoppedAt;
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) {
      monthCounts[date.getMonth()].value += 1;
    }
  });

  const sketchedCount = images.filter((image) => image.isSketched).length;
  const favoriteCount = images.filter((image) => image.isFavorite).length;
  const availableCount = images.length - sketchedCount;

  elements.dashTotalTime.textContent = formatDuration(totalDuration);
  elements.dashAvgTime.textContent = formatDuration(avgDuration);
  elements.dashLongestTime.textContent = formatDuration(longestDuration);
  elements.dashThisMonth.textContent = String(thisMonthCount);
  elements.dashSketchedCount.textContent = String(sketchedCount);
  elements.dashAvailableCount.textContent = String(availableCount);

  renderBarList(elements.dashModeBars, [
    { label: "free", value: freeCount },
    { label: "drill", value: drillCount },
  ]);
  renderBarList(elements.dashMonthBars, monthCounts);

  const bestMonth = [...monthCounts].sort((a, b) => b.value - a.value)[0];
  const avgMinutes = avgDuration ? Math.max(1, Math.round(avgDuration / 60000)) : 0;
  elements.dashInsights.innerHTML = `<p>most active month: <strong>${bestMonth.label}</strong> (${bestMonth.value})</p><p>average pace: <strong>${avgMinutes} min</strong> per sketch</p><p>favorites saved: <strong>${favoriteCount}</strong></p>`;
}

function renderTabs() {
  const isSketchedView = state.activeTab === "sketched";
  const counts = {
    all: 0,
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
    undated: 0,
  };

  state.images.forEach((image) => {
    if (isSketchedView ? !image.isSketched : image.isSketched) {
      return;
    }
    counts.all += 1;
    if (!image.parsedDate?.date) {
      counts.undated += 1;
      return;
    }
    const month = Number(image.parsedDate.date.split("-")[1]);
    const monthKey = Object.keys(MONTHS).find((key) => MONTHS[key] === month);
    if (monthKey) {
      counts[monthKey] += 1;
    }
  });

  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === state.activeTab);
  });

  elements.rangeTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.range === state.activeRange);
    const label = tab.dataset.label || tab.textContent.trim();
    const count = counts[tab.dataset.range] || 0;
    tab.innerHTML = `${label}<span class="count">${count}</span>`;
  });

  elements.modeButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
  });

  elements.autoAdvanceToggle.checked = Boolean(state.settings.autoAdvance);
  elements.customSecondsInput.value = String(state.drillSeconds);
}

function refreshTimerTicker() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  const selected = getSelectedImage();
  if (!selected || !selected.timer?.isRunning) {
    return;
  }

  state.timerInterval = setInterval(async () => {
    const latestSelected = getSelectedImage();
    if (!latestSelected || !latestSelected.timer?.isRunning) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      return;
    }

    latestSelected.timer.elapsedMs += 1000;
    const formatted = formatDuration(getTimerDisplayMs(latestSelected.timer.elapsedMs));
    elements.timerDisplay.textContent = formatted;
    if (!elements.focusModal.classList.contains("is-hidden")) {
      elements.modalTimerDisplay.textContent = formatted;
    }

    if (
      state.mode === "drill" &&
      !state.isStoppingFromDrillTick &&
      latestSelected.timer.elapsedMs >= state.drillSeconds * 1000
    ) {
      state.isStoppingFromDrillTick = true;
      await stopSketch();
      state.isStoppingFromDrillTick = false;
    }
  }, 1000);
}

function render() {
  applyFilters();
  ensureSelection();
  renderTabs();
  renderGallery();
  renderViewer();
  renderQueue();
  renderTimeline();
  renderDashboard();
  refreshTimerTicker();
}

async function apiPost(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || "Request failed");
  }
  return response.json();
}

async function loadAuthState() {
  const response = await fetch("/auth/me", { cache: "no-store" });
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error("Failed to load auth state");
  }
  const payload = await response.json();
  writeSnapshot("sketchable.auth", payload);
  return payload;
}

async function loadImages() {
  try {
    const response = await fetch("/api/images", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load images");
    }
    const payload = await response.json();
    state.images = payload.images || [];
    writeSnapshot("sketchable.images", state.images);
    return;
  } catch (_error) {
    const cachedImages = readSnapshot("sketchable.images", []);
    state.images = Array.isArray(cachedImages) ? cachedImages : [];
  }
}

async function loadRemoteState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load state");
    }
    const payload = await response.json();
    state.queue = payload.queue || [];
    state.sessions = payload.sessions || [];
    state.settings = payload.settings || state.settings;
    writeSnapshot("sketchable.remoteState", {
      queue: state.queue,
      sessions: state.sessions,
      settings: state.settings,
    });
  } catch (_error) {
    const cached = readSnapshot("sketchable.remoteState", null);
    if (cached && typeof cached === "object") {
      state.queue = Array.isArray(cached.queue) ? cached.queue : [];
      state.sessions = Array.isArray(cached.sessions) ? cached.sessions : [];
      state.settings = cached.settings && typeof cached.settings === "object" ? cached.settings : state.settings;
    }
  }
  state.drillSeconds = Number(state.settings.defaultDrillSeconds || state.drillSeconds);

  if (state.mode === "drill" && state.queue.length > 0) {
    const selectedStillQueued = state.selectedId && state.queue.some((item) => item.imageId === state.selectedId);
    if (!selectedStillQueued) {
      state.selectedId = state.queue[0].imageId;
    }
  }
}

async function reloadData() {
  state.isOfflineSnapshot = false;
  let auth = null;

  try {
    [auth] = await Promise.all([loadAuthState(), loadImages(), loadRemoteState()]);
  } catch (_error) {
    auth = readSnapshot("sketchable.auth", { authenticated: true, username: "offline" });
    await Promise.all([loadImages(), loadRemoteState()]);
    state.isOfflineSnapshot = true;
  }

  if (elements.authStatus) {
    if (auth?.authenticated) {
      elements.authStatus.textContent = state.isOfflineSnapshot
        ? `offline snapshot: ${auth.username || "user"}`
        : `signed in: ${auth.username || "user"}`;
      elements.authStatus.classList.remove("is-hidden");
    } else {
      elements.authStatus.textContent = "";
      elements.authStatus.classList.add("is-hidden");
    }
  }

  if (state.isOfflineSnapshot) {
    showToast("offline mode: using last synced snapshot");
  }
}

async function performAction(action) {
  const selected = getSelectedImage();
  if (!selected) {
    return null;
  }

  const result = await action(selected);
  await reloadData();

  const exists = state.images.some((item) => item.id === selected.id);
  state.selectedId = exists ? selected.id : state.images[0]?.id || null;

  render();
  return result;
}

function getNextImageCandidate(serverNextId) {
  if (serverNextId && state.images.some((item) => item.id === serverNextId)) {
    return serverNextId;
  }
  const pool = state.filtered.length ? state.filtered : state.images;
  if (!pool.length) {
    return null;
  }
  const currentIndex = pool.findIndex((item) => item.id === state.selectedId);
  if (currentIndex === -1) {
    return pool[0].id;
  }
  return pool[(currentIndex + 1) % pool.length].id;
}

async function startSketch() {
  if (state.mode === "drill") {
    const imageById = new Map(state.images.map((image) => [image.id, image]));
    const completedQueueIds = state.queue
      .filter((item) => imageById.get(item.imageId)?.isSketched)
      .map((item) => item.imageId);

    if (completedQueueIds.length) {
      for (const imageId of completedQueueIds) {
        await apiPost("/api/queue/remove", { imageId });
      }
      await loadRemoteState();
      renderQueue();
    }
  }

  if (state.mode === "drill" && state.queue.length === 0) {
    showToast("your queue is empty - add a few images and let the drill begin ✨");
    return;
  }

  if (state.mode === "drill" && !isSelectedInQueue()) {
    showToast("pick from queue to start drill mode 🎯");
    return;
  }
  const shouldReset = state.mode === "drill";
  await performAction((selected) => apiPost("/api/sketch/start", { imageId: selected.id, resetTimer: shouldReset }));
}

async function pauseSketch() {
  await performAction((selected) => apiPost("/api/sketch/pause", { imageId: selected.id }));
}

async function resetSketchTimer() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }

  await apiPost("/api/sketch/reset", { imageId: selected.id });
  await reloadData();

  const stillExists = state.images.some((item) => item.id === selected.id);
  state.selectedId = stillExists ? selected.id : state.images[0]?.id || null;

  if (state.activeTab === "sketched") {
    applyFilters();
    ensureSelection();
    renderTabs();
    renderGallery();
    renderSelectionOnly();
    return;
  }

  renderSelectionOnly();
}

async function stopSketch() {
  const selectedBeforeStop = getSelectedImage();
  const wasAutoStop = state.isStoppingFromDrillTick;
  const result = await performAction((selected) =>
    apiPost("/api/sketch/stop", {
      imageId: selected.id,
      markSketched: true,
      mode: state.mode,
      drillConfig: state.mode === "drill" ? { seconds: state.drillSeconds } : null,
    })
  );

  if (!result) {
    return;
  }

  if (state.mode === "drill" && wasAutoStop && selectedBeforeStop && isImageInQueue(selectedBeforeStop.id)) {
    await apiPost("/api/queue/remove", { imageId: selectedBeforeStop.id });
    await loadRemoteState();
  }

  if (
    result.isSketched &&
    selectedBeforeStop &&
    isImageInQueue(selectedBeforeStop.id) &&
    !(state.mode === "drill" && wasAutoStop)
  ) {
    await apiPost("/api/queue/remove", { imageId: selectedBeforeStop.id });
    await loadRemoteState();
  }

  if (state.settings.autoAdvance) {
    let nextImageId = null;
    if (state.mode === "drill") {
      nextImageId = state.queue[0]?.imageId || null;
      if (!nextImageId) {
        elements.historyMeta.textContent = "queue finished. drill stopped.";
        render();
        return;
      }
    } else {
      nextImageId = getNextImageCandidate(result.nextQueueImageId);
    }

    if (nextImageId) {
      state.selectedId = nextImageId;
      render();
      if (state.mode === "drill") {
        await startSketch();
      }
    }
  }
}

async function actionPrimary() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }
  if (selected.timer?.isRunning) {
    await stopSketch();
  } else {
    await startSketch();
  }
}

function toggleSelectedSketchStatus() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }

  const targetIsSketched = !selected.isSketched;
  performAction(() => apiPost("/api/sketch/mark", { imageId: selected.id, isSketched: targetIsSketched }));
}

function chooseRandomImage() {
  if (!state.filtered.length) {
    return;
  }

  const next = state.filtered[Math.floor(Math.random() * state.filtered.length)];
  state.selectedId = next.id;
  elements.randomBtn.classList.remove("is-animated");
  void elements.randomBtn.offsetWidth;
  elements.randomBtn.classList.add("is-animated");
  renderSelectionOnly();

  const activeCard = elements.galleryGrid.querySelector(`.image-card[data-image-id="${next.id}"]`);
  if (activeCard) {
    activeCard.classList.remove("random-picked");
    void activeCard.offsetWidth;
    activeCard.classList.add("random-picked");
    activeCard.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      activeCard.classList.remove("random-picked");
    }, 900);
  }

  window.setTimeout(() => {
    elements.randomBtn.classList.remove("is-animated");
  }, 650);
}

function openFocusModal() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }
  renderModalContent(selected);
  elements.focusModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

function closeFocusModal() {
  elements.focusModal.classList.add("is-hidden");
  maybeUnlockBodyScroll();
}

function openTimelineModal() {
  renderTimeline();
  elements.timelineModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

function openHelpModal() {
  elements.helpModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

function openDashboardModal() {
  renderDashboard();
  elements.dashboardModal.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

function maybeUnlockBodyScroll() {
  if (
    elements.focusModal.classList.contains("is-hidden") &&
    elements.timelineModal.classList.contains("is-hidden") &&
    elements.helpModal.classList.contains("is-hidden") &&
    elements.dashboardModal.classList.contains("is-hidden")
  ) {
    document.body.classList.remove("modal-open");
  }
}

function closeHelpModal() {
  elements.helpModal.classList.add("is-hidden");
  maybeUnlockBodyScroll();
}

function closeDashboardModal() {
  elements.dashboardModal.classList.add("is-hidden");
  maybeUnlockBodyScroll();
}

async function clearSessionStats() {
  await apiPost("/api/sessions/clear", {});
  await reloadData();
  render();
}

async function clearAppCache() {
  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    showToast("cache controls are not available in this browser");
    return;
  }

  const confirmed = window.confirm("clear all offline cached files and images?");
  if (!confirmed) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration && registration.active) {
    registration.active.postMessage({ type: "CLEAR_RUNTIME_CACHE" });
  }

  showToast("offline cache cleared");
}

async function logout() {
  try {
    await apiPost("/auth/logout", {});
  } finally {
    window.location.href = "/login";
  }
}

async function installPwa() {
  const promptEvent = state.deferredInstallPrompt;
  if (!promptEvent) {
    showToast("open browser menu and choose install sketchable");
    return;
  }

  promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  if (choice?.outcome === "accepted") {
    showToast("install started");
  }

  state.deferredInstallPrompt = null;
  updateInstallButtonVisibility();
}

async function resetAllState() {
  const confirmed = window.confirm("this will reset all saved sketch data, queue, favorites, and history. continue?");
  if (!confirmed) {
    return;
  }

  await apiPost("/api/state/reset", {});
  await reloadData();
  state.selectedId = state.images[0]?.id || null;
  render();
}

function closeTimelineModal() {
  elements.timelineModal.classList.add("is-hidden");
  maybeUnlockBodyScroll();
}

function isTypingTarget(target) {
  if (!target) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

async function queueMove(direction) {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }
  const endpoint = direction > 0 ? "/api/queue/next" : "/api/queue/prev";
  const result = await apiPost(endpoint, { currentImageId: selected.id });
  if (result.imageId) {
    state.selectedId = result.imageId;
    renderSelectionOnly();
  }
}

async function addSelectedToQueue() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }
  await apiPost("/api/queue/add", { imageId: selected.id });
  await loadRemoteState();
  render();
}

async function toggleSelectedQueueStatus() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }

  if (isImageInQueue(selected.id)) {
    await apiPost("/api/queue/remove", { imageId: selected.id });
  } else {
    await apiPost("/api/queue/add", { imageId: selected.id });
  }

  await loadRemoteState();
  render();
}

function isViewerMostlyVisible() {
  const rect = elements.viewerPanel.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(viewportHeight, rect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  return visibleHeight > rect.height * 0.45;
}

function jumpBetweenPanels() {
  if (isViewerMostlyVisible()) {
    elements.galleryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    elements.viewerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function attachEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    render();
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      render();
    });
  });

  elements.rangeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeRange = tab.dataset.range;
      render();
    });
  });

  elements.modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      render();
    });
  });

  elements.presetButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const seconds = Number(btn.dataset.seconds || 120);
      state.drillSeconds = seconds;
      await apiPost("/api/settings", { defaultDrillSeconds: seconds });
      await loadRemoteState();
      render();
    });
  });

  elements.customSecondsInput.addEventListener("change", async () => {
    const seconds = Math.max(10, Math.min(7200, Number(elements.customSecondsInput.value || 120)));
    state.drillSeconds = seconds;
    await apiPost("/api/settings", { defaultDrillSeconds: seconds });
    await loadRemoteState();
    render();
  });

  elements.autoAdvanceToggle.addEventListener("change", async () => {
    await apiPost("/api/settings", { autoAdvance: Boolean(elements.autoAdvanceToggle.checked) });
    await loadRemoteState();
    render();
  });

  elements.actionBtn.addEventListener("click", actionPrimary);
  elements.pauseBtn.addEventListener("click", pauseSketch);
  attachTimerResetHandlers(elements.timerDisplay);
  elements.markBtn.addEventListener("click", toggleSelectedSketchStatus);
  elements.fullscreenBtn.addEventListener("click", toggleFullscreen);

  document.addEventListener("fullscreenchange", () => {
    renderViewer();
  });

  elements.modalActionBtn.addEventListener("click", actionPrimary);
  elements.modalPauseBtn.addEventListener("click", pauseSketch);
  attachTimerResetHandlers(elements.modalTimerDisplay);
  elements.favoriteBtn.addEventListener("click", toggleSelectedFavoriteStatus);

  elements.randomBtn.addEventListener("click", chooseRandomImage);

  elements.queueAddBtn.addEventListener("click", addSelectedToQueue);
  elements.queueFabBtn.addEventListener("click", toggleSelectedQueueStatus);
  elements.jumpFabBtn.addEventListener("click", jumpBetweenPanels);

  elements.queueRemoveBtn.addEventListener("click", async () => {
    const selected = getSelectedImage();
    if (!selected) {
      return;
    }
    await apiPost("/api/queue/remove", { imageId: selected.id });
    await loadRemoteState();
    render();
  });

  elements.queueClearBtn.addEventListener("click", async () => {
    await apiPost("/api/queue/clear", {});
    await loadRemoteState();
    render();
  });

  elements.queueNextBtn.addEventListener("click", () => queueMove(1));
  elements.queuePrevBtn.addEventListener("click", () => queueMove(-1));

  elements.timelineBtn.addEventListener("click", openTimelineModal);
  elements.dashboardBtn.addEventListener("click", openDashboardModal);
  elements.helpBtn.addEventListener("click", openHelpModal);
  elements.timelineModeFilter.addEventListener("change", () => {
    state.timelineMode = elements.timelineModeFilter.value;
    renderTimeline();
  });
  elements.timelineMonthFilter.addEventListener("change", () => {
    state.timelineMonth = elements.timelineMonthFilter.value;
    renderTimeline();
  });

  elements.focusBtn.addEventListener("click", openFocusModal);
  elements.closeModalBtn.addEventListener("click", closeFocusModal);
  elements.focusModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeModal === "true") {
      closeFocusModal();
    }
  });

  elements.closeTimelineBtn.addEventListener("click", closeTimelineModal);
  elements.clearSessionsBtn.addEventListener("click", clearSessionStats);
  elements.timelineModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeTimeline === "true") {
      closeTimelineModal();
    }
  });

  elements.closeHelpBtn.addEventListener("click", closeHelpModal);
  elements.installPwaBtn.addEventListener("click", installPwa);
  elements.helpModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeHelp === "true") {
      closeHelpModal();
    }
  });

  elements.closeDashboardBtn.addEventListener("click", closeDashboardModal);
  elements.clearSessionsDashboardBtn.addEventListener("click", clearSessionStats);
  elements.clearCacheDashboardBtn.addEventListener("click", clearAppCache);
  elements.resetAllDashboardBtn.addEventListener("click", resetAllState);
  elements.dashboardModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeDashboard === "true") {
      closeDashboardModal();
    }
  });

  elements.logoutBtn.addEventListener("click", logout);

  window.addEventListener("keydown", async (event) => {
    if (event.key === "Escape") {
      closeFocusModal();
      closeTimelineModal();
      closeHelpModal();
      closeDashboardModal();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      const selected = getSelectedImage();
      if (!selected) {
        return;
      }
      if (selected.timer?.isRunning) {
        await pauseSketch();
      } else {
        await startSketch();
      }
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "s") {
      await stopSketch();
    } else if (key === "n") {
      await queueMove(1);
    } else if (key === "p") {
      await queueMove(-1);
    } else if (key === "r") {
      chooseRandomImage();
    } else if (key === "f") {
      openFocusModal();
    } else if (key === "t") {
      openTimelineModal();
    } else if (key === "q") {
      await addSelectedToQueue();
    } else if (key === "d") {
      openDashboardModal();
    } else if (key === "v") {
      toggleSelectedFavoriteStatus();
    } else if (key === "x") {
      await toggleFullscreen();
    }
  });

  let dragging = false;
  elements.resizeHandle.addEventListener("mousedown", () => {
    dragging = true;
    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (event) => {
    if (!dragging || window.innerWidth <= 1024) {
      return;
    }
    const bounds = elements.splitLayout.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const sidebarPx = 200;
    const remaining = Math.max(600, bounds.width - sidebarPx - 10);
    const galleryRatio = Math.min(0.72, Math.max(0.35, (x - sidebarPx) / remaining));
    elements.splitLayout.style.gridTemplateColumns = `${sidebarPx}px minmax(0, ${galleryRatio}fr) 10px minmax(0, ${1 - galleryRatio}fr)`;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}

async function init() {
  attachEvents();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    updateInstallButtonVisibility();
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    updateInstallButtonVisibility();
    showToast("app installed");
  });

  updateInstallButtonVisibility();

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      if (registration.waiting) {
        showToast("new version ready - refreshing now");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) {
          return;
        }
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showToast("update downloaded - applying");
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      let hasReloadedForSw = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hasReloadedForSw) {
          return;
        }
        hasReloadedForSw = true;
        window.location.reload();
      });
    } catch (_error) {
      showToast("offline mode setup failed");
    }
  }
  await reloadData();
  state.drillSeconds = Number(state.settings.defaultDrillSeconds || state.drillSeconds);
  state.selectedId = state.images[0]?.id || null;
  render();
}

init().catch((error) => {
  elements.galleryCount.textContent = `Error: ${error.message}`;
});
