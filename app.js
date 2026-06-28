const STORAGE_KEY = "setline-data-v1";

const CATEGORY_META = {
  push: {
    label: "Push",
    subtitle: "Chest · triceps · shoulders",
    muscles: ["chest", "triceps", "shoulders"],
    color: "#f16d46",
  },
  pull: {
    label: "Pull",
    subtitle: "Biceps · back · forearms",
    muscles: ["biceps", "back", "forearms"],
    color: "#5b79dc",
  },
  legs: {
    label: "Legs",
    subtitle: "Hamstrings · glutes · quads · more",
    muscles: ["hamstrings", "glutes", "quads", "calves", "inner / outer thigh"],
    color: "#b46bd1",
  },
  cardio: {
    label: "Cardio",
    subtitle: "Intervals · activities · notes",
    muscles: ["activity"],
    color: "#3a9a74",
  },
};

const DEFAULT_EXERCISES = {
  push: {
    chest: ["Barbell Bench Press", "Incline Dumbbell Press", "Chest Fly", "Push-Up", "Cable Crossover"],
    triceps: ["Triceps Pushdown", "Skull Crusher", "Overhead Triceps Extension", "Close-Grip Bench Press", "Dip"],
    shoulders: ["Overhead Press", "Lateral Raise", "Front Raise", "Reverse Fly", "Arnold Press"],
  },
  pull: {
    biceps: ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl", "Cable Curl"],
    back: ["Deadlift", "Lat Pulldown", "Pull-Up", "Barbell Row", "Seated Cable Row"],
    forearms: ["Wrist Curl", "Reverse Wrist Curl", "Farmer Carry", "Reverse Curl", "Plate Pinch"],
  },
  legs: {
    hamstrings: ["Romanian Deadlift", "Leg Curl", "Good Morning", "Nordic Curl"],
    glutes: ["Hip Thrust", "Glute Bridge", "Cable Kickback", "Bulgarian Split Squat"],
    quads: ["Back Squat", "Front Squat", "Leg Press", "Leg Extension", "Walking Lunge"],
    calves: ["Standing Calf Raise", "Seated Calf Raise", "Single-Leg Calf Raise"],
    "inner / outer thigh": ["Hip Adduction", "Hip Abduction", "Lateral Lunge", "Cossack Squat"],
  },
  cardio: {
    activity: ["Running", "Cycling", "Walking", "Rowing", "Stair Climber", "Elliptical", "Jump Rope"],
  },
};

const state = {
  route: "home",
  currentSession: null,
  selectedMuscle: null,
  historyFilter: "all",
  detailId: null,
  libraryCategory: "push",
  deferredInstallPrompt: null,
};

let data = loadData();

function defaultData() {
  return {
    version: 1,
    workouts: [],
    customExercises: [],
    draft: null,
    unit: "lb",
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const saved = JSON.parse(raw);
    return {
      ...defaultData(),
      ...saved,
      workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
      customExercises: Array.isArray(saved.customExercises) ? saved.customExercises : [],
    };
  } catch {
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid(prefix = "id") {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function categoryIcon(category) {
  const paths = {
    push: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    pull: '<path d="M5 4v5a7 7 0 0 0 14 0V4M5 8h4M15 8h4M12 16v4M9 20h6"/>',
    legs: '<path d="M9 3v7l-3 4v7M15 3v7l3 4v7M9 10h6M6 17h4M14 17h4"/>',
    cardio: '<path d="M3 13h4l2-6 4 11 3-8 2 3h3"/><path d="M4 5.5A5 5 0 0 1 12 7a5 5 0 0 1 8-1.5"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[category]}</svg>`;
}

function brandMarkup() {
  return `
    <div class="brand">
      <span class="brand-mark">S</span>
      <span>SETLINE</span>
    </div>
  `;
}

function formatDate(value, options = {}) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: options.year ? "numeric" : undefined,
  }).format(date);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeDate(value) {
  const then = new Date(value);
  const today = new Date();
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((startToday - startThen) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(value, { year: then.getFullYear() !== today.getFullYear() });
}

function allExercises(category, muscle) {
  const builtIns = (DEFAULT_EXERCISES[category]?.[muscle] || []).map((name) => ({
    id: `default-${slugify(category)}-${slugify(muscle)}-${slugify(name)}`,
    name,
    category,
    muscle,
    custom: false,
  }));
  const custom = data.customExercises.filter(
    (exercise) => exercise.category === category && exercise.muscle === muscle
  );
  return [...builtIns, ...custom].sort((a, b) => a.name.localeCompare(b.name));
}

function findPreviousEntry(exerciseId) {
  const ordered = [...data.workouts].sort(
    (a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt)
  );
  for (const workout of ordered) {
    const entry = workout.exercises?.find((item) => item.exerciseId === exerciseId);
    if (entry) return { workout, entry };
  }
  return null;
}

function render() {
  const view = document.querySelector("#app-view");
  const nav = document.querySelector("#bottom-nav");
  document.body.classList.toggle("session-open", state.route === "session");
  nav.classList.toggle("is-hidden", state.route === "session");

  if (state.route === "home") view.innerHTML = renderHome();
  if (state.route === "session") view.innerHTML = renderSession();
  if (state.route === "history") view.innerHTML = renderHistory();
  if (state.route === "detail") view.innerHTML = renderDetail();
  if (state.route === "library") view.innerHTML = renderLibrary();

  nav.querySelectorAll(".nav-item").forEach((button) => {
    const activeRoute = state.route === "detail" ? "history" : state.route;
    button.classList.toggle("is-active", button.dataset.route === activeRoute);
  });
}

function renderHome() {
  const workouts = [...data.workouts].sort(
    (a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt)
  );
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = workouts.filter(
    (workout) => new Date(workout.completedAt || workout.startedAt).getTime() >= weekAgo
  ).length;
  const last = workouts[0];
  const draft = data.draft;

  return `
    <div class="topbar">
      ${brandMarkup()}
      <button class="icon-button" data-action="open-settings" aria-label="Settings">⋯</button>
    </div>

    <p class="eyebrow">${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
    <h1>What are we training?</h1>
    <p class="intro-copy">Choose a session, put in the work, and keep every set ready for next time.</p>

    ${
      draft
        ? `
          <button class="quick-stat" data-action="resume-draft" style="width:100%; text-align:left; cursor:pointer;">
            <span class="stat-icon">↗</span>
            <span>
              <strong>Resume ${escapeHtml(CATEGORY_META[draft.category].label)} session</strong>
              <span>${draft.exercises.length} ${draft.exercises.length === 1 ? "exercise" : "exercises"} in progress</span>
            </span>
          </button>
        `
        : ""
    }

    <div class="section-heading">
      <h2>Start a session</h2>
      <p>${thisWeek} this week</p>
    </div>

    <div class="category-grid">
      ${Object.entries(CATEGORY_META)
        .map(
          ([key, category]) => `
            <button class="category-card" data-action="start-category" data-category="${key}">
              <span class="category-icon">${categoryIcon(key)}</span>
              <strong>${category.label}</strong>
              <small>${category.subtitle}</small>
              <span class="arrow">↗</span>
            </button>
          `
        )
        .join("")}
    </div>

    <div class="section-heading">
      <h2>Your rhythm</h2>
      <p>${workouts.length} total</p>
    </div>

    <div class="quick-stat">
      <span class="stat-icon">${thisWeek}</span>
      <span>
        <strong>Sessions in the last 7 days</strong>
        <span>${thisWeek ? "Your consistency is taking shape." : "Your next session starts the streak."}</span>
      </span>
    </div>
    <div class="quick-stat">
      <span class="stat-icon">${last ? CATEGORY_META[last.category].label.charAt(0) : "—"}</span>
      <span>
        <strong>${last ? `Last: ${CATEGORY_META[last.category].label}` : "No workouts logged yet"}</strong>
        <span>${last ? `${relativeDate(last.completedAt || last.startedAt)} · ${last.exercises.length} ${last.exercises.length === 1 ? "exercise" : "exercises"}` : "Your first entry will appear here."}</span>
      </span>
    </div>

    <div id="install-card" class="install-card ${state.deferredInstallPrompt ? "is-visible" : ""}">
      <span>
        <strong>Add Setline to your home screen</strong>
        <span>Open it like any other app, even offline.</span>
      </span>
      <button data-action="install-app">Install</button>
    </div>
  `;
}

function createSession(category) {
  return {
    id: uid("workout"),
    category,
    startedAt: new Date().toISOString(),
    completedAt: null,
    notes: "",
    exercises: [],
  };
}

function startSession(category) {
  if (data.draft && data.draft.category !== category) {
    const replace = window.confirm(
      `You have an unfinished ${CATEGORY_META[data.draft.category].label} session. Start a new one instead?`
    );
    if (!replace) {
      resumeDraft();
      return;
    }
  }
  state.currentSession = createSession(category);
  state.selectedMuscle = CATEGORY_META[category].muscles[0];
  data.draft = state.currentSession;
  saveData();
  state.route = "session";
  render();
}

function resumeDraft() {
  if (!data.draft) return;
  state.currentSession = data.draft;
  state.selectedMuscle = CATEGORY_META[data.draft.category].muscles[0];
  state.route = "session";
  render();
}

function renderSession() {
  const session = state.currentSession || data.draft;
  if (!session) {
    state.route = "home";
    return renderHome();
  }
  state.currentSession = session;
  const meta = CATEGORY_META[session.category];
  const muscle = state.selectedMuscle || meta.muscles[0];
  const exercises = allExercises(session.category, muscle);
  const isCardio = session.category === "cardio";

  return `
    <header class="session-header">
      <button class="icon-button" data-action="leave-session" aria-label="Back">‹</button>
      <div class="session-title">
        <strong>${meta.label} session</strong>
        <span>${formatTime(session.startedAt)} · ${session.exercises.length} added</span>
      </div>
      <button class="icon-button" data-action="discard-session" aria-label="Discard session">×</button>
    </header>

    <section class="session-hero" style="--tone:${meta.color}">
      <p>In progress</p>
      <h1>${meta.label} day</h1>
    </section>

    ${
      !isCardio
        ? `
          <div class="muscle-tabs" aria-label="Muscle group">
            ${meta.muscles
              .map(
                (item) => `
                  <button class="chip ${item === muscle ? "is-active" : ""}" data-action="select-muscle" data-muscle="${escapeAttr(item)}">
                    ${escapeHtml(item)}
                  </button>
                `
              )
              .join("")}
          </div>
        `
        : `<div style="height:17px"></div>`
    }

    <section class="exercise-picker">
      <div class="picker-row">
        <div class="select-wrap">
          <select id="exercise-picker-select" aria-label="${isCardio ? "Choose an activity" : "Choose an exercise"}">
            <option value="">${isCardio ? "Choose an activity…" : `Choose a ${escapeHtml(muscle)} exercise…`}</option>
            ${exercises
              .map(
                (exercise) =>
                  `<option value="${escapeAttr(exercise.id)}">${escapeHtml(exercise.name)}${exercise.custom ? " · custom" : ""}</option>`
              )
              .join("")}
          </select>
        </div>
        <button class="primary-button accent" data-action="add-entry">Add</button>
      </div>
      <div class="picker-actions">
        <span>${exercises.length} ${isCardio ? "activities" : "exercises"} available</span>
        <button class="text-button" data-action="open-add-exercise" data-category="${session.category}" data-muscle="${escapeAttr(muscle)}">
          + Create your own
        </button>
      </div>
    </section>

    <div id="session-entries">
      ${
        session.exercises.length
          ? session.exercises
              .map((entry) =>
                isCardio ? renderCardioEntry(entry) : renderStrengthEntry(entry)
              )
              .join("")
          : `
            <div class="empty-state">
              <span class="empty-state-icon">${isCardio ? "⏱" : "+"}</span>
              <h3>${isCardio ? "Add your first activity" : "Add your first exercise"}</h3>
              <p>${isCardio ? "Build timed intervals and leave a note on each one." : "Each set can have its own weight and rep target."}</p>
            </div>
          `
      }
    </div>

    <section class="session-note">
      <label for="session-notes">Session notes</label>
      <textarea id="session-notes" data-action="update-session-notes" placeholder="Energy, wins, things to remember…">${escapeHtml(session.notes || "")}</textarea>
    </section>

    <div class="save-bar">
      <button class="primary-button" data-action="save-workout">
        Finish & save workout
      </button>
    </div>
  `;
}

function renderStrengthEntry(entry) {
  const previous = findPreviousEntry(entry.exerciseId);
  const unit = data.unit;
  return `
    <article class="exercise-card" data-entry-id="${escapeAttr(entry.entryId)}">
      <div class="exercise-card-head">
        <span>
          <h3>${escapeHtml(entry.name)}</h3>
          <p>${escapeHtml(entry.muscle)} · ${entry.sets.length} ${entry.sets.length === 1 ? "set" : "sets"}</p>
        </span>
        <button class="mini-menu" data-action="remove-entry" data-entry-id="${escapeAttr(entry.entryId)}" aria-label="Remove ${escapeAttr(entry.name)}">×</button>
      </div>

      ${renderPrevious(previous, "strength")}

      <div class="same-weight-row">
        <span>Use first-set weight for all sets</span>
        <button
          class="switch ${entry.sameWeight ? "is-on" : ""}"
          data-action="toggle-same-weight"
          data-entry-id="${escapeAttr(entry.entryId)}"
          role="switch"
          aria-checked="${entry.sameWeight}"
          aria-label="Use the same weight for every set"
        ></button>
      </div>

      <div class="set-table">
        <div class="set-row header">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
          <span></span>
        </div>
        ${entry.sets
          .map(
            (set, index) => `
              <div class="set-row">
                <span class="set-number">${index + 1}</span>
                <div class="input-with-unit">
                  <input
                    class="number-input"
                    type="number"
                    min="0"
                    step="0.5"
                    inputmode="decimal"
                    value="${escapeAttr(set.weight)}"
                    placeholder="0"
                    data-action="update-strength-set"
                    data-field="weight"
                    data-entry-id="${escapeAttr(entry.entryId)}"
                    data-set-index="${index}"
                    aria-label="Set ${index + 1} weight"
                  />
                  <span>${unit}</span>
                </div>
                <input
                  class="number-input"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  value="${escapeAttr(set.reps)}"
                  placeholder="0"
                  data-action="update-strength-set"
                  data-field="reps"
                  data-entry-id="${escapeAttr(entry.entryId)}"
                  data-set-index="${index}"
                  aria-label="Set ${index + 1} reps"
                />
                <button class="remove-set" data-action="remove-set" data-entry-id="${escapeAttr(entry.entryId)}" data-set-index="${index}" aria-label="Remove set ${index + 1}">×</button>
              </div>
            `
          )
          .join("")}
      </div>
      <button class="add-set-button" data-action="add-set" data-entry-id="${escapeAttr(entry.entryId)}">+ Add set</button>
    </article>
  `;
}

function renderPrevious(previous, type) {
  if (!previous) {
    return `
      <div class="previous-box">
        <div class="previous-label"><span>Previous</span></div>
        <span class="empty-previous">First time logging this one.</span>
      </div>
    `;
  }
  if (type === "strength") {
    return `
      <div class="previous-box">
        <div class="previous-label">
          <span>Previous</span>
          <span>${relativeDate(previous.workout.completedAt || previous.workout.startedAt)}</span>
        </div>
        <div class="previous-sets">
          ${previous.entry.sets
            .map(
              (set, index) =>
                `<span>${index + 1}. ${set.weight || "—"} ${data.unit} × ${set.reps || "—"}</span>`
            )
            .join("")}
        </div>
      </div>
    `;
  }
  const totalSeconds = previous.entry.intervals.reduce(
    (total, interval) => total + Number(interval.minutes || 0) * 60 + Number(interval.seconds || 0),
    0
  );
  return `
    <div class="previous-box">
      <div class="previous-label">
        <span>Previous</span>
        <span>${relativeDate(previous.workout.completedAt || previous.workout.startedAt)}</span>
      </div>
      <div class="previous-sets">
        <span>${previous.entry.intervals.length} intervals</span>
        <span>${formatDuration(totalSeconds)}</span>
      </div>
    </div>
  `;
}

function renderCardioEntry(entry) {
  const previous = findPreviousEntry(entry.exerciseId);
  return `
    <article class="exercise-card" data-entry-id="${escapeAttr(entry.entryId)}">
      <div class="exercise-card-head">
        <span>
          <h3>${escapeHtml(entry.name)}</h3>
          <p>${entry.intervals.length} ${entry.intervals.length === 1 ? "interval" : "intervals"}</p>
        </span>
        <button class="mini-menu" data-action="remove-entry" data-entry-id="${escapeAttr(entry.entryId)}" aria-label="Remove ${escapeAttr(entry.name)}">×</button>
      </div>
      ${renderPrevious(previous, "cardio")}
      ${entry.intervals
        .map(
          (interval, index) => `
            <div class="cardio-interval">
              <div class="interval-top">
                <span class="set-number">${index + 1}</span>
                <label>
                  Minutes
                  <input
                    class="number-input"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    value="${escapeAttr(interval.minutes)}"
                    placeholder="0"
                    data-action="update-interval"
                    data-field="minutes"
                    data-entry-id="${escapeAttr(entry.entryId)}"
                    data-set-index="${index}"
                  />
                </label>
                <label>
                  Seconds
                  <input
                    class="number-input"
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    inputmode="numeric"
                    value="${escapeAttr(interval.seconds)}"
                    placeholder="00"
                    data-action="update-interval"
                    data-field="seconds"
                    data-entry-id="${escapeAttr(entry.entryId)}"
                    data-set-index="${index}"
                  />
                </label>
                <button class="remove-set" data-action="remove-interval" data-entry-id="${escapeAttr(entry.entryId)}" data-set-index="${index}" aria-label="Remove interval ${index + 1}">×</button>
              </div>
              <textarea
                class="interval-note"
                data-action="update-interval"
                data-field="note"
                data-entry-id="${escapeAttr(entry.entryId)}"
                data-set-index="${index}"
                placeholder="Pace, incline, effort, distance…"
              >${escapeHtml(interval.note || "")}</textarea>
            </div>
          `
        )
        .join("")}
      <button class="add-set-button" data-action="add-interval" data-entry-id="${escapeAttr(entry.entryId)}">+ Add interval</button>
    </article>
  `;
}

function getEntry(entryId) {
  return state.currentSession?.exercises.find((entry) => entry.entryId === entryId);
}

function persistDraft() {
  data.draft = state.currentSession;
  saveData();
}

function addEntry() {
  const select = document.querySelector("#exercise-picker-select");
  if (!select?.value) {
    toast(state.currentSession.category === "cardio" ? "Choose an activity first" : "Choose an exercise first");
    return;
  }
  const category = state.currentSession.category;
  const muscle = state.selectedMuscle || CATEGORY_META[category].muscles[0];
  const exercise = allExercises(category, muscle).find((item) => item.id === select.value);
  if (!exercise) return;
  const existing = state.currentSession.exercises.find((entry) => entry.exerciseId === exercise.id);
  if (existing) {
    toast(`${exercise.name} is already in this session`);
    document.querySelector(`[data-entry-id="${CSS.escape(existing.entryId)}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return;
  }
  state.currentSession.exercises.push(
    category === "cardio"
      ? {
          entryId: uid("entry"),
          exerciseId: exercise.id,
          name: exercise.name,
          muscle: "activity",
          type: "cardio",
          intervals: [{ minutes: "", seconds: "", note: "" }],
        }
      : {
          entryId: uid("entry"),
          exerciseId: exercise.id,
          name: exercise.name,
          muscle: exercise.muscle,
          type: "strength",
          sameWeight: true,
          sets: [
            { weight: "", reps: "" },
            { weight: "", reps: "" },
            { weight: "", reps: "" },
          ],
        }
  );
  persistDraft();
  render();
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-entry-id="${CSS.escape(state.currentSession.exercises.at(-1).entryId)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function saveWorkout() {
  const session = state.currentSession;
  if (!session.exercises.length) {
    toast("Add at least one exercise before saving");
    return;
  }
  const hasWork = session.exercises.some((entry) => {
    if (entry.type === "strength") {
      return entry.sets.some((set) => set.weight !== "" || set.reps !== "");
    }
    return entry.intervals.some(
      (interval) => interval.minutes !== "" || interval.seconds !== "" || interval.note.trim()
    );
  });
  if (!hasWork) {
    toast("Add some set or interval data before saving");
    return;
  }
  session.completedAt = new Date().toISOString();
  data.workouts.push(JSON.parse(JSON.stringify(session)));
  data.draft = null;
  saveData();
  state.currentSession = null;
  state.historyFilter = session.category;
  state.route = "history";
  render();
  toast("Workout saved");
}

function renderHistory() {
  const workouts = [...data.workouts]
    .filter(
      (workout) => state.historyFilter === "all" || workout.category === state.historyFilter
    )
    .sort(
      (a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt)
    );

  return `
    <div class="topbar">
      ${brandMarkup()}
      <span class="meta-line">${data.workouts.length} saved</span>
    </div>
    <p class="eyebrow">Your training record</p>
    <h1>History</h1>
    <p class="intro-copy">Every workout, every set, ready when you want to look back.</p>

    <div class="filter-tabs" aria-label="Filter history">
      ${["all", ...Object.keys(CATEGORY_META)]
        .map(
          (category) => `
            <button class="chip ${state.historyFilter === category ? "is-active" : ""}" data-action="filter-history" data-category="${category}">
              ${category}
            </button>
          `
        )
        .join("")}
    </div>

    ${
      workouts.length
        ? `
          <div class="history-list">
            ${workouts.map((workout) => renderHistoryCard(workout)).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <span class="empty-state-icon">↺</span>
            <h3>${data.workouts.length ? `No ${state.historyFilter} workouts yet` : "Your history starts here"}</h3>
            <p>Finish a workout and its full set-by-set log will land here.</p>
            <button class="primary-button" data-route="home">Start training</button>
          </div>
        `
    }
  `;
}

function renderHistoryCard(workout) {
  const meta = CATEGORY_META[workout.category];
  const strengthSets = workout.exercises.reduce(
    (total, entry) => total + (entry.sets?.length || 0),
    0
  );
  const intervals = workout.exercises.reduce(
    (total, entry) => total + (entry.intervals?.length || 0),
    0
  );
  const exerciseNames = workout.exercises
    .slice(0, 3)
    .map((entry) => `<span>${escapeHtml(entry.name)}</span>`)
    .join("");

  return `
    <button class="history-card" data-action="open-workout" data-workout-id="${escapeAttr(workout.id)}" style="--tone:${meta.color}">
      <div class="history-top">
        <span class="history-category">
          <span class="history-dot"></span>
          <span>
            <strong>${meta.label}</strong>
            <small>${workout.exercises.length} ${workout.exercises.length === 1 ? "exercise" : "exercises"} · ${workout.category === "cardio" ? `${intervals} intervals` : `${strengthSets} sets`}</small>
          </span>
        </span>
        <span class="history-date">${relativeDate(workout.completedAt || workout.startedAt)}<br>${formatTime(workout.startedAt)}</span>
      </div>
      <div class="history-summary">
        ${exerciseNames}
        ${workout.exercises.length > 3 ? `<span>+${workout.exercises.length - 3} more</span>` : ""}
      </div>
    </button>
  `;
}

function renderDetail() {
  const workout = data.workouts.find((item) => item.id === state.detailId);
  if (!workout) {
    state.route = "history";
    return renderHistory();
  }
  const meta = CATEGORY_META[workout.category];
  return `
    <header class="session-header">
      <button class="icon-button" data-action="close-detail" aria-label="Back">‹</button>
      <div class="session-title">
        <strong>${meta.label} workout</strong>
        <span>${formatDate(workout.completedAt || workout.startedAt, { year: true })}</span>
      </div>
      <button class="icon-button" data-action="delete-workout" data-workout-id="${escapeAttr(workout.id)}" aria-label="Delete workout">×</button>
    </header>

    <section class="session-hero" style="--tone:${meta.color}; margin-bottom:17px;">
      <p>Completed · ${formatTime(workout.completedAt || workout.startedAt)}</p>
      <h1>${meta.label} day</h1>
    </section>

    ${workout.exercises.map((entry) => renderDetailEntry(entry)).join("")}

    ${
      workout.notes
        ? `
          <section class="detail-block">
            <h3>Session notes</h3>
            <div class="detail-note">${escapeHtml(workout.notes)}</div>
          </section>
        `
        : ""
    }
  `;
}

function renderDetailEntry(entry) {
  if (entry.type === "cardio") {
    return `
      <article class="detail-block">
        <h3>${escapeHtml(entry.name)}</h3>
        <p class="subtext">${entry.intervals.length} ${entry.intervals.length === 1 ? "interval" : "intervals"}</p>
        ${entry.intervals
          .map(
            (interval, index) => `
              <div class="detail-set">
                <span class="set-number">${index + 1}</span>
                <span>
                  <strong>${formatDuration(Number(interval.minutes || 0) * 60 + Number(interval.seconds || 0))}</strong>
                  ${interval.note ? `<div class="detail-note">${escapeHtml(interval.note)}</div>` : ""}
                </span>
              </div>
            `
          )
          .join("")}
      </article>
    `;
  }
  return `
    <article class="detail-block">
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="subtext">${escapeHtml(entry.muscle)} · ${entry.sets.length} ${entry.sets.length === 1 ? "set" : "sets"}</p>
      ${entry.sets
        .map(
          (set, index) => `
            <div class="detail-set">
              <span class="set-number">${index + 1}</span>
              <span><strong>${set.weight || "—"} ${data.unit}</strong> × ${set.reps || "—"} reps</span>
            </div>
          `
        )
        .join("")}
    </article>
  `;
}

function formatDuration(totalSeconds) {
  if (!totalSeconds) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderLibrary() {
  const category = state.libraryCategory;
  const meta = CATEGORY_META[category];
  return `
    <div class="topbar">
      ${brandMarkup()}
      <button class="icon-button" data-action="open-add-exercise" data-category="${category}" data-muscle="${escapeAttr(meta.muscles[0])}" aria-label="Add exercise">+</button>
    </div>
    <p class="eyebrow">Make it yours</p>
    <h1>Exercise library</h1>
    <p class="intro-copy">Built-in movements plus anything you add. Custom exercises stay available for every future workout.</p>

    <div class="filter-tabs" aria-label="Filter exercises">
      ${Object.keys(CATEGORY_META)
        .map(
          (item) => `
            <button class="chip ${item === category ? "is-active" : ""}" data-action="filter-library" data-category="${item}">
              ${item}
            </button>
          `
        )
        .join("")}
    </div>

    ${meta.muscles
      .map((muscle) => {
        const exercises = allExercises(category, muscle);
        return `
          <section class="library-group">
            <div class="library-group-head">
              <strong>${escapeHtml(muscle)}</strong>
              <span>${exercises.length} total</span>
            </div>
            ${exercises
              .map(
                (exercise) => `
                  <div class="library-item">
                    <span>${escapeHtml(exercise.name)}</span>
                    ${
                      exercise.custom
                        ? `<button class="text-button" data-action="delete-custom-exercise" data-exercise-id="${escapeAttr(exercise.id)}">Remove</button>`
                        : `<span></span>`
                    }
                  </div>
                `
              )
              .join("")}
            <div class="library-item">
              <button class="text-button" data-action="open-add-exercise" data-category="${category}" data-muscle="${escapeAttr(muscle)}">+ Add ${category === "cardio" ? "activity" : "exercise"}</button>
            </div>
          </section>
        `;
      })
      .join("")}

    <div class="section-heading">
      <h2>Data</h2>
      <p>Stored on this device</p>
    </div>
    <div class="library-controls">
      <button class="secondary-button" data-action="export-data">Export backup</button>
      <button class="secondary-button" data-action="import-data">Import backup</button>
      <input id="import-file" type="file" accept="application/json" hidden />
    </div>
  `;
}

function openAddExerciseModal(category, muscle) {
  const isCardio = category === "cardio";
  document.querySelector("#modal-root").innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="add-exercise-title">
        <div class="modal-handle"></div>
        <h2 id="add-exercise-title">New ${isCardio ? "activity" : "exercise"}</h2>
        <p>Add it once and it will be waiting in your library every time.</p>
        <form id="add-exercise-form">
          <div class="form-group">
            <label for="new-exercise-name">${isCardio ? "Activity name" : "Exercise name"}</label>
            <input id="new-exercise-name" class="text-input" name="name" maxlength="70" placeholder="${isCardio ? "e.g. Sled pushes" : "e.g. Incline machine press"}" required autofocus />
          </div>
          <div class="form-group">
            <label for="new-exercise-category">Category</label>
            <div class="select-wrap">
              <select id="new-exercise-category" name="category">
                ${Object.keys(CATEGORY_META)
                  .map(
                    (item) =>
                      `<option value="${item}" ${item === category ? "selected" : ""}>${CATEGORY_META[item].label}</option>`
                  )
                  .join("")}
              </select>
            </div>
          </div>
          <div class="form-group" id="muscle-form-group">
            <label for="new-exercise-muscle">${isCardio ? "Type" : "Muscle group"}</label>
            <div class="select-wrap">
              <select id="new-exercise-muscle" name="muscle">
                ${CATEGORY_META[category].muscles
                  .map(
                    (item) =>
                      `<option value="${escapeAttr(item)}" ${item === muscle ? "selected" : ""}>${escapeHtml(item)}</option>`
                  )
                  .join("")}
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary-button" data-action="close-modal">Cancel</button>
            <button type="submit" class="primary-button">Add to library</button>
          </div>
        </form>
      </section>
    </div>
  `;
  requestAnimationFrame(() => document.querySelector("#new-exercise-name")?.focus());
}

function openSettingsModal() {
  document.querySelector("#modal-root").innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="modal-handle"></div>
        <h2 id="settings-title">Settings</h2>
        <p>A couple of practical choices. Nothing that needs a user manual.</p>
        <div class="form-group">
          <label>Weight unit</label>
          <div class="button-row">
            <button class="${data.unit === "lb" ? "primary-button" : "secondary-button"}" data-action="set-unit" data-unit="lb">Pounds (lb)</button>
            <button class="${data.unit === "kg" ? "primary-button" : "secondary-button"}" data-action="set-unit" data-unit="kg">Kilograms (kg)</button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="secondary-button" data-action="close-modal">Done</button>
        </div>
      </section>
    </div>
  `;
}

function closeModal() {
  document.querySelector("#modal-root").innerHTML = "";
}

function addCustomExercise(form) {
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "");
  const muscle = String(formData.get("muscle") || "");
  if (!name || !CATEGORY_META[category]?.muscles.includes(muscle)) return;
  const duplicate = allExercises(category, muscle).some(
    (exercise) => exercise.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    toast(`${name} is already in this group`);
    return;
  }
  const exercise = {
    id: uid("custom"),
    name,
    category,
    muscle,
    custom: true,
  };
  data.customExercises.push(exercise);
  saveData();
  if (state.route === "session" && state.currentSession.category === category) {
    state.selectedMuscle = muscle;
  }
  closeModal();
  render();
  toast(`${name} added`);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ ...data, draft: null }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `setline-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast("Backup exported");
}

async function importData(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.workouts) || !Array.isArray(parsed.customExercises)) {
      throw new Error("Invalid Setline backup");
    }
    if (!window.confirm("Replace the workouts and exercise library on this device with this backup?")) return;
    data = {
      ...defaultData(),
      ...parsed,
      draft: null,
    };
    saveData();
    render();
    toast("Backup restored");
  } catch {
    toast("That file is not a valid Setline backup");
  }
}

function toast(message) {
  const root = document.querySelector("#toast-root");
  root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    root.innerHTML = "";
  }, 2400);
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action], [data-route]");
  if (!target) return;

  if (target.dataset.route) {
    state.route = target.dataset.route;
    state.detailId = null;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const action = target.dataset.action;
  if (action === "start-category") startSession(target.dataset.category);
  if (action === "resume-draft") resumeDraft();
  if (action === "leave-session") {
    persistDraft();
    state.route = "home";
    render();
  }
  if (action === "discard-session") {
    if (!window.confirm("Discard this unfinished workout?")) return;
    state.currentSession = null;
    data.draft = null;
    saveData();
    state.route = "home";
    render();
  }
  if (action === "select-muscle") {
    state.selectedMuscle = target.dataset.muscle;
    render();
  }
  if (action === "add-entry") addEntry();
  if (action === "remove-entry") {
    state.currentSession.exercises = state.currentSession.exercises.filter(
      (entry) => entry.entryId !== target.dataset.entryId
    );
    persistDraft();
    render();
  }
  if (action === "toggle-same-weight") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry) return;
    entry.sameWeight = !entry.sameWeight;
    if (entry.sameWeight && entry.sets.length) {
      entry.sets.forEach((set, index) => {
        if (index > 0) set.weight = entry.sets[0].weight;
      });
    }
    persistDraft();
    render();
  }
  if (action === "add-set") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry) return;
    entry.sets.push({
      weight: entry.sameWeight && entry.sets.length ? entry.sets[0].weight : "",
      reps: "",
    });
    persistDraft();
    render();
  }
  if (action === "remove-set") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry || entry.sets.length === 1) {
      toast("Keep at least one set");
      return;
    }
    entry.sets.splice(Number(target.dataset.setIndex), 1);
    persistDraft();
    render();
  }
  if (action === "add-interval") {
    const entry = getEntry(target.dataset.entryId);
    entry?.intervals.push({ minutes: "", seconds: "", note: "" });
    persistDraft();
    render();
  }
  if (action === "remove-interval") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry || entry.intervals.length === 1) {
      toast("Keep at least one interval");
      return;
    }
    entry.intervals.splice(Number(target.dataset.setIndex), 1);
    persistDraft();
    render();
  }
  if (action === "save-workout") saveWorkout();
  if (action === "filter-history") {
    state.historyFilter = target.dataset.category;
    render();
  }
  if (action === "open-workout") {
    state.detailId = target.dataset.workoutId;
    state.route = "detail";
    render();
    window.scrollTo({ top: 0 });
  }
  if (action === "close-detail") {
    state.route = "history";
    state.detailId = null;
    render();
  }
  if (action === "delete-workout") {
    if (!window.confirm("Delete this workout from your history?")) return;
    data.workouts = data.workouts.filter((workout) => workout.id !== target.dataset.workoutId);
    saveData();
    state.route = "history";
    state.detailId = null;
    render();
    toast("Workout deleted");
  }
  if (action === "filter-library") {
    state.libraryCategory = target.dataset.category;
    render();
  }
  if (action === "open-add-exercise") {
    openAddExerciseModal(target.dataset.category, target.dataset.muscle);
  }
  if (action === "delete-custom-exercise") {
    const exercise = data.customExercises.find((item) => item.id === target.dataset.exerciseId);
    if (!exercise || !window.confirm(`Remove ${exercise.name} from your library? Past workouts will be kept.`)) return;
    data.customExercises = data.customExercises.filter((item) => item.id !== exercise.id);
    saveData();
    render();
    toast(`${exercise.name} removed`);
  }
  if (action === "close-modal") {
    if (target.classList.contains("modal-backdrop") && event.target !== target) return;
    closeModal();
  }
  if (action === "open-settings") openSettingsModal();
  if (action === "set-unit") {
    data.unit = target.dataset.unit;
    saveData();
    openSettingsModal();
    toast(`Using ${data.unit}`);
  }
  if (action === "export-data") exportData();
  if (action === "import-data") document.querySelector("#import-file")?.click();
  if (action === "install-app" && state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action === "update-strength-set") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry) return;
    const setIndex = Number(target.dataset.setIndex);
    const field = target.dataset.field;
    entry.sets[setIndex][field] = target.value;
    if (field === "weight" && setIndex === 0 && entry.sameWeight) {
      entry.sets.forEach((set, index) => {
        if (index > 0) set.weight = target.value;
      });
      document
        .querySelectorAll(
          `[data-action="update-strength-set"][data-entry-id="${CSS.escape(entry.entryId)}"][data-field="weight"]`
        )
        .forEach((input, index) => {
          if (index > 0) input.value = target.value;
        });
    }
    persistDraft();
  }
  if (action === "update-interval") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry) return;
    entry.intervals[Number(target.dataset.setIndex)][target.dataset.field] = target.value;
    persistDraft();
  }
  if (action === "update-session-notes") {
    state.currentSession.notes = target.value;
    persistDraft();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "new-exercise-category") {
    const category = event.target.value;
    const select = document.querySelector("#new-exercise-muscle");
    if (select) {
      select.innerHTML = CATEGORY_META[category].muscles
        .map((muscle) => `<option value="${escapeAttr(muscle)}">${escapeHtml(muscle)}</option>`)
        .join("");
      document.querySelector("#muscle-form-group label").textContent =
        category === "cardio" ? "Type" : "Muscle group";
    }
  }
  if (event.target.id === "import-file") importData(event.target.files?.[0]);
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "add-exercise-form") return;
  event.preventDefault();
  addCustomExercise(event.target);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  if (state.route === "home") render();
});

window.addEventListener("appinstalled", () => {
  state.deferredInstallPrompt = null;
  toast("Setline installed");
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
