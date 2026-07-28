(() => {
  const STORAGE_KEY = "abody:deploy_version";
  const CHECK_INTERVAL = 5 * 60 * 1000;
  let latestVersion = null;
  let stopped = false;

  function removeBanner() {
    document.querySelector('[data-abody-update-banner="1"]')?.remove();
  }

  function showBanner(version) {
    if (document.querySelector('[data-abody-update-banner="1"]')) return;

    const button = document.createElement("button");
    button.dataset.abodyUpdateBanner = "1";
    button.type = "button";
    button.textContent = "⬆️ Atualização disponível — toque para recarregar";
    button.style.cssText = [
      "position:fixed",
      "top:max(10px, env(safe-area-inset-top))",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:10000",
      "background:#e8a23a",
      "color:#06140e",
      "border:none",
      "border-radius:24px",
      "padding:10px 18px",
      "font-family:inherit",
      "font-size:13px",
      "font-weight:800",
      "box-shadow:0 4px 16px rgba(0,0,0,.4)",
      "cursor:pointer",
      "max-width:calc(100vw - 24px)",
      "white-space:nowrap"
    ].join(";");

    button.addEventListener("click", async () => {
      try {
        localStorage.setItem(STORAGE_KEY, version);
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.update().catch(() => null)));
        }
      } catch {}

      const url = new URL(window.location.href);
      url.searchParams.set("update", Date.now().toString());
      window.location.replace(url.toString());
    });

    document.body.appendChild(button);
  }

  async function checkVersion() {
    try {
      const response = await fetch(`/api/version?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) return;

      const data = await response.json();
      const version = String(data?.version || "");
      if (!version || version === "local") return;
      latestVersion = version;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, version);
        return;
      }

      if (stored !== version) showBanner(version);
      else removeBanner();
    } catch {}
  }

  function start() {
    checkVersion();
    const interval = setInterval(() => {
      if (!stopped) checkVersion();
    }, CHECK_INTERVAL);

    const onVisibility = () => {
      if (!document.hidden) checkVersion();
    };
    const onOnline = () => checkVersion();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    window.addEventListener("beforeunload", () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
