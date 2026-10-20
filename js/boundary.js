/*
  boundary.js - the real Babcock campus outline (OpenStreetMap way 453068217).
  Loaded after data.js. It tightens the map lock to the campus and removes any
  place that sits outside the outline (with a ~15 m allowance for edge places
  such as the gate). Remove this script tag to switch the restriction off.
*/
const CAMPUS_POLYGON = [[6.89182,3.716687],[6.891558,3.716703],[6.891115,3.716705],[6.890622,3.717482],[6.890741,3.717602],[6.890535,3.71779],[6.890166,3.718164],[6.889642,3.718735],[6.889213,3.719178],[6.888946,3.719411],[6.888994,3.719697],[6.888933,3.719753],[6.888842,3.719843],[6.888571,3.71973],[6.88815,3.720131],[6.887491,3.720759],[6.886669,3.721485],[6.885982,3.722132],[6.884503,3.723526],[6.884354,3.72372],[6.884274,3.723868],[6.884702,3.724029],[6.8845,3.72436],[6.884116,3.724227],[6.88409,3.724234],[6.884077,3.724261],[6.884072,3.724442],[6.884046,3.724678],[6.883899,3.7252],[6.884016,3.725346],[6.884324,3.725303],[6.884519,3.72536],[6.884722,3.725426],[6.884954,3.725464],[6.885413,3.725539],[6.885548,3.725725],[6.885582,3.725815],[6.885634,3.725977],[6.885789,3.726414],[6.885938,3.726683],[6.886065,3.726844],[6.887532,3.728587],[6.888099,3.728442],[6.888438,3.728263],[6.888608,3.728021],[6.888818,3.72727],[6.889175,3.72712],[6.889487,3.72687],[6.889694,3.726683],[6.889946,3.726509],[6.892143,3.728162],[6.893251,3.728809],[6.894115,3.728957],[6.894509,3.729094],[6.894907,3.72924],[6.895135,3.729247],[6.895497,3.729236],[6.896094,3.728844],[6.895948,3.728101],[6.895843,3.727366],[6.895642,3.725662],[6.895748,3.724006],[6.895752,3.723919],[6.895723,3.72329],[6.895832,3.722179],[6.895855,3.721061],[6.895225,3.721133],[6.894425,3.721285],[6.894398,3.721137],[6.894581,3.719682],[6.894465,3.719375],[6.894136,3.718501],[6.893931,3.718034],[6.893888,3.717885],[6.893746,3.717676],[6.893648,3.717726],[6.892983,3.71737],[6.892721,3.717149],[6.892491,3.716953],[6.891981,3.716843],[6.89182,3.716687]];

function pointInCampus(lat, lng) {
  let inside = false;
  for (let i = 0, j = CAMPUS_POLYGON.length - 1; i < CAMPUS_POLYGON.length; j = i++) {
    const yi = CAMPUS_POLYGON[i][0], xi = CAMPUS_POLYGON[i][1];
    const yj = CAMPUS_POLYGON[j][0], xj = CAMPUS_POLYGON[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function insideCampus(lat, lng) {
  const d = 0.00014; // about 15 m
  return [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]].some(function (o) {
    return pointInCampus(lat + o[0], lng + o[1]);
  });
}

// Lock the map to the campus box (plus a very small margin).
CAMPUS.bounds = [[6.8836, 3.7164], [6.8964, 3.7295]];

// Drop places outside the campus. Kept in a list so the console shows what went.
const PLACES_OUTSIDE_CAMPUS = [];
for (let i = PLACES.length - 1; i >= 0; i--) {
  if (typeof PLACES[i].lat === "number" && !insideCampus(PLACES[i].lat, PLACES[i].lng)) {
    PLACES_OUTSIDE_CAMPUS.push(PLACES.splice(i, 1)[0]);
  }
}
if (PLACES_OUTSIDE_CAMPUS.length) {
  console.info("[Babnav] Hidden (outside campus):", PLACES_OUTSIDE_CAMPUS.map(function (p) { return p.name; }));
}
