const root = document.getElementById("root");
const APP_VERSION = "1.1.0";

function loadClientBool(key, fallback) {
  try {
    const value = localStorage.getItem(`mielcord:${key}`);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function saveClientBool(key, value) {
  try {
    localStorage.setItem(`mielcord:${key}`, value ? "true" : "false");
  } catch {}
}

const state = {
  user: null,
  appVersion: APP_VERSION,
  hostConfig: {
    privateMode: false,
    countryRestriction: false,
    allowedCountries: []
  },
  clientSettings: {
    ringAlerts: loadClientBool("ringAlerts", true)
  },
  guilds: [],
  snapshot: null,
  activeGuildId: null,
  activeChannelId: null,
  messages: [],
  online: new Set(),
  typing: new Map(),
  searchResults: [],
  editingMessageId: null,
  attachedImage: null,
  audioContext: null,
  voicePresence: new Map(),
  peerSettings: new Map(),
  speaking: new Set(),
  speakingMonitors: new Map(),
  focusedVideoId: null,
  callCollapsed: false,
  streamQuality: "1080p",
  deviceTest: {
    micStream: null,
    micAudio: null,
    cameraStream: null,
    previousMuted: null
  },
  ws: null,
  wsReconnect: null,
  voice: {
    channelId: null,
    channelName: "",
    localAudio: null,
    cameraStream: null,
    screenStream: null,
    muted: false,
    camera: false,
    screen: false,
    ghost: false,
    peers: new Map(),
    pcs: new Map()
  }
};

const permissions = [
  "administrator",
  "manage_guild",
  "manage_channels",
  "manage_roles",
  "manage_messages",
  "kick_members",
  "ban_members",
  "mute_members",
  "create_invite",
  "view_channels",
  "send_messages",
  "read_message_history",
  "connect",
  "speak",
  "stream"
];

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};


const icons = {
  login: '<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.18.38.5.7.88.88.33.15.7.2 1.1.2H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.92Z"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  hash: '<svg viewBox="0 0 24 24"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/></svg>',
  voice: '<svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>',
  micOff: '<svg viewBox="0 0 24 24"><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M15 9.34V7a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2"/><path d="M19 10v2a7 7 0 0 1-.11 1.23"/><path d="M12 19v3"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M15 10l5-3v10l-5-3Z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>',
  screen: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8"/><path d="M12 18v4"/></svg>',
  phoneOff: '<svg viewBox="0 0 24 24"><path d="m2 2 20 20"/><path d="M13.8 13.8a15 15 0 0 1-3.6-3.6"/><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1 .3 2 .5 3.1.5.7 0 1.3.6 1.3 1.3V20c0 .7-.6 1.3-1.3 1.3C10.2 21.3 2.7 13.8 2.7 4.3 2.7 3.6 3.3 3 4 3h3.3c.7 0 1.3.6 1.3 1.3 0 1 .2 2.1.5 3.1"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
  focus: '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24"><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></svg>',
  window: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M8 5v4"/></svg>',
  volume: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M4 2 2 4"/><path d="M22 4l-2-2"/></svg>',
  ghost: '<svg viewBox="0 0 24 24"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a7 7 0 0 0-7 7v11l2-1.5L9 20l3-2 3 2 2-1.5 2 1.5V9a7 7 0 0 0-7-7Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>'
};

function icon(name) {
  return `<span class="button-icon" aria-hidden="true">${icons[name] || ""}</span>`;
}

function iconText(name, text) {
  return `${icon(name)}<span>${escapeHtml(text)}</span>`;
}

function getAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!state.audioContext) state.audioContext = new AudioCtor();
  if (state.audioContext.state === "suspended") state.audioContext.resume().catch(() => {});
  return state.audioContext;
}

function playTone(kind) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const patterns = {
    join: [660, 880],
    leave: [440, 330],
    mute: [250],
    unmute: [520],
    stream: [740, 980],
    stopStream: [520, 360],
    ring: [523, 659, 784]
  };
  const notes = patterns[kind] || [500];
  const spacing = kind === "ring" ? 0.16 : 0.09;
  const peak = kind === "ring" ? 0.045 : 0.075;
  const start = ctx.currentTime + 0.01;
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start + index * spacing);
    gain.gain.exponentialRampToValueAtTime(peak, start + index * spacing + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + index * spacing + 0.13);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + index * spacing);
    osc.stop(start + index * spacing + 0.15);
  });
}

function mediaDevices() {
  return navigator.mediaDevices || null;
}

function requireMedia(kind) {
  const devices = mediaDevices();
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    throw new Error(`${kind} needs HTTPS or localhost on mobile browsers.`);
  }
  if (!devices?.getUserMedia) {
    throw new Error(`${kind} is not available in this browser. Try HTTPS, localhost, or a newer browser.`);
  }
  return devices;
}

async function readImageFile(file) {
  if (!file) return null;
  const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Images must be PNG, JPEG, GIF, or WebP.");
  if (file.size > 2_000_000) throw new Error("Image is too large. Keep it under 2 MB.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  return { name: file.name, mime: file.type, data: dataUrl.slice(comma + 1) };
}


function streamConstraints() {
  const options = {
    "720p": { width: 1280, height: 720, frameRate: 30 },
    "1080p": { width: 1920, height: 1080, frameRate: 60 },
    "1440p": { width: 2560, height: 1440, frameRate: 60 }
  };
  const picked = options[state.streamQuality] || options["1080p"];
  return {
    width: { ideal: picked.width },
    height: { ideal: picked.height },
    frameRate: { ideal: picked.frameRate, max: picked.frameRate }
  };
}

function peerSettings(userId) {
  const key = Number(userId);
  if (!state.peerSettings.has(key)) state.peerSettings.set(key, { muted: false, volume: 1 });
  return state.peerSettings.get(key);
}

function applyPeerMediaSettings(userId) {
  const video = document.getElementById(`video-peer-${userId}`);
  if (!video) return;
  const settings = peerSettings(userId);
  video.volume = settings.volume;
  video.muted = settings.muted;
}


function setSpeaking(userId, active) {
  const key = Number(userId);
  if (!key) return;
  const changed = active ? !state.speaking.has(key) : state.speaking.has(key);
  if (active) state.speaking.add(key);
  else state.speaking.delete(key);
  if (changed) renderSpeakingHighlights();
}

function renderSpeakingHighlights() {
  document.querySelectorAll("[data-user-id]").forEach((node) => {
    node.classList.toggle("speaking", state.speaking.has(Number(node.dataset.userId)));
  });
}

function startSpeakingMonitor(userId, stream, muted = () => false) {
  const key = Number(userId);
  if (!key || !stream?.getAudioTracks().length) return;
  const existing = state.speakingMonitors.get(key);
  if (existing?.stream === stream) {
    existing.muted = muted;
    return;
  }
  stopSpeakingMonitor(key);
  const ctx = getAudioContext();
  if (!ctx?.createMediaStreamSource || !ctx?.createAnalyser) return;
  let source;
  try {
    source = ctx.createMediaStreamSource(stream);
  } catch {
    return;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const monitor = { stream, source, analyser, samples, muted, frame: null, hot: 0, silent: 0 };
  state.speakingMonitors.set(key, monitor);

  const tick = () => {
    if (state.speakingMonitors.get(key) !== monitor) return;
    const liveAudio = stream.getAudioTracks().some((track) => track.readyState === "live" && track.enabled !== false);
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const value of samples) {
      const delta = value - 128;
      sum += delta * delta;
    }
    const level = Math.sqrt(sum / samples.length);
    const active = liveAudio && !monitor.muted() && level > 7;
    if (active) {
      monitor.hot += 1;
      monitor.silent = 0;
    } else {
      monitor.silent += 1;
      monitor.hot = 0;
    }
    if (monitor.hot >= 2) setSpeaking(key, true);
    if (monitor.silent >= 8) setSpeaking(key, false);
    monitor.frame = requestAnimationFrame(tick);
  };
  monitor.frame = requestAnimationFrame(tick);
}

function stopSpeakingMonitor(userId) {
  const key = Number(userId);
  const monitor = state.speakingMonitors.get(key);
  if (!monitor) return;
  if (monitor.frame) cancelAnimationFrame(monitor.frame);
  try { monitor.source.disconnect(); } catch {}
  try { monitor.analyser.disconnect(); } catch {}
  state.speakingMonitors.delete(key);
  setSpeaking(key, false);
}

function stopAllSpeakingMonitors() {
  [...state.speakingMonitors.keys()].forEach(stopSpeakingMonitor);
  state.speaking.clear();
  renderSpeakingHighlights();
}

function escapeHtml(value) {  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function initials(name) {
  return String(name || "?").trim().slice(0, 2).toUpperCase();
}

function activeGuild() {
  return state.snapshot?.guild || state.guilds.find((guild) => guild.id === state.activeGuildId);
}

function activeChannel() {
  return state.snapshot?.channels.find((channel) => channel.id === state.activeChannelId);
}

function currentPermissions() {
  return new Set(state.snapshot?.permissions || []);
}

function hasPermission(permission) {
  const own = currentPermissions();
  return own.has("administrator") || own.has(permission);
}

function canAdmin() {
  return ["administrator", "manage_guild", "manage_channels", "manage_roles", "kick_members", "ban_members", "mute_members"].some(hasPermission);
}

async function api(path, options = {}) {
  const init = {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" }
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      disconnectWs();
      state.user = null;
      state.guilds = [];
      state.snapshot = null;
      state.activeGuildId = null;
      state.activeChannelId = null;
      render();
    }
    throw new Error(data.error || response.statusText);
  }
  return data;
}

function notice(message, type = "info") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 180);
  }, 3200);
}

async function init() {
  renderLoading();
  await loadPublicConfig();
  try {
    const me = await api("/api/me");
    state.user = me.user;
    state.appVersion = me.version || APP_VERSION;
    state.guilds = me.guilds || [];
    connectWs();
    if (state.guilds.length) {
      await loadGuild(state.guilds[0].id, state.guilds[0].default_channel_id);
    } else {
      render();
    }
  } catch {
    render();
  }
}

async function loadPublicConfig() {
  try {
    const config = await api("/api/public-config");
    state.appVersion = config.version || APP_VERSION;
    state.hostConfig = {
      privateMode: !!config.private_mode_enabled,
      countryRestriction: !!config.country_restriction_enabled,
      allowedCountries: config.allowed_country_codes || []
    };
  } catch (error) {
    notice(error.message || "Could not load host config", "error");
  }
}

function renderLoading() {
  root.innerHTML = `
    <main class="auth-screen">
      <section class="auth-card compact">
        <div class="brand-lockup">
          <div class="brand-mark">M</div>
          <div>
            <h1>Mielcord</h1>
            <p>Loading...</p>
          </div>
        </div>
      </section>
    </main>
  `;
}

function render() {
  if (!state.user) {
    renderAuth();
    return;
  }
  renderApp();
  syncMediaElements();
  syncDeviceTestElements();
  renderSpeakingHighlights();
}

function renderAuth() {
  const privateField = state.hostConfig.privateMode ? `
    <label>Host password<input name="server_password" type="password" autocomplete="current-password" required></label>
  ` : "";
  const countryNote = state.hostConfig.countryRestriction && state.hostConfig.allowedCountries.length
    ? `<p class="auth-note">Country lock: ${state.hostConfig.allowedCountries.map(escapeHtml).join(", ")}</p>`
    : "";
  root.innerHTML = `
    <main class="auth-screen">
      <section class="auth-card">
        <div class="brand-lockup">
          <div class="brand-mark">M</div>
          <div>
            <h1>Mielcord</h1>
            <p>${state.hostConfig.privateMode ? "Private host" : "Self-hosted team chat"}</p>
          </div>
        </div>
        ${countryNote}
        <div class="auth-grid">
          <form class="panel" data-action="login">
            <h2>Sign in</h2>
            <label>Username or email<input name="username" autocomplete="username" required></label>
            <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
            ${privateField}
            <button class="primary" type="submit">${iconText("login", "Sign in")}</button>
          </form>
          <form class="panel" data-action="register">
            <h2>Create account</h2>
            <label>Username<input name="username" autocomplete="username" required minlength="3" maxlength="32"></label>
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" autocomplete="new-password" required minlength="8"></label>
            ${privateField}
            <button class="primary honey" type="submit">${iconText("userPlus", "Create")}</button>
          </form>
        </div>
      </section>
    </main>
  `;
}

function renderApp() {
  root.innerHTML = `
    <div class="app-shell ${state.voice.channelId ? "in-call" : ""}">
      ${renderChannelPane()}
      ${renderChatPane()}
    </div>
  `;
}

function renderGuildRail() {
  const guildButtons = state.guilds.map((guild) => `
    <button class="guild-button ${guild.id === state.activeGuildId ? "active" : ""}"
      data-guild-id="${guild.id}" style="--guild-color:${escapeHtml(guild.icon_color || "#d99a23")}" title="${escapeHtml(guild.name)}">
      ${initials(guild.name)}
    </button>
  `).join("");

  return `
    <aside class="guild-rail">
      <button class="guild-button home active-home" title="Mielcord">M</button>
      <div class="guild-list">${guildButtons}</div>
      <button class="rail-action" data-open-modal="profileSettings" title="User settings">${icon("settings")}</button>
      <button class="rail-action danger" data-action="logout" title="Log out">${icon("logout")}</button>
    </aside>
  `;
}

function renderChannelPane() {
  const guild = activeGuild();
  const textChannels = state.snapshot?.channels.filter((channel) => channel.type === "text") || [];
  const voiceChannels = state.snapshot?.channels.filter((channel) => channel.type === "voice") || [];
  return `
    <aside class="channel-pane">
      <header class="server-header">
        <div>
          <h2>${escapeHtml(guild?.name || "Mielcord")}</h2>
          <p>${escapeHtml(guild?.description || state.user.username)}</p>
        </div>
        <button class="icon-button" data-open-modal="guildSettings" title="Guild settings">${icon("settings")}</button>
      </header>
      <section class="channel-section">
        <div class="section-title">
          <span>Text</span>
          ${hasPermission("manage_channels") ? `<button class="tiny" data-open-modal="createText" title="Create text channel">${icon("plus")}</button>` : ""}
        </div>
        ${textChannels.map(renderChannelButton).join("") || `<p class="empty">No text channels</p>`}
      </section>
      <section class="channel-section">
        <div class="section-title">
          <span>Voice</span>
          ${hasPermission("manage_channels") ? `<button class="tiny" data-open-modal="createVoice" title="Create voice channel">${icon("plus")}</button>` : ""}
        </div>
        ${voiceChannels.map(renderChannelButton).join("") || `<p class="empty">No voice channels</p>`}
      </section>
      ${renderVoiceDock()}
      ${renderUserDock()}
    </aside>
  `;
}

function renderChannelButton(channel) {
  const active = channel.id === state.activeChannelId || channel.id === state.voice.channelId;
  const marker = channel.type === "text" ? icon("hash") : icon("voice");
  const voiceCount = channel.type === "voice" ? voiceCountFor(channel.id) : "";
  const ghostButton = channel.type === "voice" && hasPermission("mute_members") ? `
    <button class="voice-ghost-button ${state.voice.ghost && active ? "active" : ""}" data-action="ghostJoinVoice" data-ghost-channel-id="${channel.id}" title="Ghost listen">${icon("ghost")}</button>
  ` : "";
  return `
    <div class="channel-wrap ${active ? "active" : ""}">
      <button class="channel-button ${active ? "active" : ""}" data-channel-id="${channel.id}" data-channel-type="${channel.type}">
        <span>${marker}</span>
        <strong>${escapeHtml(channel.name)}</strong>
        ${voiceCount ? `<em>${voiceCount}</em>` : ""}
      </button>
      ${ghostButton}
      ${channel.type === "voice" ? renderVoiceRoster(channel.id) : ""}
    </div>
  `;
}

function voiceUsersFor(channelId) {
  return [...(state.voicePresence.get(Number(channelId)) || new Map()).values()];
}

function voiceCountFor(channelId) {
  return voiceUsersFor(channelId).length ? String(voiceUsersFor(channelId).length) : "";
}

function renderVoiceRoster(channelId) {
  const users = voiceUsersFor(channelId);
  if (!users.length) return "";
  return `
    <div class="voice-roster">
      ${users.map((entry) => `
        <div class="voice-roster-user ${state.speaking.has(Number(entry.user.id)) ? "speaking" : ""}" data-user-id="${entry.user.id}" data-peer-user-id="${entry.user.id}">
          ${renderAvatar(entry.user, "mini")}
          <span>${escapeHtml(entry.user.display_name || entry.user.username)}</span>
          ${entry.state?.muted ? icon("micOff") : ""}
          ${entry.state?.screen ? icon("screen") : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderVoiceDock() {
  const inVoice = !!state.voice.channelId;
  return `
    <section class="voice-dock ${inVoice ? "connected" : ""} ${state.voice.ghost ? "ghost" : ""}">
      <div>
        <strong>${inVoice ? escapeHtml(state.voice.channelName) : "Voice"}</strong>
        <span>${inVoice ? (state.voice.ghost ? "Ghost listening" : "Connected") : "Disconnected"}</span>
      </div>
      <div class="dock-actions">
        ${state.voice.ghost ? `<button class="icon-button active" title="Ghost listening">${icon("ghost")}</button>` : `
          <button class="icon-button ${state.voice.muted ? "danger" : ""}" data-action="toggleMute" title="Mute">${icon(state.voice.muted ? "micOff" : "mic")}</button>
          <button class="icon-button ${state.voice.camera ? "active" : ""}" data-action="toggleCamera" title="Camera">${icon("camera")}</button>
          <button class="icon-button ${state.voice.screen ? "active" : ""}" data-action="toggleScreen" title="Screen">${icon("screen")}</button>
        `}
        <button class="icon-button danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
      </div>
    </section>
  `;
}

function renderUserDock() {
  return `
    <section class="user-dock">
      ${renderAvatar(state.user || {}, "mini")}
      <div>
        <strong>${escapeHtml(state.user?.display_name || state.user?.username || "User")}</strong>
        <span>@${escapeHtml(state.user?.username || "mielcord")}</span>
      </div>
      <button class="icon-button" data-open-modal="profileSettings" title="User settings">${icon("settings")}</button>
      <button class="icon-button danger" data-action="logout" title="Log out">${icon("logout")}</button>
    </section>
  `;
}

function ringableMembers() {
  const currentRoom = state.voicePresence.get(Number(state.voice.channelId)) || new Map();
  return (state.snapshot?.members || []).filter((member) => {
    const userId = Number(member.user_id);
    return userId && userId !== state.user?.id && state.online.has(userId) && !currentRoom.has(userId);
  });
}

function renderChatPane() {
  const channel = activeChannel();
  const editable = hasPermission("send_messages") && channel?.type === "text";
  return `
    <main class="chat-pane">
      <header class="chat-header">
        <div>
          <h2>${channel ? `${channel.type === "text" ? "#" : ">"} ${escapeHtml(channel.name)}` : "Mielcord"}</h2>
          <p>${escapeHtml(channel?.topic || "Ready")}</p>
        </div>
        <form class="search-box" data-action="search">
          <input name="query" placeholder="Search" autocomplete="off">
          <button type="submit">Go</button>
        </form>
      </header>
      ${state.voice.channelId ? renderCallWindow() : ""}
      ${state.searchResults.length ? renderSearchResults() : ""}
      <section class="message-list" id="messageList">
        ${state.messages.map(renderMessage).join("") || `<div class="empty-state">No messages yet</div>`}
      </section>
      <div class="typing-line">${renderTypingLine()}</div>
      <form class="composer" data-action="sendMessage">
        ${state.editingMessageId ? `<button type="button" data-action="cancelEdit">Cancel</button>` : ""}
        <label class="attach-button" title="Attach image">
          ${icon("image")}
          <input name="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" ${editable ? "" : "disabled"}>
        </label>
        <textarea name="content" rows="1" maxlength="4000" ${editable ? "" : "disabled"} placeholder="${editable ? "Message" : "Read only"}"></textarea>
        <button class="primary send-button" type="submit" ${editable ? "" : "disabled"}>${state.editingMessageId ? iconText("save", "Save") : iconText("send", "Send")}</button>
        <div class="attachment-name" data-attachment-name>${state.attachedImage ? escapeHtml(state.attachedImage.name) : ""}</div>
      </form>
    </main>
  `;
}

function renderCallWindow() {
  const peers = [...state.voice.peers.values()];
  const total = peers.length + (state.voice.ghost ? 0 : 1);
  const ringable = state.voice.ghost ? [] : ringableMembers();
  return `
    <section class="call-window ${state.callCollapsed ? "collapsed" : ""}">
      <header class="call-window-header">
        <div>
          <strong>${escapeHtml(state.voice.channelName || "Voice")}</strong>
          <span>${total} connected</span>
        </div>
        <div class="call-actions">
          <select class="quality-select" data-action="streamQuality" title="Stream quality">
            <option value="720p" ${state.streamQuality === "720p" ? "selected" : ""}>720p</option>
            <option value="1080p" ${state.streamQuality === "1080p" ? "selected" : ""}>1080p</option>
            <option value="1440p" ${state.streamQuality === "1440p" ? "selected" : ""}>1440p</option>
          </select>
          ${state.voice.ghost ? `<span class="ghost-pill">${icon("ghost")} Ghost listening</span>` : `
            ${state.voice.screen ? `<button class="icon-button" data-action="changeScreen" title="Change shared window">${icon("window")}</button>` : ""}
            <select class="ring-select" data-ring-target title="Ring user" ${ringable.length ? "" : "disabled"}>
              <option value="">Ring user</option>
              ${ringable.map((member) => `<option value="${member.user_id}">${escapeHtml(member.nickname || member.display_name || member.username)}</option>`).join("")}
            </select>
            <button class="icon-button" data-action="ringUser" title="Ring selected user" ${ringable.length ? "" : "disabled"}>${icon("bell")}</button>
            <button class="icon-button ${state.voice.muted ? "danger" : ""}" data-action="toggleMute" title="Mute">${icon(state.voice.muted ? "micOff" : "mic")}</button>
            <button class="icon-button ${state.voice.camera ? "active" : ""}" data-action="toggleCamera" title="Camera">${icon("camera")}</button>
            <button class="icon-button ${state.voice.screen ? "active" : ""}" data-action="toggleScreen" title="Screen">${icon("screen")}</button>
          `}
          <button class="icon-button" data-action="toggleCallCollapse" title="Collapse call">${state.callCollapsed ? icon("focus") : icon("close")}</button>
          <button class="icon-button danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
        </div>
      </header>
      ${state.callCollapsed ? "" : renderVoiceStage()}
    </section>
  `;
}

function renderSearchResults() {
  return `
    <section class="search-results">
      <div class="section-title">
        <span>Results</span>
        <button class="tiny" data-action="clearSearch" title="Clear search">${icon("close")}</button>
      </div>
      ${state.searchResults.map((message) => `
        <button class="search-hit" data-jump-channel="${message.channel_id}">
          <span>#${escapeHtml(message.channel_name || "")}</span>
          <strong>${escapeHtml(message.author.display_name)}</strong>
          <em>${escapeHtml(message.content)}</em>
        </button>
      `).join("")}
    </section>
  `;
}

function renderVoiceStage() {
  if (!state.voice.channelId) return "";
  const peers = [...state.voice.peers.values()];
  return `
    <section class="voice-stage ${state.voice.ghost ? "ghost-stage" : ""}">
      <div class="stage-header">
        <strong>${escapeHtml(state.voice.channelName)}</strong>
        <span>${state.voice.ghost ? `${peers.length} observed` : `${peers.length + 1} connected`}</span>
      </div>
      <div class="video-grid">
        ${state.voice.ghost ? "" : renderVideoTile("local", state.user, {
          muted: state.voice.muted,
          camera: state.voice.camera,
          screen: state.voice.screen,
          local: true
        })}
        ${peers.map((peer) => renderVideoTile(`peer-${peer.user.id}`, peer.user, peer.state || {})).join("")}
      </div>
    </section>
  `;
}

function renderAvatar(person, classes = "") {
  const name = person.display_name || person.username || "?";
  const url = person.avatar_url || "";
  return `
    <div class="avatar ${classes}" style="--avatar:${escapeHtml(person.avatar_color || "#d99a23")}">
      ${url ? `<img src="${escapeHtml(url)}" alt="">` : initials(name)}
    </div>
  `;
}

function renderAvatarFallback(person) {
  const name = person.display_name || person.username || "?";
  const url = person.avatar_url || "";
  return url ? `<img src="${escapeHtml(url)}" alt="">` : initials(name);
}

function renderVideoTile(id, user, media) {
  const userId = id === "local" ? state.user.id : Number(String(id).replace("peer-", ""));
  const focused = state.focusedVideoId === id;
  const tileClass = `video-tile ${focused ? "focused" : ""} ${state.speaking.has(userId) ? "speaking" : ""}`.trim();
  const badges = [
    media.muted ? "muted" : "",
    media.camera ? "camera" : "",
    media.screen ? "screen" : "",
    media.local ? "you" : ""
  ].filter(Boolean);
  return `
    <article class="${tileClass}" data-video-id="${id}" data-user-id="${userId}" ${!media.local ? `data-peer-user-id="${userId}"` : ""}>
      <video id="video-${id}" autoplay playsinline ${media.local ? "muted" : ""}></video>
      <div class="video-fallback" style="--avatar:${escapeHtml(user.avatar_color || "#d99a23")}">${renderAvatarFallback(user)}</div>
      <footer>
        <strong>${escapeHtml(user.display_name || user.username)}</strong>
        <span>${badges.join(" ")}</span>
      </footer>
      <div class="video-actions">
        <button class="icon-button" data-action="focusVideo" data-video-id="${id}" title="Focus in window">${icon("focus")}</button>
        <button class="icon-button" data-action="fullscreenVideo" data-video-id="${id}" title="Fullscreen">${icon("fullscreen")}</button>
      </div>
    </article>
  `;
}

function renderMessage(message) {
  const own = message.author.id === state.user.id;
  const canManage = hasPermission("manage_messages");
  const actions = !message.deleted && (own || canManage) ? `
    <div class="message-actions">
      ${own ? `<button data-action="editMessage" data-message-id="${message.id}" title="Edit">Edit</button>` : ""}
      ${canManage ? `<button class="danger" data-action="permanentDeleteMessage" data-message-id="${message.id}" title="Permanently delete">${icon("trash")}</button>` : `<button data-action="deleteMessage" data-message-id="${message.id}" title="Delete">${icon("close")}</button>`}
    </div>
  ` : "";
  return `
    <article class="message ${message.deleted ? "deleted" : ""}" data-message-id="${message.id}">
      ${renderAvatar(message.author)}
      <div class="message-body">
        <header>
          <strong>${escapeHtml(message.author.display_name || message.author.username)}</strong>
          <span>${formatTime(message.created_at)}</span>
          ${message.edited_at ? "<em>edited</em>" : ""}
        </header>
        <p>${message.deleted ? "Message deleted" : linkify(escapeHtml(message.content))}</p>
        ${!message.deleted && message.image ? `<img class="message-image" src="${escapeHtml(message.image.data_url)}" alt="${escapeHtml(message.image.name || "image")}">` : ""}
      </div>
      ${actions}
    </article>
  `;
}

function linkify(html) {
  return html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}

function renderTypingLine() {
  const cutoff = Date.now() - 3500;
  for (const [userId, item] of state.typing) {
    if (item.at < cutoff) state.typing.delete(userId);
  }
  const names = [...state.typing.values()].map((item) => item.user.display_name || item.user.username);
  if (!names.length) return "";
  return `${escapeHtml(names.slice(0, 3).join(", "))} typing`;
}

function renderMemberPane() {
  const members = state.snapshot?.members || [];
  const guild = activeGuild();
  const admin = canAdmin();
  return `
    <aside class="member-pane ${admin ? "admin-open" : ""}">
      <section class="members-section">
        <div class="section-title"><span>Members</span><span>${members.length}</span></div>
        <div class="member-list">
          ${members.map(renderMember).join("") || `<p class="empty">No members</p>`}
        </div>
      </section>
      ${admin ? renderAdminPanel(guild, members) : ""}
    </aside>
  `;
}

function renderMember(member) {
  const online = state.online.has(member.user_id);
  const roles = (member.roles || []).map((roleId) => state.snapshot.roles.find((role) => role.id === roleId)).filter(Boolean);
  return `
    <article class="member-card">
      ${renderAvatar(member, online ? "online" : "")}
      <div>
        <strong>${escapeHtml(member.nickname || member.display_name || member.username)}</strong>
        <span>${online ? "online" : "offline"}</span>
        <div class="role-pills">${roles.slice(0, 3).map((role) => `<em style="--role:${escapeHtml(role.color)}">${escapeHtml(role.name)}</em>`).join("")}</div>
      </div>
    </article>
  `;
}

function renderAdminPanel(guild, members) {
  const roles = state.snapshot?.roles || [];
  const channels = state.snapshot?.channels || [];
  return `
    <section class="admin-panel">
      <h3>Admin</h3>
      ${hasPermission("manage_guild") ? `
        <form class="admin-block" data-action="saveGuild">
          <label>Name<input name="name" value="${escapeHtml(guild?.name || "")}"></label>
          <label>Description<input name="description" value="${escapeHtml(guild?.description || "")}"></label>
          <label>Color<input name="icon_color" type="color" value="${escapeHtml(guild?.icon_color || "#d99a23")}"></label>
          <button type="submit">Save server</button>
        </form>
      ` : ""}
      ${hasPermission("manage_channels") ? `
        <form class="admin-block compact-form" data-action="createChannel">
          <input name="name" placeholder="Channel name">
          <select name="type">
            <option value="text">Text</option>
            <option value="voice">Voice</option>
          </select>
          <button type="submit">Add channel</button>
        </form>
        <div class="admin-block list-block">
          ${channels.map((channel) => `
            <div class="list-row">
              <span>${channel.type === "text" ? "#" : ">"} ${escapeHtml(channel.name)}</span>
              <button data-action="moveChannel" data-channel-id="${channel.id}" data-direction="-1" title="Move up">Up</button>
              <button data-action="moveChannel" data-channel-id="${channel.id}" data-direction="1" title="Move down">Down</button>
              <button data-action="deleteChannel" data-channel-id="${channel.id}">Delete</button>
            </div>
          `).join("")}
        </div>
      ` : ""}
      ${hasPermission("manage_roles") ? `
        <form class="admin-block" data-action="createRole">
          <label>Role<input name="name" placeholder="Role name"></label>
          <label>Color<input name="color" type="color" value="#2a9d8f"></label>
          <div class="check-grid">
            ${permissions.map((permission) => `
              <label><input type="checkbox" name="permissions" value="${permission}">${permission.replaceAll("_", " ")}</label>
            `).join("")}
          </div>
          <button type="submit">Create role</button>
        </form>
        <form class="admin-block" data-action="assignRoles">
          <label>Member
            <select name="user_id">
              ${members.map((member) => `<option value="${member.user_id}">${escapeHtml(member.display_name || member.username)}</option>`).join("")}
            </select>
          </label>
          <div class="check-grid">
            ${roles.filter((role) => !role.is_everyone).map((role) => `
              <label><input type="checkbox" name="roles" value="${role.id}">${escapeHtml(role.name)}</label>
            `).join("")}
          </div>
          <button type="submit">Set roles</button>
        </form>
      ` : ""}
      ${hasPermission("create_invite") ? `
        <form class="admin-block compact-form" data-action="createInvite">
          <input name="max_uses" type="number" min="1" max="1000" placeholder="Uses">
          <input name="ttl_hours" type="number" min="1" max="720" placeholder="Hours">
          <button type="submit">Invite</button>
        </form>
      ` : ""}
      ${(hasPermission("kick_members") || hasPermission("ban_members") || hasPermission("mute_members")) ? `
        <form class="admin-block" data-action="moderateMember">
          <label>Member
            <select name="user_id">
              ${members.filter((member) => member.user_id !== state.user.id).map((member) => `<option value="${member.user_id}">${escapeHtml(member.display_name || member.username)}</option>`).join("")}
            </select>
          </label>
          <input name="reason" placeholder="Reason">
          <div class="button-row">
            ${hasPermission("mute_members") ? `<button type="submit" name="moderation" value="mute">Mute</button>` : ""}
            ${hasPermission("kick_members") ? `<button type="submit" name="moderation" value="kick">Kick</button>` : ""}
            ${hasPermission("ban_members") ? `<button type="submit" name="moderation" value="ban" class="danger">Ban</button>` : ""}
          </div>
        </form>
      ` : ""}
      ${hasPermission("manage_guild") ? `
        <div class="admin-block">
          <button data-action="loadInvites">Invites</button>
          <button data-action="loadAudit">Audit log</button>
          <div id="adminOutput" class="admin-output"></div>
        </div>
      ` : ""}
    </section>
  `;
}


function renderProfileSettingsModal() {
  const micTesting = !!state.deviceTest.micStream;
  const cameraTesting = !!state.deviceTest.cameraStream;
  const micStatus = micTesting ? (state.voice.channelId ? "Voice muted for test" : "Monitoring locally") : "Ready";
  return `
    <form class="modal-card profile-modal" data-action="updateProfile">
      <header class="settings-header">
        <div>
          <h2>User settings</h2>
          <p>Update your email to refresh Gravatar</p>
        </div>
        <button class="icon-button" data-close-modal type="button">${icon("close")}</button>
      </header>
      <div class="profile-preview">
        ${renderAvatar(state.user || {}, "profile-avatar")}
        <div>
          <strong>${escapeHtml(state.user?.display_name || state.user?.username || "")}</strong>
          <span>${escapeHtml(state.user?.email || "No email loaded")}</span>
        </div>
      </div>
      <label>Display name<input name="display_name" value="${escapeHtml(state.user?.display_name || "")}" maxlength="40"></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(state.user?.email || "")}" autocomplete="email"></label>
      <section class="client-settings">
        <header>
          <strong>Client</strong>
          <span>This browser</span>
        </header>
        <label class="settings-toggle">
          <input type="checkbox" data-action="toggleRingAlerts" ${state.clientSettings.ringAlerts ? "checked" : ""}>
          <span>Ring tone and desktop notification</span>
        </label>
      </section>
      <section class="device-test">
        <header>
          <strong>Device test</strong>
          <span>${escapeHtml(micStatus)}</span>
        </header>
        <div class="device-actions">
          <button type="button" class="test-button ${micTesting ? "active" : ""}" data-action="toggleMicTest">${iconText(micTesting ? "micOff" : "mic", micTesting ? "Stop mic" : "Test mic")}</button>
          <button type="button" class="test-button ${cameraTesting ? "active" : ""}" data-action="toggleCameraTest">${iconText("camera", cameraTesting ? "Stop cam" : "Test cam")}</button>
        </div>
        <audio id="micTestAudio" class="device-test-audio" autoplay></audio>
        <div class="camera-test-shell ${cameraTesting ? "active" : ""}">
          <video id="cameraTestVideo" autoplay muted playsinline></video>
          <span>Camera preview</span>
        </div>
      </section>
      <button class="primary" type="submit">${iconText("save", "Save profile")}</button>
      <footer class="settings-version">Mielcord v${escapeHtml(state.appVersion || APP_VERSION)}</footer>
    </form>
  `;
}

function renderGuildSettingsModal() {  const guild = activeGuild();
  const members = state.snapshot?.members || [];
  return `
    <section class="modal-card settings-modal">
      <header class="settings-header">
        <div>
          <h2>${escapeHtml(guild?.name || "Mielcord")}</h2>
          <p>${members.length} members</p>
        </div>
        <button class="icon-button" data-close-modal type="button">${icon("close")}</button>
      </header>
      <div class="settings-grid">
        <section class="settings-members">
          <div class="section-title"><span>Members</span><span>${members.length}</span></div>
          <div class="member-list">
            ${members.map(renderMember).join("") || `<p class="empty">No members</p>`}
          </div>
        </section>
        ${canAdmin() ? renderAdminPanel(guild, members) : ""}
      </div>
    </section>
  `;
}

function openModal(kind) {
  const forms = {
    guildSettings: renderGuildSettingsModal(),
    profileSettings: renderProfileSettingsModal(),
    createText: `
      <form class="modal-card" data-action="createChannel">
        <h2>Text channel</h2>
        <input type="hidden" name="type" value="text">
        <label>Name<input name="name" required></label>
        <label>Topic<input name="topic"></label>
        <button class="primary" type="submit">Create</button>
      </form>
    `,
    createVoice: `
      <form class="modal-card" data-action="createChannel">
        <h2>Voice channel</h2>
        <input type="hidden" name="type" value="voice">
        <label>Name<input name="name" required></label>
        <button class="primary" type="submit">Create</button>
      </form>
    `
  };
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="modal-close" data-close-modal></div>${forms[kind] || ""}`;
  document.body.appendChild(modal);
  syncDeviceTestElements();
  setTimeout(() => modal.classList.add("show"), 1);
}

function closeModal() {
  if (document.querySelector(".profile-modal")) stopDeviceTests(true);
  document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.remove());
}

async function loadGuild(guildId, preferredChannelId = null) {
  const snapshot = await api(`/api/guilds/${guildId}`);
  state.snapshot = snapshot;
  state.activeGuildId = snapshot.guild.id;
  state.online = new Set(snapshot.online_user_ids || []);
  applyVoicePresence(snapshot.voice || {});
  const preferred = snapshot.channels.find((channel) => channel.id === preferredChannelId && channel.type === "text");
  const existing = snapshot.channels.find((channel) => channel.id === state.activeChannelId && channel.type === "text");
  const first = snapshot.channels.find((channel) => channel.type === "text");
  const channel = preferred || existing || first;
  state.activeChannelId = channel?.id || null;
  state.searchResults = [];
  if (state.activeChannelId) await loadMessages(state.activeChannelId);
  render();
}

async function loadMessages(channelId) {
  const data = await api(`/api/channels/${channelId}/messages`);
  state.messages = data.messages || [];
  state.activeChannelId = channelId;
}

function connectWs() {
  disconnectWs(false);
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/ws`);
  state.ws = ws;
  ws.addEventListener("message", (event) => {
    const packet = JSON.parse(event.data);
    handleRealtime(packet.event, packet.payload || {});
  });
  ws.addEventListener("close", () => {
    if (!state.user) return;
    clearTimeout(state.wsReconnect);
    state.wsReconnect = setTimeout(connectWs, 1600);
  });
}

function disconnectWs(clear = true) {
  clearTimeout(state.wsReconnect);
  if (state.ws) {
    state.ws.onclose = null;
    state.ws.close();
  }
  if (clear) state.ws = null;
}

function wsSend(event, payload = {}) {
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ event, payload }));
  }
}

function handleRealtime(event, payload) {
  if (event === "hello") {
    applyVoicePresence(payload.voice || {});
    render();
  } else if (event === "error") {
    notice(payload.message || "Realtime error", "error");
  } else if (event === "message:create") {
    if (payload.channel_id === state.activeChannelId && !state.messages.some((message) => message.id === payload.id)) {
      state.messages.push(payload);
      render();
      scrollMessages();
    }
  } else if (event === "message:update") {
    state.messages = state.messages.map((message) => message.id === payload.id ? payload : message);
    render();
  } else if (event === "message:delete") {
    if (payload.permanent) {
      state.messages = state.messages.filter((message) => message.id !== payload.id);
    } else {
      state.messages = state.messages.map((message) => message.id === payload.id ? { ...message, deleted: true, content: "", image: null, deleted_at: Date.now() / 1000 } : message);
    }
    render();
  } else if (event.startsWith("channel:") || event.startsWith("role:") || event === "guild:update" || event === "member:join" || event === "member:remove") {
    if (state.activeGuildId) loadGuild(state.activeGuildId).catch((error) => notice(error.message, "error"));
  } else if (event === "presence:update") {
    if (payload.status === "online") state.online.add(payload.user_id);
    if (payload.status === "offline") state.online.delete(payload.user_id);
    render();
  } else if (event === "typing:start") {
    if (payload.channel_id === state.activeChannelId && payload.user?.id !== state.user.id) {
      state.typing.set(payload.user.id, { user: payload.user, at: Date.now() });
      render();
      setTimeout(render, 3600);
    }
  } else if (event === "voice:joined") {
    handleVoiceJoined(payload);
  } else if (event === "voice:peer_joined") {
    handlePeerJoined(payload);
  } else if (event === "voice:peer_left") {
    handlePeerLeft(payload);
  } else if (event === "voice:force_disconnect") {
    notice(`Disconnected from voice by ${payload.by_user?.display_name || payload.by_user?.username || "an admin"}`);
    leaveVoice(false);
  } else if (event === "voice:ring") {
    handleVoiceRing(payload);
  } else if (event === "voice:ring_sent") {
    notice(payload.delivered ? "Ring sent" : "That user is offline right now", payload.delivered ? "info" : "error");
  } else if (event === "voice:state") {
    setVoicePresence(payload.channel_id, payload.user || state.voice.peers.get(payload.user_id)?.user || state.user, payload.state || {});
    const peer = state.voice.peers.get(payload.user_id);
    if (peer) peer.state = payload.state || {};
    if (payload.user_id === state.user.id) {
      state.voice.muted = !!payload.state?.muted;
      state.voice.camera = !!payload.state?.camera;
      state.voice.screen = !!payload.state?.screen;
    }
    if (payload.user_id !== state.user.id) playVoiceStateSound(payload.changed || {});
    render();
  } else if (event === "rtc:signal") {
    handleRtcSignal(payload).catch((error) => notice(error.message, "error"));
  } else if (event === "rtc:close") {
    closePeerConnection(payload.user_id);
  }
}

function setRingAlerts(enabled) {
  state.clientSettings.ringAlerts = enabled;
  saveClientBool("ringAlerts", enabled);
  if (enabled && "Notification" in window && Notification.permission === "default") {
    const permission = Notification.requestPermission();
    if (permission?.catch) permission.catch(() => {});
  }
  refreshProfileSettingsModal();
}

function handleVoiceRing(payload) {
  if (!state.clientSettings.ringAlerts) return;
  const from = payload.from_user?.display_name || payload.from_user?.username || "Someone";
  const channel = payload.channel_name || "voice";
  const message = `${from} is ringing you for ${channel}`;
  notice(message);
  playTone("ring");
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Mielcord ring", {
        body: message,
        tag: `mielcord-ring-${payload.channel_id || "voice"}`,
        silent: false
      });
    } catch {}
  }
}

function ringSelectedUser() {
  if (!state.voice.channelId) return;
  const select = document.querySelector("[data-ring-target]");
  const targetUserId = Number(select?.value || 0);
  if (!targetUserId) {
    notice("Pick a user to ring first", "error");
    return;
  }
  wsSend("voice:ring", { target_user_id: targetUserId, channel_id: state.voice.channelId });
}

function scrollMessages() {
  requestAnimationFrame(() => {
    const list = document.getElementById("messageList");
    if (list) list.scrollTop = list.scrollHeight;
  });
}


function applyVoicePresence(snapshot) {
  state.voicePresence.clear();
  for (const [channelId, entries] of Object.entries(snapshot || {})) {
    for (const entry of entries || []) {
      setVoicePresence(Number(channelId), entry.user, entry.state || {}, false);
    }
  }
}

function setVoicePresence(channelId, user, mediaState = {}, shouldRender = false) {
  if (!channelId || !user) return;
  const room = state.voicePresence.get(Number(channelId)) || new Map();
  room.set(Number(user.id), { user, state: mediaState, channelId: Number(channelId) });
  state.voicePresence.set(Number(channelId), room);
  if (shouldRender) render();
}

function removeVoicePresence(userId) {
  for (const room of state.voicePresence.values()) room.delete(Number(userId));
}

function playVoiceStateSound(changed) {
  if (Object.prototype.hasOwnProperty.call(changed, "muted")) playTone(changed.muted ? "mute" : "unmute");
  if (Object.prototype.hasOwnProperty.call(changed, "screen")) playTone(changed.screen ? "stream" : "stopStream");
}

function handlePeerLeft(payload) {
  removeVoicePresence(payload.user_id);
  if (payload.channel_id === state.voice.channelId) removePeer(payload.user_id);
  playTone("leave");
  render();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button, .search-hit");
  if (!button) return;

  if (button.dataset.openModal) {
    openModal(button.dataset.openModal);
    return;
  }
  if (button.dataset.closeModal !== undefined) {
    closeModal();
    return;
  }
  if (button.dataset.guildId) {
    await safe(() => loadGuild(Number(button.dataset.guildId)));
    return;
  }
  if (button.dataset.channelId) {
    const channelId = Number(button.dataset.channelId);
    const channelType = button.dataset.channelType;
    if (channelType === "voice") {
      await safe(() => joinVoice(channelId));
    } else {
      await safe(async () => {
        await loadMessages(channelId);
        state.searchResults = [];
        render();
        scrollMessages();
      });
    }
    return;
  }
  if (button.dataset.jumpChannel) {
    await safe(async () => {
      await loadMessages(Number(button.dataset.jumpChannel));
      state.searchResults = [];
      render();
      scrollMessages();
    });
    return;
  }

  const action = button.dataset.action;
  if (!action) return;

  if (action === "logout") await safe(logout);
  if (action === "clearSearch") {
    state.searchResults = [];
    render();
  }
  if (action === "cancelEdit") {
    state.editingMessageId = null;
    render();
  }
  if (action === "editMessage") {
    const message = state.messages.find((item) => item.id === Number(button.dataset.messageId));
    const textarea = document.querySelector('.composer textarea[name="content"]');
    if (message && textarea) {
      state.editingMessageId = message.id;
      render();
      document.querySelector('.composer textarea[name="content"]').value = message.content;
      document.querySelector('.composer textarea[name="content"]').focus();
    }
  }
  if (action === "deleteMessage") await safe(() => deleteMessage(Number(button.dataset.messageId)));
  if (action === "permanentDeleteMessage") await safe(() => deleteMessage(Number(button.dataset.messageId), true));
  if (action === "deleteChannel") await safe(() => deleteChannel(Number(button.dataset.channelId)));
  if (action === "moveChannel") await safe(() => moveChannel(Number(button.dataset.channelId), Number(button.dataset.direction)));
  if (action === "ringUser") ringSelectedUser();
  if (action === "ghostJoinVoice") await safe(() => joinVoice(Number(button.dataset.ghostChannelId), true));
  if (action === "toggleMute") toggleMute();
  if (action === "toggleMicTest") await safe(toggleMicTest);
  if (action === "toggleCameraTest") await safe(toggleCameraTest);
  if (action === "toggleCamera") await safe(toggleCamera);
  if (action === "toggleScreen") await safe(toggleScreen);
  if (action === "changeScreen") await safe(changeScreenShare);
  if (action === "toggleCallCollapse") {
    state.callCollapsed = !state.callCollapsed;
    render();
  }
  if (action === "focusVideo") {
    const videoId = button.dataset.videoId;
    state.focusedVideoId = state.focusedVideoId === videoId ? null : videoId;
    render();
  }
  if (action === "fullscreenVideo") await safe(() => fullscreenVideo(button.dataset.videoId));
  if (action === "localMutePeer") toggleLocalPeerMute(Number(button.dataset.userId));
  if (action === "adminDisconnectVoice") wsSend("voice:admin_disconnect", { target_user_id: Number(button.dataset.userId) });
  if (action === "leaveVoice") leaveVoice();
  if (action === "loadInvites") await safe(loadInvites);
  if (action === "loadAudit") await safe(loadAudit);
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal], .modal-close")) closeModal();
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const action = form.dataset.action;
  if (!action) return;
  await safe(async () => {
    if (action === "login") await login(form);
    if (action === "register") await register(form);
    if (action === "sendMessage") await sendMessage(form);
    if (action === "search") await search(form);
    if (action === "createGuild") await createGuild(form);
    if (action === "joinInvite") await joinInvite(form);
    if (action === "saveGuild") await saveGuild(form);
    if (action === "createChannel") await createChannel(form);
    if (action === "createRole") await createRole(form);
    if (action === "assignRoles") await assignRoles(form);
    if (action === "createInvite") await createInvite(form);
    if (action === "moderateMember") await moderateMember(form, event.submitter?.value);
    if (action === "updateProfile") await updateProfile(form);
  });
});

root.addEventListener("input", (event) => {
  if (event.target.matches('.composer textarea[name="content"]') && state.activeChannelId) {
    wsSend("typing:start", { channel_id: state.activeChannelId });
    event.target.style.height = "auto";
    event.target.style.height = Math.min(180, event.target.scrollHeight) + "px";
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches('.composer input[name="image"]')) {
    state.attachedImage = event.target.files?.[0] || null;
    const name = document.querySelector("[data-attachment-name]");
    if (name) name.textContent = state.attachedImage?.name || "";
  }
  if (event.target.matches('[data-action="streamQuality"]')) {
    state.streamQuality = event.target.value;
    if (state.voice.screen) notice("Quality applies next time you change the shared window.");
  }
  if (event.target.matches('[data-action="toggleRingAlerts"]')) {
    setRingAlerts(event.target.checked);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches('[data-peer-volume]')) {
    const userId = Number(event.target.dataset.peerVolume);
    peerSettings(userId).volume = Number(event.target.value) / 100;
    applyPeerMediaSettings(userId);
  }
});

document.addEventListener("contextmenu", (event) => {
  const target = event.target.closest("[data-peer-user-id]");
  if (!target) return;
  const userId = Number(target.dataset.peerUserId);
  if (!userId || userId === state.user?.id) return;
  event.preventDefault();
  showPeerMenu(event, userId);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".peer-menu") && !event.target.closest("[data-peer-user-id]")) closePeerMenu();
});

function fullscreenVideo(videoId) {
  const tile = [...document.querySelectorAll("[data-video-id]")].find((node) => node.dataset.videoId === videoId);
  if (!tile?.requestFullscreen) throw new Error("Fullscreen is not available in this browser.");
  return tile.requestFullscreen();
}

function closePeerMenu() {
  document.querySelectorAll(".peer-menu").forEach((node) => node.remove());
}

function toggleLocalPeerMute(userId) {
  const settings = peerSettings(userId);
  settings.muted = !settings.muted;
  applyPeerMediaSettings(userId);
  closePeerMenu();
  render();
}

function showPeerMenu(event, userId) {
  closePeerMenu();
  const member = state.snapshot?.members.find((item) => item.user_id === userId);
  const peer = [...state.voicePresence.values()].flatMap((room) => [...room.values()]).find((entry) => entry.user.id === userId);
  const label = member?.display_name || peer?.user?.display_name || peer?.user?.username || "User";
  const settings = peerSettings(userId);
  const menu = document.createElement("div");
  menu.className = "peer-menu";
  menu.style.left = `${Math.min(event.clientX, window.innerWidth - 260)}px`;
  menu.style.top = `${Math.min(event.clientY, window.innerHeight - 190)}px`;
  menu.innerHTML = `
    <strong>${escapeHtml(label)}</strong>
    <label>${iconText("volume", "Volume")}
      <input type="range" min="0" max="200" value="${Math.round(settings.volume * 100)}" data-peer-volume="${userId}">
    </label>
    <button data-action="localMutePeer" data-user-id="${userId}">${iconText(settings.muted ? "mic" : "micOff", settings.muted ? "Unmute locally" : "Mute locally")}</button>
    ${hasPermission("mute_members") ? `<button data-action="adminDisconnectVoice" data-user-id="${userId}">${iconText("phoneOff", "Disconnect from voice")}</button>` : ""}
  `;
  document.body.appendChild(menu);
}

async function safe(fn) {  try {
    await fn();
  } catch (error) {
    notice(error.message || String(error), "error");
  }
}

async function login(form) {
  const data = Object.fromEntries(new FormData(form));
  const result = await api("/api/login", { method: "POST", body: data });
  state.user = result.user;
  state.appVersion = result.version || APP_VERSION;
  state.guilds = result.guilds || [];
  connectWs();
  if (state.guilds.length) await loadGuild(state.guilds[0].id, state.guilds[0].default_channel_id);
  render();
}

async function register(form) {
  const data = Object.fromEntries(new FormData(form));
  const result = await api("/api/register", { method: "POST", body: data });
  state.user = result.user;
  state.appVersion = result.version || APP_VERSION;
  state.guilds = result.guilds || [];
  connectWs();
  if (state.guilds.length) await loadGuild(state.guilds[0].id, state.guilds[0].default_channel_id);
  render();
}

async function logout() {
  await api("/api/logout", { method: "POST", body: {} });
  stopDeviceTests(false);
  stopAllSpeakingMonitors();
  disconnectWs();
  state.user = null;
  state.guilds = [];
  state.snapshot = null;
  state.messages = [];
  state.voicePresence.clear();
  leaveVoice();
  render();
}

async function updateProfile(form) {
  const payload = Object.fromEntries(new FormData(form));
  const result = await api("/api/me", { method: "PATCH", body: payload });
  state.user = result.user;
  closeModal();
  render();
  notice("Profile updated");
}

async function createGuild(form) {
  const payload = Object.fromEntries(new FormData(form));
  const snapshot = await api("/api/guilds", { method: "POST", body: payload });
  state.snapshot = snapshot;
  const guilds = await api("/api/guilds");
  state.guilds = guilds.guilds;
  closeModal();
  await loadGuild(snapshot.guild.id);
}

async function joinInvite(form) {
  const code = new FormData(form).get("code");
  const snapshot = await api(`/api/invites/${encodeURIComponent(code)}/join`, { method: "POST", body: {} });
  const guilds = await api("/api/guilds");
  state.guilds = guilds.guilds;
  closeModal();
  await loadGuild(snapshot.guild.id);
}

async function saveGuild(form) {
  const payload = Object.fromEntries(new FormData(form));
  await api(`/api/guilds/${state.activeGuildId}`, { method: "PATCH", body: payload });
  await refreshGuilds();
  await loadGuild(state.activeGuildId);
  notice("Server saved");
}

async function refreshGuilds() {
  const result = await api("/api/guilds");
  state.guilds = result.guilds || [];
}

async function createChannel(form) {
  const payload = Object.fromEntries(new FormData(form));
  await api(`/api/guilds/${state.activeGuildId}/channels`, { method: "POST", body: payload });
  closeModal();
  await loadGuild(state.activeGuildId);
}

async function moveChannel(channelId, direction) {
  const channel = state.snapshot?.channels.find((item) => item.id === channelId);
  if (!channel) return;
  await api(`/api/channels/${channelId}`, {
    method: "PATCH",
    body: {
      name: channel.name,
      topic: channel.topic || "",
      slowmode_seconds: channel.slowmode_seconds || 0,
      position: Math.max(0, Number(channel.position || 0) + direction * 15)
    }
  });
  await loadGuild(state.activeGuildId);
}

async function deleteChannel(channelId) {
  if (!confirm("Delete this channel?")) return;
  await api(`/api/channels/${channelId}`, { method: "DELETE", body: {} });
  await loadGuild(state.activeGuildId);
}

async function sendMessage(form) {
  const textarea = form.elements.content;
  const content = textarea.value.trim();
  const imageFile = form.elements.image?.files?.[0] || null;
  if ((!content && !imageFile) || !state.activeChannelId) return;
  if (state.editingMessageId) {
    await api(`/api/messages/${state.editingMessageId}`, { method: "PATCH", body: { content } });
    state.editingMessageId = null;
  } else {
    const image = imageFile ? await readImageFile(imageFile) : null;
    await api(`/api/channels/${state.activeChannelId}/messages`, { method: "POST", body: { content, image } });
  }
  textarea.value = "";
  textarea.style.height = "auto";
  if (form.elements.image) form.elements.image.value = "";
  state.attachedImage = null;
  const name = document.querySelector("[data-attachment-name]");
  if (name) name.textContent = "";
}

async function deleteMessage(messageId, permanent = false) {
  await api(`/api/messages/${messageId}`, { method: "DELETE", body: { permanent } });
}

async function search(form) {
  const query = new FormData(form).get("query");
  if (!query) return;
  const results = await api(`/api/search?guild_id=${state.activeGuildId}&q=${encodeURIComponent(query)}`);
  state.searchResults = results.results || [];
  render();
}

async function createRole(form) {
  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    color: formData.get("color"),
    permissions: formData.getAll("permissions")
  };
  await api(`/api/guilds/${state.activeGuildId}/roles`, { method: "POST", body: payload });
  await loadGuild(state.activeGuildId);
}

async function assignRoles(form) {
  const formData = new FormData(form);
  const userId = Number(formData.get("user_id"));
  const roles = formData.getAll("roles").map(Number);
  await api(`/api/guilds/${state.activeGuildId}/members/${userId}/roles`, { method: "POST", body: { roles } });
  await loadGuild(state.activeGuildId);
}

async function createInvite(form) {
  const formData = new FormData(form);
  const payload = {};
  if (formData.get("max_uses")) payload.max_uses = Number(formData.get("max_uses"));
  if (formData.get("ttl_hours")) payload.ttl_hours = Number(formData.get("ttl_hours"));
  const result = await api(`/api/guilds/${state.activeGuildId}/invites`, { method: "POST", body: payload });
  notice(`Invite: ${result.invite.code}`);
  form.reset();
}

async function moderateMember(form, action) {
  const formData = new FormData(form);
  const userId = Number(formData.get("user_id"));
  const reason = String(formData.get("reason") || "");
  if (!userId || !action) return;
  if (action === "mute") {
    await api(`/api/guilds/${state.activeGuildId}/members/${userId}/voice`, { method: "POST", body: { muted: true, deafened: false } });
  } else if (action === "kick") {
    await api(`/api/guilds/${state.activeGuildId}/members/${userId}`, { method: "DELETE", body: { reason } });
  } else if (action === "ban") {
    await api(`/api/guilds/${state.activeGuildId}/members/${userId}/ban`, { method: "POST", body: { reason } });
  }
  await loadGuild(state.activeGuildId);
}

async function loadInvites() {
  const result = await api(`/api/guilds/${state.activeGuildId}/invites`);
  const output = document.getElementById("adminOutput");
  if (output) {
    output.innerHTML = (result.invites || []).map((invite) => `
      <div class="list-row">
        <strong>${escapeHtml(invite.code)}</strong>
        <span>${invite.uses}${invite.max_uses ? `/${invite.max_uses}` : ""}</span>
      </div>
    `).join("") || `<p class="empty">No invites</p>`;
  }
}

async function loadAudit() {
  const result = await api(`/api/guilds/${state.activeGuildId}/audit`);
  const output = document.getElementById("adminOutput");
  if (output) {
    output.innerHTML = (result.audit || []).map((entry) => `
      <div class="audit-row">
        <strong>${escapeHtml(entry.action)}</strong>
        <span>${escapeHtml(entry.actor_username || "system")} - ${formatTime(entry.created_at)}</span>
      </div>
    `).join("") || `<p class="empty">No audit entries</p>`;
  }
}


function voiceStatePayload() {
  return {
    muted: state.voice.muted,
    camera: state.voice.camera,
    screen: state.voice.screen
  };
}

function publishVoiceState() {
  if (!state.voice.channelId) return;
  const payload = voiceStatePayload();
  wsSend("voice:state", payload);
  if (state.user) setVoicePresence(state.voice.channelId, state.user, payload, false);
}

function applyLocalMuteTracks() {
  state.voice.localAudio?.getAudioTracks().forEach((track) => {
    track.enabled = !state.voice.muted;
  });
  renderSpeakingHighlights();
}

function refreshProfileSettingsModal() {
  const card = document.querySelector(".profile-modal");
  if (!card) return;
  card.outerHTML = renderProfileSettingsModal();
  syncDeviceTestElements();
}

async function toggleMicTest() {
  if (state.deviceTest.micStream) {
    stopMicTest(true);
    render();
    refreshProfileSettingsModal();
    return;
  }
  const stream = await requireMedia("Mic test").getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 2,
      sampleRate: 48000
    },
    video: false
  });
  state.deviceTest.micStream = stream;
  state.deviceTest.previousMuted = state.voice.channelId ? state.voice.muted : null;
  if (state.voice.channelId && !state.voice.muted) {
    state.voice.muted = true;
    applyLocalMuteTracks();
    publishVoiceState();
    playTone("mute");
  }
  render();
  refreshProfileSettingsModal();
  syncDeviceTestElements();
}

function stopMicTest(restoreVoice = true) {
  const previousMuted = state.deviceTest.previousMuted;
  state.deviceTest.micStream?.getTracks().forEach((track) => track.stop());
  state.deviceTest.micStream = null;
  state.deviceTest.previousMuted = null;
  if (state.deviceTest.micAudio) {
    state.deviceTest.micAudio.pause();
    state.deviceTest.micAudio.srcObject = null;
    state.deviceTest.micAudio = null;
  }
  if (restoreVoice && state.voice.channelId && previousMuted !== null && state.voice.muted !== previousMuted) {
    state.voice.muted = previousMuted;
    applyLocalMuteTracks();
    publishVoiceState();
    playTone(state.voice.muted ? "mute" : "unmute");
  }
}

async function toggleCameraTest() {
  if (state.deviceTest.cameraStream) {
    stopCameraTest();
    refreshProfileSettingsModal();
    return;
  }
  const stream = await requireMedia("Camera test").getUserMedia({
    audio: false,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 60 }
    }
  });
  state.deviceTest.cameraStream = stream;
  refreshProfileSettingsModal();
  syncDeviceTestElements();
}

function stopCameraTest() {
  state.deviceTest.cameraStream?.getTracks().forEach((track) => track.stop());
  state.deviceTest.cameraStream = null;
  const video = document.getElementById("cameraTestVideo");
  if (video) video.srcObject = null;
}

function stopDeviceTests(restoreVoice = true) {
  stopMicTest(restoreVoice);
  stopCameraTest();
}

function syncDeviceTestElements() {
  const audio = document.getElementById("micTestAudio");
  if (audio) {
    if (state.deviceTest.micStream) {
      state.deviceTest.micAudio = audio;
      if (audio.srcObject !== state.deviceTest.micStream) audio.srcObject = state.deviceTest.micStream;
      audio.muted = false;
      audio.volume = 0.8;
      const play = audio.play();
      if (play?.catch) play.catch(() => {});
    } else {
      audio.pause();
      audio.srcObject = null;
    }
  }
  const video = document.getElementById("cameraTestVideo");
  if (video) {
    if (state.deviceTest.cameraStream) {
      if (video.srcObject !== state.deviceTest.cameraStream) video.srcObject = state.deviceTest.cameraStream;
      video.classList.add("has-video");
      const play = video.play();
      if (play?.catch) play.catch(() => {});
    } else {
      video.srcObject = null;
      video.classList.remove("has-video");
    }
  }
}

async function joinVoice(channelId, ghost = false) {
  const channel = state.snapshot?.channels.find((item) => item.id === channelId);
  if (!channel) return;
  if (!ghost) await ensureAudio();
  state.voice.channelId = channelId;
  state.voice.channelName = channel.name;
  state.voice.ghost = ghost;
  state.voice.muted = ghost ? true : state.voice.muted;
  wsSend(ghost ? "voice:ghost_join" : "voice:join", { channel_id: channelId });
  render();
}

async function ensureAudio() {
  if (state.voice.localAudio) return state.voice.localAudio;
  const stream = await requireMedia("Voice chat").getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 2,
      sampleRate: 48000
    },
    video: false
  });
  state.voice.localAudio = stream;
  stream.getAudioTracks().forEach((track) => {
    track.enabled = !state.voice.muted;
    track._mielcordSource = "audio";
  });
  startSpeakingMonitor(state.user?.id, stream, () => state.voice.muted);
  return stream;
}

function handleVoiceJoined(payload) {
  state.voice.channelId = payload.channel.id;
  state.voice.channelName = payload.channel.name;
  state.voice.ghost = !!payload.ghost;
  state.voice.peers.clear();
  state.voice.pcs.forEach((pc) => pc.close());
  state.voice.pcs.clear();
  stopAllSpeakingMonitors();
  if (state.voice.ghost) {
    state.voice.muted = true;
    state.voice.camera = false;
    state.voice.screen = false;
    state.voice.localAudio?.getTracks().forEach((track) => track.stop());
    state.voice.localAudio = null;
  } else {
    setVoicePresence(state.voice.channelId, state.user, { muted: state.voice.muted, camera: state.voice.camera, screen: state.voice.screen });
  }
  for (const peer of payload.peers || []) {
    setVoicePresence(state.voice.channelId, peer.user, peer.state || {});
    state.voice.peers.set(peer.user.id, {
      user: peer.user,
      state: peer.state || {},
      channelId: state.voice.channelId,
      stream: new MediaStream()
    });
  }
  if (!state.voice.ghost) playTone("join");
  render();
  for (const peer of payload.peers || []) {
    createPeer(peer.user.id, true).catch((error) => notice(error.message, "error"));
  }
}

function handlePeerJoined(payload) {
  setVoicePresence(payload.channel_id, payload.user, payload.state || {});
  if (!state.voice.ghost && payload.user.id !== state.user.id) playTone("join");
  if (payload.channel_id !== state.voice.channelId || payload.user.id === state.user.id) {
    render();
    return;
  }
  if (!state.voice.peers.has(payload.user.id)) {
    state.voice.peers.set(payload.user.id, {
      user: payload.user,
      state: payload.state || {},
      channelId: payload.channel_id,
      stream: new MediaStream()
    });
  }
  render();
  if (state.voice.ghost) createPeer(payload.user.id, true).catch((error) => notice(error.message, "error"));
}

function closePeerConnection(userId) {
  const pc = state.voice.pcs.get(Number(userId));
  if (pc) pc.close();
  state.voice.pcs.delete(Number(userId));
}

function removePeer(userId) {
  closePeerConnection(userId);
  state.voice.peers.delete(userId);
  stopSpeakingMonitor(userId);
  render();
}

async function createPeer(userId, initiator = false) {
  if (state.voice.pcs.has(userId)) return state.voice.pcs.get(userId);
  const pc = new RTCPeerConnection(rtcConfig);
  state.voice.pcs.set(userId, pc);
  const peer = state.voice.peers.get(userId);
  if (peer && !peer.stream) peer.stream = new MediaStream();

  addLocalTracks(pc);

  pc.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      wsSend("rtc:signal", {
        channel_id: state.voice.channelId,
        target_user_id: userId,
        signal: { candidate: event.candidate }
      });
    }
  });

  pc.addEventListener("track", (event) => {
    const currentPeer = state.voice.peers.get(userId);
    if (!currentPeer) return;
    if (!currentPeer.stream) currentPeer.stream = new MediaStream();
    currentPeer.stream.addTrack(event.track);
    if (event.track.kind === "audio") {
      event.track.addEventListener("ended", () => stopSpeakingMonitor(userId));
      startSpeakingMonitor(userId, currentPeer.stream);
    }
    syncMediaElements();
  });

  pc.addEventListener("connectionstatechange", () => {
    if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
      if (pc.connectionState === "failed") pc.restartIce();
    }
  });

  if (initiator) await negotiate(userId);
  return pc;
}

function addLocalTracks(pc) {
  const streams = [state.voice.localAudio, state.voice.cameraStream, state.voice.screenStream].filter(Boolean);
  for (const stream of streams) {
    for (const track of stream.getTracks()) {
      if (!pc.getSenders().some((sender) => sender.track === track)) {
        pc.addTrack(track, stream);
      }
    }
  }
}

async function negotiate(userId) {
  const pc = state.voice.pcs.get(userId) || await createPeer(userId, false);
  addLocalTracks(pc);
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  });
  await pc.setLocalDescription(offer);
  wsSend("rtc:signal", {
    channel_id: state.voice.channelId,
    target_user_id: userId,
    signal: { description: pc.localDescription }
  });
}

async function handleRtcSignal(payload) {
  const userId = payload.from_user_id;
  const signal = payload.signal || {};
  let pc = state.voice.pcs.get(userId);
  if (!pc) pc = await createPeer(userId, false);

  if (signal.description) {
    await pc.setRemoteDescription(signal.description);
    if (signal.description.type === "offer") {
      addLocalTracks(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsSend("rtc:signal", {
        channel_id: state.voice.channelId,
        target_user_id: userId,
        signal: { description: pc.localDescription }
      });
    }
  }
  if (signal.candidate) {
    await pc.addIceCandidate(signal.candidate).catch(() => {});
  }
}

function toggleMute() {
  if (state.voice.ghost) return;
  state.voice.muted = !state.voice.muted;
  playTone(state.voice.muted ? "mute" : "unmute");
  applyLocalMuteTracks();
  publishVoiceState();
  render();
}

async function toggleCamera() {
  if (!state.voice.channelId || state.voice.ghost) return;
  if (state.voice.cameraStream) {
    removeLocalSource("camera");
    state.voice.cameraStream.getTracks().forEach((track) => track.stop());
    state.voice.cameraStream = null;
    state.voice.camera = false;
  } else {
    const stream = await requireMedia("Camera").getUserMedia({
      audio: false,
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 }
      }
    });
    stream.getVideoTracks().forEach((track) => {
      track._mielcordSource = "camera";
    });
    state.voice.cameraStream = stream;
    state.voice.camera = true;
    for (const pc of state.voice.pcs.values()) addLocalTracks(pc);
  }
  await renegotiateAll();
  wsSend("voice:state", {
    muted: state.voice.muted,
    camera: state.voice.camera,
    screen: state.voice.screen
  });
  render();
}

async function startScreenShare() {
  const devices = mediaDevices();
  if (!devices?.getDisplayMedia) throw new Error("Screen sharing is not available in this browser.");
  const stream = await devices.getDisplayMedia({
    video: streamConstraints(),
    audio: true
  });
  stream.getTracks().forEach((track) => {
    track._mielcordSource = track.kind === "video" ? "screen" : "screen-audio";
    track.addEventListener("ended", () => {
      if (track._mielcordSource === "screen") {
        stopScreenShare(false);
        wsSend("voice:state", {
          muted: state.voice.muted,
          camera: state.voice.camera,
          screen: false
        });
        render();
      }
    });
  });
  state.voice.screenStream = stream;
  state.voice.screen = true;
  playTone("stream");
  for (const pc of state.voice.pcs.values()) addLocalTracks(pc);
  await renegotiateAll();
}

function stopScreenShare(renegotiate = true) {
  removeLocalSource("screen");
  state.voice.screenStream?.getTracks().forEach((track) => track.stop());
  state.voice.screenStream = null;
  if (state.voice.screen) playTone("stopStream");
  state.voice.screen = false;
  if (renegotiate) renegotiateAll().catch(() => {});
}

async function toggleScreen() {
  if (!state.voice.channelId || state.voice.ghost) return;
  if (state.voice.screenStream) {
    stopScreenShare();
  } else {
    await startScreenShare();
  }
  wsSend("voice:state", {
    muted: state.voice.muted,
    camera: state.voice.camera,
    screen: state.voice.screen
  });
  render();
}

async function changeScreenShare() {
  if (!state.voice.channelId || state.voice.ghost) return;
  if (state.voice.screenStream) stopScreenShare(false);
  await startScreenShare();
  wsSend("voice:state", {
    muted: state.voice.muted,
    camera: state.voice.camera,
    screen: state.voice.screen
  });
  render();
}

function removeLocalSource(source) {
  for (const pc of state.voice.pcs.values()) {
    for (const sender of pc.getSenders()) {
      if (sender.track?._mielcordSource === source || (source === "screen" && sender.track?._mielcordSource === "screen-audio")) {
        pc.removeTrack(sender);
      }
    }
  }
}

async function renegotiateAll() {
  await Promise.all([...state.voice.pcs.keys()].map((userId) => negotiate(userId).catch(() => {})));
}

function leaveVoice(notify = true) {
  const previousGhost = state.voice.ghost;
  const previousChannelId = state.voice.channelId;
  if (notify) wsSend("voice:leave", {});
  state.voice.pcs.forEach((pc) => pc.close());
  state.voice.pcs.clear();
  state.voice.peers.clear();
  stopAllSpeakingMonitors();
  state.voice.localAudio?.getTracks().forEach((track) => track.stop());
  state.voice.cameraStream?.getTracks().forEach((track) => track.stop());
  state.voice.screenStream?.getTracks().forEach((track) => track.stop());
  state.voice.localAudio = null;
  state.voice.cameraStream = null;
  state.voice.screenStream = null;
  state.voice.channelId = null;
  state.voice.channelName = "";
  state.voice.muted = false;
  state.voice.camera = false;
  state.voice.screen = false;
  state.voice.ghost = false;
  state.focusedVideoId = null;
  state.callCollapsed = false;
  if (previousChannelId) {
    if (!previousGhost) removeVoicePresence(state.user?.id);
    if (!previousGhost) playTone("leave");
  }
  render();
}

function syncMediaElements() {
  if (state.voice.localAudio) startSpeakingMonitor(state.user?.id, state.voice.localAudio, () => state.voice.muted);
  const local = document.getElementById("video-local");
  if (local) {
    const stream = new MediaStream();
    for (const source of [state.voice.cameraStream, state.voice.screenStream]) {
      source?.getVideoTracks().forEach((track) => stream.addTrack(track));
    }
    const hasLocalVideo = stream.getVideoTracks().length > 0;
    local.srcObject = stream.getTracks().length ? stream : null;
    local.classList.toggle("has-video", hasLocalVideo);
  }
  for (const [userId, peer] of state.voice.peers) {
    const video = document.getElementById(`video-peer-${userId}`);
    if (video && peer.stream) {
      video.srcObject = peer.stream;
      video.classList.toggle("has-video", peer.stream.getVideoTracks().length > 0);
      if (peer.stream.getAudioTracks().length) startSpeakingMonitor(userId, peer.stream);
      applyPeerMediaSettings(userId);
    }
  }
  renderSpeakingHighlights();
}

init();
