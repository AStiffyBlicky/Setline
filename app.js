const STORAGE_KEY = "setline-data-v1";

const CATEGORY_META = {
  push: {
    label: "Push",
    subtitle: "Chest · triceps · shoulders",
    muscles: ["chest", "triceps", "shoulders"],
    color: "#c77dff",
  },
  pull: {
    label: "Pull",
    subtitle: "Biceps · back · forearms",
    muscles: ["biceps", "back", "forearms"],
    color: "#8f82ff",
  },
  legs: {
    label: "Legs",
    subtitle: "Hamstrings · glutes · quads · more",
    muscles: ["hamstrings", "glutes", "quads", "calves", "inner / outer thigh"],
    color: "#e078b5",
  },
  core: {
    label: "Core",
    subtitle: "Abs · obliques",
    muscles: ["abs", "obliques"],
    color: "#a970ff",
  },
  cardio: {
    label: "Cardio",
    subtitle: "Intervals · activities · notes",
    muscles: ["activity"],
    color: "#63c6b0",
  },
};

const DEFAULT_EXERCISES = {
  push: {
    chest: ["Flat Dumbbell Press", "Pec Fly Machine", "Incline Dumbbell Press", "Cable Fly"],
    triceps: ["Dips", "Tricep Pushdown", "Dumbbell Skull Crusher", "Overhead Cable Tricep Push"],
    shoulders: ["Dumbbell Shoulder Press", "Side Laterals", "Cable Side Lateral", "Shoulder Press Machine"],
  },
  pull: {
    biceps: ["Preacher Curl", "Hammer Curl", "Incline Dumbbell Curl", "Cable Curl"],
    back: ["Pull-up", "Vertical Row (Wide Grip)", "Vertical Row (Narrow Grip)", "Lat Prayer", "Bent Over Dumbbell Row"],
    forearms: ["Wrist Curl", "Reverse Wrist Curl"],
  },
  legs: {
    hamstrings: ["Seated Leg Curl", "Romanian Deadlift", "Lying Leg Curl"],
    glutes: ["Barbell Squat", "Hip Thrust", "Leg Press"],
    quads: ["Leg Extension", "Bulgarian Split Squat", "Hack Squat"],
    calves: ["Seated Calf Raise", "Standing Calf Raise"],
    "inner / outer thigh": ["Hip Abduction", "Hip Adduction"],
  },
  core: {
    abs: ["Crunch", "Weighted Crunch", "Hanging Leg Raise"],
    obliques: ["Bicycle Crunch", "Russian Twist", "Side Plank"],
  },
  cardio: {
    activity: ["Running", "Assault Bike", "Elliptical", "Rowing", "Stair Climber", "Walking"],
  },
};

const state = {
  route: "home",
  currentSession: null,
  selectedCategory: null,
  selectedMuscle: null,
  historyFilter: "all",
  historyYear: "all",
  historyMonth: "all",
  historyStart: "",
  historyEnd: "",
  detailId: null,
  libraryCategory: "push",
  analyticsExerciseId: null,
  analyticsMode: "exercise",
  analyticsRange: "all",
  deferredInstallPrompt: null,
};

let data = loadData();

function defaultData() {
  return {
    version: 3,
    workouts: [],
    customExercises: [],
    hiddenExercises: [],
    draft: null,
    unit: "lb",
    currentWeight: "",
    weightUpdatedAt: null,
    bodyWeightHistory: [],
    theme: "light",
  };
}

function normalizeEntry(entry, fallbackCategory) {
  const category = entry.category || (entry.type === "cardio" ? "cardio" : fallbackCategory) || "push";
  return {
    ...entry,
    category,
    sameReps: entry.type === "strength" ? Boolean(entry.sameReps) : undefined,
  };
}

function normalizeWorkout(workout) {
  const fallbackCategory = CATEGORY_META[workout.category] ? workout.category : "push";
  return {
    ...workout,
    category: fallbackCategory,
    bodyWeightUnit: workout.bodyWeightUnit || null,
    exercises: Array.isArray(workout.exercises)
      ? workout.exercises.map((entry) => normalizeEntry(entry, fallbackCategory))
      : [],
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
      version: 3,
      workouts: Array.isArray(saved.workouts) ? saved.workouts.map(normalizeWorkout) : [],
      customExercises: Array.isArray(saved.customExercises) ? saved.customExercises : [],
      hiddenExercises: Array.isArray(saved.hiddenExercises) ? saved.hiddenExercises : [],
      bodyWeightHistory: Array.isArray(saved.bodyWeightHistory) ? saved.bodyWeightHistory : [],
      draft: saved.draft ? normalizeWorkout(saved.draft) : null,
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
    core: '<path d="M8 4c1.5 1 2.8 1.5 4 1.5S14.5 5 16 4M8 20c1.5-1 2.8-1.5 4-1.5s2.5.5 4 1.5M9 6.5 8 17.5M15 6.5l1 11M8.5 12h7"/>',
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

function allExercises(category, muscle, options = {}) {
  const builtIns = (DEFAULT_EXERCISES[category]?.[muscle] || []).map((name) => ({
    id: `default-${slugify(category)}-${slugify(muscle)}-${slugify(name)}`,
    name,
    category,
    muscle,
    custom: false,
  })).filter((exercise) => options.includeHidden || !data.hiddenExercises.includes(exercise.id));
  const custom = data.customExercises.filter(
    (exercise) => exercise.category === category && exercise.muscle === muscle
  );
  return [...builtIns, ...custom].sort((a, b) => a.name.localeCompare(b.name));
}

function workoutCategories(workout) {
  const categories = [
    ...new Set(
      (workout.exercises || [])
        .map((entry) => entry.category || workout.category)
        .filter((category) => CATEGORY_META[category])
    ),
  ];
  return categories.length ? categories : [workout.category || "push"];
}

function workoutLabel(workout) {
  const categories = workoutCategories(workout);
  return categories.length > 1
    ? "Mixed"
    : CATEGORY_META[categories[0]]?.label || "Workout";
}

function getExerciseById(exerciseId) {
  for (const category of Object.keys(CATEGORY_META)) {
    for (const muscle of CATEGORY_META[category].muscles) {
      const exercise = allExercises(category, muscle, { includeHidden: true }).find(
        (item) => item.id === exerciseId
      );
      if (exercise) return exercise;
    }
  }
  return null;
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

function availableAnalyticsExercises() {
  const exerciseMap = new Map();
  for (const category of Object.keys(CATEGORY_META)) {
    if (category === "cardio") continue;
    for (const muscle of CATEGORY_META[category].muscles) {
      for (const exercise of allExercises(category, muscle)) {
        exerciseMap.set(exercise.id, exercise);
      }
    }
  }
  for (const workout of data.workouts) {
    for (const entry of workout.exercises || []) {
      if (entry.type !== "strength" || exerciseMap.has(entry.exerciseId)) continue;
      exerciseMap.set(entry.exerciseId, {
        id: entry.exerciseId,
        name: entry.name,
        category: entry.category || workout.category || "push",
        muscle: entry.muscle || "",
        custom: true,
      });
    }
  }
  const categoryOrder = Object.keys(CATEGORY_META);
  return [...exerciseMap.values()].sort(
    (a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) ||
      a.name.localeCompare(b.name)
  );
}

function exerciseHistory(exerciseId) {
  return [...data.workouts]
    .sort(
      (a, b) => new Date(a.completedAt || a.startedAt) - new Date(b.completedAt || b.startedAt)
    )
    .flatMap((workout) => {
      const entry = workout.exercises?.find(
        (item) => item.exerciseId === exerciseId && item.type === "strength"
      );
      if (!entry) return [];
      const weights = (entry.sets || [])
        .map((set) => Number(set.weight))
        .filter((weight) => Number.isFinite(weight) && weight > 0);
      return [
        {
          date: new Date(workout.completedAt || workout.startedAt),
          weight: weights.length ? Math.max(...weights) : null,
          sets: entry.sets || [],
          workoutId: workout.id,
        },
      ];
    });
}

function exerciseWeightSeries(exerciseId) {
  return exerciseHistory(exerciseId).filter((point) => point.weight !== null);
}

function convertWeight(value, fromUnit, toUnit) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  if (!fromUnit || fromUnit === toUnit) return numericValue;
  return fromUnit === "kg" ? numericValue * 2.2046226218 : numericValue / 2.2046226218;
}

function bodyWeightSeries() {
  const workoutPoints = data.workouts.flatMap((workout) => {
    if (!workout.bodyWeight || Number(workout.bodyWeight) <= 0) return [];
    return [
      {
        date: new Date(workout.completedAt || workout.startedAt),
        weight: convertWeight(
          workout.bodyWeight,
          workout.bodyWeightUnit || data.unit,
          data.unit
        ),
        source: "Workout",
        id: `workout-${workout.id}`,
      },
    ];
  });
  const settingsPoints = data.bodyWeightHistory.flatMap((entry) => {
    if (!entry.weight || Number(entry.weight) <= 0 || !entry.date) return [];
    return [
      {
        date: new Date(entry.date),
        weight: convertWeight(entry.weight, entry.unit || data.unit, data.unit),
        source: "Settings",
        id: entry.id,
      },
    ];
  });
  const points = [...workoutPoints, ...settingsPoints];
  if (
    data.currentWeight &&
    data.weightUpdatedAt &&
    !points.some(
      (point) => Math.abs(point.date - new Date(data.weightUpdatedAt)) < 1000
    )
  ) {
    points.push({
      date: new Date(data.weightUpdatedAt),
      weight: Number(data.currentWeight),
      source: "Current weight",
      id: "legacy-current-weight",
    });
  }
  return points.sort((a, b) => a.date - b.date);
}

function filterAnalyticsRange(points) {
  if (state.analyticsRange === "all") return points;
  if (state.analyticsRange.startsWith("year-")) {
    const year = Number(state.analyticsRange.slice(5));
    return points.filter((point) => point.date.getFullYear() === year);
  }
  const cutoff = new Date();
  if (state.analyticsRange === "last12") cutoff.setMonth(cutoff.getMonth() - 12);
  if (state.analyticsRange === "last1") cutoff.setMonth(cutoff.getMonth() - 1);
  return points.filter((point) => point.date >= cutoff);
}

function renderAnalyticsRangeSelector(points) {
  const years = [...new Set(points.map((point) => point.date.getFullYear()))].sort(
    (a, b) => b - a
  );
  if (
    state.analyticsRange.startsWith("year-") &&
    !years.includes(Number(state.analyticsRange.slice(5)))
  ) {
    years.push(Number(state.analyticsRange.slice(5)));
    years.sort((a, b) => b - a);
  }
  return `
    <section class="analytics-range-control">
      <label for="analytics-range-select">Graph range</label>
      <div class="select-wrap">
        <select id="analytics-range-select">
          <option value="all" ${state.analyticsRange === "all" ? "selected" : ""}>All time</option>
          <option value="last12" ${
            state.analyticsRange === "last12" ? "selected" : ""
          }>Last 12 months</option>
          <option value="last1" ${
            state.analyticsRange === "last1" ? "selected" : ""
          }>Last month</option>
          ${
            years.length
              ? `<optgroup label="By year">${years
                  .map(
                    (year) =>
                      `<option value="year-${year}" ${
                        state.analyticsRange === `year-${year}` ? "selected" : ""
                      }>${year}</option>`
                  )
                  .join("")}</optgroup>`
              : ""
          }
        </select>
      </div>
    </section>
  `;
}

function compoundedMonthlyGrowth(points) {
  if (points.length < 2) return null;
  const first = points[0];
  const latest = points.at(-1);
  const elapsedDays = (latest.date - first.date) / 86400000;
  if (elapsedDays < 28 || first.weight <= 0 || latest.weight <= 0) return null;
  const elapsedMonths = elapsedDays / (365.2425 / 12);
  return (Math.pow(latest.weight / first.weight, 1 / elapsedMonths) - 1) * 100;
}

function formatWeight(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}

function formatChartDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}

function render() {
  const view = document.querySelector("#app-view");
  const nav = document.querySelector("#bottom-nav");
  const isDark = data.theme === "dark";
  document.documentElement.classList.toggle("dark-theme", isDark);
  document.documentElement.classList.toggle("light-theme", !isDark);
  document.body.classList.toggle("dark-theme", isDark);
  document.body.classList.toggle("light-theme", !isDark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    isDark ? "#0e0a13" : "#f7f3fb"
  );
  document.body.classList.toggle("session-open", state.route === "session");
  nav.classList.toggle("is-hidden", state.route === "session");

  if (state.route === "home") view.innerHTML = renderHome();
  if (state.route === "session") view.innerHTML = renderSession();
  if (state.route === "history") view.innerHTML = renderHistory();
  if (state.route === "detail") view.innerHTML = renderDetail();
  if (state.route === "library") view.innerHTML = renderLibrary();
  if (state.route === "data") view.innerHTML = renderData();

  nav.querySelectorAll(".nav-item").forEach((button) => {
    const activeRoute = state.route === "detail" ? "history" : state.route;
    button.classList.toggle("is-active", button.dataset.route === activeRoute);
  });
  if (state.route === "data") {
    requestAnimationFrame(() => {
      const chart = document.querySelector(".chart-scroll");
      if (chart) chart.scrollLeft = chart.scrollWidth;
    });
  }
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

    ${
      draft
        ? `
          <button class="quick-stat" data-action="resume-draft" style="width:100%; text-align:left; cursor:pointer;">
            <span class="stat-icon">↗</span>
            <span>
              <strong>Resume ${escapeHtml(workoutLabel(draft))} session</strong>
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
      <span class="stat-icon">${last ? workoutLabel(last).charAt(0) : "—"}</span>
      <span>
        <strong>${last ? `Last: ${workoutLabel(last)}` : "No workouts logged yet"}</strong>
        <span>${last ? `${relativeDate(last.completedAt || last.startedAt)} · ${last.exercises.length} ${last.exercises.length === 1 ? "exercise" : "exercises"}` : "Your first entry will appear here."}</span>
      </span>
    </div>
    <button class="quick-stat body-weight-stat" data-action="open-settings">
      <span class="stat-icon">BW</span>
      <span>
        <strong>${data.currentWeight ? `${escapeHtml(data.currentWeight)} ${data.unit}` : "Add your current weight"}</strong>
        <span>${data.weightUpdatedAt ? `Updated ${relativeDate(data.weightUpdatedAt)}` : "Keep your latest body weight close at hand."}</span>
      </span>
    </button>

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
    bodyWeight: data.currentWeight || "",
    bodyWeightUnit: data.unit,
    exercises: [],
  };
}

function startSession(category) {
  if (data.draft) {
    const replace = window.confirm(
      `You have an unfinished ${workoutLabel(data.draft)} session. Start a new one instead?`
    );
    if (!replace) {
      resumeDraft();
      return;
    }
  }
  state.currentSession = createSession(category);
  state.selectedCategory = category;
  state.selectedMuscle = CATEGORY_META[category].muscles[0];
  data.draft = state.currentSession;
  saveData();
  state.route = "session";
  render();
}

function resumeDraft() {
  if (!data.draft) return;
  state.currentSession = data.draft;
  state.selectedCategory = data.draft.category;
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
  const selectedCategory = CATEGORY_META[state.selectedCategory]
    ? state.selectedCategory
    : session.category;
  state.selectedCategory = selectedCategory;
  const selectedMeta = CATEGORY_META[selectedCategory];
  const muscle = selectedMeta.muscles.includes(state.selectedMuscle)
    ? state.selectedMuscle
    : selectedMeta.muscles[0];
  state.selectedMuscle = muscle;
  const exercises = allExercises(selectedCategory, muscle);
  const isCardio = selectedCategory === "cardio";
  const usedCategories = workoutCategories(session);
  const displayLabel = workoutLabel(session);
  const heroColor = usedCategories.length > 1 ? "#ad7cff" : CATEGORY_META[usedCategories[0]].color;

  return `
    <header class="session-header">
      <button class="icon-button" data-action="leave-session" aria-label="Back">‹</button>
      <div class="session-title">
        <strong>${displayLabel} session</strong>
        <span>${formatTime(session.startedAt)} · ${session.exercises.length} added</span>
      </div>
      <button class="icon-button" data-action="discard-session" aria-label="Discard session">×</button>
    </header>

    <section class="session-hero" style="--tone:${heroColor}">
      <p>In progress</p>
      <h1>${displayLabel} workout</h1>
      ${
        session.exercises.length
          ? `<div class="hero-categories">${usedCategories
              .map((category) => `<span>${CATEGORY_META[category].label}</span>`)
              .join("")}</div>`
          : ""
      }
    </section>

    <div class="muscle-tabs category-tabs" aria-label="Exercise category">
      ${Object.entries(CATEGORY_META)
        .map(
          ([category, meta]) => `
            <button class="chip ${category === selectedCategory ? "is-active" : ""}" data-action="select-session-category" data-category="${category}">
              ${meta.label}
            </button>
          `
        )
        .join("")}
    </div>

    ${
      !isCardio
        ? `
          <div class="muscle-tabs subgroup-tabs" aria-label="Muscle group">
            ${selectedMeta.muscles
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
        : ""
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
        <button class="text-button" data-action="open-add-exercise" data-category="${selectedCategory}" data-muscle="${escapeAttr(muscle)}">
          + Create your own
        </button>
      </div>
    </section>

    <div id="session-entries">
      ${
        session.exercises.length
          ? session.exercises
              .map((entry) => entry.type === "cardio" ? renderCardioEntry(entry) : renderStrengthEntry(entry))
              .join("")
          : `
            <div class="empty-state">
              <button class="empty-state-icon" data-action="open-add-entry-modal" aria-label="Add your first exercise">+</button>
              <h3>Add your first exercise</h3>
              <p>Start anywhere. You can mix categories freely in the same workout.</p>
            </div>
          `
      }
    </div>

    ${
      session.exercises.length
        ? `
          <section class="bottom-add-card">
            <button class="primary-button accent" data-action="open-add-entry-modal">+ Add another exercise</button>
            <span>Choose from Push, Pull, Legs, Core, or Cardio.</span>
          </section>
        `
        : ""
    }

    <section class="session-note">
      <label for="session-body-weight">Current body weight</label>
      <div class="input-with-unit session-weight-input">
        <input
          id="session-body-weight"
          class="number-input"
          type="number"
          min="0"
          step="0.1"
          inputmode="decimal"
          value="${escapeAttr(session.bodyWeight || "")}"
          placeholder="Optional"
          data-action="update-session-weight"
        />
        <span>${data.unit}</span>
      </div>
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
          <p><span class="category-tag">${CATEGORY_META[entry.category]?.label || "Strength"}</span> ${escapeHtml(entry.muscle)} · ${entry.sets.length} ${entry.sets.length === 1 ? "set" : "sets"}</p>
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
      <div class="same-weight-row">
        <span>Use first-set reps for all sets</span>
        <button
          class="switch ${entry.sameReps ? "is-on" : ""}"
          data-action="toggle-same-reps"
          data-entry-id="${escapeAttr(entry.entryId)}"
          role="switch"
          aria-checked="${Boolean(entry.sameReps)}"
          aria-label="Use the same reps for every set"
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
          <p><span class="category-tag">Cardio</span> ${entry.intervals.length} ${entry.intervals.length === 1 ? "interval" : "intervals"}</p>
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
  const category = state.selectedCategory || state.currentSession.category;
  if (!select?.value) {
    toast(category === "cardio" ? "Choose an activity first" : "Choose an exercise first");
    return;
  }
  const muscle = state.selectedMuscle || CATEGORY_META[category].muscles[0];
  addEntryById(category, muscle, select.value);
}

function addEntryById(category, muscle, exerciseId, options = {}) {
  const exercise = allExercises(category, muscle).find((item) => item.id === exerciseId);
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
          category,
          type: "cardio",
          intervals: [{ minutes: "", seconds: "", note: "" }],
        }
      : {
          entryId: uid("entry"),
          exerciseId: exercise.id,
          name: exercise.name,
          muscle: exercise.muscle,
          category,
          type: "strength",
          sameWeight: true,
          sameReps: false,
          sets: [
            { weight: "", reps: "" },
            { weight: "", reps: "" },
            { weight: "", reps: "" },
          ],
        }
  );
  persistDraft();
  if (options.closeModal) closeModal();
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
  if (session.bodyWeight) {
    session.bodyWeightUnit = data.unit;
    data.currentWeight = session.bodyWeight;
    data.weightUpdatedAt = session.completedAt;
  }
  data.workouts.push(JSON.parse(JSON.stringify(session)));
  data.draft = null;
  saveData();
  state.currentSession = null;
  state.historyFilter = workoutCategories(session).length > 1 ? "all" : workoutCategories(session)[0];
  state.route = "history";
  render();
  toast("Workout saved");
}

function historyDateMatches(workout) {
  const workoutDate = new Date(workout.completedAt || workout.startedAt);
  if (
    state.historyYear !== "all" &&
    workoutDate.getFullYear() !== Number(state.historyYear)
  ) {
    return false;
  }
  if (
    state.historyMonth !== "all" &&
    workoutDate.getMonth() !== Number(state.historyMonth)
  ) {
    return false;
  }
  if (state.historyStart) {
    const start = new Date(`${state.historyStart}T00:00:00`);
    if (workoutDate < start) return false;
  }
  if (state.historyEnd) {
    const end = new Date(`${state.historyEnd}T23:59:59.999`);
    if (workoutDate > end) return false;
  }
  return true;
}

function renderHistory() {
  const years = [
    ...new Set(
      data.workouts.map((workout) =>
        new Date(workout.completedAt || workout.startedAt).getFullYear()
      )
    ),
  ].sort((a, b) => b - a);
  if (state.historyYear !== "all" && !years.includes(Number(state.historyYear))) {
    years.push(Number(state.historyYear));
    years.sort((a, b) => b - a);
  }
  const hasDateFilter =
    state.historyYear !== "all" ||
    state.historyMonth !== "all" ||
    state.historyStart ||
    state.historyEnd;
  const workouts = [...data.workouts]
    .filter(
      (workout) =>
        (state.historyFilter === "all" ||
          workoutCategories(workout).includes(state.historyFilter)) &&
        historyDateMatches(workout)
    )
    .sort(
      (a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt)
    );

  return `
    <div class="topbar">
      ${brandMarkup()}
      <span class="meta-line">${data.workouts.length} saved</span>
    </div>
    <h1>History</h1>
    <p class="intro-copy">Your training record</p>

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

    <section class="history-date-filters">
      <div class="history-filter-row">
        <label>
          Year
          <div class="select-wrap">
            <select id="history-year-filter">
              <option value="all">Any year</option>
              ${years
                .map(
                  (year) =>
                    `<option value="${year}" ${
                      String(year) === state.historyYear ? "selected" : ""
                    }>${year}</option>`
                )
                .join("")}
            </select>
          </div>
        </label>
        <label>
          Month
          <div class="select-wrap">
            <select id="history-month-filter">
              <option value="all">Any month</option>
              ${Array.from({ length: 12 }, (_, month) => {
                const monthName = new Intl.DateTimeFormat("en-US", {
                  month: "long",
                }).format(new Date(2026, month, 1));
                return `<option value="${month}" ${
                  String(month) === state.historyMonth ? "selected" : ""
                }>${monthName}</option>`;
              }).join("")}
            </select>
          </div>
        </label>
      </div>
      <div class="history-filter-row custom-date-row">
        <label>
          From
          <input id="history-start-filter" class="text-input" type="date" value="${escapeAttr(
            state.historyStart
          )}" />
        </label>
        <label>
          Through
          <input id="history-end-filter" class="text-input" type="date" value="${escapeAttr(
            state.historyEnd
          )}" />
        </label>
      </div>
      <div class="history-filter-footer">
        <span>${workouts.length} matching ${workouts.length === 1 ? "workout" : "workouts"}</span>
        ${
          hasDateFilter
            ? `<button class="text-button" data-action="clear-history-dates">Clear date filters</button>`
            : ""
        }
      </div>
    </section>

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
  const categories = workoutCategories(workout);
  const meta = categories.length > 1
    ? { label: "Mixed", color: "#ad7cff" }
    : CATEGORY_META[categories[0]];
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
  const volumeSummary = [
    strengthSets ? `${strengthSets} sets` : "",
    intervals ? `${intervals} ${intervals === 1 ? "interval" : "intervals"}` : "",
  ].filter(Boolean).join(" · ");
  const categorySummary = categories.map((category) => CATEGORY_META[category].label).join(" + ");

  return `
    <button class="history-card" data-action="open-workout" data-workout-id="${escapeAttr(workout.id)}" style="--tone:${meta.color}">
      <div class="history-top">
        <span class="history-category">
          <span class="history-dot"></span>
          <span>
            <strong>${meta.label}</strong>
            <small>${categorySummary} · ${workout.exercises.length} ${workout.exercises.length === 1 ? "exercise" : "exercises"} · ${volumeSummary}</small>
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
  const categories = workoutCategories(workout);
  const meta = categories.length > 1
    ? { label: "Mixed", color: "#ad7cff" }
    : CATEGORY_META[categories[0]];
  return `
    <header class="session-header">
      <button class="icon-button" data-action="close-detail" aria-label="Back">‹</button>
      <div class="session-title">
        <strong>${meta.label} workout</strong>
        <span>${formatDate(workout.completedAt || workout.startedAt, { year: true })}</span>
      </div>
      <button class="icon-button" data-action="delete-workout" data-workout-id="${escapeAttr(workout.id)}" aria-label="Delete workout">⌫</button>
    </header>

    <section class="session-hero" style="--tone:${meta.color}; margin-bottom:17px;">
      <p>Completed · ${formatTime(workout.completedAt || workout.startedAt)}</p>
      <h1>${meta.label} workout</h1>
      <div class="hero-categories">${categories
        .map((category) => `<span>${CATEGORY_META[category].label}</span>`)
        .join("")}</div>
    </section>

    ${workout.exercises.map((entry) => renderDetailEntry(entry)).join("")}

    ${
      workout.bodyWeight
        ? `
          <section class="detail-block detail-metric">
            <span>Body weight</span>
            <strong>${formatWeight(
              convertWeight(
                workout.bodyWeight,
                workout.bodyWeightUnit || data.unit,
                data.unit
              )
            )} ${data.unit}</strong>
          </section>
        `
        : ""
    }

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

    <button class="danger-button detail-delete-button" data-action="delete-workout" data-workout-id="${escapeAttr(workout.id)}">
      Delete this workout
    </button>
  `;
}

function renderDetailEntry(entry) {
  if (entry.type === "cardio") {
    return `
      <article class="detail-block">
        <h3>${escapeHtml(entry.name)}</h3>
        <p class="subtext"><span class="category-tag">Cardio</span> ${entry.intervals.length} ${entry.intervals.length === 1 ? "interval" : "intervals"}</p>
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
      <p class="subtext"><span class="category-tag">${CATEGORY_META[entry.category]?.label || "Strength"}</span> ${escapeHtml(entry.muscle)} · ${entry.sets.length} ${entry.sets.length === 1 ? "set" : "sets"}</p>
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
    <h1>Exercise library</h1>
    <p class="intro-copy">Keep only the movements you use. Removing a built-in exercise never changes your past workouts.</p>

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
        const hiddenInGroup = allExercises(category, muscle, { includeHidden: true }).filter(
          (exercise) => !exercise.custom && data.hiddenExercises.includes(exercise.id)
        );
        return `
          <section class="library-group">
            <div class="library-group-head">
              <strong>${escapeHtml(muscle)}</strong>
              <span>${exercises.length} total</span>
            </div>
            ${
              exercises.length
                ? exercises.map(
                (exercise) => `
                  <div class="library-item">
                    <span>${escapeHtml(exercise.name)}</span>
                    <button class="text-button remove-library-button" data-action="remove-library-exercise" data-exercise-id="${escapeAttr(exercise.id)}">Remove</button>
                  </div>
                `
              ).join("")
                : `<div class="library-item library-empty">No exercises in this group.</div>`
            }
            ${
              hiddenInGroup.length
                ? `
                  <div class="library-item">
                    <button class="text-button" data-action="restore-exercises" data-category="${category}" data-muscle="${escapeAttr(muscle)}">
                      Restore ${hiddenInGroup.length} removed ${hiddenInGroup.length === 1 ? "exercise" : "exercises"}
                    </button>
                  </div>
                `
                : ""
            }
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

function renderWeightChart(points, options = {}) {
  const emptyTitle = options.emptyTitle || "No weighted sets yet";
  const emptyCopy =
    options.emptyCopy || "Log a weight for this exercise and its graph will begin here.";
  const ariaLabel = options.ariaLabel || "Working weight";
  if (!points.length) {
    return `
      <div class="analytics-empty-chart">
        <span>⌁</span>
        <strong>${escapeHtml(emptyTitle)}</strong>
        <p>${escapeHtml(emptyCopy)}</p>
      </div>
    `;
  }

  const width = Math.max(330, 88 + points.length * 76);
  const height = 252;
  const padding = { top: 24, right: 22, bottom: 48, left: 50 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const highestWeight = Math.max(...points.map((point) => point.weight));
  const tickStep = Math.max(1, Math.ceil((highestWeight * 1.12) / 4 / 5) * 5);
  const yMax = tickStep * 4;
  const coordinates = points.map((point, index) => ({
    x:
      points.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (points.length - 1)) * plotWidth,
    y: padding.top + plotHeight - (point.weight / yMax) * plotHeight,
    point,
  }));
  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + plotHeight} ${linePoints} ${
    padding.left + plotWidth
  },${padding.top + plotHeight}`;

  return `
    <div class="chart-scroll" aria-label="${escapeAttr(ariaLabel)} by date">
      <svg
        class="weight-chart"
        viewBox="0 0 ${width} ${height}"
        style="width:${width}px"
        role="img"
        aria-label="${escapeAttr(ariaLabel)} history from ${formatChartDate(points[0].date)} to ${formatChartDate(points.at(-1).date)}"
      >
        <defs>
          <linearGradient id="weight-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#b884ff" stop-opacity=".32" />
            <stop offset="100%" stop-color="#b884ff" stop-opacity=".02" />
          </linearGradient>
        </defs>
        ${[0, 1, 2, 3, 4]
          .map((index) => {
            const y = padding.top + (index / 4) * plotHeight;
            const value = yMax - index * tickStep;
            return `
              <line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${
                padding.left + plotWidth
              }" y2="${y}" />
              <text class="chart-y-label" x="${padding.left - 9}" y="${y + 4}" text-anchor="end">${formatWeight(
                value
              )}</text>
            `;
          })
          .join("")}
        <text class="chart-axis-title" x="13" y="${padding.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 13 ${
          padding.top + plotHeight / 2
        })">Weight (${data.unit})</text>
        ${
          points.length > 1
            ? `<polygon class="chart-area" points="${areaPoints}" />`
            : ""
        }
        <polyline class="chart-line" points="${linePoints}" />
        ${coordinates
          .map(
            ({ x, y, point }) => `
              <g>
                <circle class="chart-point-halo" cx="${x}" cy="${y}" r="8" />
                <circle class="chart-point" cx="${x}" cy="${y}" r="4">
                  <title>${formatChartDate(point.date)}: ${formatWeight(point.weight)} ${data.unit}</title>
                </circle>
                <text class="chart-value-label" x="${x}" y="${Math.max(13, y - 12)}" text-anchor="middle">${formatWeight(
                  point.weight
                )}</text>
                <text class="chart-x-label" x="${x}" y="${height - 19}" text-anchor="middle">${formatChartDate(
                  point.date
                )}</text>
              </g>
            `
          )
          .join("")}
      </svg>
    </div>
  `;
}

function renderAnalyticsModeSwitch() {
  return `
    <div class="analytics-mode-switch" aria-label="Data type">
      <button class="${state.analyticsMode === "exercise" ? "is-active" : ""}" data-action="set-analytics-mode" data-mode="exercise">
        Exercise
      </button>
      <button class="${state.analyticsMode === "body" ? "is-active" : ""}" data-action="set-analytics-mode" data-mode="body">
        Body weight
      </button>
    </div>
  `;
}

function renderData() {
  if (state.analyticsMode === "body") return renderBodyWeightData();
  const exercises = availableAnalyticsExercises();
  if (
    !state.analyticsExerciseId ||
    !exercises.some((exercise) => exercise.id === state.analyticsExerciseId)
  ) {
    const exerciseWithHistory = exercises.find(
      (exercise) => exerciseHistory(exercise.id).length > 0
    );
    state.analyticsExerciseId = exerciseWithHistory?.id || exercises[0]?.id || null;
  }

  const selectedExercise = exercises.find(
    (exercise) => exercise.id === state.analyticsExerciseId
  );
  const fullHistory = selectedExercise ? exerciseHistory(selectedExercise.id) : [];
  const allPoints = fullHistory.filter((item) => item.weight !== null);
  const points = filterAnalyticsRange(allPoints);
  const latest = points.at(-1);
  const growth = compoundedMonthlyGrowth(points);

  return `
    <div class="topbar">
      ${brandMarkup()}
      <span class="meta-line">${points.length} weighted ${points.length === 1 ? "session" : "sessions"}</span>
    </div>
    ${renderAnalyticsModeSwitch()}
    <h1>Exercise data</h1>
    <p class="intro-copy">Choose an exercise to see its complete working-weight history. Repetitions don't affect the graph.</p>

    ${
      exercises.length
        ? `
          <section class="analytics-picker">
            <label for="data-exercise-select">Exercise</label>
            <div class="select-wrap">
              <select id="data-exercise-select">
                ${Object.keys(CATEGORY_META)
                  .filter((category) => category !== "cardio")
                  .map((category) => {
                    const categoryExercises = exercises.filter(
                      (exercise) => exercise.category === category
                    );
                    if (!categoryExercises.length) return "";
                    return `
                      <optgroup label="${CATEGORY_META[category].label}">
                        ${categoryExercises
                          .map(
                            (exercise) => `
                              <option value="${escapeAttr(exercise.id)}" ${
                                exercise.id === state.analyticsExerciseId ? "selected" : ""
                              }>
                                ${escapeHtml(exercise.name)}
                              </option>
                            `
                          )
                          .join("")}
                      </optgroup>
                    `;
                  })
                  .join("")}
              </select>
            </div>
          </section>

          ${renderAnalyticsRangeSelector(allPoints.length ? allPoints : fullHistory)}

          <section class="analytics-summary">
            <div class="analytics-title-row">
              <span>
                <span class="category-tag">${
                  CATEGORY_META[selectedExercise.category]?.label || "Strength"
                }</span>
                <h2>${escapeHtml(selectedExercise.name)}</h2>
              </span>
              <span class="analytics-muscle">${escapeHtml(selectedExercise.muscle)}</span>
            </div>

            <div class="analytics-metrics">
              <article class="metric-card">
                <span>Most recent weight</span>
                <strong>${latest ? `${formatWeight(latest.weight)} <small>${data.unit}</small>` : "—"}</strong>
                <small>${latest ? formatDate(latest.date, { year: true }) : "No weighted sets"}</small>
              </article>
              <article class="metric-card growth-card">
                <span>Average monthly growth</span>
                <strong class="${growth !== null && growth < 0 ? "is-negative" : ""}">${
                  growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(2)}%`
                }</strong>
                <small>${
                  growth === null
                    ? "Needs two weights spanning at least 28 days"
                    : "Compounded from first logged weight to latest"
                }</small>
              </article>
            </div>
          </section>

          <section class="analytics-chart-card">
            <div class="section-heading analytics-section-heading">
              <span>
                <p class="eyebrow">Working weight</p>
                <h2>Progress over time</h2>
              </span>
              <p>Highest weight per workout</p>
            </div>
            ${renderWeightChart(points)}
            <p class="chart-footnote">The chart grows horizontally as you log more workouts. Scroll sideways to revisit older dates.</p>
          </section>

          <div class="section-heading">
            <h2>Exercise history</h2>
            <p>${fullHistory.length} ${fullHistory.length === 1 ? "workout" : "workouts"}</p>
          </div>
          ${
            fullHistory.length
              ? `
                <div class="analytics-history-list">
                  ${[...fullHistory]
                    .reverse()
                    .map(
                      (item) => `
                        <article class="analytics-history-row">
                          <span class="analytics-history-date">
                            <strong>${formatDate(item.date, { year: true })}</strong>
                            <small>${formatTime(item.date)}</small>
                          </span>
                          <span class="analytics-set-details">
                            ${item.sets
                              .map(
                                (set, index) =>
                                  `<span>${index + 1}. ${
                                    set.weight ? `${escapeHtml(set.weight)} ${data.unit}` : "No weight"
                                  } × ${set.reps || "—"} reps</span>`
                              )
                              .join("")}
                          </span>
                          <strong class="analytics-working-weight">${
                            item.weight === null
                              ? "—"
                              : `${formatWeight(item.weight)} ${data.unit}`
                          }</strong>
                        </article>
                      `
                    )
                    .join("")}
                </div>
              `
              : `
                <div class="empty-state">
                  <span class="empty-state-icon">↗</span>
                  <h3>No history for this exercise yet</h3>
                  <p>Log it in a workout and its complete set history will appear here.</p>
                </div>
              `
          }
        `
        : `
          <div class="empty-state">
            <span class="empty-state-icon">+</span>
            <h3>Your exercise library is empty</h3>
            <p>Add a strength exercise in Library before opening its analytics.</p>
            <button class="primary-button" data-route="library">Open library</button>
          </div>
        `
    }
  `;
}

function renderBodyWeightData() {
  const allPoints = bodyWeightSeries();
  const points = filterAnalyticsRange(allPoints);
  const latest = points.at(-1);
  const growth = compoundedMonthlyGrowth(points);

  return `
    <div class="topbar">
      ${brandMarkup()}
      <span class="meta-line">${points.length} ${points.length === 1 ? "entry" : "entries"}</span>
    </div>
    ${renderAnalyticsModeSwitch()}
    <h1>Body weight data</h1>
    <p class="intro-copy">See how your body weight changes over time using entries from Settings and completed workouts.</p>

    ${renderAnalyticsRangeSelector(allPoints)}

    <section class="analytics-summary body-weight-summary">
      <div class="analytics-title-row">
        <span>
          <span class="category-tag">Body weight</span>
          <h2>Your trend</h2>
        </span>
        <button class="text-button" data-action="open-settings">+ Add weight</button>
      </div>
      <div class="analytics-metrics">
        <article class="metric-card">
          <span>Most recent weight</span>
          <strong>${
            latest ? `${formatWeight(latest.weight)} <small>${data.unit}</small>` : "—"
          }</strong>
          <small>${
            latest ? formatDate(latest.date, { year: true }) : "No body-weight entries"
          }</small>
        </article>
        <article class="metric-card growth-card">
          <span>Average monthly change</span>
          <strong class="${growth !== null && growth < 0 ? "is-negative" : ""}">${
            growth === null
              ? "—"
              : `${growth >= 0 ? "+" : ""}${growth.toFixed(2)}%`
          }</strong>
          <small>${
            growth === null
              ? "Needs two weights spanning at least 28 days"
              : "Compounded across the selected graph range"
          }</small>
        </article>
      </div>
    </section>

    <section class="analytics-chart-card">
      <div class="section-heading analytics-section-heading">
        <span>
          <p class="eyebrow">Body weight</p>
          <h2>Weight over time</h2>
        </span>
        <p>${data.unit}</p>
      </div>
      ${renderWeightChart(points, {
        emptyTitle: "No body-weight data in this range",
        emptyCopy: "Add your current weight in Settings or with a workout to begin the graph.",
        ariaLabel: "Body weight",
      })}
      <p class="chart-footnote">The graph uses body weights saved in Settings and body weights recorded with completed workouts.</p>
    </section>

    <div class="section-heading">
      <h2>Body weight history</h2>
      <p>${allPoints.length} ${allPoints.length === 1 ? "entry" : "entries"}</p>
    </div>
    ${
      allPoints.length
        ? `
          <div class="analytics-history-list">
            ${[...allPoints]
              .reverse()
              .map(
                (point) => `
                  <article class="analytics-history-row body-weight-history-row">
                    <span class="analytics-history-date">
                      <strong>${formatDate(point.date, { year: true })}</strong>
                      <small>${formatTime(point.date)}</small>
                    </span>
                    <span class="body-weight-source">${escapeHtml(point.source)}</span>
                    <strong class="analytics-working-weight">${formatWeight(
                      point.weight
                    )} ${data.unit}</strong>
                  </article>
                `
              )
              .join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <span class="empty-state-icon">BW</span>
            <h3>No body-weight history yet</h3>
            <p>Add your current weight in Settings. Each saved value becomes a dated point.</p>
            <button class="primary-button" data-action="open-settings">Add current weight</button>
          </div>
        `
    }
  `;
}

function openAddEntryModal() {
  const category = state.selectedCategory || state.currentSession?.category || "push";
  const muscle = CATEGORY_META[category].muscles.includes(state.selectedMuscle)
    ? state.selectedMuscle
    : CATEGORY_META[category].muscles[0];
  const exercises = allExercises(category, muscle);
  document.querySelector("#modal-root").innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="add-entry-title">
        <div class="modal-handle"></div>
        <h2 id="add-entry-title">Add another exercise</h2>
        <p>Mix any categories you want in this workout.</p>
        <div class="form-group">
          <label for="entry-modal-category">Category</label>
          <div class="select-wrap">
            <select id="entry-modal-category">
              ${Object.keys(CATEGORY_META)
                .map(
                  (item) =>
                    `<option value="${item}" ${item === category ? "selected" : ""}>${CATEGORY_META[item].label}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="entry-modal-muscle">Muscle group</label>
          <div class="select-wrap">
            <select id="entry-modal-muscle">
              ${CATEGORY_META[category].muscles
                .map(
                  (item) =>
                    `<option value="${escapeAttr(item)}" ${item === muscle ? "selected" : ""}>${escapeHtml(item)}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="entry-modal-exercise">${category === "cardio" ? "Activity" : "Exercise"}</label>
          <div class="select-wrap">
            <select id="entry-modal-exercise">
              <option value="">Choose one…</option>
              ${exercises
                .map(
                  (exercise) =>
                    `<option value="${escapeAttr(exercise.id)}">${escapeHtml(exercise.name)}${exercise.custom ? " · custom" : ""}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
        <button class="text-button" data-action="open-custom-from-entry-modal">+ Create your own exercise</button>
        <div class="modal-actions">
          <button class="secondary-button" data-action="close-modal">Cancel</button>
          <button class="primary-button" data-action="add-entry-from-modal">Add to workout</button>
        </div>
      </section>
    </div>
  `;
}

function refreshAddEntryModal(categoryChanged = false) {
  const categorySelect = document.querySelector("#entry-modal-category");
  const muscleSelect = document.querySelector("#entry-modal-muscle");
  const exerciseSelect = document.querySelector("#entry-modal-exercise");
  if (!categorySelect || !muscleSelect || !exerciseSelect) return;
  const category = categorySelect.value;
  if (categoryChanged) {
    muscleSelect.innerHTML = CATEGORY_META[category].muscles
      .map((muscle) => `<option value="${escapeAttr(muscle)}">${escapeHtml(muscle)}</option>`)
      .join("");
  }
  const muscle = muscleSelect.value;
  exerciseSelect.innerHTML = `
    <option value="">Choose one…</option>
    ${allExercises(category, muscle)
      .map(
        (exercise) =>
          `<option value="${escapeAttr(exercise.id)}">${escapeHtml(exercise.name)}${exercise.custom ? " · custom" : ""}</option>`
      )
      .join("")}
  `;
  const label = document.querySelector('label[for="entry-modal-muscle"]');
  const exerciseLabel = document.querySelector('label[for="entry-modal-exercise"]');
  if (label) label.textContent = category === "cardio" ? "Type" : "Muscle group";
  if (exerciseLabel) exerciseLabel.textContent = category === "cardio" ? "Activity" : "Exercise";
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
          <label>Appearance</label>
          <div class="button-row">
            <button class="${
              data.theme !== "dark" ? "primary-button" : "secondary-button"
            }" data-action="set-theme" data-theme="light">Light</button>
            <button class="${
              data.theme === "dark" ? "primary-button" : "secondary-button"
            }" data-action="set-theme" data-theme="dark">Dark</button>
          </div>
        </div>
        <div class="form-group">
          <label>Weight unit</label>
          <div class="button-row">
            <button class="${data.unit === "lb" ? "primary-button" : "secondary-button"}" data-action="set-unit" data-unit="lb">Pounds (lb)</button>
            <button class="${data.unit === "kg" ? "primary-button" : "secondary-button"}" data-action="set-unit" data-unit="kg">Kilograms (kg)</button>
          </div>
        </div>
        <div class="form-group">
          <label for="current-weight-input">Current body weight</label>
          <div class="input-with-unit">
            <input
              id="current-weight-input"
              class="number-input"
              type="number"
              min="0"
              step="0.1"
              inputmode="decimal"
              value="${escapeAttr(data.currentWeight || "")}"
              placeholder="Add weight"
            />
            <span>${data.unit}</span>
          </div>
          <div class="button-row settings-weight-actions">
            <button class="secondary-button" data-action="save-current-weight">Save weight</button>
            <button class="secondary-button" data-action="clear-current-weight">Clear</button>
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
  const duplicate = allExercises(category, muscle, { includeHidden: true }).some(
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
  if (state.route === "session") {
    state.selectedCategory = category;
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
      version: 3,
      workouts: parsed.workouts.map(normalizeWorkout),
      hiddenExercises: Array.isArray(parsed.hiddenExercises) ? parsed.hiddenExercises : [],
      bodyWeightHistory: Array.isArray(parsed.bodyWeightHistory)
        ? parsed.bodyWeightHistory
        : [],
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
  if (action === "select-session-category") {
    state.selectedCategory = target.dataset.category;
    state.selectedMuscle = CATEGORY_META[state.selectedCategory].muscles[0];
    render();
  }
  if (action === "add-entry") addEntry();
  if (action === "open-add-entry-modal") openAddEntryModal();
  if (action === "add-entry-from-modal") {
    const category = document.querySelector("#entry-modal-category")?.value;
    const muscle = document.querySelector("#entry-modal-muscle")?.value;
    const exerciseId = document.querySelector("#entry-modal-exercise")?.value;
    if (!exerciseId) {
      toast("Choose an exercise first");
    } else {
      state.selectedCategory = category;
      state.selectedMuscle = muscle;
      addEntryById(category, muscle, exerciseId, { closeModal: true });
    }
  }
  if (action === "open-custom-from-entry-modal") {
    const category = document.querySelector("#entry-modal-category")?.value || "push";
    const muscle =
      document.querySelector("#entry-modal-muscle")?.value || CATEGORY_META[category].muscles[0];
    openAddExerciseModal(category, muscle);
  }
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
  if (action === "toggle-same-reps") {
    const entry = getEntry(target.dataset.entryId);
    if (!entry) return;
    entry.sameReps = !entry.sameReps;
    if (entry.sameReps && entry.sets.length) {
      entry.sets.forEach((set, index) => {
        if (index > 0) set.reps = entry.sets[0].reps;
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
      reps: entry.sameReps && entry.sets.length ? entry.sets[0].reps : "",
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
  if (action === "clear-history-dates") {
    state.historyYear = "all";
    state.historyMonth = "all";
    state.historyStart = "";
    state.historyEnd = "";
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
  if (action === "remove-library-exercise") {
    const exercise = getExerciseById(target.dataset.exerciseId);
    if (!exercise || !window.confirm(`Remove ${exercise.name} from your library? Past workouts will be kept.`)) return;
    if (exercise.custom) {
      data.customExercises = data.customExercises.filter((item) => item.id !== exercise.id);
    } else if (!data.hiddenExercises.includes(exercise.id)) {
      data.hiddenExercises.push(exercise.id);
    }
    saveData();
    render();
    toast(`${exercise.name} removed`);
  }
  if (action === "restore-exercises") {
    const defaultIds = allExercises(target.dataset.category, target.dataset.muscle, {
      includeHidden: true,
    })
      .filter((exercise) => !exercise.custom)
      .map((exercise) => exercise.id);
    data.hiddenExercises = data.hiddenExercises.filter((id) => !defaultIds.includes(id));
    saveData();
    render();
    toast("Removed exercises restored");
  }
  if (action === "close-modal") {
    if (target.classList.contains("modal-backdrop") && event.target !== target) return;
    closeModal();
  }
  if (action === "open-settings") openSettingsModal();
  if (action === "set-theme") {
    data.theme = target.dataset.theme === "dark" ? "dark" : "light";
    saveData();
    render();
    openSettingsModal();
  }
  if (action === "set-unit") {
    if (data.currentWeight && data.unit !== target.dataset.unit) {
      data.currentWeight = formatWeight(
        convertWeight(data.currentWeight, data.unit, target.dataset.unit)
      );
    }
    data.unit = target.dataset.unit;
    saveData();
    openSettingsModal();
    toast(`Using ${data.unit}`);
  }
  if (action === "save-current-weight") {
    const value = document.querySelector("#current-weight-input")?.value.trim() || "";
    if (value && Number(value) <= 0) {
      toast("Enter a valid body weight");
      return;
    }
    const savedAt = value ? new Date().toISOString() : null;
    data.currentWeight = value;
    data.weightUpdatedAt = savedAt;
    if (value) {
      data.bodyWeightHistory.push({
        id: uid("body-weight"),
        date: savedAt,
        weight: value,
        unit: data.unit,
      });
    }
    saveData();
    closeModal();
    render();
    toast(value ? "Current weight saved" : "Current weight cleared");
  }
  if (action === "clear-current-weight") {
    data.currentWeight = "";
    data.weightUpdatedAt = null;
    saveData();
    closeModal();
    render();
    toast("Current weight cleared");
  }
  if (action === "set-analytics-mode") {
    state.analyticsMode = target.dataset.mode === "body" ? "body" : "exercise";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (field === "reps" && setIndex === 0 && entry.sameReps) {
      entry.sets.forEach((set, index) => {
        if (index > 0) set.reps = target.value;
      });
      document
        .querySelectorAll(
          `[data-action="update-strength-set"][data-entry-id="${CSS.escape(entry.entryId)}"][data-field="reps"]`
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
  if (action === "update-session-weight") {
    state.currentSession.bodyWeight = target.value;
    state.currentSession.bodyWeightUnit = data.unit;
    persistDraft();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "data-exercise-select") {
    state.analyticsExerciseId = event.target.value;
    render();
  }
  if (event.target.id === "analytics-range-select") {
    state.analyticsRange = event.target.value;
    render();
  }
  if (event.target.id === "history-year-filter") {
    state.historyYear = event.target.value;
    render();
  }
  if (event.target.id === "history-month-filter") {
    state.historyMonth = event.target.value;
    render();
  }
  if (event.target.id === "history-start-filter") {
    state.historyStart = event.target.value;
    render();
  }
  if (event.target.id === "history-end-filter") {
    state.historyEnd = event.target.value;
    render();
  }
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
  if (event.target.id === "entry-modal-category") refreshAddEntryModal(true);
  if (event.target.id === "entry-modal-muscle") refreshAddEntryModal(false);
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
