/*
  route.js — walking directions (Phase 6)

  Babnav does not compute routes itself. Working out the shortest path across
  a road network is a serious piece of software, and OpenStreetMap already has
  free public ones. We ask, they answer.

  Service: OSRM (Open Source Routing Machine), foot profile, hosted by FOSSGIS.
  This is the same service the "Directions" tab on openstreetmap.org uses. No
  API key, no signup, no cost. In return it expects light traffic — fine for a
  campus app, but do not hammer it in a loop.

  What comes back: a distance in metres, a duration in seconds, the route
  geometry as a list of coordinates, and turn-by-turn steps.

  Honest limitation, and it matters here: OSRM can only route along paths that
  exist in OpenStreetMap. If Babcock's internal walkways are not mapped, a
  route may take a long way round on the roads that ARE mapped, or fail
  entirely. When it fails we fall back to a straight line and label it as
  such — a straight line is NOT a walking route and the app says so.
*/

const BabnavRoute = (function () {

  const ENDPOINT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/";

  // Distance between two points on the Earth's surface, in metres.
  // The haversine formula: it treats the Earth as a sphere, which is close
  // enough at campus scale (error well under a metre).
  function haversine(a, b) {
    const R = 6371000;                       // Earth radius in metres
    const toRad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toRad;
    const dLng = (b.lng - a.lng) * toRad;

    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function formatDistance(metres) {
    if (metres < 1000) return Math.round(metres / 10) * 10 + " m";
    return (metres / 1000).toFixed(1) + " km";
  }

  function formatDuration(seconds) {
    const mins = Math.round(seconds / 60);
    if (mins < 1) return "under a minute";
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60);
    return h + " h " + (mins % 60) + " min";
  }

  // OSRM describes a turn as a type plus a modifier. Turn that into English.
  function describeStep(step) {
    const m = step.maneuver || {};
    const type = m.type || "";
    const mod = m.modifier || "";
    const road = step.name ? " onto " + step.name : "";

    if (type === "depart") return "Start" + (step.name ? " on " + step.name : "");
    if (type === "arrive") return "Arrive at your destination";
    if (type === "roundabout" || type === "rotary") return "Take the roundabout" + road;
    if (type === "new name") return "Continue" + road;
    if (type === "continue") return "Continue " + mod + road;

    if (mod === "straight") return "Continue straight" + road;
    if (mod === "uturn") return "Make a U-turn";
    if (mod) return "Turn " + mod + road;

    return "Continue" + road;
  }

  /*
    Ask for a walking route from one place to another.
    Always resolves — never rejects — so the caller has one code path.

    Resolves with:
      { ok, fallback, distance, duration, distanceText, durationText,
        coordinates, steps, message }
  */
  async function walk(from, to) {
    const straight = haversine(from, to);

    // A rough walking fallback: 1.35 m/s is a normal unhurried pace.
    const fallbackResult = function (message) {
      return {
        ok: false,
        fallback: true,
        distance: straight,
        duration: straight / 1.35,
        distanceText: formatDistance(straight),
        durationText: formatDuration(straight / 1.35),
        coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
        steps: [],
        message: message
      };
    };

    const url = ENDPOINT +
      from.lng + "," + from.lat + ";" + to.lng + "," + to.lat +
      "?overview=full&geometries=geojson&steps=true";

    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return fallbackResult("The routing service answered with an error (" +
                              res.status + "), so this is a straight line.");
      }
      data = await res.json();
    } catch (err) {
      return fallbackResult("Could not reach the routing service, so this is " +
                            "a straight line. Check your connection.");
    }

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return fallbackResult("No walking route was found between these two " +
                            "points, so this is a straight line. The paths " +
                            "between them may not be mapped in OpenStreetMap yet.");
    }

    const route = data.routes[0];

    // GeoJSON is [longitude, latitude]. Leaflet wants [latitude, longitude].
    // Getting this backwards puts your campus in the Indian Ocean.
    const coordinates = route.geometry.coordinates.map(function (pair) {
      return [pair[1], pair[0]];
    });

    const steps = [];
    (route.legs || []).forEach(function (leg) {
      (leg.steps || []).forEach(function (step) {
        steps.push({
          text: describeStep(step),
          distanceText: formatDistance(step.distance)
        });
      });
    });

    return {
      ok: true,
      fallback: false,
      distance: route.distance,
      duration: route.duration,
      distanceText: formatDistance(route.distance),
      durationText: formatDuration(route.duration),
      coordinates: coordinates,
      steps: steps,
      message: ""
    };
  }

  return {
    walk: walk,
    haversine: haversine,
    formatDistance: formatDistance,
    formatDuration: formatDuration
  };
})();
