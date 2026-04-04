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
  drillRounds: 1,
  drillRoundsLeft: 1,
  queue: [],
  sessions: [],
  settings: {
    autoAdvance: true,
    defaultDrillSeconds: 120,
  },
  timelineMode: "all",
  timelineMonth: "all",
  isStoppingFromDrillTick: false,
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  rangeTabs: Array.from(document.querySelectorAll(".range-tab")),
  randomBtn: document.getElementById("randomBtn"),
  galleryCount: document.getElementById("galleryCount"),
  galleryGrid: document.getElementById("galleryGrid"),
  cardTemplate: document.getElementById("cardTemplate"),
  emptyViewer: document.getElementById("emptyViewer"),
  viewerContent: document.getElementById("viewerContent"),
  viewerTitle: document.getElementById("viewerTitle"),
  viewerSubtitle: document.getElementById("viewerSubtitle"),
  viewerImage: document.getElementById("viewerImage"),
  focusBtn: document.getElementById("focusBtn"),
  markBtn: document.getElementById("markBtn"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  stopBtn: document.getElementById("stopBtn"),
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
  modalStartBtn: document.getElementById("modalStartBtn"),
  modalPauseBtn: document.getElementById("modalPauseBtn"),
  modalStopBtn: document.getElementById("modalStopBtn"),
  modalMarkBtn: document.getElementById("modalMarkBtn"),
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
  presetButtons: Array.from(document.querySelectorAll(".preset-btn")),
  customSecondsInput: document.getElementById("customSecondsInput"),
  roundsInput: document.getElementById("roundsInput"),
  autoAdvanceToggle: document.getElementById("autoAdvanceToggle"),
  queueAddBtn: document.getElementById("queueAddBtn"),
  queuePrevBtn: document.getElementById("queuePrevBtn"),
  queueNextBtn: document.getElementById("queueNextBtn"),
  timelineBtn: document.getElementById("timelineBtn"),
  helpBtn: document.getElementById("helpBtn"),
  queueRemoveBtn: document.getElementById("queueRemoveBtn"),
  queueClearBtn: document.getElementById("queueClearBtn"),
  queueCount: document.getElementById("queueCount"),
  queueList: document.getElementById("queueList"),
  timelineModal: document.getElementById("timelineModal"),
  closeTimelineBtn: document.getElementById("closeTimelineBtn"),
  timelineModeFilter: document.getElementById("timelineModeFilter"),
  timelineMonthFilter: document.getElementById("timelineMonthFilter"),
  timelineBody: document.getElementById("timelineBody"),
  helpModal: document.getElementById("helpModal"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
};

function formatDuration(durationMs) {
  const totalSeconds = Math.floor((durationMs || 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    if (isSketchedView ? !image.isSketched : image.isSketched) {
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

    card.dataset.imageId = image.id;
    thumb.src = image.imageUrl;
    title.textContent = image.parsedDate ? image.parsedDate.date : "undated";
    subtitle.textContent = `- ${image.folder}`;
    detail.textContent = isImageInQueue(image.id)
      ? "in queue"
      : state.activeTab === "sketched"
        ? `done: ${formatDateTime(image.sketchedAt)} · ${formatDuration(image.durationMs)}`
        : "";

    button.addEventListener("click", () => {
      state.selectedId = image.id;
      render();
    });

    elements.galleryGrid.appendChild(fragment);
  });

  elements.galleryCount.textContent = `${state.filtered.length} image${state.filtered.length === 1 ? "" : "s"} in ${state.activeTab}`;
}

function renderModalContent(image) {
  elements.modalTitle.textContent = getDisplayDate(image);
  elements.modalSubtitle.textContent = `${image.fileName} · ${image.folder}`;
  elements.modalImage.src = image.imageUrl;
  elements.modalTimerDisplay.textContent = formatDuration(image.timer?.elapsedMs || 0);
  elements.modalMarkBtn.textContent = image.isSketched ? "mark available" : "mark sketched";
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
  elements.timerDisplay.textContent = formatDuration(image.timer?.elapsedMs || 0);
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
    selectBtn.title = `${index + 1}. ${image.fileName}`;

    const thumb = document.createElement("img");
    thumb.className = "queue-thumb";
    thumb.src = image.imageUrl;
    thumb.alt = image.fileName;
    thumb.loading = "lazy";
    selectBtn.appendChild(thumb);

    const badge = document.createElement("span");
    badge.className = "queue-index";
    badge.textContent = String(index + 1);
    selectBtn.appendChild(badge);

    selectBtn.addEventListener("click", () => {
      state.selectedId = image.id;
      render();
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
    tr.innerHTML = `<td>${formatDateTime(session.stoppedAt)}</td><td>${formatDateTime(session.imageDateTime)}</td><td>${formatDuration(session.durationMs)}</td><td>${session.mode}</td><td>${session.imageFileName || session.imageId}</td>`;
    elements.timelineBody.appendChild(tr);
  });

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="5">no sessions for this filter.</td>';
    elements.timelineBody.appendChild(tr);
  }
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
  elements.roundsInput.value = String(state.drillRounds);
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
    const formatted = formatDuration(latestSelected.timer.elapsedMs);
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

async function loadImages() {
  const response = await fetch("/api/images");
  if (!response.ok) {
    throw new Error("Failed to load images");
  }
  const payload = await response.json();
  state.images = payload.images || [];
}

async function loadRemoteState() {
  const response = await fetch("/api/state");
  if (!response.ok) {
    throw new Error("Failed to load state");
  }
  const payload = await response.json();
  state.queue = payload.queue || [];
  state.sessions = payload.sessions || [];
  state.settings = payload.settings || state.settings;
  state.drillSeconds = Number(state.settings.defaultDrillSeconds || state.drillSeconds);
}

async function reloadData() {
  await Promise.all([loadImages(), loadRemoteState()]);
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
  await performAction((selected) => apiPost("/api/sketch/start", { imageId: selected.id }));
}

async function pauseSketch() {
  await performAction((selected) => apiPost("/api/sketch/pause", { imageId: selected.id }));
}

async function stopSketch() {
  const result = await performAction((selected) =>
    apiPost("/api/sketch/stop", {
      imageId: selected.id,
      markSketched: true,
      mode: state.mode,
      drillConfig: state.mode === "drill" ? { seconds: state.drillSeconds, rounds: state.drillRounds } : null,
    })
  );

  if (!result) {
    return;
  }

  if (state.mode === "drill") {
    state.drillRoundsLeft = Math.max(1, state.drillRoundsLeft - 1);
  }

  if (state.settings.autoAdvance) {
    const nextImageId = getNextImageCandidate(result.nextQueueImageId);
    if (nextImageId) {
      state.selectedId = nextImageId;
      render();
      if (state.mode === "drill" && state.drillRoundsLeft > 0) {
        await startSketch();
      }
    }
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
  render();

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
  if (elements.timelineModal.classList.contains("is-hidden")) {
    document.body.classList.remove("modal-open");
  }
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

function closeHelpModal() {
  elements.helpModal.classList.add("is-hidden");
  if (elements.focusModal.classList.contains("is-hidden") && elements.timelineModal.classList.contains("is-hidden")) {
    document.body.classList.remove("modal-open");
  }
}

function closeTimelineModal() {
  elements.timelineModal.classList.add("is-hidden");
  if (elements.focusModal.classList.contains("is-hidden")) {
    document.body.classList.remove("modal-open");
  }
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
    render();
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
      state.drillRoundsLeft = Number(elements.roundsInput.value || 1);
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

  elements.roundsInput.addEventListener("change", () => {
    state.drillRounds = Math.max(1, Number(elements.roundsInput.value || 1));
    state.drillRoundsLeft = state.drillRounds;
    render();
  });

  elements.autoAdvanceToggle.addEventListener("change", async () => {
    await apiPost("/api/settings", { autoAdvance: Boolean(elements.autoAdvanceToggle.checked) });
    await loadRemoteState();
    render();
  });

  elements.startBtn.addEventListener("click", startSketch);
  elements.pauseBtn.addEventListener("click", pauseSketch);
  elements.stopBtn.addEventListener("click", stopSketch);
  elements.markBtn.addEventListener("click", toggleSelectedSketchStatus);

  elements.modalStartBtn.addEventListener("click", startSketch);
  elements.modalPauseBtn.addEventListener("click", pauseSketch);
  elements.modalStopBtn.addEventListener("click", stopSketch);
  elements.modalMarkBtn.addEventListener("click", toggleSelectedSketchStatus);

  elements.randomBtn.addEventListener("click", chooseRandomImage);

  elements.queueAddBtn.addEventListener("click", addSelectedToQueue);

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
  elements.timelineModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeTimeline === "true") {
      closeTimelineModal();
    }
  });

  elements.closeHelpBtn.addEventListener("click", closeHelpModal);
  elements.helpModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeHelp === "true") {
      closeHelpModal();
    }
  });

  window.addEventListener("keydown", async (event) => {
    if (event.key === "Escape") {
      closeFocusModal();
      closeTimelineModal();
      closeHelpModal();
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
  await reloadData();
  state.drillSeconds = Number(state.settings.defaultDrillSeconds || state.drillSeconds);
  state.drillRounds = Number(elements.roundsInput.value || 1);
  state.drillRoundsLeft = state.drillRounds;
  state.selectedId = state.images[0]?.id || null;
  render();
}

init().catch((error) => {
  elements.galleryCount.textContent = `Error: ${error.message}`;
});
