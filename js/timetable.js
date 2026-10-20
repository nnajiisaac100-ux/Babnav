/*
  timetable.js - the Class tab. A class rep creates the class once and keeps the
  timetable up to date; classmates join with a code or link and just read it.
  Data lives in Supabase behind four functions (see supabase/schema.sql).
*/
const BabnavClass = (function () {
  const KEY = "babnav_class";
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let opts, panel, cls = null, saved = load(), showWeek = false, editing = null, notice = "", busy = false;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* private mode */ } }
  function ready() { return !!(BABNAV_BACKEND.url && BABNAV_BACKEND.anonKey); }
  function esc(s) { return escapeHtml(String(s == null ? "" : s)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function toMin(v) { const p = String(v).split(":"); return (+p[0]) * 60 + (+p[1]); }
  function today() { return (new Date().getDay() + 6) % 7 + 1; }

  function rpc(fn, args) {
    return fetch(BABNAV_BACKEND.url + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { apikey: BABNAV_BACKEND.anonKey, Authorization: "Bearer " + BABNAV_BACKEND.anonKey,
                 "Content-Type": "application/json" },
      body: JSON.stringify(args)
    }).then(function (r) {
      return r.text().then(function (t) {
        const body = t ? JSON.parse(t) : null;
        if (!r.ok) throw new Error((body && body.message) || "Something went wrong. Try again.");
        return body;
      });
    });
  }

  function refresh() {
    if (!ready() || !saved.code) { render(); return Promise.resolve(); }
    return rpc("get_class", { p_code: saved.code }).then(function (data) {
      if (!data) { notice = "That class code was not found."; saved = {}; persist(); cls = null; }
      else { cls = data; }
      render();
    }).catch(function (e) { notice = e.message; render(); });
  }

  /* ---------- Rendering ---------- */
  function slotRow(s, rep) {
    const place = s.place_id ? opts.getPlace(s.place_id) : null;
    const where = (place ? esc(place.name) : "Venue not set") + (s.room ? " \u00B7 " + esc(s.room) : "");
    const flag = s.status === "cancelled" ? '<span class="slot__flag slot__flag--x">Cancelled</span>'
               : s.status === "changed" ? '<span class="slot__flag">Changed</span>' : "";
    return '<div class="slot slot--' + s.status + '">' +
      '<div class="slot__time">' + fmt(s.start_min) + "<br><small>" + fmt(s.end_min) + "</small></div>" +
      '<div class="slot__main"><b>' + esc(s.course) + "</b> " + flag +
        (s.title ? '<div class="slot__title">' + esc(s.title) + "</div>" : "") +
        '<div class="slot__where">' + where + "</div>" +
        (s.note ? '<div class="slot__note">' + esc(s.note) + "</div>" : "") +
        '<div class="slot__acts">' +
          (place && s.status !== "cancelled" ? '<button data-c="dir" data-id="' + s.id + '">Directions</button>' : "") +
          (rep ? '<button data-c="edit" data-id="' + s.id + '">Edit</button>' +
                 '<button data-c="status" data-id="' + s.id + '" data-v="' + (s.status === "cancelled" ? "normal" : "cancelled") + '">' +
                   (s.status === "cancelled" ? "Restore" : "Cancel class") + "</button>" +
                 '<button data-c="del" data-id="' + s.id + '">Delete</button>' : "") +
        "</div></div></div>";
  }

  function leaveHint(slots) {
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    const next = slots.filter(function (s) { return s.status !== "cancelled" && s.start_min > nowMin; })[0];
    if (!next || !next.place_id) return "";
    const place = opts.getPlace(next.place_id), walk = place && opts.walkMinutes(place);
    if (!walk) return '<p class="cls__hint">Next: <b>' + esc(next.course) + "</b> at " + fmt(next.start_min) + ".</p>";
    const leave = next.start_min - walk - 5;
    return '<p class="cls__hint">Next: <b>' + esc(next.course) + "</b> at " + fmt(next.start_min) +
           ". About " + walk + " min walk, so leave by <b>" + fmt(Math.max(0, leave)) + "</b>.</p>";
  }

  function form(s) {
    s = s || { day: today(), start_min: 480, end_min: 600, status: "normal" };
    const venues = opts.venues().map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (p.id === s.place_id ? " selected" : "") + ">" + esc(p.name) + "</option>";
    }).join("");
    return '<div class="cls__form"><h4>' + (s.id ? "Edit class" : "Add a class") + "</h4>" +
      '<input id="cf-course" placeholder="Course code, e.g. CSC 301" value="' + esc(s.course) + '">' +
      '<input id="cf-title" placeholder="Course title (optional)" value="' + esc(s.title) + '">' +
      '<select id="cf-day">' + DAYS.map(function (d, i) {
        return '<option value="' + (i + 1) + '"' + (s.day === i + 1 ? " selected" : "") + ">" + d + "</option>";
      }).join("") + "</select>" +
      '<div class="cls__two"><label>Start <input id="cf-start" type="time" value="' + fmt(s.start_min) + '"></label>' +
      '<label>End <input id="cf-end" type="time" value="' + fmt(s.end_min) + '"></label></div>' +
      '<select id="cf-place"><option value="">Choose the building</option>' + venues + "</select>" +
      '<input id="cf-room" placeholder="Room, e.g. LT 2 (optional)" value="' + esc(s.room) + '">' +
      '<input id="cf-note" placeholder="Note, e.g. moved from Hall A (optional)" value="' + esc(s.note) + '">' +
      '<div class="cls__row"><button class="primary" data-c="save" data-id="' + esc(s.id || "") + '">Save</button>' +
      '<button class="secondary" data-c="cancel">Cancel</button></div></div>';
  }

  function render() {
    if (!panel) return;
    let h = notice ? '<p class="cls__notice">' + esc(notice) + "</p>" : "";

    if (!ready()) {
      panel.innerHTML = '<p class="empty">Class timetables are coming soon.</p>';
      return;
    }
    if (!saved.code || !cls) {
      panel.innerHTML = h +
        "<h3 class=\"cls__h\">Your class timetable</h3>" +
        '<p class="cls__p">Your class rep keeps it updated, so you never type it in.</p>' +
        '<div class="cls__form"><input id="cf-join" maxlength="8" placeholder="Class code" autocapitalize="characters">' +
        '<button class="primary" data-c="join">Join class</button></div>' +
        '<details class="cls__rep"><summary>I am a class rep</summary><div class="cls__form">' +
        '<input id="cf-name" placeholder="Class name, e.g. CSC 300L 2026/27">' +
        '<button class="secondary" data-c="create">Create class</button></div></details>';
      return;
    }

    const rep = !!saved.editCode, all = cls.slots || [], t = today();
    if (editing !== null) { panel.innerHTML = h + form(editing); return; }

    const list = showWeek ? all : all.filter(function (s) { return s.day === t; });
    h += '<div class="cls__head"><div><h3 class="cls__h">' + esc(cls.name) + '</h3><small>Code ' + esc(cls.code) +
         (rep ? " \u00B7 you are the rep" : "") + "</small></div>" +
         '<button class="secondary" data-c="share">Invite</button></div>' +
         '<div class="cls__row"><button class="' + (showWeek ? "secondary" : "primary") + '" data-c="today">Today</button>' +
         '<button class="' + (showWeek ? "primary" : "secondary") + '" data-c="week">Full week</button>' +
         (rep ? '<button class="secondary" data-c="add">+ Add class</button>' : "") + "</div>";
    if (!showWeek) h += leaveHint(list);

    if (list.length === 0) {
      h += '<p class="empty">' + (showWeek ? "No classes have been added yet." : "No classes today.") + "</p>";
    } else if (showWeek) {
      DAYS.forEach(function (d, i) {
        const day = list.filter(function (s) { return s.day === i + 1; });
        if (day.length) h += '<h4 class="cls__day">' + d + "</h4>" + day.map(function (s) { return slotRow(s, rep); }).join("");
      });
    } else {
      h += list.map(function (s) { return slotRow(s, rep); }).join("");
    }
    h += '<p class="cls__foot"><button class="linklike" data-c="leave">Leave this class</button></p>';
    panel.innerHTML = h;
  }

  /* ---------- Actions ---------- */
  function run(promise, after) {
    if (busy) return; busy = true; notice = "";
    promise.then(function (r) { busy = false; if (after) after(r); })
           .catch(function (e) { busy = false; notice = e.message; render(); });
  }
  function slotById(id) { return (cls.slots || []).filter(function (s) { return s.id === id; })[0]; }
  function readForm(id) {
    return {
      id: id || null, course: document.getElementById("cf-course").value.trim(),
      title: document.getElementById("cf-title").value.trim(),
      day: +document.getElementById("cf-day").value,
      start_min: toMin(document.getElementById("cf-start").value || "08:00"),
      end_min: toMin(document.getElementById("cf-end").value || "09:00"),
      place_id: document.getElementById("cf-place").value || null,
      room: document.getElementById("cf-room").value.trim(),
      note: document.getElementById("cf-note").value.trim()
    };
  }

  function onClick(e) {
    const b = e.target.closest("[data-c]"); if (!b) return;
    const c = b.dataset.c, id = b.dataset.id;
    if (c === "join") {
      const code = document.getElementById("cf-join").value.trim().toUpperCase();
      if (code) { saved = { code: code }; persist(); run(refresh()); }
    } else if (c === "create") {
      const name = document.getElementById("cf-name").value;
      run(rpc("create_class", { p_name: name }), function (r) {
        saved = { code: r.code, editCode: r.edit_code }; persist();
        notice = "Class created. Your EDIT CODE is " + r.edit_code + ". Write it down now, it cannot be recovered. " +
                 "Share the code " + r.code + " (or the Invite link) with classmates.";
        refresh();
      });
    } else if (c === "today" || c === "week") { showWeek = c === "week"; render();
    } else if (c === "add") { editing = { day: today(), start_min: 480, end_min: 600, status: "normal" }; render();
    } else if (c === "edit") { editing = slotById(id); render();
    } else if (c === "cancel") { editing = null; render();
    } else if (c === "save") {
      const slot = readForm(id);
      if (!slot.course) { notice = "Enter the course code."; render(); editing = slot; render(); return; }
      run(rpc("save_slot", { p_code: saved.code, p_edit: saved.editCode, p_slot: slot }), function () { editing = null; refresh(); });
    } else if (c === "status") {
      const s = slotById(id); s.status = b.dataset.v;
      run(rpc("save_slot", { p_code: saved.code, p_edit: saved.editCode, p_slot: s }), refresh);
    } else if (c === "del") {
      if (confirm("Delete this class from the timetable?"))
        run(rpc("delete_slot", { p_code: saved.code, p_edit: saved.editCode, p_id: id }), refresh);
    } else if (c === "dir") {
      const s = slotById(id); if (s && s.place_id) opts.openDirections(opts.getPlace(s.place_id));
    } else if (c === "share") {
      const url = location.origin + location.pathname + "?class=" + encodeURIComponent(saved.code);
      if (navigator.share) navigator.share({ title: cls.name, text: "Join " + cls.name + " on Babnav", url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { opts.toast("Invite link copied"); });
      else window.prompt("Copy this link:", url);
    } else if (c === "leave") {
      if (confirm("Leave this class on this phone?")) { saved = {}; persist(); cls = null; notice = ""; render(); }
    }
  }

  function init(options) {
    opts = options; panel = opts.panel;
    panel.addEventListener("click", onClick);
    render();
    if (saved.code) refresh();
  }
  function joinFromLink() {
    const code = new URLSearchParams(location.search).get("class");
    if (code && ready() && saved.code !== code.toUpperCase()) { saved = { code: code.toUpperCase() }; persist(); }
    return refresh();
  }
  return { init: init, refresh: refresh, joinFromLink: joinFromLink };
})();
