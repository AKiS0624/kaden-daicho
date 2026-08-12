const CATEGORIES = ["キッチン", "リビング", "寝室", "浴室・洗面", "冷暖房", "その他"];
const STORAGE_KEY = "appliances-v1";
const COUNTER_KEY = "appliances-counter-v1";

let items = [];
let counter = 0;
let statusFilter = "active";
let categoryFilter = "all";
let query = "";
let disposingId = null;
let detailId = null;
let numberMode = "auto";
let pendingImport = null;

function padNumber(n) {
  return String(n).padStart(3, "0");
}

function qrImageUrl(number) {
  const data = encodeURIComponent(`KADEN-${padNumber(number)}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${data}`;
}

function load() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    items = [];
  }
  counter = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10) || 0;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(COUNTER_KEY, String(counter));
    document.getElementById("saveError").classList.add("hidden");
    return true;
  } catch {
    const el = document.getElementById("saveError");
    el.textContent = "保存に失敗しました。もう一度お試しください。";
    el.classList.remove("hidden");
    return false;
  }
}

function icons() {
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function populateCategorySelects() {
  const catFilter = document.getElementById("categoryFilter");
  const fCategory = document.getElementById("f_category");
  CATEGORIES.forEach((c) => {
    const opt1 = document.createElement("option");
    opt1.value = c; opt1.textContent = c;
    catFilter.appendChild(opt1);
    const opt2 = document.createElement("option");
    opt2.value = c; opt2.textContent = c;
    fCategory.appendChild(opt2);
  });
}

function getFiltered() {
  return items
    .filter((it) => {
      if (statusFilter === "active" && it.status !== "active") return false;
      if (statusFilter === "disposed" && it.status !== "disposed") return false;
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = [padNumber(it.number), it.name, it.manufacturer, it.modelNumber, it.category, it.location, it.purchasePlace, it.memo]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.number - a.number);
}

function render() {
  document.getElementById("activeCount").textContent = items.filter((i) => i.status === "active").length;
  document.getElementById("disposedCount").textContent = items.filter((i) => i.status === "disposed").length;

  document.querySelectorAll(".status-btn").forEach((btn) => {
    const active = btn.dataset.status === statusFilter;
    btn.className = "status-btn shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition " +
      (active ? "bg-[#1F2421] text-white border-[#1F2421]" : "bg-white text-[#6B7280] border-[#D8D8D0]");
  });

  const filtered = getFiltered();
  const list = document.getElementById("itemList");
  const empty = document.getElementById("emptyState");

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    document.getElementById("emptyMessage").textContent =
      items.length === 0 ? "まだ登録された家電がありません" : "条件に一致する家電が見つかりません";
  } else {
    empty.classList.add("hidden");
    list.innerHTML = filtered.map((it) => `
      <li data-id="${it.id}" class="item-row plate-texture bg-white border rounded-xl px-4 py-3 cursor-pointer transition hover:border-[#F2A900] ${it.status === "disposed" ? "border-[#D8D8D0] opacity-60" : "border-[#D8D8D0]"}">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="font-mono-plate text-[11px] font-bold text-white bg-[#1F2421] rounded px-1.5 py-0.5">No.${padNumber(it.number)}</span>
              ${it.status === "disposed" ? `<span class="font-mono-plate text-[10px] uppercase tracking-wide text-[#B54834] border border-[#B54834]/40 rounded px-1.5 py-0.5">廃棄済み</span>` : ""}
            </div>
            <div class="font-semibold text-[15px] truncate">
              ${escapeHtml(it.name)}
              ${(it.manufacturer || it.modelNumber) ? `<span class="ml-1.5 font-mono-plate text-[11px] font-normal text-[#6B7280]">${escapeHtml([it.manufacturer, it.modelNumber].filter(Boolean).join(" "))}</span>` : ""}
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[#6B7280]">
              <span class="inline-flex items-center gap-1"><i data-lucide="tag" style="width:12px;height:12px"></i> ${escapeHtml(it.category)}</span>
              ${it.location ? `<span class="inline-flex items-center gap-1"><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${escapeHtml(it.location)}</span>` : ""}
              ${it.purchaseDate ? `<span class="inline-flex items-center gap-1"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${it.purchaseDate}</span>` : ""}
            </div>
          </div>
        </div>
      </li>
    `).join("");
    list.querySelectorAll(".item-row").forEach((row) => {
      row.addEventListener("click", () => openDetail(row.dataset.id));
    });
  }
  icons();
}

// ---- Add form ----
let editingId = null;

function setNumberMode(mode) {
  numberMode = mode;
  document.getElementById("numModeAuto").className =
    "num-mode-btn flex-1 text-xs font-medium px-3 py-1.5 rounded-full border transition " +
    (mode === "auto" ? "bg-[#1F2421] text-white border-[#1F2421]" : "bg-white text-[#6B7280] border-[#D8D8D0]");
  document.getElementById("numModeManual").className =
    "num-mode-btn flex-1 text-xs font-medium px-3 py-1.5 rounded-full border transition " +
    (mode === "manual" ? "bg-[#1F2421] text-white border-[#1F2421]" : "bg-white text-[#6B7280] border-[#D8D8D0]");
  document.getElementById("f_manualNumber").classList.toggle("hidden", mode !== "manual");
}

function openAddForm() {
  editingId = null;
  ["f_name", "f_manufacturer", "f_modelNumber", "f_purchaseDate", "f_purchasePlace", "f_price", "f_location", "f_warrantyMonths", "f_memo"]
    .forEach((id) => { document.getElementById(id).value = ""; });
  document.getElementById("f_category").value = CATEGORIES[0];
  document.getElementById("f_manualNumber").value = String(counter + 1);
  document.getElementById("numModeAuto").textContent = `連番(次は No.${padNumber(counter + 1)})`;
  setNumberMode("auto");
  document.getElementById("formTitle").textContent = "家電を登録";
  document.getElementById("submitAddBtn").textContent = "登録する";
  document.getElementById("editNumberNote").classList.add("hidden");
  document.getElementById("numberModeSection").classList.remove("hidden");
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("addModal").classList.remove("hidden");
  document.getElementById("addModal").classList.add("flex");
}

function openEditForm(id) {
  const it = items.find((i) => i.id === id);
  if (!it) return;
  editingId = id;
  document.getElementById("f_name").value = it.name || "";
  document.getElementById("f_manufacturer").value = it.manufacturer || "";
  document.getElementById("f_modelNumber").value = it.modelNumber || "";
  document.getElementById("f_category").value = it.category || CATEGORIES[0];
  document.getElementById("f_purchaseDate").value = it.purchaseDate || "";
  document.getElementById("f_purchasePlace").value = it.purchasePlace || "";
  document.getElementById("f_price").value = it.price || "";
  document.getElementById("f_location").value = it.location || "";
  document.getElementById("f_warrantyMonths").value = it.warrantyMonths || "";
  document.getElementById("f_memo").value = it.memo || "";
  document.getElementById("formTitle").textContent = "家電を編集";
  document.getElementById("submitAddBtn").textContent = "変更を保存";
  document.getElementById("editNumberValue").textContent = `No.${padNumber(it.number)}`;
  document.getElementById("editNumberNote").classList.remove("hidden");
  document.getElementById("numberModeSection").classList.add("hidden");
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("addModal").classList.remove("hidden");
  document.getElementById("addModal").classList.add("flex");
}

function closeAddForm() {
  document.getElementById("addModal").classList.add("hidden");
  document.getElementById("addModal").classList.remove("flex");
  editingId = null;
}
function showFormError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function submitAdd() {
  const name = document.getElementById("f_name").value.trim();
  if (!name) { showFormError("品名を入力してください"); return; }

  if (editingId) {
    const it = items.find((i) => i.id === editingId);
    if (!it) { closeAddForm(); return; }
    it.name = name;
    it.manufacturer = document.getElementById("f_manufacturer").value.trim();
    it.modelNumber = document.getElementById("f_modelNumber").value.trim();
    it.category = document.getElementById("f_category").value;
    it.purchaseDate = document.getElementById("f_purchaseDate").value;
    it.purchasePlace = document.getElementById("f_purchasePlace").value.trim();
    it.price = document.getElementById("f_price").value;
    it.location = document.getElementById("f_location").value.trim();
    it.warrantyMonths = document.getElementById("f_warrantyMonths").value;
    it.memo = document.getElementById("f_memo").value.trim();
    save();
    closeAddForm();
    render();
    return;
  }

  let numberToUse;
  if (numberMode === "manual") {
    const raw = document.getElementById("f_manualNumber").value;
    const n = parseInt(raw, 10);
    if (!raw.trim() || Number.isNaN(n) || n <= 0) { showFormError("1以上の番号を入力してください"); return; }
    if (items.some((it) => it.number === n)) { showFormError(`No.${padNumber(n)} はすでに使われています`); return; }
    numberToUse = n;
  } else {
    numberToUse = counter + 1;
  }

  const newItem = {
    id: `${Date.now()}-${numberToUse}`,
    number: numberToUse,
    name,
    manufacturer: document.getElementById("f_manufacturer").value.trim(),
    modelNumber: document.getElementById("f_modelNumber").value.trim(),
    category: document.getElementById("f_category").value,
    purchaseDate: document.getElementById("f_purchaseDate").value,
    purchasePlace: document.getElementById("f_purchasePlace").value.trim(),
    price: document.getElementById("f_price").value,
    location: document.getElementById("f_location").value.trim(),
    warrantyMonths: document.getElementById("f_warrantyMonths").value,
    memo: document.getElementById("f_memo").value.trim(),
    status: "active",
    disposalDate: "",
  };
  items.push(newItem);
  counter = Math.max(counter, numberToUse);
  save();
  closeAddForm();
  render();
}

document.getElementById("openAddBtn").addEventListener("click", openAddForm);
document.getElementById("closeAddBtn").addEventListener("click", closeAddForm);
document.getElementById("submitAddBtn").addEventListener("click", submitAdd);
document.getElementById("numModeAuto").addEventListener("click", () => setNumberMode("auto"));
document.getElementById("numModeManual").addEventListener("click", () => setNumberMode("manual"));

// ---- Detail modal ----
function openDetail(id) {
  const it = items.find((i) => i.id === id);
  if (!it) return;
  detailId = id;
  document.getElementById("d_number").textContent = `No.${padNumber(it.number)}`;
  document.getElementById("d_name").textContent = it.name;
  document.getElementById("d_qrImg").src = qrImageUrl(it.number);
  const rows = [
    ["メーカー", it.manufacturer || "—"],
    ["型番", it.modelNumber || "—"],
    ["カテゴリ", it.category],
    ["購入日", it.purchaseDate || "—"],
    ["価格", it.price ? `¥${Number(it.price).toLocaleString()}` : "—"],
    ["購入場所", it.purchasePlace || "—"],
    ["設置場所", it.location || "—"],
    ["保証期間", it.warrantyMonths ? `${it.warrantyMonths}ヶ月` : "—"],
    ["状態", it.status === "disposed" ? `廃棄済み(${it.disposalDate})` : "使用中"],
  ];
  const rowsHtml = rows.map(([label, value]) => `
    <div class="flex justify-between py-2 gap-4">
      <dt class="text-[#6B7280] shrink-0">${label}</dt>
      <dd class="text-right font-medium break-words">${escapeHtml(String(value))}</dd>
    </div>
  `).join("");
  const memoHtml = `
    <div class="py-2">
      <dt class="text-[#6B7280] mb-1">メモ</dt>
      <dd class="font-medium break-words" style="white-space: pre-wrap;">${escapeHtml(it.memo || "—")}</dd>
    </div>
  `;
  document.getElementById("d_rows").innerHTML = rowsHtml + memoHtml;

  document.getElementById("d_disposeBtn").classList.toggle("hidden", it.status !== "active");
  document.getElementById("d_restoreBtn").classList.toggle("hidden", it.status === "active");

  document.getElementById("detailModal").classList.remove("hidden");
  document.getElementById("detailModal").classList.add("flex");
  icons();
}
function closeDetail() {
  document.getElementById("detailModal").classList.add("hidden");
  document.getElementById("detailModal").classList.remove("flex");
  detailId = null;
}
document.getElementById("closeDetailBtn").addEventListener("click", closeDetail);

document.getElementById("d_editBtn").addEventListener("click", () => {
  const id = detailId;
  closeDetail();
  openEditForm(id);
});
document.getElementById("d_disposeBtn").addEventListener("click", () => {
  const id = detailId;
  closeDetail();
  startDispose(id);
});
document.getElementById("d_restoreBtn").addEventListener("click", () => {
  const it = items.find((i) => i.id === detailId);
  if (it) { it.status = "active"; it.disposalDate = ""; save(); render(); }
  closeDetail();
});
document.getElementById("d_deleteBtn").addEventListener("click", () => {
  items = items.filter((i) => i.id !== detailId);
  save();
  closeDetail();
  render();
});

// ---- Dispose modal ----
function startDispose(id) {
  disposingId = id;
  document.getElementById("disposalDateInput").value = new Date().toISOString().slice(0, 10);
  document.getElementById("disposeModal").classList.remove("hidden");
  document.getElementById("disposeModal").classList.add("flex");
}
function closeDispose() {
  document.getElementById("disposeModal").classList.add("hidden");
  document.getElementById("disposeModal").classList.remove("flex");
  disposingId = null;
}
document.getElementById("disposeCancelBtn").addEventListener("click", closeDispose);
document.getElementById("disposeConfirmBtn").addEventListener("click", () => {
  const it = items.find((i) => i.id === disposingId);
  if (it) {
    it.status = "disposed";
    it.disposalDate = document.getElementById("disposalDateInput").value;
    save();
    render();
  }
  closeDispose();
});

// ---- Filters ----
document.getElementById("statusFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".status-btn");
  if (!btn) return;
  statusFilter = btn.dataset.status;
  render();
});
document.getElementById("categoryFilter").addEventListener("change", (e) => {
  categoryFilter = e.target.value;
  render();
});
document.getElementById("searchInput").addEventListener("input", (e) => {
  query = e.target.value;
  render();
});

// ---- Backup export / import ----
document.getElementById("exportBtn").addEventListener("click", () => {
  const payload = { exportedAt: new Date().toISOString(), counter, items };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaden-daicho-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importError").classList.add("hidden");
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || !Array.isArray(parsed.items)) throw new Error("invalid");
      pendingImport = parsed;
      document.getElementById("importCount").textContent = `このファイルには ${parsed.items.length} 件の家電データが含まれています。`;
      document.getElementById("importModal").classList.remove("hidden");
      document.getElementById("importModal").classList.add("flex");
    } catch {
      const el = document.getElementById("importError");
      el.textContent = "ファイルの形式が正しくありません。書き出したバックアップファイルを選んでください。";
      el.classList.remove("hidden");
    }
  };
  reader.onerror = () => {
    const el = document.getElementById("importError");
    el.textContent = "ファイルを読み込めませんでした。";
    el.classList.remove("hidden");
  };
  reader.readAsText(file);
});
document.getElementById("importCancelBtn").addEventListener("click", () => {
  pendingImport = null;
  document.getElementById("importModal").classList.add("hidden");
  document.getElementById("importModal").classList.remove("flex");
});
document.getElementById("importConfirmBtn").addEventListener("click", () => {
  if (!pendingImport) return;
  items = pendingImport.items;
  const maxNumber = items.reduce((m, it) => Math.max(m, Number(it.number) || 0), 0);
  counter = typeof pendingImport.counter === "number" ? Math.max(pendingImport.counter, maxNumber) : maxNumber;
  save();
  pendingImport = null;
  document.getElementById("importModal").classList.add("hidden");
  document.getElementById("importModal").classList.remove("flex");
  render();
});

// ---- QR scanner ----
let scanStream = null;
let scanRAF = null;
let scanDetected = false;
const scannerSupported = "BarcodeDetector" in window;

function openScanner() {
  document.getElementById("scanMessage").classList.add("hidden");
  scanDetected = false;
  document.getElementById("scannerModal").classList.remove("hidden");
  document.getElementById("scannerModal").classList.add("flex");

  if (!scannerSupported) {
    document.getElementById("scannerVideoWrap").classList.add("hidden");
    document.getElementById("scannerUnsupported").classList.remove("hidden");
    return;
  }
  document.getElementById("scannerVideoWrap").classList.remove("hidden");
  document.getElementById("scannerUnsupported").classList.add("hidden");

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then((stream) => {
      scanStream = stream;
      const video = document.getElementById("scannerVideo");
      video.srcObject = stream;
      return video.play();
    })
    .then(() => {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const video = document.getElementById("scannerVideo");
      const tick = async () => {
        if (scanDetected || !scanStream) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              handleScanResult(codes[0].rawValue);
              return;
            }
          }
        } catch {
          // ignore single-frame errors
        }
        scanRAF = requestAnimationFrame(tick);
      };
      tick();
    })
    .catch(() => {
      const el = document.getElementById("scanMessage");
      el.textContent = "カメラを利用できませんでした。カメラへのアクセスを許可しているか確認してください。";
      el.classList.remove("hidden");
    });
}

function closeScanner() {
  document.getElementById("scannerModal").classList.add("hidden");
  document.getElementById("scannerModal").classList.remove("flex");
  if (scanRAF) cancelAnimationFrame(scanRAF);
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
}

function handleScanResult(raw) {
  const match = String(raw).match(/(\d{1,6})/);
  if (!match) {
    const el = document.getElementById("scanMessage");
    el.textContent = "番号を読み取れませんでした。もう一度お試しください。";
    el.classList.remove("hidden");
    scanRAF = requestAnimationFrame(function retry() {
      if (scanDetected) return;
      scanRAF = requestAnimationFrame(retry);
    });
    return;
  }
  const num = parseInt(match[1], 10);
  const found = items.find((it) => it.number === num);
  if (found) {
    scanDetected = true;
    closeScanner();
    openDetail(found.id);
  } else {
    const el = document.getElementById("scanMessage");
    el.textContent = `No.${padNumber(num)} は登録されていません`;
    el.classList.remove("hidden");
    scanRAF = requestAnimationFrame(function retry() {
      if (scanDetected) return;
      scanRAF = requestAnimationFrame(retry);
    });
  }
}

document.getElementById("openScannerBtn").addEventListener("click", openScanner);
document.getElementById("closeScannerBtn").addEventListener("click", closeScanner);

// ---- Init ----
populateCategorySelects();
load();
render();

// ---- PWA: register service worker ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
