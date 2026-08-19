(() => {
  const ICON_GITHUB =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>';

  const FOOTER = `
    <div class="rs-footer">
      <div>
        <span class="rs-footer-brand">
          <img src="/logo.svg" alt="" width="22" height="22" />
          RedSpace
        </span>
        <p>
          The official TypeScript SDK for Cyberpunk 2077 multiplayer servers.
          Rust core, TypeScript resources, Night City at scale.
        </p>
      </div>
      <nav class="rs-footer-links" aria-label="Footer">
        <a href="/getting-started">Getting Started</a>
        <a href="/architecture">Architecture</a>
        <a href="/api">API Reference</a>
        <a href="/roadmap">Roadmap</a>
        <a href="/contributing">Contributing</a>
        <a href="https://github.com/redspaceMP/sdk" target="_blank" rel="noreferrer">${ICON_GITHUB} GitHub</a>
      </nav>
    </div>`;

  function inject() {
    if (!document.body) return;
    if (document.getElementById("rsm-footer")) return;
    const landing = document.querySelector(".rs-nav");
    if (landing) return;
    const main = document.getElementById("vocs-content");
    if (!main) return;
    const host = document.createElement("div");
    host.id = "rsm-footer";
    host.innerHTML = FOOTER;
    main.appendChild(host);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
