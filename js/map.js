/*
  map.js — Babnav map module (Phase 2)

  This file is the ONLY file that knows Leaflet exists. Everything else in the
  app talks to it through the BabnavMap object at the bottom. That matters: if
  we ever swap Leaflet for something else, only this file changes.

  What it does:
    1. Creates the Leaflet map and loads OpenStreetMap tiles
    2. Draws one pin per place, coloured by category
    3. Tells app.js when a pin is clicked (via a callback)
    4. Lets the map be zoomed to a place, or to the current filtered set
    5. Runs the "Capture coordinates" tool used to collect real positions
*/

const BabnavMap = (function () {

  let map = null;                 // the Leaflet map instance
  let markerLayer = null;         // a group holding all current pins
  let routeLayer = null;          // the drawn walking route, if any
  let meLayer = null;             // the user's own position (Phase 7)
  let markersById = {};           // id -> Leaflet marker, so we can restyle one
  let onSelect = function () {};  // callback into app.js
  let captureOn = false;
  let ready = false;

  /* ---------- Pin appearance ---------- */

  // Leaflet's divIcon lets us supply our own HTML, so pins are styled with
  // the same CSS as the rest of the app instead of image files.
  function buildIcon(place, color, isSelected) {
    const classes = [
      "pin",
      (place.verified || !new URLSearchParams(location.search).has("dev")) ? "" : "pin--unverified",
      isSelected ? "is-selected" : ""
    ].join(" ").trim();

    const cat = CATEGORIES.find(function (c) { return c.id === place.category; });
    const glyph = cat ? cat.icon : "\u25CF";

    return L.divIcon({
      className: "pin-icon",
      html:
        '<span class="' + classes + '" style="--pin:' + color + '">' +
          '<span class="pin__drop"><span class="pin__emoji">' + glyph + "</span></span>" +
          '<span class="pin__label">' + place.name + "</span>" +
        "</span>",
      iconSize: null,
      iconAnchor: [15, 36]   // the tip of the teardrop sits on the place
    });
  }

  /* ---------- Public functions ---------- */

  function init(options) {
    onSelect = options.onSelect || onSelect;

    // Leaflet loads from a CDN. If the network blocked it, say so plainly
    // instead of throwing an error the user cannot read.
    if (typeof L === "undefined") {
      showFailure(
        "Map could not load.",
        "Babnav needs an internet connection the first time it loads the map " +
        "library. Check your connection and refresh."
      );
      return false;
    }

    map = L.map("map-canvas", {
      center: CAMPUS.center,
      zoom: CAMPUS.defaultZoom,
      minZoom: CAMPUS.minZoom,
      maxZoom: CAMPUS.maxZoom,
      maxBounds: L.latLngBounds(CAMPUS.bounds),
      maxBoundsViscosity: 1.0,
      zoomControl: true
    });

    // The tile layer is the actual map imagery. Each tile is a 256x256 PNG
    // that OpenStreetMap serves for one square of the world at one zoom
    // level. Leaflet works out which tiles the current view needs and
    // requests them. The attribution below is required by OSM.
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        bounds: L.latLngBounds(CAMPUS.bounds),
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    );

    let tileErrors = 0;
    tiles.on("tileerror", function () {
      tileErrors += 1;
      if (tileErrors === 6) {
        setStatus("Map images are not loading. Check your connection.");
      }
    });

    tiles.addTo(map);

    // Cover everything outside the campus outline and stop zooming out past it.
    if (typeof CAMPUS_POLYGON !== "undefined") {
      map.createPane("campusMask");
      map.getPane("campusMask").style.zIndex = 350;
      map.getPane("campusMask").style.pointerEvents = "none";
      L.polygon(
        [[[-85, -180], [-85, 180], [85, 180], [85, -180]], CAMPUS_POLYGON],
        { pane: "campusMask", className: "campus-mask", stroke: false, fillColor: "#f1f5f9", fillOpacity: 1, interactive: false }
      ).addTo(map);
      L.polygon(CAMPUS_POLYGON, {
        color: "#ca8a04", weight: 2, fill: false, interactive: false
      }).addTo(map);
      const fitMinZoom = function () {
        map.invalidateSize();
        map.setMinZoom(map.getBoundsZoom(L.latLngBounds(CAMPUS.bounds)));
      };
      fitMinZoom();
      window.addEventListener("resize", fitMinZoom);
      map.fitBounds(L.latLngBounds(CAMPUS.bounds));
    }

    // Names show on the selected pin, and on every pin once zoomed in close.
    const syncLabels = function () {
      map.getContainer().classList.toggle("labels-on", map.getZoom() >= 18);
    };
    map.on("zoomend", syncLabels);
    syncLabels();

    markerLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    meLayer = L.layerGroup().addTo(map);
    map.on("click", handleMapClick);

    ready = true;
    return true;
  }

  // Draw pins for the given places. Called every time the filter changes.
  function renderPlaces(places, selectedId) {
    if (!ready) return;

    markerLayer.clearLayers();
    markersById = {};

    places.forEach(function (place) {
      if (typeof place.lat !== "number" || typeof place.lng !== "number") {
        return; // no coordinates yet, so nothing to draw
      }

      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--c-" + place.category).trim() || "#1454b8";

      const marker = L.marker([place.lat, place.lng], {
        icon: buildIcon(place, color, place.id === selectedId),
        keyboard: true,
        title: place.name,
        alt: place.name,
        riseOnHover: true
      });

      marker.on("click", function () { onSelect(place.id); });
      marker.addTo(markerLayer);
      markersById[place.id] = marker;
    });
  }

  // Move the map to one place, keeping it clear of the sheet or side panel.
  function focusPlace(place, pad) {
    if (!ready || !place) return;

    map.setView([place.lat, place.lng], Math.max(map.getZoom(), 17), {
      animate: true
    });

    // Shift the view so the pin sits in the visible strip of map rather
    // than underneath the sheet. Positive y pans the view down, which
    // pushes the pin up the screen.
    if (pad) {
      if (pad.bottom) map.panBy([0, pad.bottom / 2], { animate: true });
      if (pad.left) map.panBy([-pad.left / 2, 0], { animate: true });
    }
  }

  // Zoom out/in so every currently visible place fits in the uncovered area.
  function fitPlaces(places, pad) {
    if (!ready || places.length === 0) return;

    const points = places
      .filter(function (p) { return typeof p.lat === "number"; })
      .map(function (p) { return [p.lat, p.lng]; });

    if (points.length === 0) return;

    const bottom = (pad && pad.bottom) || 0;
    const left = (pad && pad.left) || 0;

    if (points.length === 1) {
      map.setView(points[0], 17);
      if (bottom) map.panBy([0, bottom / 2], { animate: false });
      if (left) map.panBy([-left / 2, 0], { animate: false });
    } else {
      map.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: [40 + left, 90],
        paddingBottomRight: [40, 40 + bottom],
        maxZoom: 18
      });
    }
  }

  /* ---------- Route drawing (Phase 6) ---------- */

  // Two lines on top of each other: a wide pale one underneath acts as a
  // casing so the route stays readable over dark map features.
  function drawRoute(coordinates, isFallback, pad) {
    pad = pad || {};
    if (!ready) return;
    routeLayer.clearLayers();

    L.polyline(coordinates, {
      color: "#ffffff", weight: 9, opacity: 0.9, lineCap: "round"
    }).addTo(routeLayer);

    L.polyline(coordinates, {
      color: "#1454b8",
      weight: 5,
      opacity: 0.95,
      lineCap: "round",
      // A dashed line signals "this is a straight line, not a real route".
      dashArray: isFallback ? "2 9" : null
    }).addTo(routeLayer);

    const ends = [coordinates[0], coordinates[coordinates.length - 1]];
    ends.forEach(function (point, index) {
      L.marker(point, {
        icon: L.divIcon({
          className: "pin-icon",
          html: '<span class="endpoint endpoint--' +
                (index === 0 ? "start" : "finish") + '"></span>',
          iconSize: null,
          iconAnchor: [9, 9]
        }),
        interactive: false
      }).addTo(routeLayer);
    });

    map.fitBounds(L.latLngBounds(coordinates), {
      paddingTopLeft: [40 + (pad.left || 0), 96],
      paddingBottomRight: [40, 40 + (pad.bottom || 0)],
      maxZoom: 18
    });
  }

  function clearRoute() {
    if (ready) routeLayer.clearLayers();
  }

  /* ---------- The user's own position (Phase 7) ---------- */

  // A dot for where you are, and a circle for how sure the device is.
  // Showing the accuracy honestly matters: a 40 m circle tells the user not
  // to trust the dot to the metre, which a bare dot would not.
  function showMe(pos) {
    if (!ready) return;
    meLayer.clearLayers();
    if (!pos) return;

    L.circle([pos.lat, pos.lng], {
      radius: pos.accuracy,
      color: "#1454b8",
      weight: 1,
      opacity: 0.4,
      fillColor: "#1454b8",
      fillOpacity: 0.10,
      interactive: false
    }).addTo(meLayer);

    L.marker([pos.lat, pos.lng], {
      icon: L.divIcon({
        className: "pin-icon",
        html: '<span class="me"></span>',
        iconSize: null,
        iconAnchor: [11, 11]
      }),
      interactive: false,
      zIndexOffset: 1000
    }).addTo(meLayer);
  }

  function goToMe(pos) {
    if (!ready || !pos) return;
    map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 18), { animate: true });
  }

  function resetView() {
    if (!ready) return;
    map.setView(CAMPUS.center, CAMPUS.defaultZoom);
  }

  // Leaflet mis-measures its container if it was hidden when created, so
  // call this after switching back to the Map tab.
  function refreshSize() {
    if (ready) map.invalidateSize();
  }

  /* ---------- Coordinate capture tool (Phase 3 helper) ---------- */

  function setCapture(on) {
    captureOn = on;
    const box = document.getElementById("capture-box");
    box.hidden = !on;
    if (!on) return;
    document.getElementById("capture-output").textContent =
      "Click anywhere on the map.";
  }

  function handleMapClick(event) {
    if (!captureOn) return;

    const lat = event.latlng.lat.toFixed(6);
    const lng = event.latlng.lng.toFixed(6);

    document.getElementById("capture-output").textContent =
      "lat: " + lat + ", lng: " + lng + ",";
  }

  /* ---------- Failure / status messages ---------- */

  function showFailure(title, detail) {
    const box = document.getElementById("map-failure");
    if (!box) return;
    box.hidden = false;
    box.innerHTML = "<strong>" + title + "</strong><span>" + detail + "</span>";
  }

  function setStatus(text) {
    const stamp = document.getElementById("map-stamp");
    if (stamp) stamp.textContent = text;
  }

  // The map container changes size when the sheet moves, so Leaflet has to
  // re-measure or the tiles end up misaligned.
  function resized() {
    if (ready) map.invalidateSize({ animate: false });
  }

  /* ---------- What the rest of the app is allowed to use ---------- */
  return {
    init: init,
    renderPlaces: renderPlaces,
    focusPlace: focusPlace,
    fitPlaces: fitPlaces,
    resetView: resetView,
    drawRoute: drawRoute,
    clearRoute: clearRoute,
    showMe: showMe,
    goToMe: goToMe,
    refreshSize: refreshSize,
    resized: resized,
    setCapture: setCapture,
    setStatus: setStatus,
    isReady: function () { return ready; }
  };
})();
