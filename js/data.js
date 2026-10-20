/*
  data.js — Babnav campus data (PHASE 3)

  ============================================================
  READ THIS BEFORE EDITING
  ============================================================
  Every place below has a "verified" flag.

    verified: false  -> the position is a PLACEHOLDER I have not confirmed.
                        It is placed near the campus centre so the interface
                        has something to draw. It is NOT the real position of
                        that building, and the building itself is not
                        confirmed. The app shows these with a dashed pin and
                        an "Unverified" badge.

    verified: true   -> YOU stood there (or checked satellite imagery) and
                        confirmed both the building and the coordinates.
                        Only you should set this, after checking.

  There is also an optional "source" field:

    source: "osm"    -> the position came from OpenStreetMap, pulled in with
                        tools/osm-import.html. Real, volunteer-contributed,
                        and much better than a placeholder — but still worth
                        checking before you mark it verified.
    (no source)      -> a placeholder I invented so the interface had
                        something to draw.

  The fastest way to fill this file properly is tools/osm-import.html.
  Open it in a browser, fetch, tick what you want, paste the result here.
  ============================================================
*/

/* ---------- Campus-level settings ---------- */
const CAMPUS = {
  name: "Babcock University",
  place: "Ilishan-Remo, Ogun State",

  // Published coordinate for the university, used only to decide where the
  // map opens. It is not a building position.
  center: [6.894, 3.7187],

  defaultZoom: 16,
  minZoom: 14,
  maxZoom: 19,

  // A generous box around the campus so the map cannot be panned away to
  // Lagos. Tighten this once you have surveyed the real campus edges.
  bounds: [
    [6.874, 3.699],   // south-west corner [lat, lng]
    [6.914, 3.739]    // north-east corner [lat, lng]
  ]
};

/* ---------- Categories ---------- */
const CATEGORIES = [
  { id: "all",         label: "All places",     icon: "\u25CE" },
  { id: "academic",    label: "Academic",       icon: "📚" },
  { id: "residential", label: "Residential",    icon: "🏠" },
  { id: "food",        label: "Food",           icon: "🍴" },
  { id: "health",      label: "Health",         icon: "🏥" },
  { id: "religious",   label: "Religious",      icon: "⛪" },
  { id: "sports",      label: "Sports",         icon: "🏃" },
  { id: "admin",       label: "Administration", icon: "🏢" },
  { id: "transport",   label: "Transportation", icon: "🚌" },
  { id: "services",    label: "Services",       icon: "🛍" },
  { id: "recreation",  label: "Recreation",     icon: "🌳" }
];

/*
  ---------- Places ----------
  Fields:
    id          unique text id, never reuse one
    name        what the user sees
    category    must match a category id above
    lat, lng    decimal degrees. North and East are positive.
                Babcock is roughly lat 6.89, lng 3.71.
    description one plain sentence
    keywords    extra search words (nicknames, abbreviations, what students
                actually call it)
    verified    see the note at the top of this file
    hours       optional, e.g. "Mon-Fri 08:00-18:00". Omit if unknown.
    image       optional filename inside assets/images/
*/
/* Generated from OpenStreetMap on 2026-10-18. Data (c) OpenStreetMap contributors, ODbL.
   Positions are community data: set verified: true only after checking them yourself.
   Descriptions are empty on purpose - write your own. */
const PLACES = [
  {
    id: "academic-building",
    name: "Academic Building",
    category: "academic",
    lat: 6.891437, lng: 3.722977,
    description: "",
    keywords: ["academic", "building"],
    source: "osm",
    osmId: "way/1283238161",
    verified: false
  },
  {
    id: "adeleke-hall",
    name: "Adeleke Hall",
    category: "residential",
    lat: 6.892800, lng: 3.721149,
    description: "",
    keywords: ["adeleke", "hall"],
    source: "osm",
    osmId: "node/11750293371",
    verified: false
  },
  {
    id: "ameyo-adadevoh-hall",
    name: "Ameyo Adadevoh Hall",
    category: "residential",
    lat: 6.894945, lng: 3.724927,
    description: "",
    keywords: ["ameyo", "adadevoh", "hall"],
    source: "osm",
    osmId: "node/11750293373",
    verified: false
  },
  {
    id: "amphitheatre",
    name: "Amphitheatre",
    category: "academic",
    lat: 6.890878, lng: 3.722423,
    description: "",
    keywords: ["amphitheatre", "theatre"],
    source: "osm",
    osmId: "node/11750218077",
    verified: false
  },
  {
    id: "andrews-park",
    name: "Andrews Park",
    category: "recreation",
    lat: 6.887380, lng: 3.721347,
    description: "",
    keywords: ["andrews", "park"],
    source: "osm",
    osmId: "way/1471761176",
    verified: false
  },
  {
    id: "babcock-guest-house",
    name: "Babcock Guest House",
    category: "residential",
    lat: 6.890511, lng: 3.719922,
    description: "",
    keywords: ["babcock", "guest", "house"],
    source: "osm",
    osmId: "node/11750185545",
    verified: false
  },
  {
    id: "babcock-university-central-store",
    name: "Babcock University Central Store",
    category: "services",
    lat: 6.889959, lng: 3.724378,
    description: "",
    keywords: ["babcock", "university", "central", "store"],
    source: "osm",
    osmId: "way/1568016862",
    verified: false
  },
  {
    id: "banks-cluster",
    name: "Banks Cluster",
    category: "services",
    lat: 6.890799, lng: 3.720736,
    description: "",
    keywords: ["banks", "cluster", "bank"],
    source: "osm",
    osmId: "node/11750284268",
    verified: false
  },
  {
    id: "basketball-court-bu",
    name: "Basketball Court BU",
    category: "sports",
    lat: 6.893933, lng: 3.728415,
    description: "",
    keywords: ["basketball", "court"],
    source: "osm",
    osmId: "node/11750293375",
    verified: false
  },
  {
    id: "bbs-babcock-business-school",
    name: "BBS Babcock Business School",
    category: "academic",
    lat: 6.890815, lng: 3.723908,
    description: "",
    keywords: ["bbs", "babcock", "business", "school"],
    source: "osm",
    osmId: "node/11750260583",
    verified: false
  },
  {
    id: "bethel-splendor-hall",
    name: "Bethel Splendor Hall",
    category: "residential",
    lat: 6.894609, lng: 3.723073,
    description: "",
    keywords: ["bethel", "splendor", "hall"],
    source: "osm",
    osmId: "node/11750260572",
    verified: false
  },
  {
    id: "bu-highschool",
    name: "BU Highschool",
    category: "academic",
    lat: 6.890112, lng: 3.718971,
    description: "",
    keywords: ["highschool"],
    source: "osm",
    osmId: "node/11750293376",
    verified: false
  },
  {
    id: "bu-mall",
    name: "BU Mall",
    category: "services",
    lat: 6.891235, lng: 3.720442,
    description: "",
    keywords: ["mall"],
    source: "osm",
    osmId: "node/11750139937",
    verified: false
  },
  {
    id: "bucodel",
    name: "BuCodel",
    category: "academic",
    lat: 6.891653, lng: 3.723363,
    description: "",
    keywords: ["bucodel"],
    source: "osm",
    osmId: "way/1283238020",
    verified: false
  },
  {
    id: "bursary",
    name: "Bursary",
    category: "admin",
    lat: 6.890103, lng: 3.722889,
    description: "",
    keywords: ["bursary"],
    source: "osm",
    osmId: "node/11750260570",
    verified: false
  },
  {
    id: "busa",
    name: "BUSA",
    category: "academic",
    lat: 6.892123, lng: 3.724004,
    description: "",
    keywords: ["busa"],
    source: "osm",
    osmId: "way/1283237867",
    verified: false
  },
  {
    id: "busa-house",
    name: "BUSA House",
    category: "services",
    lat: 6.892054, lng: 3.723759,
    description: "",
    keywords: ["busa", "house"],
    source: "osm",
    osmId: "node/11750260577",
    verified: false
  },
  {
    id: "buth",
    name: "BUTH",
    category: "health",
    lat: 6.891814, lng: 3.718502,
    description: "",
    keywords: ["buth", "teaching hospital"],
    source: "osm",
    osmId: "way/1283238008",
    verified: false
  },
  {
    id: "buth-600",
    name: "BUTH 600",
    category: "health",
    lat: 6.891260, lng: 3.716939,
    description: "",
    keywords: ["buth", "600"],
    source: "osm",
    osmId: "way/1283238068",
    verified: false
  },
  {
    id: "cibn-building",
    name: "CIBN building",
    category: "academic",
    lat: 6.890128, lng: 3.723898,
    description: "",
    keywords: ["cibn", "building", "lecture theatre"],
    source: "osm",
    osmId: "way/1568016864",
    verified: false
  },
  {
    id: "crystal-hall",
    name: "Crystal Hall",
    category: "residential",
    lat: 6.892856, lng: 3.727742,
    description: "",
    keywords: ["crystal", "hall"],
    source: "osm",
    osmId: "node/11750260579",
    verified: false
  },
  {
    id: "diamond-hall",
    name: "Diamond Hall",
    category: "residential",
    lat: 6.892117, lng: 3.727193,
    description: "",
    keywords: ["diamond", "hall"],
    source: "osm",
    osmId: "node/11750260581",
    verified: false
  },
  {
    id: "eah",
    name: "EAH",
    category: "academic",
    lat: 6.890228, lng: 3.720572,
    description: "",
    keywords: ["eah"],
    source: "osm",
    osmId: "way/1283238226",
    verified: false
  },
  {
    id: "emerald-hall",
    name: "Emerald Hall",
    category: "residential",
    lat: 6.894024, lng: 3.719704,
    description: "",
    keywords: ["emerald", "hall"],
    source: "osm",
    osmId: "way/1436645312",
    verified: false
  },
  {
    id: "facilities-building",
    name: "Facilities Building",
    category: "academic",
    lat: 6.889665, lng: 3.724052,
    description: "",
    keywords: ["facilities", "building", "office"],
    source: "osm",
    osmId: "way/1568016863",
    verified: false
  },
  {
    id: "felicia-adebisi-dada",
    name: "Felicia Adebisi Dada",
    category: "residential",
    lat: 6.893674, lng: 3.724978,
    description: "",
    keywords: ["felicia", "adebisi", "dada", "hall"],
    source: "osm",
    osmId: "node/11750260576",
    verified: false
  },
  {
    id: "gideon-troopers-hall",
    name: "Gideon Troopers Hall",
    category: "residential",
    lat: 6.894424, lng: 3.722493,
    description: "",
    keywords: ["gideon", "troopers", "hall"],
    source: "osm",
    osmId: "node/11750260571",
    verified: false
  },
  {
    id: "havilah-gold-hall",
    name: "Havilah Gold Hall",
    category: "residential",
    lat: 6.894879, lng: 3.726075,
    description: "",
    keywords: ["havilah", "gold", "hall"],
    source: "osm",
    osmId: "node/11750293374",
    verified: false
  },
  {
    id: "laz-otti-library",
    name: "Laz Otti Library",
    category: "academic",
    lat: 6.892156, lng: 3.722333,
    description: "",
    keywords: ["laz", "otti", "library"],
    source: "osm",
    osmId: "node/11750293370",
    verified: false
  },
  {
    id: "main-gate",
    name: "Main Gate",
    category: "services",
    lat: 6.889076, lng: 3.720041,
    description: "",
    keywords: ["main", "gate", "entrance"],
    source: "osm",
    osmId: "node/11750260587",
    verified: false
  },
  {
    id: "neal-wilson-hall",
    name: "Neal Wilson Hall",
    category: "residential",
    lat: 6.893053, lng: 3.721716,
    description: "",
    keywords: ["neal", "wilson", "hall"],
    source: "osm",
    osmId: "node/11750209192",
    verified: false
  },
  {
    id: "nelson-mandela-hall",
    name: "Nelson Mandela Hall",
    category: "residential",
    lat: 6.893473, lng: 3.723041,
    description: "",
    keywords: ["nelson", "mandela", "hall"],
    source: "osm",
    osmId: "node/11750260574",
    verified: false
  },
  {
    id: "new-bucodel-building",
    name: "New Bucodel Building",
    category: "academic",
    lat: 6.890219, lng: 3.723519,
    description: "",
    keywords: ["new", "bucodel", "building"],
    source: "osm",
    osmId: "way/1568016858",
    verified: false
  },
  {
    id: "new-horizon",
    name: "New Horizon",
    category: "admin",
    lat: 6.890344, lng: 3.723179,
    description: "",
    keywords: ["new", "horizon"],
    source: "osm",
    osmId: "node/11750187321",
    verified: false
  },
  {
    id: "new-horizon-gazebo-1",
    name: "New Horizon Gazebo 1",
    category: "academic",
    lat: 6.890086, lng: 3.723315,
    description: "",
    keywords: ["new", "horizon", "gazebo"],
    source: "osm",
    osmId: "way/1568016859",
    verified: false
  },
  {
    id: "new-horizon-gazebo-2",
    name: "New Horizon Gazebo 2",
    category: "academic",
    lat: 6.890006, lng: 3.723397,
    description: "",
    keywords: ["new", "horizon", "gazebo"],
    source: "osm",
    osmId: "way/1568016860",
    verified: false
  },
  {
    id: "new-horizon-gazebo-3",
    name: "New Horizon Gazebo 3",
    category: "academic",
    lat: 6.889928, lng: 3.723479,
    description: "",
    keywords: ["new", "horizon", "gazebo"],
    source: "osm",
    osmId: "way/1568016861",
    verified: false
  },
  {
    id: "nyberg-hall",
    name: "Nyberg Hall",
    category: "residential",
    lat: 6.892597, lng: 3.725379,
    description: "",
    keywords: ["nyberg", "hall"],
    source: "osm",
    osmId: "node/11750260578",
    verified: false
  },
  {
    id: "ogden-hall",
    name: "Ogden Hall",
    category: "residential",
    lat: 6.892829, lng: 3.726381,
    description: "",
    keywords: ["ogden", "hall"],
    source: "osm",
    osmId: "node/11750260582",
    verified: false
  },
  {
    id: "platinum-hall",
    name: "Platinum Hall",
    category: "residential",
    lat: 6.892452, lng: 3.727420,
    description: "",
    keywords: ["platinum", "hall"],
    source: "osm",
    osmId: "node/11750260580",
    verified: false
  },
  {
    id: "queen-esther",
    name: "Queen Esther",
    category: "residential",
    lat: 6.892979, lng: 3.724701,
    description: "",
    keywords: ["queen", "esther", "hall"],
    source: "osm",
    osmId: "node/11750260575",
    verified: false
  },
  {
    id: "samuel-akande-hall",
    name: "Samuel Akande Hall",
    category: "residential",
    lat: 6.894131, lng: 3.723637,
    description: "",
    keywords: ["samuel", "akande", "hall"],
    source: "osm",
    osmId: "node/11750260573",
    verified: false
  },
  {
    id: "school-cafeteria",
    name: "School Cafeteria",
    category: "food",
    lat: 6.892680, lng: 3.723606,
    description: "",
    keywords: ["school", "cafeteria", "fast food"],
    source: "osm",
    osmId: "node/11750211718",
    verified: false
  },
  {
    id: "science-and-technology",
    name: "Science and Technology",
    category: "academic",
    lat: 6.888716, lng: 3.722546,
    description: "",
    keywords: ["science", "technology", "school"],
    source: "osm",
    osmId: "node/11750260584",
    verified: false
  },
  {
    id: "senate-building",
    name: "Senate Building",
    category: "admin",
    lat: 6.888840, lng: 3.721885,
    description: "",
    keywords: ["senate", "building"],
    source: "osm",
    osmId: "node/11750260585",
    verified: false
  },
  {
    id: "seventh-day-adventist-church",
    name: "Seventh Day Adventist Church",
    category: "religious",
    lat: 6.889608, lng: 3.719595,
    description: "",
    keywords: ["seventh", "day", "adventist", "church", "place of worship"],
    source: "osm",
    osmId: "node/11750284267",
    verified: false
  },
  {
    id: "stadium-babcock-university",
    name: "Stadium Babcock University",
    category: "sports",
    lat: 6.894722, lng: 3.727703,
    description: "",
    keywords: ["stadium", "babcock", "university"],
    source: "osm",
    osmId: "node/11750284266",
    verified: false
  },
  {
    id: "topaz-activity-hall",
    name: "Topaz Activity Hall",
    category: "residential",
    lat: 6.893765, lng: 3.720277,
    description: "",
    keywords: ["topaz", "activity", "hall"],
    source: "osm",
    osmId: "way/1436645313",
    verified: false
  },
  {
    id: "topaz-hall",
    name: "Topaz Hall",
    category: "residential",
    lat: 6.893688, lng: 3.720567,
    description: "",
    keywords: ["topaz", "hall"],
    source: "osm",
    osmId: "way/1436645315",
    verified: false
  },
  {
    id: "welch-hall",
    name: "Welch Hall",
    category: "residential",
    lat: 6.891751, lng: 3.721436,
    description: "",
    keywords: ["welch", "hall"],
    source: "osm",
    osmId: "node/11750293369",
    verified: false
  },
  {
    id: "white-hall",
    name: "White Hall",
    category: "residential",
    lat: 6.893770, lng: 3.726330,
    description: "",
    keywords: ["white", "hall"],
    source: "osm",
    osmId: "node/11750284265",
    verified: false
  },
  {
    id: "winslow-hall",
    name: "Winslow Hall",
    category: "residential",
    lat: 6.894008, lng: 3.721660,
    description: "",
    keywords: ["winslow", "hall"],
    source: "osm",
    osmId: "node/11750228864",
    verified: false
  }
];
