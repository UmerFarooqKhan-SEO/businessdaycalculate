const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const holidays = document.getElementById("holidays");
const includeStart = document.getElementById("includeStart");
const includeEnd = document.getElementById("includeEnd");
const customDays = document.getElementById("customDays");
const results = document.getElementById("results");
const errorBox = document.getElementById("error");

const calculateBtn = document.getElementById("calculateBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const businessDaysOutput = document.getElementById("businessDays");
const calendarDaysOutput = document.getElementById("calendarDays");
const weekendDaysOutput = document.getElementById("weekendDays");
const holidayDaysOutput = document.getElementById("holidayDays");

const pad = n => String(n).padStart(2, "0");

function localISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDefaultDates() {
  const today = new Date();

  const end = new Date(today);
  end.setDate(end.getDate() + 30);

  return {
    start: localISODate(today),
    end: localISODate(end)
  };
}

function setDefaultDates() {
  const defaults = getDefaultDates();

  startDate.value = defaults.start;
  endDate.value = defaults.end;
}

setDefaultDates();

/* --------------------------------
   Working week selection
-------------------------------- */

document.querySelectorAll('input[name="week"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const isCustom = radio.value === "custom" && radio.checked;
    customDays.classList.toggle("hidden", !isCustom);

    if (isCustom) {
      const checkedDays = customDays.querySelectorAll(
        'input[type="checkbox"]:checked'
      );

      if (checkedDays.length === 0) {
        customDays
          .querySelectorAll('input[type="checkbox"]')
          .forEach((input, index) => {
            input.checked = index < 5;
          });
      }
    }
  });
});

/* --------------------------------
   Selected working days
-------------------------------- */

function selectedWorkingDays() {
  const mode = document.querySelector(
    'input[name="week"]:checked'
  ).value;

  if (mode === "mon-fri") {
    return new Set([1, 2, 3, 4, 5]);
  }

  if (mode === "mon-sat") {
    return new Set([1, 2, 3, 4, 5, 6]);
  }

  return new Set(
    [...customDays.querySelectorAll('input[type="checkbox"]:checked')]
      .map(input => Number(input.value))
  );
}

/* --------------------------------
   Holiday validation
-------------------------------- */

function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function parseHolidaySet() {
  const set = new Set();
  const invalidDates = [];

  holidays.value.split(/\r?\n/).forEach(value => {
    const date = value.trim();

    if (!date) {
      return;
    }

    if (isValidISODate(date)) {
      set.add(date);
    } else {
      invalidDates.push(date);
    }
  });

  return {
    set,
    invalidDates
  };
}

/* --------------------------------
   Date range
-------------------------------- */

function dateRange(start, end) {
  const dates = [];

  const current = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const last = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  while (current <= last) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/* --------------------------------
   Error handling
-------------------------------- */

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  results.classList.add("hidden");

  errorBox.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

/* --------------------------------
   Calculate
-------------------------------- */

function calculate() {
  clearError();

  if (!startDate.value || !endDate.value) {
    showError("Please enter both a start date and an end date.");
    return;
  }

  const start = new Date(`${startDate.value}T00:00:00`);
  const end = new Date(`${endDate.value}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    showError("Please enter valid dates.");
    return;
  }

  if (start > end) {
    showError(
      "The start date must be before or the same as the end date."
    );
    return;
  }

  const workingDays = selectedWorkingDays();

  if (workingDays.size === 0) {
    showError("Please select at least one working day.");
    return;
  }

  const {
    set: holidaySet,
    invalidDates
  } = parseHolidaySet();

  if (invalidDates.length > 0) {
    showError(
      `Please check these holiday dates: ${invalidDates.join(", ")}. Use YYYY-MM-DD format.`
    );
    return;
  }

  const dates = dateRange(start, end);

  /*
    Calendar days always represent the complete date range,
    regardless of whether the user chooses to include/exclude
    the start or end date.
  */
  const calendarDays = dates.length;

  let businessDays = 0;
  let weekendDays = 0;
  let holidayCount = 0;

  dates.forEach((date, index) => {
    const isFirst = index === 0;
    const isLast = index === dates.length - 1;

    /*
      Start/end inclusion affects the calculated working-day
      totals, but calendar days still show the full date range.
    */
    if (
      (isFirst && !includeStart.checked) ||
      (isLast && !includeEnd.checked)
    ) {
      return;
    }

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

  updateResult(
    businessDaysOutput,
    businessDays.toLocaleString()
  );

  updateResult(
    calendarDaysOutput,
    calendarDays.toLocaleString()
  );

  updateResult(
    weekendDaysOutput,
    weekendDays.toLocaleString()
  );

  updateResult(
    holidayDaysOutput,
    holidayCount.toLocaleString()
  );

  results.classList.remove("hidden");

  /*
    Restart the result animation each time a new calculation
    is performed.
  */
  results.classList.remove("results-animate");

  requestAnimationFrame(() => {
    results.classList.add("results-animate");
  });
}

/* --------------------------------
   Result animation helper
-------------------------------- */

function updateResult(element, value) {
  element.textContent = value;

  element.classList.remove("number-pop");

  requestAnimationFrame(() => {
    element.classList.add("number-pop");
  });
}

/* --------------------------------
   Calculate button
-------------------------------- */

calculateBtn.addEventListener("click", calculate);

/* --------------------------------
   Enter key support
-------------------------------- */

[startDate, endDate].forEach(input => {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      calculate();
    }
  });
});

/* --------------------------------
   Clear button
-------------------------------- */

clearBtn.addEventListener("click", () => {
  setDefaultDates();

  holidays.value = "";

  includeStart.checked = true;
  includeEnd.checked = true;

  const defaultWeek = document.querySelector(
    'input[name="week"][value="mon-fri"]'
  );

  defaultWeek.checked = true;

  customDays.classList.add("hidden");

  customDays
    .querySelectorAll("input")
    .forEach(input => {
      input.checked = false;
    });

  clearError();

  results.classList.add("hidden");

  copyBtn.textContent = "Copy Results";
});

/* --------------------------------
   Copy results
-------------------------------- */

copyBtn.addEventListener("click", async () => {
  const text = [
    `Business Days: ${businessDaysOutput.textContent}`,
    `Calendar Days: ${calendarDaysOutput.textContent}`,
    `Weekend Days: ${weekendDaysOutput.textContent}`,
    `Holidays Excluded: ${holidayDaysOutput.textContent}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);

    copyBtn.textContent = "✓ Results Copied";

    setTimeout(() => {
      copyBtn.textContent = "Copy Results";
    }, 1800);

  } catch {
    showError(
      "Your browser did not allow automatic copying. Please copy the results manually."
    );
  }
});
```
