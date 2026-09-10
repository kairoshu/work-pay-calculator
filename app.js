const STORAGE_KEY = "workPayHistoryV1";
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

const startInput = document.getElementById("startDateTime");
const endInput = document.getElementById("endDateTime");
const hourlyWageInput = document.getElementById("hourlyWage");
const overtimeRateInput = document.getElementById("overtimeRate");
const nightRateInput = document.getElementById("nightRate");

const regularHourlyRateElement = document.getElementById("regularHourlyRate");
const overtimeHourlyRateElement = document.getElementById("overtimeHourlyRate");
const nightHourlyRateElement = document.getElementById("nightHourlyRate");
const overtimeNightHourlyRateElement = document.getElementById("overtimeNightHourlyRate");

const overtimeHourlyRateRow = document.getElementById("overtimeHourlyRateRow");
const nightHourlyRateRow = document.getElementById("nightHourlyRateRow");
const overtimeNightHourlyRateRow = document.getElementById("overtimeNightHourlyRateRow");

const totalHoursElement = document.getElementById("totalHours");
const regularHoursElement = document.getElementById("regularHours");
const overtimeHoursElement = document.getElementById("overtimeHours");
const nightHoursElement = document.getElementById("nightHours");
const overtimeNightHoursElement = document.getElementById("overtimeNightHours");
const dailyPayElement = document.getElementById("dailyPay");
const errorMessageElement = document.getElementById("errorMessage");
const historyListElement = document.getElementById("historyList");
const historyTotalPayElement = document.getElementById("historyTotalPay");

document.getElementById("calculateBtn").addEventListener("click", calculate);

initializeDateTimes();
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

  const totalMs = end - start;
  const overtimeStart = new Date(start.getTime() + EIGHT_HOURS_MS);

  const regularMs = Math.min(totalMs, EIGHT_HOURS_MS);
  const overtimeMs = Math.max(totalMs - EIGHT_HOURS_MS, 0);

  const nightMs = calculateNightMilliseconds(start, end);
  const overtimeNightMs = end > overtimeStart
    ? calculateNightMilliseconds(overtimeStart, end)
    : 0;

  const regularHours = msToHours(regularMs);
  const overtimeHours = msToHours(overtimeMs);
  const nightHours = msToHours(nightMs);
  const overtimeNightHours = msToHours(overtimeNightMs);

  // 基本賃金 + 残業割増分 + 深夜割増分
  // 重複時間は両方がそれぞれ加算される。
  const basePay = msToHours(totalMs) * hourlyWage;
  const overtimePremium = overtimeHours * hourlyWage * (overtimeRate / 100);
  const nightPremium = nightHours * hourlyWage * (nightRate / 100);

  // 最終的な1円未満を切り捨てる。
  const dailyPay = Math.floor(basePay + overtimePremium + nightPremium);

  // 時給の内訳は画面表示だけ1円未満を切り捨てる。
  // 日当計算そのものは上記の小数値を保持したまま計算する。
  const regularHourlyRate = hourlyWage;
  const overtimeHourlyRate = hourlyWage * (1 + overtimeRate / 100);
  const nightHourlyRate = hourlyWage * (1 + nightRate / 100);
  const overtimeNightHourlyRate = hourlyWage * (1 + (overtimeRate + nightRate) / 100);

  regularHourlyRateElement.textContent =
    `${formatYen(Math.floor(regularHourlyRate))} 円`;

  // 実際に該当する勤務時間が発生した場合だけ、各割増時給を表示する。
  overtimeHourlyRateRow.hidden = overtimeHours <= 0;
  nightHourlyRateRow.hidden = nightHours <= 0;
  overtimeNightHourlyRateRow.hidden = overtimeNightHours <= 0;

  if (overtimeHours > 0) {
    overtimeHourlyRateElement.textContent =
      `${formatYen(Math.floor(overtimeHourlyRate))} 円（+${formatYen(Math.floor(overtimeHourlyRate - hourlyWage))} 円）`;
  }

  if (nightHours > 0) {
    nightHourlyRateElement.textContent =
      `${formatYen(Math.floor(nightHourlyRate))} 円（+${formatYen(Math.floor(nightHourlyRate - hourlyWage))} 円）`;
  }

  if (overtimeNightHours > 0) {
    overtimeNightHourlyRateElement.textContent =
      `${formatYen(Math.floor(overtimeNightHourlyRate))} 円（+${formatYen(Math.floor(overtimeNightHourlyRate - hourlyWage))} 円）`;
  }

  totalHoursElement.textContent = formatHours(msToHours(totalMs));
  regularHoursElement.textContent = formatHours(regularHours);
  overtimeHoursElement.textContent = formatHours(overtimeHours);
  nightHoursElement.textContent = formatHours(nightHours);
  overtimeNightHoursElement.textContent = formatHours(overtimeNightHours);
  dailyPayElement.textContent = `${formatYen(dailyPay)} 円`;

  saveHistory({
    start: start.toISOString(),
    end: end.toISOString(),
    hourlyWage,
    overtimeRate,
    nightRate,
    totalHours: msToHours(totalMs),
    overtimeHours,
    nightHours,
    overtimeNightHours,
    dailyPay
  });

  renderHistory();
}

function calculateNightMilliseconds(start, end) {
  if (end <= start) {
    return 0;
  }

  let total = 0;

  // 開始日の前日から終了日まで確認する。
  // 例：開始が 2:00 の場合、前日22:00～当日5:00 の深夜帯に含まれるため。
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - 1,
    0, 0, 0, 0
  );

  const lastDate = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    0, 0, 0, 0
  );

  while (cursor <= lastDate) {
    const nightStart = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      22, 0, 0, 0
    );

    const nightEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
      5, 0, 0, 0
    );

    total += overlapMilliseconds(start, end, nightStart, nightEnd);

    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function overlapMilliseconds(startA, endA, startB, endB) {
  const overlapStart = Math.max(startA.getTime(), startB.getTime());
  const overlapEnd = Math.min(endA.getTime(), endB.getTime());

  return Math.max(overlapEnd - overlapStart, 0);
}

function msToHours(milliseconds) {
  return milliseconds / (60 * 60 * 1000);
}

function formatHours(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `${h}時間`;
  }

  return `${h}時間${m}分`;
}

function formatYen(value) {
  return Math.trunc(value).toLocaleString("ja-JP");
}

function formatDateTime(value) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function saveHistory(item) {
  const history = getHistory();

  history.unshift({
    ...item,
    savedAt: new Date().toISOString()
  });

  // 履歴が増えすぎないように100件まで保存。
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

  historyListElement.innerHTML = history.map((item, index) => `
    <article class="history-item">
      <div class="history-item-header">
        <p>${escapeHtml(formatDateTime(item.start))} ～ ${escapeHtml(formatDateTime(item.end))}</p>
        <button
          type="button"
          class="history-delete-btn"
          data-history-index="${index}"
          aria-label="この履歴を削除">
          削除
        </button>
      </div>
      <p>時給 ${formatYen(item.hourlyWage)}円 / 残業 +${item.overtimeRate}% / 深夜 +${item.nightRate}%</p>
      <p>勤務 ${escapeHtml(formatHours(item.totalHours))} / 残業 ${escapeHtml(formatHours(item.overtimeHours))} / 深夜 ${escapeHtml(formatHours(item.nightHours))}</p>
      <p class="history-pay">${formatYen(item.dailyPay)} 円</p>
    </article>
  `).join("");

  document.querySelectorAll(".history-delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.historyIndex);
      deleteHistoryItem(index);
    });
  });
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
