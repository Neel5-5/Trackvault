(function () {
  var endpoint = document.currentScript
    ? new URL(document.currentScript.src).origin + "/event"
    : window.__POCKETTRACK_ENDPOINT__ || "/event";

  function uid() {
    var key = "pt_sid";
    var id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function send(path) {
    var payload = {
      path: path || location.pathname,
      referrer: document.referrer || "",
      ua: navigator.userAgent,
      w: screen.width,
      h: screen.height,
      sid: uid(),
      ts: Date.now(),
    };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  }

  send();

  // SPA support
  var _push = history.pushState;
  history.pushState = function () {
    _push.apply(history, arguments);
    send(location.pathname);
  };
  window.addEventListener("popstate", function () { send(location.pathname); });
})();
