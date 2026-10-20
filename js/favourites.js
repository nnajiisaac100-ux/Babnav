/*
  favourites.js — saved places (Phase 9)

  Stored in localStorage under one key. localStorage is a small key/value
  store the browser keeps per site, it survives refreshes and restarts, and
  it never leaves the device.

  Two things about it that catch people out:

    1. It stores strings only. Objects have to be JSON.stringify'd on the way
       in and JSON.parse'd on the way out, and the parse can throw if the
       stored text was corrupted.
    2. It is not always available. Private windows, blocked cookies and some
       enterprise policies make it throw on access, not just return null.
       Every call here is wrapped, and if storage is unavailable Babnav keeps
       working with the saved list held in memory for the session only.

  It is also per-browser, not per-person: saving a place on your laptop does
  not save it on your phone. Syncing needs accounts and a backend, which is
  Phase 11 territory.
*/

const BabnavFavourites = (function () {

  const KEY = "babnav.saved.v1";

  let ids = [];
  let persistent = true;   // false when localStorage refused to work

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { ids = []; return; }

      const parsed = JSON.parse(raw);
      ids = Array.isArray(parsed)
        ? parsed.filter(function (v) { return typeof v === "string"; })
        : [];
    } catch (err) {
      // Corrupted JSON or storage blocked. Carry on with an empty list
      // rather than breaking the whole app over a bookmark feature.
      ids = [];
      persistent = false;
    }
  }

  function save() {
    if (!persistent) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch (err) {
      persistent = false;   // quota full or storage blocked mid-session
    }
  }

  function has(id) { return ids.indexOf(id) > -1; }

  function toggle(id) {
    const at = ids.indexOf(id);
    if (at > -1) { ids.splice(at, 1); } else { ids.push(id); }
    save();
    return has(id);
  }

  function list() { return ids.slice(); }

  function count() { return ids.length; }

  // Places that were saved but no longer exist in data.js — usually after a
  // fresh OSM import changed the ids. Cleared silently rather than shown as
  // broken entries.
  function prune(existingIds) {
    const before = ids.length;
    ids = ids.filter(function (id) { return existingIds.indexOf(id) > -1; });
    if (ids.length !== before) save();
  }

  function isPersistent() { return persistent; }

  load();

  return {
    has: has,
    toggle: toggle,
    list: list,
    count: count,
    prune: prune,
    isPersistent: isPersistent
  };
})();
