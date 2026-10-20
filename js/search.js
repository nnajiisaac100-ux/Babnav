/*
  search.js — Babnav search (Phase 4)

  Phase 3's search was one line: does the name contain what you typed?
  That is fine with 12 places and useless with 60, because it cannot rank.
  Type "hall" and you get twenty results in whatever order data.js happens
  to list them.

  This file scores every place instead, then sorts by score. Higher is better:

    1000  exact name match                    "cafeteria" -> Cafeteria
     900  name starts with the query          "laz"       -> Laz Otti Library
     800  a word in the name starts with it   "otti"      -> Laz Otti Library
     700  initials match                      "buth"      -> Babcock University Teaching Hospital
     500  name contains it anywhere           "brary"     -> Library
     400  a keyword starts with it            "dorm"      -> a hostel
     300  a keyword contains it
     200  the category name matches           "food"      -> everything edible

  Ties break on shorter names first, so "Cafeteria" outranks
  "Cafeteria Extension Annexe" for the query "cafe".
*/

const BabnavSearch = (function () {

  /*
    Two normalisers, and the difference matters.

    flatten() is for MATCHING: it also collapses runs of spaces and trims the
    ends, which is what you want when comparing words.

    align() is for HIGHLIGHTING: it lowercases and turns punctuation into
    spaces but changes nothing else, so every character keeps its original
    index. Using flatten() here was a bug — "University  Library" (two
    spaces) collapses to one, every index after it shifts by one, and the
    highlight landed a character to the left.
  */
  function align(text) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, " ");
  }

  function normalise(text) {
    return align(text).replace(/\s+/g, " ").trim();
  }

  // "Babcock University Teaching Hospital" -> "buth"
  function initials(name) {
    return normalise(name).split(" ")
      .filter(function (w) { return w.length > 0; })
      .map(function (w) { return w[0]; })
      .join("");
  }

  function score(place, query, categoryLabel) {
    const q = normalise(query);
    if (q === "") return 0;

    const name = normalise(place.name);
    const words = name.split(" ");
    const keywords = (place.keywords || []).map(normalise);

    if (name === q) return 1000;
    if (name.indexOf(q) === 0) return 900;

    for (let i = 0; i < words.length; i++) {
      if (words[i].indexOf(q) === 0) return 800;
    }

    if (q.length >= 2 && initials(place.name).indexOf(q) === 0) return 700;

    if (name.indexOf(q) > -1) return 500;

    for (let i = 0; i < keywords.length; i++) {
      if (keywords[i].indexOf(q) === 0) return 400;
    }
    for (let i = 0; i < keywords.length; i++) {
      if (keywords[i].indexOf(q) > -1) return 300;
    }

    if (normalise(categoryLabel).indexOf(q) > -1) return 200;

    return 0;
  }

  /*
    Returns the matching places, best first. When the query is empty every
    place comes back in its original order — that is the browse case, not a
    search.
  */
  /* ---- Spelling tolerance ----
     When nothing matches exactly, compare each typed word with the words of
     every name and keyword allowing a few wrong letters ("ameyo adadevo",
     "leibrary", "gidion troopers"). Closest matches come first. */
  let lastWasFuzzy = false;

  function editDistance(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 9;
    let prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(
          prev[j] + 1, cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          cur[j] = Math.min(cur[j], (prevPrev[j - 2] || 0) + 1);
        }
      }
      prevPrev = prev; prev = cur;
    }
    return prev[n];
  }
  let prevPrev = [];

  function wordCost(word, target) {
    if (target.indexOf(word) === 0) return 0;               // typed the start of it
    const allowed = word.length <= 2 ? 0 : word.length <= 5 ? 1 : word.length <= 9 ? 2 : 3;
    const d = Math.min(editDistance(word, target),
                       editDistance(word, target.slice(0, word.length)));
    return d <= allowed ? d : -1;
  }

  function fuzzyRank(places, query) {
    const qWords = normalise(query).split(" ").filter(Boolean);
    if (qWords.length === 0) return [];
    const rows = [];
    places.forEach(function (place) {
      const targets = normalise(place.name).split(" ")
        .concat((place.keywords || []).map(normalise));
      let total = 0;
      for (let i = 0; i < qWords.length; i++) {
        let best = -1;
        targets.forEach(function (t) {
          const c = wordCost(qWords[i], t);
          if (c >= 0 && (best < 0 || c < best)) best = c;
        });
        if (best < 0) return;                                // this word matched nothing
        total += best;
      }
      rows.push({ place: place, s: 100 - total });
    });
    return rows.sort(function (a, b) {
      return b.s - a.s || a.place.name.length - b.place.name.length;
    }).map(function (r) { return r.place; });
  }

  function rank(places, query, labelFor) {
    lastWasFuzzy = false;
    if (normalise(query) === "") return places.slice();

    const exact = places
      .map(function (place) {
        return { place: place, s: score(place, query, labelFor(place.category)) };
      })
      .filter(function (row) { return row.s > 0; })
      .sort(function (a, b) {
        if (b.s !== a.s) return b.s - a.s;
        return a.place.name.length - b.place.name.length;
      })
      .map(function (row) { return row.place; });

    if (exact.length > 0) return exact;
    const close = fuzzyRank(places, query);
    lastWasFuzzy = close.length > 0;
    return close;
  }

  /*
    Wraps the matched part of a name in <mark> so the user can see why a
    result matched. Falls back to the plain name when the match came from a
    keyword or initials rather than the visible text.

    The name is escaped first — a place name containing "<" must never
    become markup.
  */
  function highlight(name, query) {
    const safe = name
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const q = normalise(query);
    if (q === "") return safe;

    // Match against the length-preserving form so the index is valid in the
    // original string.
    const at = align(name).indexOf(q);
    if (at === -1) return safe;

    // The escaped string can be longer than the original ("&" becomes
    // "&amp;"), so slice the raw name and escape each piece separately.
    function esc(part) {
      return part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    return esc(name.slice(0, at)) +
           "<mark>" + esc(name.slice(at, at + q.length)) + "</mark>" +
           esc(name.slice(at + q.length));
  }

  return {
    rank: rank, highlight: highlight, initials: initials, normalise: normalise,
    wasFuzzy: function () { return lastWasFuzzy; }
  };
})();
