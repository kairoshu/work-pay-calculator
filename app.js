const STORAGE_KEY = "workPayHistoryV1";
const DISPLAY_SETTINGS_KEY = "workPayDisplaySettingsV1";
const MINUTE_MS = 60 * 1000;
const REGULAR_LIMIT_MINUTES = 8 * 60;

const startInput = document.getElementById("startDateTime");
const endInput = document.getElementById("endDateTime");
const hourlyWageInput = document.getElementById("hourlyWage");
const overtimeRateInput = document.getElementById("overtimeRate");
const nightRateInput = document.getElementById("nightRate");
const breakEnabledInput = document.getElementById("breakEnabled");
const breakSectionElement = document.getElementById("breakSection");
const breakListElement = document.getElementById("breakList");
const addBreakBtn = document.getElementById("addBreakBtn");
const dateTimeModeToggle = document.getElementById("dateTimeModeToggle");

const errorMessageElement = document.getElementById("errorMessage");
const resultCardElement = document.getElementById("resultCard");
const historyListElement = document.getElementById("historyList");
const historyTotalPayElement = document.getElementById("historyTotalPay");

const displaySettingsBtn = document.getElementById("displaySettingsBtn");
const displaySettingsPanel = document.getElementById("displaySettingsPanel");
const displayOptionInputs = [...document.querySelectorAll("[data-display-key]")];

const resultElements = {
  boundTime: document.getElementById("boundTime"),
  totalWork: document.getElementById("totalWork"),
  regularTime: document.getElementById("regularTime"),
  regularBreak: document.getElementById("regularBreak"),
  regularRate: document.getElementById("regularRate"),
  regularWork: document.getElementById("regularWork"),
  overtimeTime: document.getElementById("overtimeTime"),
  overtimeBreak: document.getElementById("overtimeBreak"),
  overtimeWork: document.getElementById("overtimeWork"),
  overtimeRate: document.getElementById("overtimeRateResult"),
  nightTime: document.getElementById("nightTime"),
  nightBreak: document.getElementById("nightBreak"),
  nightWork: document.getElementById("nightWork"),
  nightRate: document.getElementById("nightRateResult"),
  overtimeNightTime: document.getElementById("overtimeNightTime"),
  overtimeNightRate: document.getElementById("overtimeNightRateResult"),
  overtimeNightBreak: document.getElementById("overtimeNightBreak"),
  overtimeNightWork: document.getElementById("overtimeNightWork"),
  dailyPay: document.getElementById("dailyPay")
};

const resultRows = {};
document.querySelectorAll("[data-result-key]").forEach((element) => {
  resultRows[element.dataset.resultKey] = element;
});

let lastVisibilityContext = {
  hasBreaks: false,
  categoryWork: {
    regular: 0,
    overtime: 0,
    night: 0,
    overtimeNight: 0
  }
};

document.getElementById("calculateBtn").addEventListener("click", calculate);
document.getElementById("clearAllHistoryBtn").addEventListener("click", clearAllHistory);
dateTimeModeToggle.addEventListener("click", () => {
  const calendarMode = document.body.classList.toggle("calendar-input-mode");
  const nextMode = calendarMode ? "スクロール入力" : "カレンダー入力";
  dateTimeModeToggle.textContent = calendarMode ? "↕️" : "📅";
  dateTimeModeToggle.setAttribute("aria-label", `${nextMode}に切り替え`);
  dateTimeModeToggle.title = `${nextMode}に切り替え`;
});
breakEnabledInput.addEventListener("change", handleBreakEnabledChange);
addBreakBtn.addEventListener("click", () => {
  const rows = [...breakListElement.querySelectorAll(".break-row")];

  if (rows.length === 0) {
    const baseDate = getDatePart(startInput.value);
    addBreakRow(
      baseDate ? `${baseDate}T00:00` : "",
      baseDate ? `${baseDate}T00:00` : ""
    );
    return;
  }

  const lastRow = rows[rows.length - 1];
  const lastStartValue = lastRow.querySelector(".break-start").value;
  const lastEndValue = lastRow.querySelector(".break-end").value;

  const inheritedDate =
    getDatePart(lastEndValue) ||
    getDatePart(lastStartValue) ||
    getDatePart(startInput.value);

  addBreakRow(
    inheritedDate ? `${inheritedDate}T00:00` : "",
    inheritedDate ? `${inheritedDate}T00:00` : ""
  );
});

displaySettingsBtn.addEventListener("click", () => {
  displaySettingsPanel.hidden = !displaySettingsPanel.hidden;
});

displayOptionInputs.forEach((input) => {
  input.addEventListener("change", () => {
    saveDisplaySettings();
    applyResultVisibility();
  });
});

initializeDateTimes();
enhanceMobileDateTime(startInput);
enhanceMobileDateTime(endInput);
dateTimeModeToggle.hidden = false;
loadDisplaySettings();
applyResultVisibility();
renderHistory();

function initializeDateTimes() {
  const now = new Date();
  const start = roundToFiveMinutes(now);
  const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);

  startInput.value = toDateTimeLocalValue(start);
  endInput.value = toDateTimeLocalValue(end);
}

function roundToFiveMinutes(date) {
  const result = new Date(date);
  result.setSeconds(0, 0);
  const minutes = result.getMinutes();
  result.setMinutes(Math.ceil(minutes / 5) * 5);
  return result;
}

function toDateTimeLocalValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getDatePart(dateTimeValue) {
  if (!dateTimeValue || !dateTimeValue.includes("T")) {
    return "";
  }

  return dateTimeValue.split("T")[0];
}

function enhanceMobileDateTime(input) {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "mobile-datetime-trigger";
  input.classList.add("mobile-wheel-enabled");
  const field = document.createElement("div");
  field.className = "mobile-datetime-field";
  input.before(field);
  field.append(input, trigger);

  const label = input.closest(".form-group").querySelector("label").textContent;
  const refresh = () => {
    const value = input.value;
    const date = value ? new Date(value) : null;
    const display = date && !Number.isNaN(date.getTime())
      ? `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
      : "日時を選択";
    trigger.textContent = display;
    trigger.setAttribute("aria-label", `${label}: ${display}`);
  };

  input.addEventListener("input", refresh);
  trigger.addEventListener("click", () => openMobileDateTimePicker(input, trigger, label));
  refresh();
}

function openMobileDateTimePicker(input, trigger, label) {
  const selected = input.value ? new Date(input.value) : new Date();
  if (Number.isNaN(selected.getTime())) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "mobile-wheel-overlay";
  overlay.innerHTML = `
    <div class="mobile-wheel-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(label)}を選択">
      <div class="mobile-wheel-title">${escapeHtml(label)}</div>
      <div class="mobile-wheel-columns">
        <div class="mobile-wheel-selection" aria-hidden="true"></div>
      </div>
      <div class="mobile-wheel-actions">
        <button type="button" class="mobile-wheel-cancel">キャンセル</button>
        <button type="button" class="mobile-wheel-done">完了</button>
      </div>
    </div>
  `;

  const columns = overlay.querySelector(".mobile-wheel-columns");
  const dayOptions = [];
  for (let offset = -365; offset <= 365; offset += 1) {
    const date = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + offset);
    dayOptions.push(mobileDayOption(date));
  }

  const days = createMobileWheel("日付", dayOptions, 365);
  const hours = createMobileWheel("時", Array.from({length: 24}, (_, n) => ({value: String(n).padStart(2, "0"), label: String(n).padStart(2, "0")})), selected.getHours(), true);
  const minutes = createMobileWheel("分", Array.from({length: 60}, (_, n) => ({value: String(n).padStart(2, "0"), label: String(n).padStart(2, "0")})), selected.getMinutes(), true);
  columns.append(days, hours, minutes);
  document.body.appendChild(overlay);
  document.body.classList.add("mobile-wheel-open");

  for (const wheel of [days, hours, minutes]) {
    wheel.scrollTop = Number(wheel.dataset.initialIndex) * 44;
    updateMobileWheelSelection(wheel);
  }

  const close = () => {
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
    document.body.classList.remove("mobile-wheel-open");
    trigger.focus();
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };
  document.addEventListener("keydown", onKeydown);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector(".mobile-wheel-cancel").addEventListener("click", close);
  overlay.querySelector(".mobile-wheel-done").addEventListener("click", () => {
    const day = selectedMobileWheelValue(days);
    const hour = selectedMobileWheelValue(hours);
    const minute = selectedMobileWheelValue(minutes);
    input.value = `${day}T${hour}:${minute}`;
    input.dispatchEvent(new Event("input", {bubbles: true}));
    input.dispatchEvent(new Event("change", {bubbles: true}));
    close();
  });
  overlay.querySelector(".mobile-wheel-done").focus();
}

function mobileDayOption(date) {
  const today = new Date();
  const dayLabel = `${date.getMonth() + 1}月${date.getDate()}日 ${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}`;
  return {
    value: getDatePart(toDateTimeLocalValue(date)),
    label: date.toDateString() === today.toDateString() ? `今日 (${dayLabel})` : dayLabel
  };
}

function createMobileWheelOption(wheel, option) {
  const row = document.createElement("div");
  row.className = "mobile-wheel-option";
  row.setAttribute("role", "option");
  row.dataset.value = option.value;
  row.textContent = option.label;
  row.addEventListener("click", () => {
    wheel.scrollTop = Array.prototype.indexOf.call(wheel.children, row) * 44;
    normalizeMobileWheelPosition(wheel);
    updateMobileWheelSelection(wheel);
  });
  return row;
}

function createMobileWheel(label, options, initialIndex, loop = false) {
  const wheel = document.createElement("div");
  wheel.className = `mobile-wheel-column${label === "日付" ? " mobile-wheel-date" : ""}`;
  wheel.setAttribute("role", "listbox");
  wheel.setAttribute("aria-label", label);
  wheel.dataset.initialIndex = loop ? options.length * 2 + initialIndex : initialIndex;
  if (loop) wheel.dataset.loopLength = options.length;

  const fragment = document.createDocumentFragment();
  for (let cycle = 0; cycle < (loop ? 5 : 1); cycle += 1) {
    options.forEach((option) => fragment.appendChild(createMobileWheelOption(wheel, option)));
  }
  wheel.appendChild(fragment);
  wheel.addEventListener("scroll", () => {
    normalizeMobileWheelPosition(wheel);
    updateMobileWheelSelection(wheel);
  }, {passive: true});
  return wheel;
}

function normalizeMobileWheelPosition(wheel) {
  const length = Number(wheel.dataset.loopLength);
  if (!length) return;

  const index = Math.round(wheel.scrollTop / 44);
  if (index < length) {
    wheel.scrollTop += length * 2 * 44;
  } else if (index >= length * 4) {
    wheel.scrollTop -= length * 2 * 44;
  }
}

function selectedMobileWheelValue(wheel) {
  const index = Math.max(0, Math.min(wheel.children.length - 1, Math.round(wheel.scrollTop / 44)));
  return wheel.children[index].dataset.value;
}

function updateMobileWheelSelection(wheel) {
  const index = Math.max(0, Math.min(wheel.children.length - 1, Math.round(wheel.scrollTop / 44)));
  const previous = wheel.querySelector('[aria-selected="true"]');
  if (previous !== wheel.children[index]) {
    if (previous) previous.setAttribute("aria-selected", "false");
    wheel.children[index].setAttribute("aria-selected", "true");
  }
}

function handleBreakEnabledChange() {
  const enabled = breakEnabledInput.value === "yes";
  breakSectionElement.hidden = !enabled;

  if (enabled && breakListElement.children.length === 0) {
    const baseDate = getDatePart(startInput.value);
    addBreakRow(
      baseDate ? `${baseDate}T00:00` : "",
      baseDate ? `${baseDate}T00:00` : ""
    );
  }
}

function addBreakRow(startValue = "", endValue = "") {
  const row = document.createElement("div");
  row.className = "break-row";

  row.innerHTML = `
    <div class="break-row-header">
      <strong>休憩</strong>
      <button type="button" class="break-remove-btn">削除</button>
    </div>

    <div class="form-group">
      <label>休憩開始日時</label>
      <input type="datetime-local" class="break-start" value="${escapeHtml(startValue)}">
    </div>

    <div class="form-group">
      <label>休憩終了日時</label>
      <input type="datetime-local" class="break-end" value="${escapeHtml(endValue)}">
    </div>
  `;

  enhanceMobileDateTime(row.querySelector(".break-start"));
  enhanceMobileDateTime(row.querySelector(".break-end"));

  row.querySelector(".break-remove-btn").addEventListener("click", () => {
    row.remove();

    if (breakEnabledInput.value === "yes" && breakListElement.children.length === 0) {
      const baseDate = getDatePart(startInput.value);
      addBreakRow(
        baseDate ? `${baseDate}T00:00` : "",
        baseDate ? `${baseDate}T00:00` : ""
      );
    }
  });

  breakListElement.appendChild(row);
}

function getBreaksFromForm(workStart, workEnd) {
  if (breakEnabledInput.value !== "yes") {
    return [];
  }

  const rows = [...breakListElement.querySelectorAll(".break-row")];
  const breaks = [];

  for (let i = 0; i < rows.length; i += 1) {
    const startValue = rows[i].querySelector(".break-start").value;
    const endValue = rows[i].querySelector(".break-end").value;

    if (!startValue || !endValue) {
      throw new Error(`休憩${i + 1}の開始日時と終了日時を入力してください。`);
    }

    const start = new Date(startValue);
    const end = new Date(endValue);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error(`休憩${i + 1}の日時を正しく入力してください。`);
    }

    if (end <= start) {
      throw new Error(`休憩${i + 1}の終了日時は開始日時より後にしてください。`);
    }

    if (start < workStart || end > workEnd) {
      throw new Error(`休憩${i + 1}は勤務時間内に設定してください。`);
    }

    if (!isWholeMinute(start) || !isWholeMinute(end)) {
      throw new Error(`休憩${i + 1}は1分単位で入力してください。`);
    }

    breaks.push({ start, end });
  }

  breaks.sort((a, b) => a.start - b.start);

  for (let i = 1; i < breaks.length; i += 1) {
    if (breaks[i].start < breaks[i - 1].end) {
      throw new Error("休憩時間が重複しています。");
    }
  }

  return breaks;
}

function isWholeMinute(date) {
  return date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

function isNightMinute(date) {
  const hour = date.getHours();
  return hour >= 22 || hour < 5;
}

function isBreakMinute(timestamp, breaks) {
  return breaks.some((item) =>
    timestamp >= item.start.getTime() &&
    timestamp < item.end.getTime()
  );
}

function emptyCategory() {
  return {
    grossMinutes: 0,
    breakMinutes: 0,
    workMinutes: 0
  };
}

function classifyShift(start, end, breaks) {
  const totalMinutes = Math.round((end - start) / MINUTE_MS);
  const categories = {
    regular: emptyCategory(),
    overtime: emptyCategory(),
    night: emptyCategory(),
    overtimeNight: emptyCategory()
  };

  let workedMinutes = 0;

  for (let i = 0; i < totalMinutes; i += 1) {
    const timestamp = start.getTime() + i * MINUTE_MS;
    const current = new Date(timestamp);
    const onBreak = isBreakMinute(timestamp, breaks);
    const isOvertime = workedMinutes >= REGULAR_LIMIT_MINUTES;
    const isNight = isNightMinute(current);

    let key = "regular";

    if (isOvertime && isNight) {
      key = "overtimeNight";
    } else if (isOvertime) {
      key = "overtime";
    } else if (isNight) {
      key = "night";
    }

    categories[key].grossMinutes += 1;

    if (onBreak) {
      categories[key].breakMinutes += 1;
    } else {
      categories[key].workMinutes += 1;
      workedMinutes += 1;
    }
  }

  return {
    boundMinutes: totalMinutes,
    totalWorkMinutes: workedMinutes,
    totalBreakMinutes: totalMinutes - workedMinutes,
    categories
  };
}

function calculate() {
  errorMessageElement.textContent = "";

  const start = new Date(startInput.value);
  const end = new Date(endInput.value);
  const hourlyWage = Number(hourlyWageInput.value);
  const overtimeRate = Number(overtimeRateInput.value);
  const nightRate = Number(nightRateInput.value);

  if (!startInput.value || !endInput.value) {
    showError("勤務開始日時と勤務終了日時を入力してください。");
    return;
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    showError("日時の入力内容を確認してください。");
    return;
  }

  if (end <= start) {
    showError("勤務終了日時は勤務開始日時より後にしてください。");
    return;
  }

  if (!isWholeMinute(start) || !isWholeMinute(end)) {
    showError("勤務日時は1分単位で入力してください。");
    return;
  }

  if (!Number.isFinite(hourlyWage) || hourlyWage < 0) {
    showError("時給を正しく入力してください。");
    return;
  }

  if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
    showError("残業割増率を正しく入力してください。");
    return;
  }

  if (!Number.isFinite(nightRate) || nightRate < 0) {
    showError("深夜割増率を正しく入力してください。");
    return;
  }

  let breaks;

  try {
    breaks = getBreaksFromForm(start, end);
  } catch (error) {
    showError(error.message);
    return;
  }

  const result = classifyShift(start, end, breaks);

  if (result.totalWorkMinutes <= 0) {
    showError("休憩時間を除いた勤務時間がありません。");
    return;
  }

  const regularRate = hourlyWage;
  const overtimeHourlyRate = hourlyWage * (1 + overtimeRate / 100);
  const nightHourlyRate = hourlyWage * (1 + nightRate / 100);
  const overtimeNightHourlyRate =
    hourlyWage * (1 + (overtimeRate + nightRate) / 100);

  const dailyPayRaw =
    minutesToHours(result.categories.regular.workMinutes) * regularRate +
    minutesToHours(result.categories.overtime.workMinutes) * overtimeHourlyRate +
    minutesToHours(result.categories.night.workMinutes) * nightHourlyRate +
    minutesToHours(result.categories.overtimeNight.workMinutes) * overtimeNightHourlyRate;

  const dailyPay = Math.floor(dailyPayRaw);

  resultElements.boundTime.textContent = formatMinutes(result.boundMinutes);
  resultElements.totalWork.textContent = formatMinutes(result.totalWorkMinutes);

  resultElements.regularTime.textContent = formatMinutes(result.categories.regular.grossMinutes);
  resultElements.regularBreak.textContent = formatMinutes(result.categories.regular.breakMinutes);
  resultElements.regularRate.textContent = `${formatYen(Math.floor(regularRate))} 円`;
  resultElements.regularWork.textContent = formatMinutes(result.categories.regular.workMinutes);

  resultElements.overtimeTime.textContent = formatMinutes(result.categories.overtime.grossMinutes);
  resultElements.overtimeBreak.textContent = formatMinutes(result.categories.overtime.breakMinutes);
  resultElements.overtimeWork.textContent = formatMinutes(result.categories.overtime.workMinutes);
  resultElements.overtimeRate.textContent =
    `${formatYen(Math.floor(overtimeHourlyRate))} 円（+${formatYen(Math.floor(overtimeHourlyRate - hourlyWage))} 円）`;

  resultElements.nightTime.textContent = formatMinutes(result.categories.night.grossMinutes);
  resultElements.nightBreak.textContent = formatMinutes(result.categories.night.breakMinutes);
  resultElements.nightWork.textContent = formatMinutes(result.categories.night.workMinutes);
  resultElements.nightRate.textContent =
    `${formatYen(Math.floor(nightHourlyRate))} 円（+${formatYen(Math.floor(nightHourlyRate - hourlyWage))} 円）`;

  resultElements.overtimeNightTime.textContent =
    formatMinutes(result.categories.overtimeNight.grossMinutes);
  resultElements.overtimeNightRate.textContent =
    `${formatYen(Math.floor(overtimeNightHourlyRate))} 円（+${formatYen(Math.floor(overtimeNightHourlyRate - hourlyWage))} 円）`;
  resultElements.overtimeNightBreak.textContent =
    formatMinutes(result.categories.overtimeNight.breakMinutes);
  resultElements.overtimeNightWork.textContent =
    formatMinutes(result.categories.overtimeNight.workMinutes);

  resultElements.dailyPay.textContent = `${formatYen(dailyPay)} 円`;

  lastVisibilityContext = {
    hasBreaks: breaks.length > 0,
    categoryWork: {
      regular: result.categories.regular.workMinutes,
      overtime: result.categories.overtime.workMinutes,
      night: result.categories.night.workMinutes,
      overtimeNight: result.categories.overtimeNight.workMinutes
    }
  };

  applyResultVisibility();

  resultCardElement.hidden = false;

  saveHistory({
    version: 2,
    start: start.toISOString(),
    end: end.toISOString(),
    hourlyWage,
    overtimeRate,
    nightRate,
    boundMinutes: result.boundMinutes,
    totalWorkMinutes: result.totalWorkMinutes,
    totalBreakMinutes: result.totalBreakMinutes,
    categories: result.categories,
    breakCount: breaks.length,
    breaks: breaks.map((item) => ({
      start: item.start.toISOString(),
      end: item.end.toISOString()
    })),
    dailyPay
  });

  renderHistory();
}

function loadDisplaySettings() {
  const settings = getDisplaySettings();

  displayOptionInputs.forEach((input) => {
    if (Object.prototype.hasOwnProperty.call(settings, input.dataset.displayKey)) {
      input.checked = settings[input.dataset.displayKey];
    }
  });
}

function getDisplaySettings() {
  try {
    const raw = localStorage.getItem(DISPLAY_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDisplaySettings() {
  const settings = {};

  displayOptionInputs.forEach((input) => {
    settings[input.dataset.displayKey] = input.checked;
  });

  localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(settings));
}

function isDisplayEnabled(key) {
  const input = displayOptionInputs.find((item) => item.dataset.displayKey === key);
  return !input || input.checked;
}

function applyResultVisibility() {
  const breakOnlyKeys = new Set([
    "boundTime",
    "regularBreak",
    "overtimeBreak",
    "nightBreak",
    "overtimeNightBreak"
  ]);

  Object.entries(resultRows).forEach(([key, row]) => {
    let allowed = isDisplayEnabled(key);

    if (breakOnlyKeys.has(key) && !lastVisibilityContext.hasBreaks) {
      allowed = false;
    }

    if (key === "regularRate" && lastVisibilityContext.categoryWork.regular <= 0) {
      allowed = false;
    }

    if (key === "overtimeRate" && lastVisibilityContext.categoryWork.overtime <= 0) {
      allowed = false;
    }

    if (key === "nightRate" && lastVisibilityContext.categoryWork.night <= 0) {
      allowed = false;
    }

    if (key === "overtimeNightRate" && lastVisibilityContext.categoryWork.overtimeNight <= 0) {
      allowed = false;
    }

    row.hidden = !allowed;
  });
}

function minutesToHours(minutes) {
  return minutes / 60;
}

function formatMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (minutes === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${minutes}分`;
}

function formatYen(value) {
  return Math.trunc(Number(value) || 0).toLocaleString("ja-JP");
}

function formatDateTime(value) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatHistoryCopyRow(item) {
  const start = new Date(item.start);
  const end = new Date(item.end);
  const datePart = (date) =>
    `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  const timePart = (date) =>
    `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  const workMinutes = item.totalWorkMinutes ?? (Number(item.totalHours) || 0) * 60;
  const hours = Math.floor(Math.round(workMinutes) / 60);
  const minutes = Math.round(workMinutes) % 60;

  return [
    datePart(start),
    timePart(start),
    datePart(end),
    timePart(end),
    `${hours}:${String(minutes).padStart(2, "0")}`,
    `${formatYen(item.dailyPay)}円`
  ].join("\t");
}

async function copyHistoryItem(index, button) {
  const item = getHistory()[index];

  if (!item) {
    return;
  }

  const value = formatHistoryCopyRow(item);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        if (!document.execCommand("copy")) {
          throw new Error("Copy failed");
        }
      } finally {
        field.remove();
      }
    }

    button.textContent = "コピー済み";
    window.setTimeout(() => {
      if (button.isConnected) {
        button.textContent = "コピー";
      }
    }, 2000);
  } catch {
    alert("コピーできませんでした。ブラウザのクリップボード設定を確認してください。");
  }
}

function saveHistory(item) {
  const history = getHistory();

  history.unshift({
    ...item,
    savedAt: new Date().toISOString()
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
}

function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const history = JSON.parse(raw);
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();

  const totalPay = history.reduce((sum, item) => {
    const pay = Number(item.dailyPay);
    return sum + (Number.isFinite(pay) ? pay : 0);
  }, 0);

  historyTotalPayElement.textContent = `${formatYen(totalPay)} 円`;

  if (history.length === 0) {
    historyListElement.innerHTML = '<p class="empty">履歴はありません。</p>';
    return;
  }

  historyListElement.innerHTML = history.map((item, index) => {
    const detail = buildHistoryDetail(item);

    return `
      <article class="history-item">
        <div class="history-item-header">
          <p>${escapeHtml(formatDateTime(item.start))} ～ ${escapeHtml(formatDateTime(item.end))}</p>
          <div class="history-actions">
            <button
              type="button"
              class="history-copy-btn"
              data-history-index="${index}"
              aria-label="この履歴をコピー">コピー</button>
            <button
              type="button"
              class="history-delete-btn"
              data-history-index="${index}"
              aria-label="この履歴を削除">削除</button>
          </div>
        </div>
        <p>時給 ${formatYen(item.hourlyWage)}円 / 残業 +${item.overtimeRate}% / 深夜 +${item.nightRate}%</p>
        ${detail}
        <p class="history-pay">${formatYen(item.dailyPay)} 円</p>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".history-delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.historyIndex);
      deleteHistoryItem(index);
    });
  });

  document.querySelectorAll(".history-copy-btn").forEach((button) => {
    button.addEventListener("click", () => {
      copyHistoryItem(Number(button.dataset.historyIndex), button);
    });
  });
}

function buildHistoryDetail(item) {
  if (item.version === 2 && item.categories) {
    const c = item.categories;
    const hasBreaks = Number(item.breakCount) > 0;

    let html = `
      <p>総勤務 ${escapeHtml(formatMinutes(item.totalWorkMinutes))}${hasBreaks ? ` / 拘束 ${escapeHtml(formatMinutes(item.boundMinutes))}` : ""}</p>
      <p>通常 ${escapeHtml(formatMinutes(c.regular.workMinutes))} / 残業 ${escapeHtml(formatMinutes(c.overtime.workMinutes))} / 深夜 ${escapeHtml(formatMinutes(c.night.workMinutes))} / 残業＋深夜 ${escapeHtml(formatMinutes(c.overtimeNight.workMinutes))}</p>
    `;

    if (hasBreaks) {
      html += `
        <p>休憩合計 ${escapeHtml(formatMinutes(item.totalBreakMinutes))} / ${Number(item.breakCount) || 0}回</p>
        <p>休憩内訳：通常 ${escapeHtml(formatMinutes(c.regular.breakMinutes))} / 残業 ${escapeHtml(formatMinutes(c.overtime.breakMinutes))} / 深夜 ${escapeHtml(formatMinutes(c.night.breakMinutes))} / 残業＋深夜 ${escapeHtml(formatMinutes(c.overtimeNight.breakMinutes))}</p>
      `;
    }

    return html;
  }

  const totalHours = Number(item.totalHours) || 0;
  const overtimeHours = Number(item.overtimeHours) || 0;
  const nightHours = Number(item.nightHours) || 0;
  const breakHours = Number(item.breakHours) || 0;

  return `
    <p>勤務 ${escapeHtml(formatMinutes(totalHours * 60))} / 残業 ${escapeHtml(formatMinutes(overtimeHours * 60))} / 深夜 ${escapeHtml(formatMinutes(nightHours * 60))}</p>
    ${breakHours > 0 ? `<p>休憩 ${escapeHtml(formatMinutes(breakHours * 60))} / ${Number(item.breakCount) || 0}回</p>` : ""}
  `;
}

function deleteHistoryItem(index) {
  const history = getHistory();

  if (!Number.isInteger(index) || index < 0 || index >= history.length) {
    return;
  }

  if (!confirm("この計算履歴を削除しますか？")) {
    return;
  }

  history.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function clearAllHistory() {
  const history = getHistory();

  if (history.length === 0) {
    return;
  }

  if (!confirm("計算履歴をすべて削除しますか？")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function showError(message) {
  errorMessageElement.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
