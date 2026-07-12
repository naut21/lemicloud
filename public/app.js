(() => {
  "use strict";

  let files = [];
  let activeFilter = "all";

  const $ = (id) => document.getElementById(id);
  const els = {
    themeBtn: $("theme-toggle"),
    drop: $("drop"),
    fileInput: $("file-input"),
    urlForm: $("url-form"),
    urlInput: $("url-input"),
    uploadsActive: $("uploads-active"),
    fileList: $("file-list"),
    gallery: $("gallery"),
    statFiles: $("stat-files"),
    copyAll: $("copy-all"),
    filters: $("gallery-filters"),
    toast: $("toast"),
    lightbox: $("lightbox"),
    lightboxContent: $("lightbox-content"),
    lightboxMeta: $("lightbox-meta"),
    lightboxClose: $("lightbox-close"),
    tabs: document.querySelectorAll(".tab"),
    screens: document.querySelectorAll(".screen"),
  };

  function initTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  }
  els.themeBtn.addEventListener("click", toggleTheme);

  let toastTimer = null;
  function toast(msg, kind = "ok") {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.className = `toast is-show toast--${kind}`;
    toastTimer = setTimeout(() => { els.toast.className = "toast"; }, 2400);
  }

  function fmtSize(n) {
    if (!n) return "0 B";
    const u = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(n) / Math.log(1024));
    return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) +
           " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  function fileKind(f) {
    const ext = (f.extension || "").toLowerCase();
    if (["jpg","jpeg","png","gif","webp","bmp","avif","svg"].includes(ext)) return "image";
    if (["mp4","webm","mov","mkv","avi","m4v"].includes(ext)) return "video";
    if (["mp3","wav","ogg","flac","m4a","aac"].includes(ext)) return "audio";
    if (ext === "pdf") return "pdf";
    if (["txt","md","json","csv","html","css","js","xml","yml","yaml"].includes(ext)) return "text";
    return "other";
  }

  function fileUrl(f) {
    return `${location.origin}/p/${f.id}`;
  }

  async function apiGet(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  async function apiDelete(path) {
    const r = await fetch(path, { method: "DELETE" });
    return r.json();
  }

  function renderStats() {
    els.statFiles.textContent = files.length;
  }

  function renderFileList() {
    if (!files.length) {
      els.fileList.innerHTML = `<li class="file-list__empty">sin archivos todavía</li>`;
      return;
    }
    els.fileList.innerHTML = files.map(f => {
      const kind = fileKind(f);
      const ext = (f.extension || "?").toUpperCase().slice(0, 4);
      const short = `/p/${f.id}`;
      return `
        <li class="file-row" data-id="${f.id}">
          <div class="file-row__icon" data-kind="${kind}">${ext}</div>
          <div class="file-row__main">
            <div class="file-row__name">${escapeHtml(f.original_name || f.name)}</div>
            <div class="file-row__meta">${fmtDate(f.created_at)} · ${fmtSize(f.size)} · ${f.chunks || 1}c</div>
          </div>
          <div class="file-row__url">${short}</div>
          <div class="file-row__actions">
            <button class="act act--copy" data-act="copy" title="Copiar URL">
              <svg viewBox="0 0 24 24" width="12" height="12"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 15V5a2 2 0 012-2h10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
            </button>
            <button class="act act--open" data-act="open" title="Abrir">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="act act--del" data-act="del" title="Eliminar">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </li>
      `;
    }).join("");
  }

  function renderGallery() {
    const filtered = activeFilter === "all" ? files : files.filter(f => fileKind(f) === activeFilter);
    if (!filtered.length) {
      els.gallery.innerHTML = `<div class="gallery__empty">${activeFilter === "all" ? "galería vacía" : "sin archivos de este tipo"}</div>`;
      return;
    }
    els.gallery.innerHTML = filtered.map(f => tileHtml(f)).join("");
  }

  function tileHtml(f) {
    const kind = fileKind(f);
    const url = fileUrl(f);
    const ext = (f.extension || "?").toUpperCase();

    let inner = "";
    if (kind === "image") {
      inner = `<img src="${url}" loading="lazy" alt="${escapeHtml(f.name)}" onerror="this.parentNode.innerHTML = fallbackTile('${ext}','image','${escapeHtml(f.name)}')" />`;
    } else if (kind === "video") {
      inner = `<video src="${url}" loading="lazy" muted preload="metadata" onerror="this.parentNode.innerHTML = fallbackTile('${ext}','video','${escapeHtml(f.name)}')"></video>`;
    } else if (kind === "audio") {
      inner = `
        <div class="tile__fallback">
          <div class="audio-viz"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <div class="tile__ext">${ext}</div>
        </div>`;
    } else if (kind === "pdf") {
      inner = `
        <div class="tile__fallback">
          <div class="tile__fallback-icon" data-kind="pdf">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 2h9l5 5v15H6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          </div>
          <div class="tile__ext">PDF</div>
        </div>`;
    } else if (kind === "text") {
      inner = `
        <div class="tile__fallback">
          <div class="tile__fallback-icon" data-kind="text">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 2h12v20H6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </div>
          <div class="tile__ext">${ext}</div>
        </div>`;
    } else {
      inner = `
        <div class="tile__fallback">
          <div class="tile__fallback-icon" data-kind="other">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 2h9l5 5v15H6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          </div>
          <div class="tile__ext">${ext}</div>
          <div class="tile__name">${escapeHtml(f.original_name || f.name)}</div>
        </div>`;
    }

    return `
      <div class="tile ${kind === "audio" ? "tile--audio" : ""}" data-id="${f.id}" data-kind="${kind}">
        ${inner}
        <div class="tile__overlay">
          <span class="tile__size">${fmtSize(f.size)}</span>
          <span class="tile__kind">${kind}</span>
        </div>
      </div>`;
  }

  window.fallbackTile = function(ext, kind, name) {
    return `
      <div class="tile__fallback">
        <div class="tile__fallback-icon" data-kind="${kind}">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 2h9l5 5v15H6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        </div>
        <div class="tile__ext">${ext}</div>
        <div class="tile__name">${escapeHtml(name)}</div>
      </div>`;
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function renderAll() {
    renderStats();
    renderFileList();
    renderGallery();
  }

  function addActiveUpload(name, status = "subiendo") {
    const div = document.createElement("div");
    div.className = "up-active";
    div.innerHTML = `
      <span class="counter__dot counter__dot--celeste"></span>
      <span class="up-active__name">${escapeHtml(name)}</span>
      <span class="up-active__bar"></span>
      <span class="up-active__status">${status}</span>
    `;
    els.uploadsActive.appendChild(div);
    return div;
  }

  async function uploadFile(file) {
    const row = addActiveUpload(file.name, "subiendo");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(e.error || "Upload failed");
      }
      const data = await r.json();
      row.querySelector(".up-active__status").textContent = "ok";
      row.querySelector(".counter__dot").className = "counter__dot counter__dot--green";
      toast(`subido · /p/${data.id}`, "ok");
      await refresh();
      setTimeout(() => row.remove(), 1500);
      return data;
    } catch (e) {
      row.querySelector(".up-active__status").textContent = "error";
      row.querySelector(".counter__dot").className = "counter__dot counter__dot--red";
      toast(`error: ${e.message}`, "err");
      setTimeout(() => row.remove(), 2400);
      return null;
    }
  }

  async function uploadUrl(url) {
    const row = addActiveUpload(url, "descargando");
    try {
      const r = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(e.error || "Upload failed");
      }
      const data = await r.json();
      row.querySelector(".up-active__name").textContent = data.name;
      row.querySelector(".up-active__status").textContent = "ok";
      row.querySelector(".counter__dot").className = "counter__dot counter__dot--green";
      toast(`subido · /p/${data.id}`, "ok");
      await refresh();
      setTimeout(() => row.remove(), 1500);
      return data;
    } catch (e) {
      row.querySelector(".up-active__status").textContent = "error";
      row.querySelector(".counter__dot").className = "counter__dot counter__dot--red";
      toast(`error: ${e.message}`, "err");
      setTimeout(() => row.remove(), 2400);
      return null;
    }
  }

  async function refresh() {
    try {
      files = await apiGet("/api/files");
      renderAll();
    } catch (e) {
      console.error(e);
      toast("no se pudo cargar", "err");
    }
  }

  els.drop.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", async (e) => {
    const fs = Array.from(e.target.files || []);
    for (const f of fs) await uploadFile(f);
    els.fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach(ev => {
    els.drop.addEventListener(ev, (e) => {
      e.preventDefault();
      els.drop.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach(ev => {
    els.drop.addEventListener(ev, (e) => {
      e.preventDefault();
      els.drop.classList.remove("is-drag");
    });
  });
  els.drop.addEventListener("drop", async (e) => {
    const fs = Array.from(e.dataTransfer?.files || []);
    for (const f of fs) await uploadFile(f);
  });

  els.urlForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = els.urlInput.value.trim();
    if (!url) return;
    els.urlInput.value = "";
    await uploadUrl(url);
  });

  els.fileList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const row = btn.closest(".file-row");
    const id = row.dataset.id;
    const f = files.find(x => x.id === id);
    if (!f) return;
    const act = btn.dataset.act;

    if (act === "copy") {
      try {
        await navigator.clipboard.writeText(fileUrl(f));
        toast("url copiada", "ok");
      } catch {
        toast("no se pudo copiar", "err");
      }
    } else if (act === "open") {
      window.open(fileUrl(f), "_blank");
    } else if (act === "del") {
      if (!confirm(`¿Eliminar "${f.original_name || f.name}"?`)) return;
      btn.disabled = true;
      const res = await apiDelete(`/api/file/${id}`);
      if (res.ok) {
        toast("eliminado", "ok");
        await refresh();
      } else {
        toast("no se pudo eliminar", "err");
        btn.disabled = false;
      }
    }
  });

  els.copyAll.addEventListener("click", async () => {
    if (!files.length) return toast("sin archivos", "err");
    const text = files.map(f => fileUrl(f)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast(`${files.length} urls copiadas`, "ok");
    } catch {
      toast("no se pudo copiar", "err");
    }
  });

  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    els.filters.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeFilter = btn.dataset.filter;
    renderGallery();
  });

  els.gallery.addEventListener("click", (e) => {
    const tile = e.target.closest(".tile");
    if (!tile) return;
    const id = tile.dataset.id;
    const f = files.find(x => x.id === id);
    if (!f) return;
    openLightbox(f);
  });

  function openLightbox(f) {
    const kind = fileKind(f);
    const url = fileUrl(f);
    let html = "";
    if (kind === "image") {
      html = `<img src="${url}" alt="${escapeHtml(f.name)}" />`;
    } else if (kind === "video") {
      html = `<video src="${url}" controls autoplay></video>`;
    } else if (kind === "audio") {
      html = `<audio src="${url}" controls autoplay></audio>`;
    } else if (kind === "pdf") {
      html = `<iframe src="${url}"></iframe>`;
    } else {
      html = `<div style="text-align:center; padding:40px 30px; background:var(--bg-elev); border:1px solid var(--line); border-radius:8px; max-width:380px;">
        <p style="font-size:13px; margin-bottom:8px; word-break:break-all;">${escapeHtml(f.original_name || f.name)}</p>
        <p style="font-size:11px; color:var(--fg-mute); font-family:monospace; margin-bottom:14px;">${fmtSize(f.size)} · ${f.extension || "bin"}</p>
        <a href="${url}" target="_blank" style="display:inline-block; padding:7px 14px; border:1px solid var(--c-celeste); color:var(--c-celeste); border-radius:6px; text-decoration:none; font-size:11px;">abrir raw ↗</a>
      </div>`;
    }
    els.lightboxContent.innerHTML = html;
    els.lightboxMeta.innerHTML = `
      <span>${escapeHtml(f.original_name || f.name)}</span>
      <span style="color:var(--fg-mute)">·</span>
      <span>${fmtSize(f.size)}</span>
      <span style="color:var(--fg-mute)">·</span>
      <a href="${url}" target="_blank">/p/${f.id} ↗</a>
    `;
    els.lightbox.classList.add("is-open");
  }

  els.lightboxClose.addEventListener("click", closeLightbox);
  els.lightbox.addEventListener("click", (e) => {
    if (e.target === els.lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
  function closeLightbox() {
    els.lightbox.classList.remove("is-open");
    els.lightboxContent.innerHTML = "";
  }

  els.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.screen;
      els.tabs.forEach(t => t.classList.toggle("is-active", t === tab));
      els.screens.forEach(s => s.classList.toggle("is-hidden", s.id !== `screen-${target}`));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  initTheme();
  refresh();
  setInterval(refresh, 60000);
})();
