const sizeInput = document.getElementById("sizeInput");
const spaceInput = document.getElementById("spaceInput");
const lengthInput = document.getElementById("lengthInput");
const algoSelect = document.getElementById("algoSelect");

const sizeValue = document.getElementById("sizeValue");
const spaceValue = document.getElementById("spaceValue");
const lengthValue = document.getElementById("lengthValue");

const generateBtn = document.getElementById("generateBtn");
const stepBtn = document.getElementById("stepBtn");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");

const traceEl = document.getElementById("trace");
const cacheView = document.getElementById("cacheView");
const hitsText = document.getElementById("hitsText");
const missesText = document.getElementById("missesText");
const rateText = document.getElementById("rateText");
const evictionsText = document.getElementById("evictionsText");

const timeline = document.getElementById("timeline");
const tctx = timeline.getContext("2d");

let trace = [];
let pointer = 0;
let cache = [];
let meta = {};
let hits = 0;
let misses = 0;
let evictions = 0;
let steps = [];
let runTimer = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTrace() {
  const len = Number(lengthInput.value);
  const space = Number(spaceInput.value);

  trace = [];
  for (let i = 0; i < len; i += 1) {
    if (Math.random() < 0.62 && trace.length > 0) {
      const hot = trace[Math.floor(Math.random() * Math.max(1, trace.length * 0.35))];
      trace.push(hot);
    } else {
      trace.push(randomInt(1, space));
    }
  }

  resetSimulation();
  renderTrace();
}

function resetSimulation() {
  pointer = 0;
  cache = [];
  meta = {};
  hits = 0;
  misses = 0;
  evictions = 0;
  steps = [];
  if (runTimer) {
    clearInterval(runTimer);
    runTimer = null;
    runBtn.textContent = "Run All";
  }
  renderCache();
  renderMetrics();
  drawTimeline();
}

function renderTrace(active = -1, result = "") {
  traceEl.innerHTML = "";
  trace.forEach((addr, index) => {
    const token = document.createElement("div");
    token.className = "token";
    if (index === active) token.classList.add("active");
    if (index === active && result === "hit") token.classList.add("hit");
    if (index === active && result === "miss") token.classList.add("miss");
    token.textContent = String(addr);
    traceEl.appendChild(token);
  });
}

function renderCache() {
  const size = Number(sizeInput.value);
  cacheView.innerHTML = "";

  for (let i = 0; i < size; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = cache[i] !== undefined ? String(cache[i]) : "-";
    cacheView.appendChild(slot);
  }
}

function renderMetrics() {
  hitsText.textContent = String(hits);
  missesText.textContent = String(misses);
  evictionsText.textContent = String(evictions);
  const total = hits + misses;
  rateText.textContent = `${(total ? (hits / total) * 100 : 0).toFixed(1)}%`;
}

function chooseVictim(algo) {
  if (algo === "fifo") {
    let oldest = cache[0];
    cache.forEach((addr) => {
      if ((meta[addr]?.insertOrder ?? Infinity) < (meta[oldest]?.insertOrder ?? Infinity)) {
        oldest = addr;
      }
    });
    return oldest;
  }

  if (algo === "lru") {
    let oldest = cache[0];
    cache.forEach((addr) => {
      if ((meta[addr]?.lastUsed ?? Infinity) < (meta[oldest]?.lastUsed ?? Infinity)) {
        oldest = addr;
      }
    });
    return oldest;
  }

  // lfu
  let weakest = cache[0];
  cache.forEach((addr) => {
    const a = meta[addr];
    const b = meta[weakest];
    if (a.freq < b.freq || (a.freq === b.freq && a.lastUsed < b.lastUsed)) {
      weakest = addr;
    }
  });
  return weakest;
}

function stepOnce() {
  if (pointer >= trace.length) return;

  const addr = trace[pointer];
  const algo = algoSelect.value;
  let result;

  if (cache.includes(addr)) {
    hits += 1;
    result = "hit";
    meta[addr].lastUsed = pointer;
    meta[addr].freq += 1;
  } else {
    misses += 1;
    result = "miss";

    if (cache.length < Number(sizeInput.value)) {
      cache.push(addr);
    } else {
      const victim = chooseVictim(algo);
      cache = cache.filter((x) => x !== victim);
      delete meta[victim];
      cache.push(addr);
      evictions += 1;
    }

    meta[addr] = {
      insertOrder: pointer,
      lastUsed: pointer,
      freq: (meta[addr]?.freq ?? 0) + 1,
    };
  }

  steps.push({ index: pointer, result });
  pointer += 1;

  renderTrace(pointer - 1, result);
  renderCache();
  renderMetrics();
  drawTimeline();
}

function drawTimeline() {
  const w = timeline.width;
  const h = timeline.height;
  tctx.clearRect(0, 0, w, h);
  tctx.fillStyle = "#101918";
  tctx.fillRect(0, 0, w, h);

  if (!steps.length) return;

  const barW = w / Math.max(steps.length, 1);
  steps.forEach((s, i) => {
    const x = i * barW;
    const color = s.result === "hit" ? "#66e1b0" : "#ff9898";
    tctx.fillStyle = color;
    tctx.fillRect(x, 0, Math.max(1, barW - 1), h - 30);
  });

  tctx.fillStyle = "#d8ebe6";
  tctx.font = "12px monospace";
  tctx.fillText(`Steps: ${steps.length}`, 10, h - 10);
  tctx.fillText(`Hit ${hits} / Miss ${misses}`, 140, h - 10);
}

function syncLabels() {
  sizeValue.textContent = sizeInput.value;
  spaceValue.textContent = spaceInput.value;
  lengthValue.textContent = lengthInput.value;
}

[sizeInput, spaceInput, lengthInput].forEach((el) => {
  el.addEventListener("input", () => {
    syncLabels();
  });
});

generateBtn.addEventListener("click", generateTrace);
stepBtn.addEventListener("click", stepOnce);
runBtn.addEventListener("click", () => {
  if (runTimer) {
    clearInterval(runTimer);
    runTimer = null;
    runBtn.textContent = "Run All";
    return;
  }
  runTimer = setInterval(() => {
    if (pointer >= trace.length) {
      clearInterval(runTimer);
      runTimer = null;
      runBtn.textContent = "Run All";
      return;
    }
    stepOnce();
  }, 75);
  runBtn.textContent = "Stop";
});
resetBtn.addEventListener("click", () => {
  resetSimulation();
  renderTrace();
});

syncLabels();
generateTrace();
