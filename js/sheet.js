/*
  sheet.js — the draggable bottom sheet

  This is the only genuinely tricky part of the map-first layout, so it lives
  in its own file.

  How it works:
    - The sheet's height is driven by one CSS variable, --sheet-h.
    - Three snap heights: peek (just the header), half, and full.
    - While you drag, we write the live height to --sheet-h with no transition.
    - When you let go, we turn the transition back on and snap to whichever
      point is nearest, biased by how fast you were flicking.

  Why a CSS variable instead of setting sheet.style.height directly: the map
  tools, the attribution stamp and the Leaflet zoom buttons all sit above the
  sheet, and they follow the same variable. One value moves four things.
*/

const BabnavSheet = (function () {

  const sheet = document.getElementById("sheet");
  const grip = document.getElementById("sheet-grip");
  const body = document.getElementById("sheet-body");
  const root = document.documentElement;

  const PEEK = 210;             // matches --sheet-peek in style.css
  let snaps = [];               // [peek, half, full] in pixels
  let current = PEEK;
  let dragging = false;
  let startY = 0;
  let startHeight = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocity = 0;
  let onResize = function () {};

  // Above this width the sheet is a fixed side panel, so dragging is off.
  function isPanel() {
    return window.matchMedia("(min-width: 961px)").matches;
  }

  function computeSnaps() {
    const h = window.innerHeight;
    snaps = [PEEK, Math.round(h * 0.55), Math.round(h - 76)];
  }

  function setHeight(px, animate) {
    const min = snaps[0];
    const max = snaps[snaps.length - 1];
    current = Math.max(min, Math.min(max, px));

    sheet.classList.toggle("is-animating", !!animate);
    root.style.setProperty("--sheet-h", current + "px");

    grip.setAttribute("aria-expanded", String(current > snaps[0] + 10));

    // Only the fully open sheet scrolls its own content.
    body.style.overflowY = current > snaps[0] + 10 ? "auto" : "hidden";

    if (animate) {
      setTimeout(function () { onResize(current); }, 240);
    } else {
      onResize(current);
    }
  }

  function nearestSnap(px, vel) {
    // A fast flick jumps a whole step instead of snapping back.
    if (Math.abs(vel) > 0.6) {
      const dir = vel > 0 ? 1 : -1;   // positive velocity = growing
      let index = snaps.indexOf(nearestSnap(px, 0));
      index = Math.max(0, Math.min(snaps.length - 1, index + dir));
      return snaps[index];
    }

    return snaps.reduce(function (best, snap) {
      return Math.abs(snap - px) < Math.abs(best - px) ? snap : best;
    }, snaps[0]);
  }

  /* ---------- Drag handling ---------- */

  function onPointerDown(event) {
    if (isPanel()) return;
    dragging = true;
    startY = lastY = event.clientY;
    startHeight = current;
    lastTime = Date.now();
    velocity = 0;
    grip.setPointerCapture(event.pointerId);
    sheet.classList.remove("is-animating");
  }

  function onPointerMove(event) {
    if (!dragging) return;

    const now = Date.now();
    const dt = Math.max(1, now - lastTime);
    velocity = (lastY - event.clientY) / dt;   // px per ms, up is positive
    lastY = event.clientY;
    lastTime = now;

    setHeight(startHeight + (startY - event.clientY), false);
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    try { grip.releasePointerCapture(event.pointerId); } catch (e) { /* already gone */ }
    setHeight(nearestSnap(current, velocity), true);
  }

  /* ---------- Public API ---------- */

  function init(options) {
    onResize = (options && options.onResize) || onResize;

    computeSnaps();
    setHeight(PEEK, false);

    grip.addEventListener("pointerdown", onPointerDown);
    grip.addEventListener("pointermove", onPointerMove);
    grip.addEventListener("pointerup", onPointerUp);
    grip.addEventListener("pointercancel", onPointerUp);

    // Tapping the grip toggles between peek and half.
    grip.addEventListener("click", function () {
      if (isPanel()) return;
      if (Math.abs(startY - lastY) > 6) return;   // that was a drag, not a tap
      setHeight(current > snaps[0] + 10 ? snaps[0] : snaps[1], true);
    });

    // Keyboard users get the same toggle.
    grip.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setHeight(current > snaps[0] + 10 ? snaps[0] : snaps[1], true);
    });

    window.addEventListener("resize", function () {
      computeSnaps();
      setHeight(nearestSnap(current, 0), false);
    });
  }

  function peek() { if (!isPanel()) setHeight(snaps[0], true); }
  function half() { if (!isPanel()) setHeight(snaps[1], true); }
  function full() { if (!isPanel()) setHeight(snaps[2], true); }

  // How much of the map the sheet is covering right now. The map uses this
  // to keep a selected pin above the sheet instead of behind it.
  function coverage() { return isPanel() ? 0 : current; }

  return {
    init: init,
    peek: peek,
    half: half,
    full: full,
    coverage: coverage,
    isPanel: isPanel
  };
})();
