# Babnav

Find Your Way Around Babcock.

A campus navigation web app for Babcock University, Ilishan-Remo.

## Status — Phases 1–12

Plain HTML, CSS and JavaScript, plus Leaflet for the map. No build step and no
backend. Open `index.html` with Live Server and it runs.

### Working
- Map-first layout: the map fills the screen, everything floats on top
- Draggable bottom sheet with three snap points (peek, half, full)
- On screens wider than 960px the sheet becomes a fixed side panel
- Real slippy map (OpenStreetMap tiles via Leaflet): pan, zoom, drag
- Map is locked to a box around campus so it cannot be panned away
- One pin per place, coloured by category
- Live search over name, category and keywords; map zooms to fit the results
- Category filters
- Selecting a place from the list zooms the map to it, and back again
- Coordinate capture tool for collecting real building positions
- Honest failure messages when the map library or tiles do not load

- Ranked search: exact name, prefix, word start, initials, keywords, category
- Enter opens the top result
- Detail view per place: description, coordinates, position status, OSM link
- Walking directions between any two places, with turn-by-turn steps

- Your own position on the map, with an honest accuracy circle
- Distances from you, and "Nearby" sorted by nearest when your position is known
- Routing from where you are standing
- Category chips with live counts, hidden when empty
- Saved places, kept in this browser
- A campus information screen driven by js/info.js

### Not working yet
- **Coordinates are placeholders** until you run the OSM importer. Pins are
  drawn dashed and badged until you set `verified: true`.
- **Campus information is empty.** js/info.js has the structure; the words
  are yours to write.
- Staff-facing admin with logins — deliberately not built (see the editor
  section: editing happens locally instead)

## Folder structure

```
Babnav/
├── index.html          page structure, loads Leaflet then our scripts
├── css/style.css       all styling, including the pin and map overlays
├── js/data.js          campus settings, categories, places  ← you edit this
├── js/map.js           everything Leaflet: tiles, pins, capture tool
├── js/sheet.js         the draggable bottom sheet: snap points, drag, resize
├── js/search.js        search scoring and ranking
├── js/route.js         walking routes from the OSRM service
├── js/locate.js        geolocation: permission, accuracy, watching
├── js/favourites.js    saved places in localStorage
├── js/info.js          campus information content  ← you write this
├── js/pwa.js           install, update and offline handling
├── sw.js               service worker: caching and offline
├── manifest.webmanifest  name, icons and display mode for installing
├── tools/osm-import.html   build tool: pulls campus places out of OpenStreetMap
├── tools/editor.html       build tool: edit places through a form and map
├── js/app.js           state, search, filters, lists, event handling
├── assets/images/      building photos (empty for now)
├── assets/icons/
└── README.md
```

Only `map.js` knows Leaflet exists. Everything else talks to it through the
`BabnavMap` object. `sheet.js` is likewise the only file that touches the
sheet's geometry — it publishes one CSS variable, `--sheet-h`, and the map
tools, status stamp, zoom buttons and attribution all position themselves
against it. One number moves five things.

## Filling the place list from OpenStreetMap

Babcock's buildings are already mapped in OpenStreetMap by volunteers, with
names and positions. `tools/osm-import.html` pulls them out.

1. Open `tools/osm-import.html` in a browser (Live Server or double-click).
2. Press **Fetch from OpenStreetMap**. It queries the Overpass API for
   everything named inside the box around campus. Takes 20–60 seconds.
3. Tick what belongs in Babnav, fix any wrong category in the dropdown.
   Roads, paths, streams and boundaries are found but start unticked — tick
   **Show roads, paths and boundaries too** if you need to see them. Use the
   find box to check whether a specific building came back at all.
4. Press **Generate**, then **Copy**.
5. In `js/data.js`, replace the whole `const PLACES = [ … ];` block.
6. Refresh Babnav.

Imported places get `source: "osm"` and a blue "From OSM" badge. That is not
the same as verified — OpenStreetMap is volunteer-edited, so a building can be
misnamed, renamed since, or drawn in the wrong spot. Walk past the ones that
matter, then set `verified: true` and the badge disappears.

Descriptions come back empty on purpose. Those are yours to write; do not
invent facts about what happens inside a building.

**Licensing.** OpenStreetMap data is ODbL. You must credit OpenStreetMap
contributors (Babnav already does, bottom right of the map). If you publish a
modified copy of the data itself, the same licence applies to it.

If a building is missing or wrong in OSM, fix it at openstreetmap.org — it
improves the base map, this importer, and everyone else's maps at once.

## Coordinates: how to collect real ones by hand

The placeholder coordinates must be replaced with real ones before Babnav is
useful. Three ways, best first.

**1. Walk the campus with a phone (most accurate)**
Open Google Maps on the spot, press and hold the building, and the coordinates
appear at the top. Or use an app like GPS Coordinates. Record them to 6 decimal
places — 6 decimals is about 10 cm, 5 is about 1 m, 4 is about 11 m.

**2. Satellite imagery (good for roofs you can identify)**
Open Google Maps satellite view over Ilishan-Remo, right-click a building, and
the first item in the menu is its latitude and longitude. Click it to copy.

**3. The built-in capture tool (fastest for bulk entry)**
Click **Capture coordinates** on the map, then click a spot. The panel shows
`lat: 6.894123, lng: 3.718455,` ready to paste into `js/data.js`. Note that the
OpenStreetMap base map may not show individual campus buildings, so use this
for positions you already know rather than for identifying buildings.

**Then, for each place you confirm:**

```js
{
  id: "library",
  name: "University Library",
  category: "academic",
  lat: 6.893812, lng: 3.719604,   // ← your measured values
  description: "...",
  keywords: [...],
  verified: true                   // ← only after you have checked it
}
```

Save, refresh. The pin becomes solid, the badge disappears, and the banner
count drops by one. When it reaches zero the banner hides itself.

**Do not guess.** A wrong coordinate is worse than a missing one — it will send
someone to the wrong side of campus in Phase 6.

## About the map

**OpenStreetMap** is a free, openly licensed map of the world built by
volunteers. Anyone can edit it, and anyone can use the data.

**Leaflet** is a small JavaScript library that displays maps. It does not
supply map imagery itself — it handles panning, zooming, and drawing markers,
and asks a tile server for the pictures.

**Tiles** are how the imagery arrives. The world is cut into 256x256 pixel PNG
squares at each zoom level. Leaflet works out which squares your current view
needs, requests those URLs, and lays them out in a grid. Zooming in requests a
new, more detailed set. This is why the map needs an internet connection.

We use OpenStreetMap's own tile servers, which are free but run on donated
capacity. Their usage policy forbids heavy or commercial traffic. That is fine
for development and a campus-sized audience; if Babnav ever gets real load,
move to a tile host such as MapTiler, Stadia or Thunderforest, or self-host.
The attribution in the map corner is required and must not be removed.

## Adding Babcock to OpenStreetMap

If campus buildings are missing from the base map, you can add them yourself at
openstreetmap.org — create an account, use the iD editor, trace buildings from
satellite imagery. Edits appear in the tiles within days and benefit everyone,
Babnav included. Map only what you can verify.

## Running it

Open the `Babnav` folder in VS Code, right-click `index.html`, choose
**Open with Live Server**.

Opening the file directly from File Explorer mostly works now, but stop doing
it — Phase 7's geolocation requires a proper `http://` origin.

## Privacy

Babnav asks for location permission only when a feature needs it, and never
stores or transmits location data without consent. Map tile requests do reach
OpenStreetMap's servers, which is normal for any web map.


## Search (Phase 4)

`js/search.js` scores every place instead of just filtering, so results come
back best-first. Scores, high to low: exact name, name starts with the query,
a word in the name starts with it, initials (`buth` finds Babcock University
Teaching Hospital), name contains it, keyword starts with it, keyword contains
it, category name. Ties break toward the shorter name.

The matched part of the name is wrapped in `<mark>` so the user can see why a
result matched. Pressing Enter opens the top result.

## Directions (Phase 6)

Babnav does not compute routes. It asks OSRM (Open Source Routing Machine),
foot profile, hosted free by FOSSGIS at `routing.openstreetmap.de` — the same
service behind the Directions tab on openstreetmap.org. No API key, no cost,
but it expects light traffic: fine for a campus, not for a loop.

**The limitation that matters here.** OSRM can only route along paths that
exist in OpenStreetMap. If Babcock's internal walkways are not mapped, routes
will take a long way round on the roads that are mapped, or fail. When routing
fails Babnav draws a dashed straight line, labels it a straight line, and says
why. A straight line is not a walking route and the app never pretends it is.

If routes look wrong, the fix is usually to map the missing footpaths in
OpenStreetMap. That improves every map of the campus, not just this one.


## Location (Phase 7)

Babnav asks for location only when the **Where am I** button is pressed.
Nothing asks on page load. The position is held in a variable for that visit
and nothing else: not written to storage, not put in a URL, not sent to
OpenStreetMap, not sent to the routing service. Routing only ever receives
the two places you chose.

Pressing the button again clears the position and removes the dot.

The map shows a dot and a translucent circle. The circle is the device's own
accuracy estimate, and showing it is deliberate: a bare dot implies a
precision phones rarely have indoors.

Geolocation needs a secure context — https, or localhost. Opening index.html
straight from File Explorer gives a `file://` page where most browsers refuse
silently. Use Live Server. If permission is denied, Babnav says so once and
does not ask again; everything else keeps working.

## Saved places (Phase 9)

Stored in localStorage under `babnav.saved.v1`. That is per-browser, not
per-person: saving on your laptop does not save on your phone. Real syncing
needs accounts and a backend.

If localStorage is blocked — private windows, some enterprise policies —
saving still works for the session and Babnav says the list will not survive
a refresh, rather than failing silently.

Saved ids that no longer exist in `data.js` (usually after a fresh OSM
import) are pruned quietly on startup.

## Campus information (Phase 10)

`js/info.js` holds the sections. Every `body` field is empty because I have
never been to Babcock, and a navigation app that states the wrong opening
hours is worse than one that says nothing.

A section with no text and no linked category is hidden entirely. Sections
with a `category` automatically list every place of that category from
`data.js`, so those lists stay correct as the place data changes.

When you write a section, fill in `source` too — where the information came
from and when you checked it. Whoever maintains this next needs to know
whether it is still current.


## Editing places (tools/editor.html)

Babnav itself never asks anyone to sign in. Visitors and new students are the
main users, so the app stays open to everyone.

Editing is separate, and it happens on your own machine. `tools/editor.html`
reads the current `js/data.js`, gives you a form and a map, and produces a new
`data.js` for you to paste back. No server, no database, no login — because
there is nothing exposed to log in to.

1. Open `tools/editor.html` with Live Server (it reads `../js/data.js`, so it
   must run from inside the project folder).
2. Pick a place from the list, or press **Add a place**.
3. Click the map, or drag the marker, to set its position.
4. Fill in the name, category, description, keywords and hours.
5. Tick **I have checked this position myself** only when you really have.
6. Press **Generate data.js**, then **Copy** or **Download**.
7. Replace the whole contents of `js/data.js` with it, and refresh Babnav.

Your work is kept as a draft in the browser between sessions, so closing the
tab does not lose it. `js/data.js` on disk stays untouched until you paste an
export in — browsers cannot write to your file system, which is why the last
step is manual.

The Checks panel flags duplicate ids, missing names and missing positions
before you export, and counts how many places still lack a description or a
verified position.

### What this deliberately does not do

It does not let staff in an office edit Babnav. That needs a database, a
server and real authentication, and it is worth building only once the
university has committed to using this. The screens would be much the same;
the infrastructure would not.


## Installing on a phone (Phase 12)

Babnav is a Progressive Web App: a normal website that a phone can install to
the home screen and open without a browser bar, and that keeps working
offline.

Three pieces make that work.

**manifest.webmanifest** tells the phone what to call the app, which icon to
use, and to open it full screen rather than in a browser tab.

**sw.js**, the service worker, is a script the browser runs in the background.
Every network request passes through it, so it can answer from a cache. It
keeps two: the app's own files, cached on install and served cache-first, and
map tiles, cached as you look at them and capped at 400 so it cannot grow
forever. OpenStreetMap's usage policy allows normal caching but forbids bulk
downloading, so Babnav never pre-fetches tiles — only keeps ones you actually
viewed. Routing is never cached, because a stale route is a wrong route.

**js/pwa.js** registers the worker, offers "Add to home screen" when the
browser says it is possible, offers a Reload button when a new version is
waiting, and shows a bar when you go offline.

### What works with no signal

Opening the app, the full place list, search, categories, saved places, place
details, and any part of the map you have already looked at. What does not:
new map areas, and directions — routing needs the network, and Babnav says so
rather than inventing a route.

### After you change any cached file

Bump `CACHE_VERSION` in `sw.js`. Otherwise people keep the old copy and cannot
work out why your fix did nothing. This catches everyone once.

## Getting it onto your phone

**Right now, over WiFi.** In VS Code, set Live Server to accept outside
connections (Settings → search "liveServer host" → set to `0.0.0.0`), find
your laptop's IP with `ipconfig` in a terminal, and open
`http://192.168.x.x:5500` on your phone with both devices on the same network.

The catch: that is plain http, so **the locate button will not work and the
app cannot be installed**. Both need a secure context. Everything else — map,
search, details, directions between two places — works fine. Good enough to
check how it feels in the hand.

**Properly, with https.** Put it online and everything works, including
location and installing. Any of these are free:

- **GitHub Pages** — push the folder to a repository, Settings → Pages →
  deploy from `main`. You get `https://yourname.github.io/babnav/`.
- **Netlify Drop** — drag the folder onto app.netlify.com/drop. No account
  needed to start, live in seconds.
- **Vercel** or **Cloudflare Pages** — same idea, connect a repo.

All of them serve https automatically, which is the only part that matters
here. Once it is live, open it on your phone, and the browser will offer to
add it to your home screen.

Note that `tools/` is only for you. Do not link to it from the app. Anyone
finding those pages can edit their own copy of the data, which changes
nothing for anyone else, but there is no reason to advertise them.
