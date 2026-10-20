/*
  locate.js — where the user is (Phase 7)

  Rules this file follows, and they are not negotiable:

    1. Permission is only requested when the user presses the locate button.
       Nothing asks on page load.
    2. The position is held in a variable and nothing else. It is never
       written to storage, never put in a URL, never sent anywhere.
       Not to us, not to OpenStreetMap, not to the routing service — routing
       only ever receives the two places you picked.
    3. Watching (continuous updates) is off by default and stops when the
       user turns it off or leaves the map.

  The browser's Geolocation API needs a secure context: https, or localhost.
  Opening index.html straight from Explorer gives a file:// page, where this
  silently fails in most browsers. Use Live Server.
*/

const BabnavLocate = (function () {

  let position = null;     // { lat, lng, accuracy } or null
  let watchId = null;
  let onChange = function () {};

  function supported() {
    return "geolocation" in navigator;
  }

  // A page served over file:// cannot use geolocation in Chrome or Edge.
  function secure() {
    return window.isSecureContext === true;
  }

  function get() { return position; }

  function clear() {
    position = null;
    stopWatching();
    onChange(null, null);
  }

  // Turn a GeolocationPositionError into something a person can act on.
  function explain(error) {
    if (!error) return "Location is not available right now.";

    if (error.code === 1) {
      return "Location access is disabled. Babnav will not ask again — turn " +
             "it back on in your browser's site settings if you change your " +
             "mind. Everything else still works: pick a place from the list " +
             "instead.";
    }
    if (error.code === 2) {
      return "Your position could not be determined. Indoors or under thick " +
             "cover, GPS often fails. Try again near a window or outside.";
    }
    if (error.code === 3) {
      return "Finding your position took too long. Try again.";
    }
    return "Location is not available right now.";
  }

  /*
    Ask once. Resolves with { ok: true, position } or { ok: false, message }.
    Never rejects, so the caller has one code path.
  */
  function locate() {
    return new Promise(function (resolve) {
      if (!supported()) {
        resolve({ ok: false, message: "This browser does not support location." });
        return;
      }

      if (!secure()) {
        resolve({
          ok: false,
          message: "Location needs a secure page. Open Babnav with Live " +
                   "Server (http://localhost) rather than double-clicking " +
                   "index.html."
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (result) {
          position = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
            accuracy: result.coords.accuracy    // metres, 68% confidence
          };
          onChange(position, null);
          resolve({ ok: true, position: position });
        },
        function (error) {
          const message = explain(error);
          onChange(null, message);
          resolve({ ok: false, message: message });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000        // a half-minute-old fix is fine, saves battery
        }
      );
    });
  }

  /* ---------- Following the user as they walk ---------- */

  function watching() { return watchId !== null; }

  function startWatching() {
    if (!supported() || !secure() || watchId !== null) return false;

    watchId = navigator.geolocation.watchPosition(
      function (result) {
        position = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy
        };
        onChange(position, null);
      },
      function (error) {
        onChange(null, explain(error));
        stopWatching();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    return true;
  }

  function stopWatching() {
    if (watchId === null) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  function init(options) {
    onChange = (options && options.onChange) || onChange;

    // Stop draining the battery when the tab is not being looked at.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopWatching();
    });
  }

  return {
    init: init,
    locate: locate,
    get: get,
    clear: clear,
    supported: supported,
    secure: secure,
    watching: watching,
    startWatching: startWatching,
    stopWatching: stopWatching
  };
})();
