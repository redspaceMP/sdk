(() => {
  const INDEX_URL = "search-index.json";
  const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";
  const WASM_PATH = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/";
  const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
  const TOP_N = 5;
  const ASK_N = 3;
  const LS_PROVIDER = "RedSpace.ai.provider";
  const LS_KEY = "RedSpace.ai.key";
  const LS_MODEL = "RedSpace.ai.model";

  const PROVIDERS = {
    anthropic: {
      label: "Anthropic",
      url: "https://api.anthropic.com/v1/messages",
      defaultModel: "claude-sonnet-4-20250514",
      headers(key) {
        return {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        };
      },
      body(model, system, user) {
        return {
          model,
          max_tokens: 2048,
          system,
          messages: [{ role: "user", content: user }],
          stream: true,
        };
      },
      parseDelta(json) {
        if (json.type === "content_block_delta" && json.delta && json.delta.text) {
          return json.delta.text;
        }
        return null;
      },
    },
    openai: {
      label: "OpenAI",
      url: "https://api.openai.com/v1/chat/completions",
      defaultModel: "gpt-4o-mini",
      headers(key) {
        return {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        };
      },
      body(model, system, user) {
        return {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: true,
        };
      },
      parseDelta(json) {
        const choice = json.choices?.[0];
        return choice?.delta?.content ? choice.delta.content : null;
      },
    },
    deepseek: {
      label: "DeepSeek",
      url: "https://api.deepseek.com/chat/completions",
      defaultModel: "deepseek-chat",
      headers(key) {
        return {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        };
      },
      body(model, system, user) {
        return {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: true,
        };
      },
      parseDelta(json) {
        const choice = json.choices?.[0];
        return choice?.delta?.content ? choice.delta.content : null;
      },
    },
  };

  const state = {
    index: null,
    embedder: null,
    results: [],
    active: -1,
    askAbort: null,
  };

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );

  const css = `
.rsm-search-host{position:fixed;bottom:18px;right:18px;z-index:1200;font-family:var(--vocs-font-family,ui-sans-serif,system-ui,sans-serif)}
.rsm-search-toggle{align-items:center;border:1px solid var(--vocs-color-gray6,var(--vocs-border-color-secondary));border-radius:999px;box-shadow:0 8px 24px rgb(0 0 0 / .35);color:var(--vocs-color-text-primary,#fff);background:var(--vocs-color-background2,var(--vocs-color-gray3,#26282d));cursor:pointer;display:flex;gap:8px;padding:10px 16px;transition:filter .15s ease,transform .1s ease}
.rsm-search-toggle:hover{filter:brightness(1.12)}
.rsm-search-toggle:active{transform:scale(.98)}
.rsm-search-kbd{background:var(--vocs-color-gray5,#333);border:1px solid var(--vocs-color-gray6);border-radius:5px;color:var(--vocs-color-text-secondary,#c9ccd2);font-size:11px;padding:2px 6px}
.rsm-modal{background:var(--vocs-color-background,var(--vocs-color-gray2,#1f2124));border:1px solid var(--vocs-color-gray6,var(--vocs-border-color-secondary));border-radius:14px;box-shadow:0 24px 80px rgb(0 0 0 / .55);display:flex;flex-direction:column;max-height:min(640px,82vh);overflow:hidden;position:fixed;right:18px;bottom:74px;top:auto;width:min(560px,calc(100vw - 36px));z-index:1200}
.rsm-tabs{border-bottom:1px solid var(--vocs-color-gray6);display:flex;padding:6px 6px 0}
.rsm-tab{background:transparent;border:0;border-radius:8px 8px 0 0;color:var(--vocs-color-text-secondary,#c9ccd2);cursor:pointer;flex:1;font:inherit;font-size:13px;padding:10px 12px;transition:background .15s ease,color .15s ease}
.rsm-tab[aria-selected="true"]{background:var(--vocs-color-gray4,#2a2d33);color:var(--vocs-color-text-primary,#fff)}
.rsm-input-row{display:flex;gap:8px;padding:10px 12px}
.rsm-input{background:var(--vocs-color-gray3,#26282d);border:1px solid var(--vocs-color-gray6);border-radius:9px;color:var(--vocs-color-text-primary,#fff);flex:1;font:inherit;font-size:14px;outline:none;padding:10px 12px;transition:border-color .15s ease}
.rsm-input:focus{border-color:var(--vocs-color-accent)}
.rsm-input::placeholder{color:var(--vocs-color-text-muted,#8b8f98)}
.rsm-btn{background:var(--vocs-color-accent);border:0;border-radius:9px;color:#fff;cursor:pointer;font:inherit;font-size:14px;font-weight:600;padding:10px 16px;transition:filter .15s ease}
.rsm-btn:hover{filter:brightness(1.1)}
.rsm-btn:disabled{opacity:.5;cursor:not-allowed}
.rsm-body{overflow-y:auto;padding:6px 12px 14px}
.rsm-status{color:var(--vocs-color-text-muted,#8b8f98);font-size:12px;padding:10px 4px}
.rsm-empty{align-items:center;color:var(--vocs-color-text-muted,#8b8f98);display:flex;flex-direction:column;gap:8px;justify-content:center;min-height:120px;text-align:center}
.rsm-empty svg{opacity:.5}
.rsm-results{display:flex;flex-direction:column;gap:4px}
.rsm-result{border:1px solid transparent;border-radius:10px;color:var(--vocs-color-text-primary,#fff);display:block;padding:10px 12px;text-decoration:none;transition:background .12s ease,border-color .12s ease}
.rsm-result:hover,.rsm-result[data-active="true"]{background:var(--vocs-color-gray4,#2a2d33);border-color:var(--vocs-color-gray6)}
.rsm-result-title{font-size:14px;font-weight:600;margin-bottom:3px}
.rsm-result-crumb{color:var(--vocs-color-accent);font-size:11px;margin-bottom:5px}
.rsm-result-snippet{color:var(--vocs-color-text-secondary,#c9ccd2);font-size:12.5px;line-height:1.5}
.rsm-result-snippet mark{background:color-mix(in srgb,var(--vocs-color-accent) 28%,transparent);border-radius:3px;color:var(--vocs-color-text-primary,#fff);padding:0 2px}
.rsm-settings{display:flex;flex-wrap:wrap;gap:8px;padding:0 12px 4px}
.rsm-settings select,.rsm-settings input{background:var(--vocs-color-gray3,#26282d);border:1px solid var(--vocs-color-gray6);border-radius:8px;color:var(--vocs-color-text-primary,#fff);font:inherit;font-size:12.5px;padding:7px 10px;outline:none}
.rsm-settings input[type="password"]{flex:1;min-width:150px}
.rsm-ask-note{color:var(--vocs-color-text-muted,#8b8f98);font-size:11.5px;line-height:1.5;padding:2px 12px 8px}
.rsm-answer{font-size:13.5px;line-height:1.7}
.rsm-answer p{margin:0 0 10px}
.rsm-answer pre{background:var(--vocs-color-background2);border:1px solid var(--vocs-color-gray6);border-radius:8px;overflow-x:auto;padding:10px}
.rsm-answer code{background:var(--vocs-color-background2);border-radius:4px;font-size:12.5px;padding:1px 4px}
.rsm-sources{border-top:1px solid var(--vocs-color-gray6);font-size:12px;margin-top:12px;padding-top:10px}
.rsm-sources b{color:var(--vocs-color-text-muted,#8b8f98);display:block;font-weight:600;margin-bottom:4px}
.rsm-sources a{color:var(--vocs-color-accent);display:block;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsm-error{background:color-mix(in srgb,var(--vocs-color-red) 12%,transparent);border:1px solid color-mix(in srgb,var(--vocs-color-red) 40%,transparent);border-radius:9px;color:var(--vocs-color-text-primary,#fff);font-size:12.5px;line-height:1.5;margin-top:10px;padding:10px 12px}
.rsm-spinner{align-items:center;display:flex;gap:8px;justify-content:center;padding:24px 0}
.rsm-spinner-dot{animation:rsm-bounce 1s infinite ease-in-out;background:var(--vocs-color-accent);border-radius:50%;height:8px;width:8px}
.rsm-spinner-dot:nth-child(2){animation-delay:.12s}
.rsm-spinner-dot:nth-child(3){animation-delay:.24s}
@keyframes rsm-bounce{0%,80%,100%{transform:translateY(0);opacity:.6}40%{transform:translateY(-6px);opacity:1}}
.rsm-panel[hidden]{display:none}
@media (prefers-reduced-motion: reduce){.rsm-modal,.rsm-toggle{animation:none!important}}
`;

  function injectStyle() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function baseUrl() {
    const base = document.querySelector("base");
    let href = base?.href ? new URL(base.href, location.origin).toString() : location.origin;
    if (!href.endsWith("/")) href += "/";
    return href;
  }

  function indexUrl() {
    return new URL(INDEX_URL, baseUrl()).toString();
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\p{L}\u0400-\u04ff]+/gu, "-")
      .replace(/^-+|-+$/g, "");
  }

  function highlight(text, terms) {
    let out = esc(text);
    for (const term of terms) {
      if (term.length < 2) continue;
      out = out.replace(
        new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
        "<mark>$1</mark>",
      );
    }
    return out;
  }

  function snippetFor(chunk, query) {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    const hay = chunk.text;
    let index = -1;
    for (const term of terms) {
      const at = hay.toLowerCase().indexOf(term);
      if (at !== -1 && (index === -1 || at < index)) index = at;
    }
    if (index === -1) index = 0;
    const start = Math.max(0, index - 80);
    const end = Math.min(hay.length, index + 180);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < hay.length ? "…" : "";
    return `${prefix}${highlight(hay.slice(start, end), terms)}${suffix}`;
  }

  function cosine(a, b) {
    let dot = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) dot += a[i] * b[i];
    return dot;
  }

  function bigramTerms(text) {
    const words = text
      .toLowerCase()
      .split(/[^a-zа-яё0-9]+/)
      .filter((w) => w.length > 1);
    const out = new Set();
    for (let i = 0; i < words.length; i++) {
      out.add(words[i]);
      if (i < words.length - 1) out.add(`${words[i]} ${words[i + 1]}`);
    }
    return out;
  }

  function keywordScore(queryTerms, chunk, idf) {
    let score = 0;
    for (const term of queryTerms) {
      if (chunk.tokens.includes(term)) score += idf[term] ?? 1;
    }
    return score;
  }

  async function loadIndex() {
    if (state.index) return state.index;
    const res = await fetch(indexUrl(), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`search index unavailable (HTTP ${res.status})`);
    state.index = await res.json();
    return state.index;
  }

  async function loadEmbedder() {
    if (state.embedder) return state.embedder;
    const { pipeline, env } = await import(TRANSFORMERS_URL);
    env.allowLocalModels = false;
    env.backends.onnx.wasm.wasmPaths = WASM_PATH;
    state.embedder = await pipeline("feature-extraction", EMBED_MODEL);
    return state.embedder;
  }

  async function embedQuery(text) {
    const embedder = await loadEmbedder();
    const out = await embedder(text, { pooling: "mean", normalize: true });
    const data = typeof out.tolist === "function" ? out.tolist() : out;
    return Array.isArray(data[0]) ? data[0] : Array.from(out.data ?? []);
  }

  async function retrieve(query, limit) {
    const index = await loadIndex();
    const terms = [...bigramTerms(query)];
    if (index.mode === "semantic" && index.chunks.some((c) => c.embedding)) {
      try {
        const q = await embedQuery(query);
        return index.chunks
          .map((chunk) => ({ chunk, score: cosine(q, chunk.embedding) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      } catch {
        // fall through to keyword scoring when embedding fails (e.g. offline)
      }
    }
    return index.chunks
      .map((chunk) => ({ chunk, score: keywordScore(terms, chunk, index.idf ?? {}) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function renderResults(results, query) {
    const body = el(".rsm-body");
    if (!results.length) {
      body.innerHTML = `<div class="rsm-empty">${magnifierIcon()}<div>No results for “${esc(query)}”. Try a broader phrase.</div></div>`;
      state.results = [];
      return;
    }
    state.results = results;
    state.active = -1;
    body.innerHTML = `<div class="rsm-results">${results
      .map((r, i) => {
        const chunk = r.chunk;
        const crumb = [chunk.title, chunk.heading].filter(Boolean).join(" · ");
        return `<a class="rsm-result" href="${esc(linkFor(chunk))}" data-index="${i}" data-active="false">
          <div class="rsm-result-title">${esc(chunk.heading || chunk.title)}</div>
          <div class="rsm-result-crumb">${esc(crumb)}${chunk.lang === "ru" ? " · RU" : ""}</div>
          <div class="rsm-result-snippet">${snippetFor(chunk, query)}</div>
        </a>`;
      })
      .join("")}</div>`;
  }

  function linkFor(chunk) {
    const anchor = chunk.heading ? `#${slugify(chunk.heading)}` : "";
    return `${chunk.url}${anchor}`;
  }

  function magnifierIcon() {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`;
  }

  function openModal() {
    document.getElementById("rsm-modal").hidden = false;
    const input = document.getElementById("rsm-search-input");
    input.focus();
    input.select();
    document.addEventListener("keydown", onKeydown, true);
  }

  function closeModal() {
    document.getElementById("rsm-modal").hidden = true;
    document.removeEventListener("keydown", onKeydown, true);
    if (state.askAbort) state.askAbort.abort();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    const results = [...document.querySelectorAll(".rsm-result")];
    if (!results.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      state.active += e.key === "ArrowDown" ? 1 : -1;
      state.active = (state.active + results.length) % results.length;
      for (let i = 0; i < results.length; i++) {
        results[i].setAttribute("data-active", String(i === state.active));
      }
      results[state.active].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (state.active >= 0) results[state.active].click();
    }
  }

  function debounce(fn, ms) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  async function runSearch(query) {
    const status = el(".rsm-status");
    const body = el(".rsm-body");
    if (!query.trim()) {
      body.innerHTML = `<div class="rsm-empty">${magnifierIcon()}<div>Type to search the docs — or use Ask AI for answers.</div></div>`;
      return;
    }
    status.hidden = false;
    status.textContent = "Searching…";
    body.innerHTML = "";
    try {
      const hits = await retrieve(query, TOP_N);
      status.hidden = true;
      renderResults(hits, query);
    } catch (err) {
      status.hidden = true;
      body.innerHTML = `<div class="rsm-error">Search is unavailable: ${esc(err.message)}</div>`;
    }
  }

  const runSearchDebounced = debounce(runSearch, 200);

  function stored(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }

  function currentProvider() {
    const provider = stored(LS_PROVIDER, "anthropic");
    return PROVIDERS[provider] ? provider : "anthropic";
  }

  function readKey() {
    return (document.getElementById("rsm-ask-key").value || "").trim();
  }

  function syncKeyInput() {
    const input = document.getElementById("rsm-ask-key");
    if (!input.value) input.value = stored(LS_KEY, "");
  }

  function buildPrompt(question, hits) {
    const excerpts = hits
      .map(
        (r, i) =>
          `[${i + 1}] ${r.chunk.title}${r.chunk.heading ? ` — ${r.chunk.heading}` : ""} (${linkFor(r.chunk)}):\n${r.chunk.text}`,
      )
      .join("\n\n");
    const system =
      "You are a concise technical assistant for the RedSpace SDK documentation. " +
      "Answer the user's question using ONLY the documentation excerpts provided below. " +
      "Reference excerpts inline as [1], [2], [3] right after the facts they support. " +
      "If the excerpts do not contain the answer, say so clearly and point to the docs site instead of guessing.";
    const user = `Question: ${question}\n\nDocumentation excerpts:\n${excerpts}`;
    return { system, user };
  }

  async function streamAsk(provider, model, system, user, onToken, signal) {
    const p = PROVIDERS[provider];
    const res = await fetch(p.url, {
      method: "POST",
      headers: p.headers(readKey()),
      body: JSON.stringify(p.body(model, system, user)),
      signal,
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        detail = data.error?.message || data.message || detail;
      } catch {
        // keep status detail
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Invalid or missing API key (${detail}).`);
      }
      throw new Error(`Provider returned ${detail}.`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        if (json.error) {
          throw new Error(json.error.message || "provider error");
        }
        const delta = p.parseDelta(json);
        if (delta) onToken(delta);
      }
    }
  }

  async function ask(question) {
    const body = el(".rsm-body");
    const provider = currentProvider();
    const key = readKey();
    if (!key) {
      body.innerHTML = `<div class="rsm-error">Add your ${PROVIDERS[provider].label} API key above to enable Ask&nbsp;AI. The key is stored only in your browser (localStorage) and never leaves it.</div>`;
      return;
    }
    const modelInput = document.getElementById("rsm-ask-model");
    const model = (modelInput.value || "").trim() || PROVIDERS[provider].defaultModel;

    setStored(LS_PROVIDER, provider);
    setStored(LS_KEY, key);
    setStored(LS_MODEL, model);

    body.innerHTML = `<div class="rsm-spinner"><span class="rsm-spinner-dot"></span><span class="rsm-spinner-dot"></span><span class="rsm-spinner-dot"></span></div><div class="rsm-status">Finding relevant docs…</div>`;
    try {
      const hits = await retrieve(question, ASK_N);
      if (!hits.length) {
        body.innerHTML = `<div class="rsm-error">No documentation matched your question. Try rephrasing or use Search.</div>`;
        return;
      }
      const { system, user } = buildPrompt(question, hits);
      const abort = new AbortController();
      state.askAbort = abort;
      body.innerHTML = `<div class="rsm-answer"></div><div class="rsm-status">Streaming…</div>`;
      const answer = body.querySelector(".rsm-answer");
      const status = body.querySelector(".rsm-status");
      const onToken = (delta) => {
        if (!status.hidden) status.hidden = true;
        answer.textContent += delta;
      };
      try {
        await streamAsk(provider, model, system, user, onToken, abort.signal);
      } catch (err) {
        answer.innerHTML += `<div class="rsm-error">${esc(err.message)}</div>`;
      }
      if (answer.textContent) {
        const sources = hits
          .map(
            (r) =>
              `<a href="${esc(linkFor(r.chunk))}">${esc(r.chunk.title)}${r.chunk.heading ? ` — ${esc(r.chunk.heading)}` : ""}</a>`,
          )
          .join("");
        answer.insertAdjacentHTML(
          "beforeend",
          `<div class="rsm-sources"><b>Sources</b>${sources}</div>`,
        );
      }
    } catch (err) {
      const hint =
        provider === "anthropic"
          ? ""
          : " Note: OpenAI/DeepSeek block direct browser calls (CORS) — Anthropic supports browser access, or proxy the request server-side.";
      body.innerHTML = `<div class="rsm-error">${esc(err.message)}${hint}</div>`;
    }
  }

  function el(selector) {
    return document.querySelector(`#rsm-modal ${selector}`);
  }

  function buildDom() {
    const host = document.createElement("div");
    host.className = "rsm-search-host";
    host.innerHTML = `
      <button type="button" class="rsm-search-toggle" id="rsm-open" aria-label="Search docs (Ctrl+K)">
        ${magnifierIcon()}
        <span>Search docs</span>
        <span class="rsm-search-kbd">Ctrl K</span>
      </button>
      <div class="rsm-modal" id="rsm-modal" role="dialog" aria-modal="true" aria-label="Docs search" hidden>
        <div class="rsm-tabs" role="tablist">
          <button type="button" class="rsm-tab" id="rsm-tab-search" role="tab" aria-selected="true">Search</button>
          <button type="button" class="rsm-tab" id="rsm-tab-ask" role="tab" aria-selected="false">Ask AI</button>
        </div>
        <div class="rsm-panel" id="rsm-panel-search">
          <div class="rsm-input-row">
            <input type="search" class="rsm-input" id="rsm-search-input" placeholder="Search the RedSpace docs… (e.g. “createContainer”, “playerJoin”)" autocomplete="off" />
          </div>
          <div class="rsm-body">
            <div class="rsm-empty">${magnifierIcon()}<div>Type to search the docs — or use Ask AI for answers.</div></div>
          </div>
          <div class="rsm-status" hidden>Searching…</div>
        </div>
        <div class="rsm-panel" id="rsm-panel-ask" hidden>
          <div class="rsm-input-row">
            <input type="text" class="rsm-input" id="rsm-ask-input" placeholder="Ask a question about the SDK…" autocomplete="off" />
            <button type="button" class="rsm-btn" id="rsm-ask-go">Ask</button>
          </div>
          <div class="rsm-settings">
            <select id="rsm-ask-provider" aria-label="AI provider">
              ${Object.entries(PROVIDERS)
                .map(([id, p]) => `<option value="${id}">${p.label}</option>`)
                .join("")}
            </select>
            <input type="text" id="rsm-ask-model" placeholder="model (optional)" aria-label="Model" />
            <input type="password" id="rsm-ask-key" placeholder="API key (localStorage only)" autocomplete="off" aria-label="API key" />
          </div>
          <div class="rsm-ask-note">Your key is saved only in this browser and sent straight to the provider. No key means no answers — Anthropic works in-browser; OpenAI/DeepSeek may be blocked by CORS.</div>
          <div class="rsm-body"></div>
        </div>
      </div>`;
    document.body.appendChild(host);

    const searchInput = document.getElementById("rsm-search-input");
    searchInput.addEventListener("input", () => {
      const q = searchInput.value;
      if (!q.trim()) {
        el(".rsm-body").innerHTML =
          `<div class="rsm-empty">${magnifierIcon()}<div>Type to search the docs — or use Ask AI for answers.</div></div>`;
        return;
      }
      runSearchDebounced(q);
    });

    document.getElementById("rsm-open").addEventListener("click", openModal);
    document.getElementById("rsm-modal").addEventListener("click", (e) => {
      if (e.target.id === "rsm-modal") return; // only backdrop if styling warrants
    });

    const tabSearch = document.getElementById("rsm-tab-search");
    const tabAsk = document.getElementById("rsm-tab-ask");
    const panelSearch = document.getElementById("rsm-panel-search");
    const panelAsk = document.getElementById("rsm-panel-ask");
    const activate = (which) => {
      const search = which === "search";
      tabSearch.setAttribute("aria-selected", String(search));
      tabAsk.setAttribute("aria-selected", String(!search));
      panelSearch.hidden = !search;
      panelAsk.hidden = search;
      if (search) searchInput.focus();
      else {
        syncKeyInput();
        document.getElementById("rsm-ask-provider").value = currentProvider();
        const model = document.getElementById("rsm-ask-model");
        if (!model.value) model.value = stored(LS_MODEL, PROVIDERS[currentProvider()].defaultModel);
        document.getElementById("rsm-ask-input").focus();
      }
    };
    tabSearch.addEventListener("click", () => activate("search"));
    tabAsk.addEventListener("click", () => activate("ask"));

    document.getElementById("rsm-ask-provider").addEventListener("change", (e) => {
      const provider = e.target.value;
      const model = document.getElementById("rsm-ask-model");
      if (!model.value || model.value === PROVIDERS[currentProvider()].defaultModel) {
        model.value = PROVIDERS[provider].defaultModel;
      }
    });

    const askGo = document.getElementById("rsm-ask-go");
    const askInput = document.getElementById("rsm-ask-input");
    const doAsk = () => {
      const q = askInput.value.trim();
      if (q) ask(q);
    };
    askGo.addEventListener("click", doAsk);
    askInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doAsk();
    });
  }

  function init() {
    if (!document.body || typeof localStorage === "undefined") return;
    injectStyle();
    buildDom();

    window.addEventListener(
      "keydown",
      (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          e.stopPropagation();
          const modal = document.getElementById("rsm-modal");
          if (modal.hidden) openModal();
          else closeModal();
        }
      },
      true,
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
