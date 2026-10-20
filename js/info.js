/*
  info.js — campus information (Phase 10)

  ============================================================
  EVERY BODY OF TEXT BELOW IS EMPTY ON PURPOSE.
  ============================================================
  I have never been to Babcock. Writing "the bursary opens at 8am" or
  "the shuttle runs every 20 minutes" would be inventing university policy,
  and a navigation app that confidently states the wrong opening hours is
  worse than one that says nothing.

  So this file gives you the structure and leaves the facts to you. Any
  section with an empty `body` is hidden from the app entirely — nothing
  shows until you have written something true. Fill them in from the
  university's own published information, or from someone in the relevant
  office, and cite where you got it in the `source` field so the next person
  can check whether it is still current.

  Each section:
    id        unique
    title     the heading a student sees
    body      your text. Plain sentences. Blank = section hidden.
    source    where the information came from, and when you checked it
    category  optional: pulls in every place of that category automatically,
              straight from data.js, so the lists never go out of date
*/

const CAMPUS_INFO = [
  {
    id: "emergency",
    title: "In an emergency",
    body: "",
    source: "",
    category: "health"
  },
  {
    id: "health",
    title: "Health services",
    body: "",
    source: "",
    category: null
  },
  {
    id: "offices",
    title: "Important offices",
    body: "",
    source: "",
    category: "admin"
  },
  {
    id: "getting-around",
    title: "Getting around campus",
    body: "",
    source: "",
    category: "transport"
  },
  {
    id: "food",
    title: "Where to eat",
    body: "",
    source: "",
    category: "food"
  },
  {
    id: "worship",
    title: "Worship",
    body: "",
    source: "",
    category: "religious"
  },
  {
    id: "services",
    title: "Student services",
    body: "",
    source: "",
    category: "services"
  },
  {
    id: "accessibility",
    title: "Accessibility",
    body: "",
    source: "",
    category: null
  },
  {
    id: "about",
    title: "About Babnav",
    body: "Babnav is a campus navigation project for Babcock University. " +
          "Map data comes from OpenStreetMap, contributed by volunteers. " +
          "Babnav asks for your location only when you press the locate " +
          "button, keeps it in memory for that visit only, and never sends " +
          "it anywhere.",
    source: "Written by the Babnav project",
    category: null
  }
];
