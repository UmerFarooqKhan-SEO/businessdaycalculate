const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const holidays = document.getElementById("holidays");
const includeStart = document.getElementById("includeStart");
const includeEnd = document.getElementById("includeEnd");
const customDays = document.getElementById("customDays");
const results = document.getElementById("results");
const errorBox = document.getElementById("error");

const pad = n => String(n).padStart(2, "0");

function localISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

startDate.value = localISODate();

const defaultEnd = new Date();
defaultEnd.setDate(defaultEnd.getDate() + 30);
endDate.value = localISODate(defaultEnd);

document.querySelectorAll('input[name="week"]').forEach(radio => {
  radio.addEventListener("change", () => {
    customDays.classList.toggle("hidden", radio.value !== "custom" || !radio.checked);
  });
});

function selectedWorkingDays() {
  const mode = document.querySelector('input[name="week"]:checked').value;

  if (mode === "mon-fri") return new Set([1, 2, 3, 4, 5]);
  if (mode === "mon-sat") return new Set([1, 2, 3, 4, 5, 6]);

  return new Set(
    [...customDays.querySelectorAll('input[type="checkbox"]:checked')]
      .map(input => Number(input.value))
  );
}

function parseHolidaySet() {
  const set = new Set();

  holidays.value.split(/\r?\n/).forEach(value => {
    const date = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) set.add(date);
  });

  return set;
}

function dateRange(start, end) {
  const dates = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current <= last) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  results.classList.add("hidden");
}

function calculate() {
  errorBox.classList.add("hidden");

  if (!startDate.value || !endDate.value) {
    showError("Please enter both a start date and an end date.");
    return;
  }

  const start = new Date(`${startDate.value}T00:00:00`);
  const end = new Date(`${endDate.value}T00:00:00`);

  if (start > end) {
    showError("The start date must be before or the same as the end date.");
    return;
  }

  const workingDays = selectedWorkingDays();

  if (workingDays.size === 0) {
    showError("Please select at least one working day.");
    return;
  }

  const holidaySet = parseHolidaySet();
  const dates = dateRange(start, end);
  const calendarDays = dates.length;

  let businessDays = 0;
  let weekendDays = 0;
  let holidayCount = 0;

  dates.forEach((date, index) => {
    const isFirst = index === 0;
    const isLast = index === dates.length - 1;

    if ((isFirst && !includeStart.checked) || (isLast && !includeEnd.checked)) return;

    const day = date.getDay();
    const iso = localISODate(date);

    if (!workingDays.has(day)) {
      weekendDays++;
      return;
    }

    if (holidaySet.has(iso)) {
      holidayCount++;
      return;
    }

    businessDays++;
  });

  document.getElementById("businessDays").textContent = businessDays.toLocaleString();
  document.getElementById("calendarDays").textContent = calendarDays.toLocaleString();
  document.getElementById("weekendDays").textContent = weekendDays.toLocaleString();
  document.getElementById("holidayDays").textContent = holidayCount.toLocaleString();

  results.classList.remove("hidden");
}

document.getElementById("calculateBtn").addEventListener("click", calculate);

document.getElementById("clearBtn").addEventListener("click", () => {
  startDate.value = "";
  endDate.value = "";
  holidays.value = "";
  includeStart.checked = true;
  includeEnd.checked = true;
  document.querySelector('input[name="week"][value="mon-fri"]').checked = true;
  customDays.classList.add("hidden");
  customDays.querySelectorAll("input").forEach(input => input.checked = false);
  results.classList.add("hidden");
  errorBox.classList.add("hidden");
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = [
    `Business Days: ${document.getElementById("businessDays").textContent}`,
    `Calendar Days: ${document.getElementById("calendarDays").textContent}`,
    `Weekend Days: ${document.getElementById("weekendDays").textContent}`,
    `Holidays Excluded: ${document.getElementById("holidayDays").textContent}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    document.getElementById("copyBtn").textContent = "Copied!";
    setTimeout(() => document.getElementById("copyBtn").textContent = "Copy Results", 1500);
  } catch {
    showError("Your browser did not allow copying automatically. Please copy the results manually.");
  }
});