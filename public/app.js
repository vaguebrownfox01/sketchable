const state = {
  images: [],
  filtered: [],
  selectedId: null,
  activeTab: "available",
  activeRange: "all",
  query: "",
  timerInterval: null,
};

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
    return "Unknown";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
}

function getDisplayDate(image) {
  if (!image?.parsedDate) {
    return "Undated reference";
  }
  return `${image.parsedDate.date} ${image.parsedDate.time}`;
}

function getSelectedImage() {
  return state.images.find((item) => item.id === state.selectedId) || null;
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
  if (!targetMonth) {
    return false;
  }

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
    thumb.alt = image.fileName;
    title.textContent = image.fileName;
    subtitle.textContent = image.parsedDate ? `${image.parsedDate.date} ${image.parsedDate.time}` : "No date in filename";
    detail.textContent = state.activeTab === "sketched"
      ? `Done: ${formatDateTime(image.sketchedAt)} · ${formatDuration(image.durationMs)}`
      : `Folder: ${image.folder}`;

    button.addEventListener("click", () => {
      state.selectedId = image.id;
      render();
    });

    elements.galleryGrid.appendChild(fragment);
  });

  elements.galleryCount.textContent = `${state.filtered.length} image${state.filtered.length === 1 ? "" : "s"} in ${state.activeTab}`;
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

function renderViewer() {
  const image = getSelectedImage();
  const hasSelection = Boolean(image);

  elements.emptyViewer.classList.toggle("is-hidden", hasSelection);
  elements.viewerContent.classList.toggle("is-hidden", !hasSelection);

  if (!image) {
    return;
  }

  elements.viewerTitle.textContent = getDisplayDate(image);
  elements.viewerSubtitle.textContent = `${image.fileName} · ${image.folder}`;
  elements.viewerImage.src = image.imageUrl;
  elements.timerDisplay.textContent = formatDuration(image.timer?.elapsedMs || 0);
  elements.markBtn.textContent = image.isSketched ? "Mark Available" : "Mark Sketched";

  if (image.isSketched) {
    elements.historyMeta.textContent = `Sketched at ${formatDateTime(image.sketchedAt)} · Duration ${formatDuration(image.durationMs)}`;
  } else {
    const last = image.history?.[image.history.length - 1];
    elements.historyMeta.textContent = last
      ? `Last session: ${formatDateTime(last.stoppedAt)} · ${formatDuration(last.durationMs)}`
      : "No completed sketch sessions yet.";
  }

  renderModalContent(image);
}

function renderModalContent(image) {
  elements.modalTitle.textContent = getDisplayDate(image);
  elements.modalSubtitle.textContent = `${image.fileName} · ${image.folder}`;
  elements.modalImage.src = image.imageUrl;
  elements.modalTimerDisplay.textContent = formatDuration(image.timer?.elapsedMs || 0);
  elements.modalMarkBtn.textContent = image.isSketched ? "Mark Available" : "Mark Sketched";
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
}

function render() {
  applyFilters();
  ensureSelection();
  renderTabs();
  renderGallery();
  renderViewer();
  refreshTimerTicker();
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

  state.timerInterval = setInterval(() => {
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
  }, 1000);
}

async function apiPost(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

async function performAction(action, options = {}) {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }

  await action(selected);
  await loadImages();

  if (state.activeTab === "sketched" && options.targetIsSketched === false) {
    state.activeTab = "available";
  }

  const exists = state.images.some((item) => item.id === selected.id);
  state.selectedId = exists ? selected.id : state.images[0]?.id || null;

  render();
}

function toggleSelectedSketchStatus() {
  const selected = getSelectedImage();
  if (!selected) {
    return;
  }

  const targetIsSketched = !selected.isSketched;
  performAction(
    () => apiPost("/api/sketch/mark", { imageId: selected.id, isSketched: targetIsSketched }),
    { targetIsSketched }
  );
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
  document.body.classList.remove("modal-open");
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

  elements.randomBtn.addEventListener("click", chooseRandomImage);

  elements.startBtn.addEventListener("click", () =>
    performAction((selected) => apiPost("/api/sketch/start", { imageId: selected.id }))
  );

  elements.pauseBtn.addEventListener("click", () =>
    performAction((selected) => apiPost("/api/sketch/pause", { imageId: selected.id }))
  );

  elements.stopBtn.addEventListener("click", () =>
    performAction((selected) => apiPost("/api/sketch/stop", { imageId: selected.id, markSketched: true }))
  );

  elements.markBtn.addEventListener("click", toggleSelectedSketchStatus);

  elements.modalStartBtn.addEventListener("click", () =>
    performAction((selected) => apiPost("/api/sketch/start", { imageId: selected.id }))
  );

  elements.modalPauseBtn.addEventListener("click", () =>
    performAction((selected) => apiPost("/api/sketch/pause", { imageId: selected.id }))
  );

  elements.modalStopBtn.addEventListener("click", () =>
    performAction((selected) => apiPost("/api/sketch/stop", { imageId: selected.id, markSketched: true }))
  );

  elements.modalMarkBtn.addEventListener("click", toggleSelectedSketchStatus);

  elements.focusBtn.addEventListener("click", openFocusModal);
  elements.closeModalBtn.addEventListener("click", closeFocusModal);
  elements.focusModal.addEventListener("click", (event) => {
    if (event.target && event.target.dataset.closeModal === "true") {
      closeFocusModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFocusModal();
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
    const ratio = Math.min(0.75, Math.max(0.3, x / bounds.width));
    elements.splitLayout.style.gridTemplateColumns = `minmax(320px, ${ratio}fr) 10px minmax(360px, ${1 - ratio}fr)`;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}

async function init() {
  attachEvents();
  await loadImages();
  state.selectedId = state.images[0]?.id || null;
  render();
}

init().catch((error) => {
  elements.galleryCount.textContent = `Error: ${error.message}`;
});
