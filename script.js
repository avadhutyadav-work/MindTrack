"use strict";

// ---- Configuration -------------------------------------------------------
const BASE_URL = "https://mindtrack-1-ybvi.onrender.com";   // FastAPI backend
const API_URL = `${BASE_URL}/predict`;
const SCORE_MAX = 10;         // top of the score scale used for the gauge (change if your target differs)

// Field rules. Names match the Pydantic model in main.py exactly.
const FIELDS = {
  Age:                     { type: "int",    min: 10, max: 100, label: "Age" },
  Gender:                  { type: "choice", label: "Gender" },
  Country:                 { type: "text",   label: "Country" },
  Academic_Level:          { type: "choice", label: "Academic level" },
  Most_Used_Platform:      { type: "choice", label: "Most used platform" },
  Purpose_Of_Use:          { type: "choice", label: "Purpose of use" },
  Avg_Daily_Usage_Hours:   { type: "float",  min: 0, max: 24, label: "Social media hours" },
  Daily_Unlocks:           { type: "int",    min: 0, label: "Phone unlocks" },
  Study_Hours:             { type: "float",  min: 0, max: 24, label: "Study hours" },
  Physical_Activity_Hours: { type: "float",  min: 0, max: 24, label: "Physical activity hours" },
  Sleep_Hours_Per_Night:   { type: "float",  min: 0, max: 24, label: "Sleep hours" },
  Stress_Level:            { type: "choice", label: "Stress level" },
};

// ---- Elements ------------------------------------------------------------
const form = document.getElementById("predictForm");
const banner = document.getElementById("formBanner");
const submitBtn = document.getElementById("submitBtn");
const btnLabel = submitBtn.querySelector(".btn-label");
const resultPanel = document.querySelector(".result");
const gaugeFill = document.getElementById("gaugeFill");
const scoreValue = document.getElementById("scoreValue");
const scoreScale = document.getElementById("scoreScale");
const resultMsg = document.getElementById("resultMsg");
const resetBtn = document.getElementById("resetBtn");

scoreScale.textContent = `out of ${SCORE_MAX}`;

// ---- Helpers -------------------------------------------------------------
function setError(name, message) {
  const field = document.getElementById(name).closest(".field");
  const slot = document.getElementById(`err-${name}`);
  field.classList.toggle("has-error", Boolean(message));
  slot.textContent = message || "";
}

function clearErrors() {
  Object.keys(FIELDS).forEach((name) => setError(name, ""));
  banner.hidden = true;
  banner.textContent = "";
}

function showBanner(message) {
  banner.textContent = message;
  banner.hidden = false;
  banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Validate one field. Returns { value } or { error }.
function readField(name) {
  const rule = FIELDS[name];
  const raw = form.elements[name].value.trim();

  if (raw === "") {
    return { error: rule.type === "choice" ? "Select an option." : "This field is required." };
  }
  if (rule.type === "text") {
    return { value: raw };
  }
  if (rule.type === "choice") {
    return { value: raw };
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) return { error: "Enter a valid number." };
  if (rule.type === "int" && !Number.isInteger(num)) return { error: "Enter a whole number." };
  if (rule.min !== undefined && num < rule.min) return { error: `Must be at least ${rule.min}.` };
  if (rule.max !== undefined && num > rule.max) return { error: `Must be at most ${rule.max}.` };
  return { value: num };
}

function validate() {
  clearErrors();
  const payload = {};
  let firstInvalid = null;

  for (const name of Object.keys(FIELDS)) {
    const result = readField(name);
    if (result.error) {
      setError(name, result.error);
      firstInvalid = firstInvalid || name;
    } else {
      payload[name] = result.value;
    }
  }

  if (firstInvalid) {
    form.elements[firstInvalid].focus();
    return null;
  }
  return payload;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("is-loading", isLoading);
  submitBtn.setAttribute("aria-busy", String(isLoading));
  btnLabel.textContent = isLoading ? "Predicting…" : "Predict score";
}

// Turn a FastAPI error response into a readable message and field errors.
async function handleErrorResponse(response) {
  let body = null;
  try { body = await response.json(); } catch (_) { /* not JSON */ }

  if (response.status === 422 && body && Array.isArray(body.detail)) {
    body.detail.forEach((item) => {
      const name = item.loc && item.loc[item.loc.length - 1];
      if (FIELDS[name]) setError(name, item.msg);
    });
    showBanner("Some values were rejected by the server. Check the highlighted fields.");
    return;
  }
  showBanner(
    response.status >= 500
      ? "The server could not make a prediction. Try again in a moment."
      : `The request failed (status ${response.status}). Check your inputs and try again.`
  );
}

// ---- Result rendering ----------------------------------------------------
function showScore(score) {
  const clamped = Math.min(Math.max(score, 0), SCORE_MAX);
  gaugeFill.style.strokeDashoffset = String(100 - (clamped / SCORE_MAX) * 100);

  // Count up to the final value
  const duration = 900;
  const start = performance.now();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function tick(now) {
    const t = reduce ? 1 : Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    scoreValue.textContent = (score * eased).toFixed(2);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  resultPanel.classList.add("is-done");
  resultMsg.textContent = "Estimated mental health score for the details you entered.";
  resetBtn.hidden = false;

  if (window.matchMedia("(max-width: 960px)").matches) {
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function resetResult() {
  gaugeFill.style.strokeDashoffset = "100";
  scoreValue.textContent = "--";
  resultPanel.classList.remove("is-done");
  resultMsg.innerHTML = "Fill in the form and select <strong>Predict score</strong>. The result appears here.";
  resetBtn.hidden = true;
}

// ---- Events --------------------------------------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = validate();
  if (!payload) return;

  setLoading(true);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleErrorResponse(response);
      return;
    }

    const data = await response.json();
    const score = Number(data.predicted_mental_health_score);
    if (!Number.isFinite(score)) {
      showBanner("The server returned an unexpected response.");
      return;
    }
    showScore(score);
  } catch (err) {
    showBanner("Could not reach the server. Make sure the FastAPI app is running, then try again.");
  } finally {
    setLoading(false);
  }
});

// Clear a field's error as soon as the user edits it
form.addEventListener("input", (event) => {
  const name = event.target.name;
  if (FIELDS[name]) setError(name, "");
});
form.addEventListener("change", (event) => {
  const name = event.target.name;
  if (FIELDS[name]) setError(name, "");
});

resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  resetResult();
  form.elements.Age.focus();
  document.getElementById("predict").scrollIntoView({ behavior: "smooth", block: "start" });
});
