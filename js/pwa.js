/*
  pwa.js — installing, updating, and knowing you are offline (Phase 12)

  Three separate jobs, and they are easy to confuse:

    Registering    tells the browser about sw.js. Without this the service
                   worker never runs and nothing is cached.
    Installing     is the user adding Babnav to their home screen. The browser
                   decides when to offer it; we only get to ask once it does.
    Updating       is a NEW sw.js being found. The browser installs it in the
                   background and waits for every tab to close before using
                   it. We offer a Reload button so the user need not wait.

  None of this works over plain http, except on localhost. On a phone, that
  means the site has to be on https.
*/

const BabnavPWA = (function () {

  let deferredPrompt = null;   // the browser's install offer, saved for later
  let bar = null;

  /* ---------- A small bar at the bottom for all three messages ---------- */

  function showBar(message, actionText, onAction) {
    hideBar();

    bar = document.createElement("div");
    bar.className = "pwa-bar";
    bar.setAttribute("role", "status");

    const text = document.createElement("span");
    text.textContent = message;
    bar.appendChild(text);

    if (actionText) {
      const action = document.createElement("button");
      action.className = "pwa-bar__action";
      action.type = "button";
      action.textContent = actionText;
      action.addEventListener("click", function () {
        hideBar();
        onAction();
      });
      bar.appendChild(action);
    }

    const close = document.createElement("button");
    close.className = "pwa-bar__close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "\u00D7";
    close.addEventListener("click", hideBar);
    bar.appendChild(close);

    document.body.appendChild(bar);
  }

  function hideBar() {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    bar = null;
  }

  /* ---------- Registration ---------- */

  function register() {
    if (!("serviceWorker" in navigator)) return;

    // file:// pages cannot register a service worker, and saying so is more
    // use than failing silently during development.
    if (location.protocol === "file:") {
      console.info("[pwa] Offline support needs http(s). Use Live Server.");
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").then(function (registration) {

        // A new version was found while this page is open.
        registration.addEventListener("updatefound", function () {
          const waiting = registration.installing;
          if (!waiting) return;

          waiting.addEventListener("statechange", function () {
            const alreadyRunning = navigator.serviceWorker.controller;
            if (waiting.state === "installed" && alreadyRunning) {
              showBar("A new version of Babnav is ready.", "Reload", function () {
                waiting.postMessage("skip-waiting");
              });
            }
          });
        });

      }).catch(function (err) {
        console.warn("[pwa] service worker did not register:", err.message);
      });
    });

    // The new worker took over: reload once so the page matches it.
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  }

  /* ---------- Install prompt ---------- */

  function watchForInstall() {
    window.addEventListener("beforeinstallprompt", function (event) {
      // Chrome would show its own bar; we hold onto the event and offer it
      // at a moment that makes sense instead.
      event.preventDefault();
      deferredPrompt = event;

      showBar("Add Babnav to your home screen for offline use.", "Add",
        async function () {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
        });
    });

    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      hideBar();
    });
  }

  /* ---------- Offline awareness ---------- */

  function watchConnection() {
    window.addEventListener("offline", function () {
      showBar("You are offline. Saved places and search still work; new map " +
              "areas and directions will not.", null, null);
    });

    window.addEventListener("online", hideBar);
  }

  function installed() {
    return window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }

  function init() {
    register();
    watchForInstall();
    watchConnection();

    if (!navigator.onLine) {
      showBar("You are offline. Showing what was saved on this device.", null, null);
    }
  }

  return { init: init, installed: installed };
})();

BabnavPWA.init();
