/*
  app.js — Babnav

  Modules and what each one owns:
    data.js    the campus places and campus settings
    map.js     Leaflet: tiles, pins, the drawn route
    sheet.js   the draggable bottom panel
    search.js  scoring and ranking search results   (Phase 4)
    route.js   asking OSRM for a walking route      (Phase 6)
    app.js     this file: state, views, and all the wiring

  The sheet now has three views and app.js is the router between them:
    list        browse or search results
    detail      one place, in full                  (Phase 5)
    directions  from, to, and the resulting route   (Phase 6)
*/

/* ---------- Elements ---------- */
const el = {
  searchInput: document.getElementById("search-input"),
  searchClear: document.getElementById("search-clear"),
  chips: document.getElementById("category-chips"),
  list: document.getElementById("places-list"),
  listEmpty: document.getElementById("places-empty"),
  count: document.getElementById("sheet-count"),
  title: document.getElementById("sheet-title"),
  notice: document.getElementById("data-notice"),
  back: document.getElementById("back-button"),
  seg: document.getElementById("seg"),
  segButtons: document.querySelectorAll(".seg__btn"),
  panels: {
    list: document.getElementById("panel-places"),
    detail: document.getElementById("panel-detail"),
    directions: document.getElementById("panel-directions")
  },
  fromSelect: document.getElementById("from-select"),
  toSelect: document.getElementById("to-select"),
  swap: document.getElementById("swap-ends"),
  getDirections: document.getElementById("get-directions"),
  routeResult: document.getElementById("route-result"),
  routeDuration: document.getElementById("route-duration"),
  routeDistance: document.getElementById("route-distance"),
  routeWarning: document.getElementById("route-warning"),
  routeSteps: document.getElementById("route-steps"),
  routeHint: document.getElementById("route-hint"),
  captureToggle: document.getElementById("capture-toggle"),
  captureCopy: document.getElementById("capture-copy"),
  captureOutput: document.getElementById("capture-output"),
  resetView: document.getElementById("reset-view"),
  locate: document.getElementById("locate"),
  locateMsg: document.getElementById("locate-msg")
};

el.panels.info = document.getElementById("panel-info");

/* ---------- State ---------- */
const state = {
  view: "list",        // "list" | "detail" | "directions"
  query: "",
  category: "all",
  selectedId: null,
  capture: false,
  routing: false,
  me: null          // the user's position, held in memory only
};

/* ---------- Helpers ---------- */
function getCategory(id) {
  return CATEGORIES.find(function (c) { return c.id === id; }) ||
         { id: id, label: id, icon: "📍" };
}

function labelFor(id) { return getCategory(id).label; }

function getPlace(id) {
  return PLACES.find(function (p) { return p.id === id; }) || null;
}

function categoryColor(id) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--c-" + id).trim();
  return value || "#1454b8";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mapPadding() {
  return BabnavSheet.isPanel()
    ? { bottom: 0, left: 400 }
    : { bottom: BabnavSheet.coverage(), left: 0 };
}

/* ---------- Filtering + ranking (Phase 4) ---------- */
function getVisiblePlaces() {
  const inCategory = PLACES.filter(function (place) {
    if (state.category === "all") return true;
    if (state.category === "saved") return BabnavFavourites.has(place.id);
    return place.category === state.category;
  });

  const ranked = BabnavSearch.rank(inCategory, state.query, labelFor);

  // With no search typed and a known position, "Nearby" should mean nearby.
  // While searching, relevance wins over distance.
  if (state.query.trim() === "" && state.me) {
    ranked.sort(function (a, b) {
      return distanceTo(a) - distanceTo(b);
    });
  }

  return ranked;
}

// Straight-line distance from the user to a place, in metres. Null when we
// do not know where the user is. This is as-the-crow-flies, not walking
// distance — the label says "away", never "walk".
function distanceTo(place) {
  if (!state.me || !hasCoords(place)) return Infinity;
  return BabnavRoute.haversine(state.me, place);
}

/* ---------- Chips ---------- */
/*
  Phase 8: the chips now carry counts and hide themselves when empty.
  A category with nothing in it is a dead end, and offering it wastes a tap.
  "Saved" is a pseudo-category: it filters by your own list, not by a tag.
*/
function countIn(categoryId) {
  if (categoryId === "all") return PLACES.length;
  if (categoryId === "saved") return BabnavFavourites.count();
  return PLACES.filter(function (p) { return p.category === categoryId; }).length;
}

function renderChips() {
  el.chips.innerHTML = "";

  const saved = { id: "saved", label: "Saved", icon: "\u2605" };

  [CATEGORIES[0], saved].concat(CATEGORIES.slice(1)).forEach(function (category) {
    const n = countIn(category.id);

    // Always show All. Show Saved only once something is saved, or while it
    // is the active filter so you can get back out of it.
    if (n === 0 && category.id !== "all" && state.category !== category.id) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (category.id === "saved" ? " chip--saved" : "");
    button.dataset.category = category.id;
    button.setAttribute("aria-pressed", String(state.category === category.id));
    button.innerHTML = category.icon + " " + category.label +
                       ' <span class="chip__n">' + n + "</span>";
    el.chips.appendChild(button);
  });
}

function updateChipStates() {
  el.chips.querySelectorAll(".chip").forEach(function (chip) {
    chip.setAttribute("aria-pressed", String(chip.dataset.category === state.category));
  });
}

/* Developer details (data-quality badges, coordinates, OpenStreetMap ids and the
   capture tool) are hidden from visitors. Add ?dev to the address to see them,
   e.g. http://127.0.0.1:5500/index.html?dev */
const DEV_MODE = new URLSearchParams(location.search).has("dev");
if (!DEV_MODE) { el.captureToggle.hidden = true; }

/* ---------- Badges ---------- */
function badgeFor(place) {
  if (!DEV_MODE || place.verified) return "";
  if (place.source === "osm") {
    return '<span class="badge badge--osm" title="Position from OpenStreetMap, not yet checked by you">From OSM</span>';
  }
  return '<span class="badge" title="Placeholder position, not a real location">Placeholder</span>';
}

/* ---------- The list ---------- */
function createCard(place) {
  const category = getCategory(place.category);

  const card = document.createElement("button");
  card.type = "button";
  card.className = "card" + (place.id === state.selectedId ? " is-selected" : "");
  card.dataset.id = place.id;
  card.style.setProperty("--pin", categoryColor(place.category));

  const name = BabnavSearch.highlight(place.name, state.query);
  const desc = place.description ? " \u00B7 " + escapeHtml(place.description) : "";

  let chip = "";
  if (state.me && hasCoords(place)) {
    const metres = distanceTo(place);
    const mins = Math.max(1, Math.round(metres * 1.3 / 80));   // ~4.8 km/h, allowing for bends
    chip = '<span class="card__chip">~' + mins + " min walk \u00B7 " +
           BabnavRoute.formatDistance(metres) + "</span>";
  }

  card.innerHTML =
    '<span class="card__icon" aria-hidden="true">' + category.icon + "</span>" +
    '<span class="card__body">' +
      '<span class="card__name">' + name + badgeFor(place) + "</span>" +
      '<span class="card__meta"><span class="card__cat">' + category.label +
      "</span>" + desc + "</span>" + chip +
    "</span>";

  return card;
}

// The star lives outside the card button, because a button inside a button
// is invalid HTML and behaves unpredictably.
function createRow(place) {
  const row = document.createElement("div");
  row.className = "row-item";
  row.appendChild(createCard(place));
  row.appendChild(createStar(place));
  return row;
}

function createStar(place) {
  const on = BabnavFavourites.has(place.id);

  const star = document.createElement("button");
  star.type = "button";
  star.className = "star" + (on ? " is-on" : "");
  star.dataset.star = place.id;
  star.setAttribute("aria-pressed", String(on));
  star.setAttribute("aria-label", (on ? "Remove " : "Save ") + place.name);
  star.textContent = on ? "\u2605" : "\u2606";

  return star;
}

function renderDataNotice() {
  if (!DEV_MODE) { el.notice.hidden = true; return; }
  const placeholder = PLACES.filter(function (p) {
    return !p.verified && p.source !== "osm";
  }).length;
  const fromOsm = PLACES.filter(function (p) {
    return !p.verified && p.source === "osm";
  }).length;

  if (placeholder === 0 && fromOsm === 0) { el.notice.hidden = true; return; }

  let text = "";
  if (placeholder > 0) {
    text += "<strong>Placeholder positions.</strong> " + placeholder +
            " place" + (placeholder === 1 ? "" : "s") +
            " still use coordinates that are not real. ";
  }
  if (fromOsm > 0) {
    text += "<strong>" + fromOsm + " from OpenStreetMap.</strong> " +
            "Real positions contributed by volunteers, not yet checked by you. ";
  }
  text += "All of these are drawn with a dashed pin.";

  el.notice.hidden = false;
  el.notice.innerHTML = text;
}

function renderList() {
  const places = getVisiblePlaces();

  updateChipStates();
  BabnavMap.renderPlaces(places, state.selectedId);

  el.list.innerHTML = "";
  places.forEach(function (place) { el.list.appendChild(createRow(place)); });

  el.listEmpty.hidden = places.length > 0;
  el.listEmpty.textContent = state.category === "saved" && state.query === ""
    ? "Nothing saved yet. Tap the star beside a place to keep it here."
    : "Nothing matched that. Try fewer letters, or pick a category above.";
  el.count.textContent = places.length === 1 ? "1 place" : places.length + " places";
  el.searchClear.hidden = state.query === "";

  if (state.query.trim() !== "") {
    el.title.textContent = "Results";
  } else if (state.category === "saved") {
    el.title.textContent = "Saved places";
  } else if (state.category !== "all") {
    el.title.textContent = getCategory(state.category).label;
  } else {
    el.title.textContent = "Nearby";
  }
}

/* ---------- The detail view (Phase 5) ---------- */
function hasCoords(place) {
  return place && typeof place.lat === "number" && typeof place.lng === "number";
}

function renderDetail(place) {
  const category = getCategory(place.category);
  const color = categoryColor(place.category);
  const located = hasCoords(place);

  let facts = "";

  function fact(key, value) {
    facts += '<div class="fact"><span class="fact__key">' + key +
             '</span><span class="fact__val">' + value + "</span></div>";
  }

  if (DEV_MODE && located) {
    fact("Coordinates",
         "<code>" + place.lat.toFixed(6) + ", " + place.lng.toFixed(6) + "</code>");
  } else if (DEV_MODE) {
    fact("Coordinates",
         '<span class="muted">None yet. This place cannot be shown on the ' +
         "map or routed to until you add lat and lng in js/data.js.</span>");
  }

  if (state.me && located) {
    fact("Distance",
         BabnavRoute.formatDistance(distanceTo(place)) +
         ' <span class="muted">in a straight line from you</span>');
  }

  if (place.hours) fact("Opening hours", escapeHtml(place.hours));

  if (!DEV_MODE) {
    // visitors do not see data-quality details
  } else if (!located) {
    fact("Position", "Not set");
  } else if (place.verified) {
    fact("Position", "Confirmed on the ground");
  } else if (place.source === "osm") {
    fact("Position", "From OpenStreetMap, not yet confirmed");
  } else {
    fact("Position", "Placeholder — not a real location");
  }

  if (DEV_MODE && place.osmId) {
    const parts = place.osmId.split("/");
    fact("OpenStreetMap",
         '<a href="https://www.openstreetmap.org/' + parts[0] + "/" + parts[1] +
         '" target="_blank" rel="noopener">' + escapeHtml(place.osmId) + "</a>");
  }

  const description = place.description
    ? '<p class="detail__desc">' + escapeHtml(place.description) + "</p>"
    : (DEV_MODE
        ? '<p class="detail__desc is-empty">No description yet. Add one in ' +
          "js/data.js — write what you know, not what you assume.</p>"
        : "");

  el.panels.detail.innerHTML =
    '<span class="detail__cat" style="--pin:' + color + '">' +
      category.icon + " " + category.label + badgeFor(place) +
    "</span>" +
    description +
    '<div class="detail__facts">' + facts + "</div>" +
    '<div class="actions">' +
      (located
        ? '<button class="primary" data-act="directions">Get directions</button>' +
          '<button class="secondary" data-act="centre">Centre on map</button>'
        : "") +
      '<button class="secondary" data-act="share">Share</button>' +
      '<button class="secondary" data-act="save">' +
        (BabnavFavourites.has(place.id) ? "\u2605 Saved" : "\u2606 Save") +
      "</button>" +
    "</div>";

  el.title.textContent = place.name;
  el.count.textContent = "";
}

/* ---------- Directions (Phase 6) ---------- */
function fillSelect(select, selectedId, allowMe) {
  select.innerHTML = "";

  // Phase 7 pays off here: you can now route from wherever you are standing.
  if (allowMe) {
    const mine = document.createElement("option");
    mine.value = "__me__";
    mine.textContent = state.me ? "My location" : "My location (tap to allow)";
    if (selectedId === "__me__") mine.selected = true;
    select.appendChild(mine);
  }

  const sorted = PLACES
    .filter(hasCoords)              // cannot route to somewhere with no position
    .slice()
    .sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

  sorted.forEach(function (place) {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = place.name;
    if (place.id === selectedId) option.selected = true;
    select.appendChild(option);
  });
}

function renderRoute(result, from, to) {
  el.routeResult.hidden = false;

  el.routeDuration.textContent = result.durationText + " walk";
  el.routeDistance.textContent =
    result.distanceText + " \u00B7 " + from.name + " to " + to.name;

  if (result.message) {
    el.routeWarning.hidden = false;
    el.routeWarning.textContent = result.message;
  } else {
    el.routeWarning.hidden = true;
  }

  el.routeSteps.innerHTML = "";
  result.steps.forEach(function (step) {
    const li = document.createElement("li");
    li.innerHTML = "<span>" + escapeHtml(step.text) + "</span>" +
                   '<span class="step__dist">' + step.distanceText + "</span>";
    el.routeSteps.appendChild(li);
  });

  if (result.steps.length === 0 && !result.message) {
    el.routeSteps.innerHTML = '<li><span>No turn-by-turn steps were returned ' +
                              "for this route.</span></li>";
  }

  // On a phone the sheet covers most of the map, so slide it down to its
  // smallest height and fit the route into the space that is left.
  const collapse = !BabnavSheet.isPanel();
  if (collapse) BabnavSheet.peek();
  setTimeout(function () {
    BabnavMap.drawRoute(result.coordinates, result.fallback, mapPadding());
  }, collapse ? 280 : 0);

  const chip = document.getElementById("route-chip");
  document.getElementById("route-chip-text").textContent =
    result.durationText + " walk \u00B7 " + result.distanceText;
  chip.hidden = !collapse;

  BabnavVoice.stop();
  lastRoute = {
    to: to.name, duration: result.durationText + " walk", distance: result.distanceText,
    steps: result.steps.map(function (s) { return s.text + (s.distanceText ? ", " + s.distanceText : ""); })
  };
  speakBtn.hidden = !(BabnavVoice.canSpeak() && result.steps.length > 0);
  speakBtn.textContent = "Read directions aloud";
}

async function requestRoute() {
  let from;

  if (el.fromSelect.value === "__me__") {
    if (!state.me) {
      const result = await askForLocation();
      if (!result) return;            // denied or unavailable; message shown
    }
    from = { name: "your location", lat: state.me.lat, lng: state.me.lng };
  } else {
    from = getPlace(el.fromSelect.value);
  }

  const to = getPlace(el.toSelect.value);

  if (!from || !to) return;

  if (from.id && from.id === to.id) {
    el.routeResult.hidden = false;
    el.routeDuration.textContent = "You are already there";
    el.routeDistance.textContent = "Start and destination are the same place.";
    el.routeWarning.hidden = true;
    el.routeSteps.innerHTML = "";
    BabnavMap.clearRoute();
    return;
  }

  state.routing = true;
  el.getDirections.disabled = true;
  el.getDirections.textContent = "Finding a route…";

  const result = await BabnavRoute.walk(from, to);

  state.routing = false;
  el.getDirections.disabled = false;
  el.getDirections.textContent = "Get walking directions";

  renderRoute(result, from, to);
  BabnavSheet.half();
}

/* ---------- Campus information (Phase 10) ---------- */

/*
  A section appears only when it has body text, or when it pulls in places
  from a category. Empty sections stay hidden: an "Emergency" heading with
  nothing under it is worse than no heading at all.
*/
function renderInfo() {
  let html = "";
  let shown = 0;

  CAMPUS_INFO.forEach(function (section) {
    const places = section.category
      ? PLACES.filter(function (p) { return p.category === section.category; })
      : [];

    if (!section.body && places.length === 0) return;
    shown += 1;

    html += '<section class="info">';
    html += "<h2>" + escapeHtml(section.title) + "</h2>";

    if (section.body) {
      html += "<p>" + escapeHtml(section.body) + "</p>";
    }

    if (places.length > 0) {
      html += '<ul class="info__places">';
      places.forEach(function (place) {
        html += '<li><button class="link" data-goto="' + place.id + '">' +
                escapeHtml(place.name) + "</button></li>";
      });
      html += "</ul>";
    }

    if (section.source) {
      html += '<p class="info__source">Source: ' + escapeHtml(section.source) + "</p>";
    }

    html += "</section>";
  });

  if (shown === 0) {
    html = '<p class="empty">' + (DEV_MODE
      ? "No campus information has been written yet. Open js/info.js and fill in the sections."
      : "Campus information is coming soon.") + "</p>";
  }

  // Honest about what is missing rather than quietly hiding it.
  const blank = CAMPUS_INFO.filter(function (sec) {
    return !sec.body && !sec.category;
  }).length;

  if (DEV_MODE && blank > 0) {
    html += '<p class="info__todo">' + blank + " section" +
            (blank === 1 ? " has" : "s have") + " no text yet. The lists above " +
            "come from your place data; the written guidance is yours to add " +
            "in js/info.js. Do not guess at opening hours or policies.</p>";
  }

  el.panels.info.innerHTML = html;
}

/*
  The hint under the directions button changes with what is actually
  possible, so it can never claim a feature that is not there — or, worse,
  say a built feature is still coming.
*/
function updateRouteHint() {
  if (!BabnavLocate.supported()) {
    el.routeHint.textContent =
      "Walking routes only. This browser cannot report your position, so " +
      "pick two places from the lists.";
    return;
  }

  if (!BabnavLocate.secure()) {
    el.routeHint.textContent =
      "Walking routes only. Routing from your own position needs a secure " +
      "page — open Babnav with Live Server rather than double-clicking " +
      "index.html.";
    return;
  }

  if (state.me) {
    el.routeHint.textContent =
      "Walking routes only. Your position is known, so \u201CMy location\u201D " +
      "is available as a start point.";
    return;
  }

  el.routeHint.innerHTML =
    "Walking routes only. Pick <strong>My location</strong> as the start and " +
    "Babnav will ask for location permission then.";
}

/* ---------- View switching ---------- */
function setView(view, place) {
  state.view = view;
  if (view !== "directions") document.getElementById("route-chip").hidden = true;

  Object.keys(el.panels).forEach(function (key) {
    el.panels[key].hidden = key !== view;
  });

  el.back.hidden = view === "list";
  el.seg.hidden = view === "detail";
  el.count.hidden = view !== "list";
  if (view === "class") BabnavClass.refresh();

  el.segButtons.forEach(function (button) {
    const target = button.dataset.panel === "places" ? "list" : button.dataset.panel;
    if (target === view) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (view === "list") {
    BabnavMap.clearRoute();
    renderList();
  }

  if (view === "detail" && place) {
    renderDetail(place);
    BabnavSheet.half();
  }

  if (view === "directions") {
    el.title.textContent = "Directions";
    updateRouteHint();
    BabnavSheet.half();
  }

  if (view === "info") {
    el.title.textContent = "Campus information";
    renderInfo();
    BabnavSheet.full();
  }
}

/* ---------- Selecting a place ---------- */
function selectPlace(id, openDetail) {
  const place = getPlace(id);
  if (!place) return;

  state.selectedId = id;
  renderList();

  // A place with no coordinates still gets its detail view — it just cannot
  // be pointed at on the map.
  if (hasCoords(place)) BabnavMap.focusPlace(place, mapPadding());

  if (openDetail) {
    setView("detail", place);
  }
}

/* ---------- Spelling hint, voice search, spoken directions ---------- */
const spellHint = document.getElementById("spell-hint");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("route-speak");
let lastRoute = null;

function updateSpellHint() {
  if (state.query.trim() !== "" && BabnavSearch.wasFuzzy()) {
    spellHint.hidden = false;
    spellHint.textContent = "No exact match for \u201C" + state.query.trim() +
                            "\u201D. Showing the closest matches.";
  } else {
    spellHint.hidden = true;
  }
}

if (BabnavVoice.canListen()) {
  micBtn.hidden = false;
  micBtn.addEventListener("click", function () {
    const placeholder = el.searchInput.placeholder;
    BabnavVoice.listen({
      onStart: function () {
        micBtn.classList.add("is-listening");
        el.searchInput.placeholder = "Listening\u2026";
      },
      onText: function (text, final) {
        el.searchInput.value = text;
        el.searchInput.dispatchEvent(new Event("input"));
        if (final) {
          const results = getVisiblePlaces();
          if (results.length > 0 && BabnavVoice.canSpeak()) {
            BabnavVoice.speak([
              BabnavSearch.wasFuzzy() ? "Closest match: " + results[0].name : results[0].name
            ]);
          }
        }
      },
      onError: function (msg) { showSearchMessage(msg); },
      onEnd: function () {
        micBtn.classList.remove("is-listening");
        el.searchInput.placeholder = placeholder;
      }
    });
  });
}

function showSearchMessage(msg) {
  spellHint.hidden = false;
  spellHint.textContent = msg;
}

if (BabnavVoice.canSpeak()) {
  speakBtn.addEventListener("click", function () {
    if (BabnavVoice.isSpeaking()) {
      BabnavVoice.stop();
      speakBtn.textContent = "Read directions aloud";
      return;
    }
    if (!lastRoute) return;
    const lines = ["Directions to " + lastRoute.to + ". " + lastRoute.duration + ", " + lastRoute.distance + "."]
      .concat(lastRoute.steps);
    lines.push("You have arrived.");
    speakBtn.textContent = "Stop reading";
    BabnavVoice.speak(lines, function () { speakBtn.textContent = "Read directions aloud"; });
  });
}

document.getElementById("route-chip").addEventListener("click", function () {
  this.hidden = true;
  BabnavSheet.half();
});

/* ---------- Events ---------- */
el.searchInput.addEventListener("input", function (event) {
  state.query = event.target.value;

  if (state.view !== "list") setView("list");
  renderList();
  updateSpellHint();

  const results = getVisiblePlaces();
  if (state.query.trim() !== "") {
    BabnavSheet.half();
    if (results.length > 0) {
      setTimeout(function () { BabnavMap.fitPlaces(results, mapPadding()); }, 240);
    }
  }
});

// Enter opens the top result — the fastest path from typing to arriving.
el.searchInput.addEventListener("keydown", function (event) {
  if (event.key !== "Enter") return;
  const results = getVisiblePlaces();
  if (results.length === 0) return;
  event.preventDefault();
  el.searchInput.blur();
  selectPlace(results[0].id, true);
});

el.searchClear.addEventListener("click", function () {
  state.query = "";
  el.searchInput.value = "";
  el.searchInput.focus();
  setView("list");
  BabnavMap.resetView();
});

el.chips.addEventListener("click", function (event) {
  const chip = event.target.closest(".chip");
  if (!chip) return;

  state.category = chip.dataset.category;
  if (state.view !== "list") setView("list");
  renderList();

  const results = getVisiblePlaces();
  if (state.category === "all") {
    BabnavMap.resetView();
  } else if (results.length > 0) {
    BabnavMap.fitPlaces(results, mapPadding());
  }
});

el.list.addEventListener("click", function (event) {
  const card = event.target.closest(".card");
  if (card) selectPlace(card.dataset.id, true);
});

// Buttons inside the detail view are built by JS, so listen on the panel.
el.panels.detail.addEventListener("click", function (event) {
  const button = event.target.closest("[data-act]");
  if (!button) return;

  const place = getPlace(state.selectedId);
  if (!place) return;

  if (button.dataset.act === "centre") {
    BabnavSheet.peek();
    setTimeout(function () { BabnavMap.focusPlace(place, mapPadding()); }, 240);
  }

  if (button.dataset.act === "directions") {
    fillSelect(el.fromSelect, state.me ? "__me__" : null, true);
    fillSelect(el.toSelect, place.id, false);
    el.routeResult.hidden = true;
    setView("directions");
  }

  if (button.dataset.act === "share") {
    const url = location.origin + location.pathname + "?place=" + encodeURIComponent(place.id);
    const original = button.textContent;
    if (navigator.share) {
      navigator.share({ title: place.name, text: "Find " + place.name + " on Babnav", url: url })
        .catch(function () { /* the person closed the share sheet */ });
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () {
        button.textContent = "Link copied";
        showToast("Link copied: " + url);
        setTimeout(function () { button.textContent = original; }, 1800);
      }).catch(function () { window.prompt("Copy this link:", url); });
    } else {
      window.prompt("Copy this link:", url);
    }
  }

  if (button.dataset.act === "save") {
    BabnavFavourites.toggle(place.id);
    renderDetail(place);
    renderChips();
  }
});

el.back.addEventListener("click", function () {
  setView("list");
});

el.segButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const target = button.dataset.panel === "places" ? "list" : button.dataset.panel;
    if (target === "directions") {
      fillSelect(el.fromSelect, el.fromSelect.value || "__me__", true);
      fillSelect(el.toSelect, state.selectedId || el.toSelect.value || null, false);
    }
    setView(target);
  });
});

// Links inside the info panel jump to a place on the map.
el.panels.info.addEventListener("click", function (event) {
  const link = event.target.closest("[data-goto]");
  if (link) selectPlace(link.dataset.goto, true);
});

el.getDirections.addEventListener("click", requestRoute);

el.swap.addEventListener("click", function () {
  const from = el.fromSelect.value;
  el.fromSelect.value = el.toSelect.value;
  el.toSelect.value = from;
  if (!el.routeResult.hidden) requestRoute();
});

/* ---------- Location (Phase 7) ---------- */

function showLocateMessage(text, isError) {
  if (!text) { el.locateMsg.hidden = true; return; }
  el.locateMsg.hidden = false;
  el.locateMsg.textContent = text;
  el.locateMsg.className = "locate-msg" + (isError ? " is-error" : "");
}

// Returns the position on success, or null after showing why it failed.
async function askForLocation() {
  el.locate.disabled = true;
  el.locate.setAttribute("aria-pressed", "true");
  showLocateMessage("Finding your position…", false);

  const result = await BabnavLocate.locate();

  el.locate.disabled = false;

  if (!result.ok) {
    state.me = null;
    el.locate.setAttribute("aria-pressed", "false");
    BabnavMap.showMe(null);
    showLocateMessage(result.message, true);
    return null;
  }

  state.me = result.position;
  BabnavMap.showMe(state.me);
  updateRouteHint();

  // Some devices report an accuracy of 0 or nothing useful. Saying
  // "accurate to about 0 m" would be a false claim of precision.
  const acc = state.me.accuracy;
  const accuracyText = (typeof acc === "number" && acc >= 5)
    ? " Accurate to about " + BabnavRoute.formatDistance(acc) + "."
    : "";

  showLocateMessage(
    "Showing your position." + accuracyText +
    " Kept on this device only, for this visit.",
    false
  );

  return state.me;
}

el.locate.addEventListener("click", async function () {
  // Pressing it again while located turns it off. Nothing lingers.
  if (state.me) {
    state.me = null;
    BabnavLocate.clear();
    BabnavMap.showMe(null);
    el.locate.setAttribute("aria-pressed", "false");
    showLocateMessage(null);
    updateRouteHint();
    if (state.view === "list") renderList();
    return;
  }

  const position = await askForLocation();
  if (!position) return;

  BabnavMap.goToMe(position);
  if (state.view === "list") renderList();
});

/* ---------- Saving places (Phase 9) ---------- */

el.list.addEventListener("click", function (event) {
  const star = event.target.closest("[data-star]");
  if (!star) return;
  event.stopPropagation();

  BabnavFavourites.toggle(star.dataset.star);
  renderChips();
  renderList();

  if (!BabnavFavourites.isPersistent()) {
    showLocateMessage(
      "Saved for this visit only — this browser is blocking local storage, " +
      "so the list will not survive a refresh.",
      true
    );
  }
});

el.resetView.addEventListener("click", function () {
  state.selectedId = null;
  setView("list");
  BabnavMap.resetView();
});

el.captureToggle.addEventListener("click", function () {
  state.capture = !state.capture;
  el.captureToggle.setAttribute("aria-pressed", String(state.capture));
  BabnavMap.setCapture(state.capture);
});

el.captureCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(el.captureOutput.textContent).then(function () {
    el.captureCopy.textContent = "Copied";
    setTimeout(function () { el.captureCopy.textContent = "Copy"; }, 1500);
  }).catch(function () {
    el.captureCopy.textContent = "Select the text and copy it";
  });
});

/* ---------- Start ---------- */
function init() {
  if (typeof PLACES === "undefined" || typeof CAMPUS === "undefined") {
    document.getElementById("sheet-body").innerHTML =
      '<p class="empty">Campus data could not be loaded. ' +
      "Check that js/data.js exists and is spelled correctly.</p>";
    return;
  }

  BabnavSheet.init({ onResize: function () { BabnavMap.resized(); } });

  BabnavLocate.init({
    onChange: function (position) {
      state.me = position;
      BabnavMap.showMe(position);
      if (state.view === "list") renderList();
    }
  });

  // Saved ids from an older import may no longer exist. Drop them quietly.
  BabnavFavourites.prune(PLACES.map(function (p) { return p.id; }));

  renderChips();
  renderDataNotice();
  fillSelect(el.fromSelect, PLACES[0] && PLACES[0].id, true);
  fillSelect(el.toSelect, PLACES[1] && PLACES[1].id, false);

  // Nothing here asks for permission. The button does, when pressed.
  if (!BabnavLocate.supported() || !BabnavLocate.secure()) {
    el.locate.title = "Location needs a secure page (Live Server or https)";
  }

  const mapStarted = BabnavMap.init({
    onSelect: function (id) { selectPlace(id, true); }
  });

  setView("list");

  if (mapStarted) {
    BabnavMap.setStatus(CAMPUS.name + " \u00B7 " + CAMPUS.place);
  }

  // A shared link (?place=laz-otti-library) opens that place straight away.
  const shared = new URLSearchParams(location.search).get("place");
  if (shared && getPlace(shared)) {
    setTimeout(function () { selectPlace(shared, true); }, 350);
  }
}

/* ---------- Small message that fades away ---------- */
function showToast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(function () { t.classList.add("is-out"); }, 2600);
  setTimeout(function () { t.remove(); }, 3100);
}

/* ---------- Class timetable tab ---------- */
el.panels.class = document.getElementById("panel-class");
BabnavClass.init({
  panel: el.panels.class,
  getPlace: getPlace,
  venues: function () { return PLACES.filter(hasCoords).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }); },
  walkMinutes: function (place) {
    if (!state.me || !hasCoords(place)) return null;
    return Math.max(1, Math.round(distanceTo(place) * 1.3 / 80));
  },
  openDirections: function (place) {
    fillSelect(el.fromSelect, state.me ? "__me__" : null, true);
    fillSelect(el.toSelect, place.id, false);
    el.routeResult.hidden = true;
    setView("directions");
  },
  toast: showToast
});
if (new URLSearchParams(location.search).get("class")) {
  setTimeout(function () { BabnavClass.joinFromLink(); setView("class"); }, 400);
}

/* ---------- Dark mode ---------- */
const themeBtn = document.getElementById("theme-toggle");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  try { localStorage.setItem("babnav_theme", theme); } catch (e) { /* private mode */ }
}
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
themeBtn.addEventListener("click", function () {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

init();
