/*
  voice.js - voice search and spoken directions, using the browser's own
  speech features (no keys, no server of ours).
  Speech recognition in Chrome sends the audio to the browser maker's service,
  so it needs a connection. Nothing is stored by Babnav.
*/
const BabnavVoice = (function () {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let listening = false;

  function canListen() { return !!Recognition && window.isSecureContext; }
  function canSpeak() { return "speechSynthesis" in window; }

  function listen(handlers) {
    if (!Recognition) { handlers.onError("Voice search is not supported in this browser."); return; }
    if (!window.isSecureContext) { handlers.onError("Voice search needs https or localhost."); return; }
    if (listening && recognizer) { recognizer.stop(); return; }

    recognizer = new Recognition();
    recognizer.lang = "en-NG";
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.onstart = function () { listening = true; handlers.onStart(); };
    recognizer.onresult = function (e) {
      let text = "", final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      handlers.onText(text.trim(), final);
    };
    recognizer.onerror = function (e) {
      listening = false;
      const msg = e.error === "not-allowed" ? "Microphone permission was denied."
        : e.error === "no-speech" ? "I did not hear anything. Try again."
        : e.error === "network" ? "Voice search needs an internet connection."
        : "Voice search stopped.";
      handlers.onError(msg);
    };
    recognizer.onend = function () { listening = false; handlers.onEnd(); };
    recognizer.start();
  }

  let speaking = false;
  function speak(lines, onDone) {
    if (!canSpeak()) return false;
    window.speechSynthesis.cancel();
    speaking = true;
    lines.forEach(function (line, i) {
      const u = new SpeechSynthesisUtterance(line);
      u.lang = "en-NG";
      u.rate = 0.95;
      if (i === lines.length - 1) {
        u.onend = u.onerror = function () { speaking = false; if (onDone) onDone(); };
      }
      window.speechSynthesis.speak(u);
    });
    return true;
  }
  function stop() {
    if (canSpeak()) window.speechSynthesis.cancel();
    speaking = false;
  }

  return {
    canListen: canListen, canSpeak: canSpeak, listen: listen,
    speak: speak, stop: stop, isSpeaking: function () { return speaking; }
  };
})();
