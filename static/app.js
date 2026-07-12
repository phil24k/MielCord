const root = document.getElementById("root");
const APP_VERSION = "2.1.0";

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

function loadClientString(key, fallback = "") {
  try {
    return localStorage.getItem(`mielcord:${key}`) || fallback;
  } catch {
    return fallback;
  }
}

function saveClientString(key, value) {
  try {
    localStorage.setItem(`mielcord:${key}`, value || "");
  } catch {}
}

function loadClientJson(key, fallback) {
  try {
    const value = localStorage.getItem(`mielcord:${key}`);
    return value ? { ...fallback, ...JSON.parse(value) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function saveClientJson(key, value) {
  try {
    localStorage.setItem(`mielcord:${key}`, JSON.stringify(value));
  } catch {}
}

const DEFAULT_THEME = {
  preset: "default",
  bg: "#171615",
  panel: "#22201d",
  panel2: "#2d2924",
  panel3: "#37312a",
  line: "#4a4339",
  text: "#f4efe6",
  muted: "#b8aa98",
  honey: "#d99a23",
  teal: "#2a9d8f",
  berry: "#c44569",
  danger: "#e15b4f",
  ok: "#5c946e"
};

const THEME_CSS_VARS = {
  bg: "--bg",
  panel: "--panel",
  panel2: "--panel-2",
  panel3: "--panel-3",
  line: "--line",
  text: "--text",
  muted: "--muted",
  honey: "--honey",
  teal: "--teal",
  berry: "--berry",
  danger: "--danger",
  ok: "--ok"
};

const THEME_CONTROLS = [
  ["bg", "Background"],
  ["panel", "Main panels"],
  ["panel2", "Raised panels"],
  ["panel3", "Buttons"],
  ["line", "Borders"],
  ["text", "Text"],
  ["muted", "Muted text"],
  ["honey", "Honey accent"],
  ["teal", "Call accent"],
  ["berry", "Berry accent"],
  ["danger", "Danger"],
  ["ok", "Success"]
];

const THEME_PRESETS = {
  default: {
    label: "Mielcord",
    description: "Default honey dark",
    className: "",
    colors: { ...DEFAULT_THEME, preset: "default" },
    swatches: ["#171615", "#d99a23", "#2a9d8f"]
  },
  cyberpunk: {
    label: "Cyberpunk",
    description: "Neon city glow",
    className: "theme-cyberpunk",
    colors: {
      preset: "cyberpunk",
      bg: "#080713",
      panel: "#111225",
      panel2: "#181833",
      panel3: "#25224b",
      line: "#5b3df5",
      text: "#f8f4ff",
      muted: "#a5b7ff",
      honey: "#ffe66d",
      teal: "#00f5ff",
      berry: "#ff2a6d",
      danger: "#ff3b58",
      ok: "#39ff88"
    },
    swatches: ["#080713", "#00f5ff", "#ff2a6d"]
  },
  windowsXp: {
    label: "Windows XP",
    description: "Y2K pastel desktop",
    className: "theme-windows-xp",
    colors: {
      preset: "windowsXp",
      bg: "#12c9ef",
      panel: "#bdf6ff",
      panel2: "#fff8fd",
      panel3: "#f7b7df",
      line: "#166b86",
      text: "#16313c",
      muted: "#586a72",
      honey: "#ffe45e",
      teal: "#00b7d8",
      berry: "#ff7bc8",
      danger: "#ff5f8f",
      ok: "#55c96f"
    },
    swatches: ["#12c9ef", "#f7b7df", "#ffe45e"]
  },
  liquidGlass: {
    label: "Liquid Glass",
    description: "Dark refractive glass",
    className: "theme-liquid-glass",
    colors: {
      preset: "liquidGlass",
      bg: "#07090d",
      panel: "#11161d",
      panel2: "#1a2029",
      panel3: "#29313c",
      line: "#505b69",
      text: "#f4f7fb",
      muted: "#aab5c3",
      honey: "#f3ca70",
      teal: "#68d5c5",
      berry: "#c49aff",
      danger: "#ff6f7d",
      ok: "#70d998"
    },
    swatches: ["#080b11", "#8fd8ff", "#c49aff"]
  }
};

const state = {
  user: null,
  appVersion: APP_VERSION,
  hostConfig: {
    privateMode: false,
    countryRestriction: false,
    allowedCountries: [],
    rtcIceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
  },
  clientSettings: {
    ringAlerts: loadClientBool("ringAlerts", true),
    inputDeviceId: loadClientString("inputDeviceId", ""),
    outputDeviceId: loadClientString("outputDeviceId", ""),
    micSensitivity: Number(loadClientString("micSensitivity", "65"))
  },
  settingsTab: "account",
  audioDevices: {
    inputs: [],
    outputs: [],
    loaded: false
  },
  clientTheme: loadClientJson("theme", DEFAULT_THEME),
  guilds: [],
  snapshot: null,
  activeGuildId: null,
  activeChannelId: null,
  messages: [],
  online: new Set(),
  mobileOnline: new Set(),
  typing: new Map(),
  searchResults: [],
  editingMessageId: null,
  attachedFile: null,
  attachedPreviewUrl: "",
  audioContext: null,
  voicePresence: new Map(),
  peerSettings: new Map(),
  speaking: new Set(),
  speakingMonitors: new Map(),
  overlayState: null,
  focusedVideoId: null,
  fullscreenVideoId: null,
  callCollapsed: false,
  mobileChannelsOpen: false,
  pendingVoiceHandoff: null,
  streamQuality: loadClientString("streamQuality", "1080p"),
  deviceTest: {
    micStream: null,
    micAudio: null,
    cameraStream: null,
    previousMuted: null
  },
  ws: null,
  wsReconnect: null,
  wsHeartbeat: null,
  wsLastPong: 0,
  resizeRender: null,
  voice: {
    channelId: null,
    channelName: "",
    localAudio: null,
    cameraStream: null,
    screenStream: null,
    muted: false,
    deafened: false,
    camera: false,
    screen: false,
    ghost: false,
    peers: new Map(),
    pcs: new Map(),
    healthTimer: null,
    videoFrameTimes: new Map()
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
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  iceCandidatePoolSize: 6,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};


const icons = {
  login: '<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  message: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.18.38.5.7.88.88.33.15.7.2 1.1.2H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.92Z"/></svg>',
  brush: '<svg viewBox="0 0 24 24"><path d="m9.06 11.9 6.01-6.02a2.1 2.1 0 0 1 2.97 0l.08.08a2.1 2.1 0 0 1 0 2.97l-6.02 6.01"/><path d="M7 14c-2 0-3 1.5-3 3.5 0 1.4-1 2.5-2 2.5 2.5 1 6 .5 7.7-1.2 1.5-1.5 1.4-3.7-.1-4.8A4 4 0 0 0 7 14Z"/><path d="m14 6 4 4"/></svg>',
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
  headphones: '<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M4 2 2 4"/><path d="M22 4l-2-2"/></svg>',
  ghost: '<svg viewBox="0 0 24 24"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a7 7 0 0 0-7 7v11l2-1.5L9 20l3-2 3 2 2-1.5 2 1.5V9a7 7 0 0 0-7-7Z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>'
};

function icon(name) {
  return `<span class="button-icon" aria-hidden="true">${icons[name] || ""}</span>`;
}

function iconText(name, text) {
  return `${icon(name)}<span>${escapeHtml(text)}</span>`;
}

function applyClientTheme(theme = state.clientTheme) {
  const merged = { ...DEFAULT_THEME, ...(theme || {}) };
  const rootEl = document.documentElement;
  Object.values(THEME_PRESETS).forEach((preset) => {
    if (preset.className) rootEl.classList.remove(preset.className);
  });
  const preset = THEME_PRESETS[merged.preset] || null;
  if (preset?.className) rootEl.classList.add(preset.className);
  for (const [key, cssVar] of Object.entries(THEME_CSS_VARS)) {
    document.documentElement.style.setProperty(cssVar, merged[key]);
  }
}

function setThemeColor(key, value) {
  if (!THEME_CSS_VARS[key] || !/^#[0-9a-f]{6}$/i.test(value || "")) return;
  state.clientTheme = { ...state.clientTheme, preset: "custom", [key]: value };
  applyClientTheme(state.clientTheme);
  saveClientJson("theme", state.clientTheme);
}

function applyThemePreset(presetId) {
  const preset = THEME_PRESETS[presetId];
  if (!preset) return;
  state.clientTheme = { ...DEFAULT_THEME, ...preset.colors, preset: presetId };
  applyClientTheme(state.clientTheme);
  saveClientJson("theme", state.clientTheme);
  renderThemeSettingsOnly();
}

function resetClientTheme() {
  state.clientTheme = { ...DEFAULT_THEME };
  applyClientTheme(state.clientTheme);
  saveClientJson("theme", state.clientTheme);
  renderThemeSettingsOnly();
}

function renderThemeSettingsOnly() {
  const panel = document.querySelector("[data-theme-settings]");
  if (panel) panel.innerHTML = renderThemeControls();
}

applyClientTheme(state.clientTheme);

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

function audioInputConstraints() {
  const deviceId = state.clientSettings.inputDeviceId;
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 2,
    sampleRate: 48000
  };
}

async function refreshMediaDevices() {
  const devices = mediaDevices();
  if (!devices?.enumerateDevices) {
    state.audioDevices = { inputs: [], outputs: [], loaded: true };
    renderDeviceSettingsOnly();
    return;
  }
  const list = await devices.enumerateDevices();
  state.audioDevices = {
    inputs: list.filter((device) => device.kind === "audioinput"),
    outputs: list.filter((device) => device.kind === "audiooutput"),
    loaded: true
  };
  renderDeviceSettingsOnly();
}

function renderDeviceOptions(devices, selected, fallback) {
  const options = [`<option value="">${escapeHtml(fallback)}</option>`];
  devices.forEach((device, index) => {
    const label = device.label || `Device ${index + 1}`;
    options.push(`<option value="${escapeHtml(device.deviceId)}" ${device.deviceId === selected ? "selected" : ""}>${escapeHtml(label)}</option>`);
  });
  return options.join("");
}

function renderDeviceSettings() {
  const outputSupported = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  return `
    <header>
      <strong>Audio devices</strong>
      <span>${state.audioDevices.loaded ? "This browser" : "Not loaded"}</span>
    </header>
    <label>Microphone
      <select data-device-select="input">
        ${renderDeviceOptions(state.audioDevices.inputs, state.clientSettings.inputDeviceId, "Default microphone")}
      </select>
    </label>
    <label>Headphones / speakers
      <select data-device-select="output" ${outputSupported ? "" : "disabled"}>
        ${renderDeviceOptions(state.audioDevices.outputs, state.clientSettings.outputDeviceId, outputSupported ? "Default output" : "Output selection unsupported")}
      </select>
    </label>
    <button type="button" data-action="refreshDevices">${iconText("volume", "Refresh devices")}</button>
  `;
}

function renderDeviceSettingsOnly() {
  const section = document.querySelector("[data-device-settings]");
  if (section) section.innerHTML = renderDeviceSettings();
}

async function setClientDevice(kind, value) {
  if (kind === "input") {
    state.clientSettings.inputDeviceId = value;
    saveClientString("inputDeviceId", value);
    if (state.voice.channelId && !state.voice.ghost) await restartLocalAudio();
  }
  if (kind === "output") {
    state.clientSettings.outputDeviceId = value;
    saveClientString("outputDeviceId", value);
    applyAudioOutputToExisting();
  }
}

function applyAudioOutput(audio) {
  if (!audio?.setSinkId) return;
  audio.setSinkId(state.clientSettings.outputDeviceId || "").catch(() => {});
}

function applyAudioOutputToExisting() {
  document.querySelectorAll("audio").forEach((audio) => applyAudioOutput(audio));
}

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const ZIP_MIME_TYPES = ["application/zip", "application/x-zip-compressed", "multipart/x-zip"];

function isZipFile(file) {
  return ZIP_MIME_TYPES.includes(file.type) || String(file.name || "").toLowerCase().endsWith(".zip");
}

async function readFileBase64(file, errorLabel) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${errorLabel}.`));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

async function readComposerFile(file) {
  if (!file) return { image: null, attachment: null };
  if (IMAGE_MIME_TYPES.includes(file.type)) {
    if (file.size > 2_000_000) throw new Error("Image is too large. Keep it under 2 MB.");
    return {
      image: { name: file.name, mime: file.type, data: await readFileBase64(file, "image") },
      attachment: null
    };
  }
  if (isZipFile(file)) {
    if (file.size > 50_000_000) throw new Error("ZIP file is too large. Keep it under 50 MB.");
    return {
      image: null,
      attachment: { name: file.name, mime: file.type || "application/zip", size: file.size, data: await readFileBase64(file, "ZIP file") }
    };
  }
  throw new Error("Attach a PNG, JPEG, GIF, WebP, or ZIP file.");
}

function revokeAttachmentPreviewUrl() {
  if (!state.attachedPreviewUrl) return;
  const urlApi = window.URL || window.webkitURL;
  try { urlApi?.revokeObjectURL(state.attachedPreviewUrl); } catch {}
  state.attachedPreviewUrl = "";
}

function setAttachedFile(file) {
  revokeAttachmentPreviewUrl();
  state.attachedFile = file || null;
  const urlApi = window.URL || window.webkitURL;
  if (state.attachedFile && IMAGE_MIME_TYPES.includes(state.attachedFile.type) && urlApi?.createObjectURL) {
    state.attachedPreviewUrl = urlApi.createObjectURL(state.attachedFile);
  }
  renderAttachmentPreviewOnly();
}

function clearAttachedFile(input = null) {
  revokeAttachmentPreviewUrl();
  state.attachedFile = null;
  const field = input || document.querySelector('.composer input[name="attachment"]');
  if (field) field.value = "";
  renderAttachmentPreviewOnly();
}

function renderAttachmentPreview() {
  const file = state.attachedFile;
  if (!file) return "";
  const imagePreview = IMAGE_MIME_TYPES.includes(file.type) && state.attachedPreviewUrl;
  const label = imagePreview ? "Image" : (isZipFile(file) ? "ZIP file" : "File");
  return `
    <div class="attachment-preview ${imagePreview ? "with-image" : ""}">
      ${imagePreview ? `<img src="${escapeHtml(state.attachedPreviewUrl)}" alt="${escapeHtml(file.name)}">` : `<div class="attachment-preview-icon">${icon("file")}</div>`}
      <div>
        <strong>${escapeHtml(file.name)}</strong>
        <span>${label} - ${formatFileSize(file.size || 0)}</span>
      </div>
      <button class="icon-button" type="button" data-action="clearAttachment" title="Remove attachment">${icon("close")}</button>
    </div>
  `;
}

function renderAttachmentPreviewOnly() {
  const slot = document.querySelector("[data-attachment-preview]");
  if (slot) slot.innerHTML = renderAttachmentPreview();
}


const STREAM_PROFILES = {
  "720p": { width: 1280, height: 720, frameRate: 30, maxBitrate: 3_000_000 },
  "1080p": { width: 1920, height: 1080, frameRate: 60, maxBitrate: 8_000_000 },
  "1440p": { width: 2560, height: 1440, frameRate: 60, maxBitrate: 16_000_000 },
  "4k": { width: 3840, height: 2160, frameRate: 60, maxBitrate: 32_000_000 },
  "5k": { width: 5120, height: 2880, frameRate: 60, maxBitrate: 46_000_000 },
  "source": { width: 7680, height: 4320, frameRate: 60, maxBitrate: 64_000_000 }
};

function streamProfile() {
  return STREAM_PROFILES[state.streamQuality] || STREAM_PROFILES["1080p"];
}

function streamConstraints() {
  const picked = streamProfile();
  return {
    width: { ideal: picked.width },
    height: { ideal: picked.height },
    frameRate: { ideal: picked.frameRate, max: picked.frameRate }
  };
}

function peerSettings(userId) {
  const key = Number(userId);
  if (!state.peerSettings.has(key)) {
    const stored = loadClientJson(`peerMedia:${key}`, {
      muted: false,
      volume: 1,
      streamVolume: 1
    });
    state.peerSettings.set(key, {
      muted: !!stored.muted,
      volume: Math.max(0, Math.min(2, Number(stored.volume) || 0)),
      streamVolume: Math.max(0, Math.min(2, Number(stored.streamVolume) || 0))
    });
  }
  return state.peerSettings.get(key);
}

function savePeerSettings(userId) {
  saveClientJson(`peerMedia:${Number(userId)}`, peerSettings(userId));
}

function applyPeerMediaSettings(userId) {
  const settings = peerSettings(userId);
  for (const videoId of [`video-peer-${userId}`, `video-screen-peer-${userId}`]) {
    const video = document.getElementById(videoId);
    if (video) {
      video.volume = 0;
      video.muted = true;
      video.defaultMuted = true;
    }
  }
  const audio = document.getElementById(`audio-peer-${userId}`);
  if (audio) {
    audio.volume = settings.volume;
    audio.muted = state.voice.deafened || settings.muted;
    applyAudioOutput(audio);
  }
  const streamAudio = document.getElementById(`audio-screen-peer-${userId}`);
  if (streamAudio) {
    streamAudio.volume = settings.streamVolume;
    streamAudio.muted = state.voice.deafened || settings.muted;
    applyAudioOutput(streamAudio);
  }
}


function setSpeaking(userId, active) {
  const key = Number(userId);
  if (!key) return;
  const changed = active ? !state.speaking.has(key) : state.speaking.has(key);
  if (active) state.speaking.add(key);
  else state.speaking.delete(key);
  if (changed && key === state.user?.id && state.voice.channelId && !state.voice.ghost) {
    wsSend("voice:speaking", { speaking: active });
  }
  if (changed) renderSpeakingHighlights();
}

function currentOverlayState() {
  if (!state.voice.channelId) return { channel_id: null, channel_name: "", users: [] };
  const users = voiceUsersFor(state.voice.channelId).map((entry) => ({
    user: entry.user,
    muted: !!entry.state?.muted,
    camera: !!entry.state?.camera,
    screen: !!entry.state?.screen,
    speaking: state.speaking.has(Number(entry.user.id)) || !!entry.state?.speaking
  }));
  return { channel_id: state.voice.channelId, channel_name: state.voice.channelName, users };
}

function publishOverlayState() {
  state.overlayState = currentOverlayState();
  window.MielcordOverlay = state.overlayState;
  window.dispatchEvent(new CustomEvent("mielcord:voice-overlay", { detail: state.overlayState }));
}

function renderSpeakingHighlights() {
  document.querySelectorAll("[data-user-id]").forEach((node) => {
    node.classList.toggle("speaking", state.speaking.has(Number(node.dataset.userId)));
  });
  publishOverlayState();
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
  analyser.fftSize = 1024;
  source.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const monitor = { stream, source, analyser, samples, muted, frame: null, hot: 0, silent: 0, level: 0 };
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
    const rawLevel = Math.sqrt(sum / samples.length);
    monitor.level = monitor.level ? monitor.level * 0.82 + rawLevel * 0.18 : rawLevel;
    const alreadySpeaking = state.speaking.has(key);
    const sensitivity = Math.max(0, Math.min(100, Number(state.clientSettings.micSensitivity || 65)));
    const startThreshold = 4 + ((100 - sensitivity) / 100) * 14;
    const threshold = alreadySpeaking ? Math.max(2.5, startThreshold * 0.65) : startThreshold;
    const active = liveAudio && !monitor.muted() && monitor.level > threshold;
    if (active) {
      monitor.hot += 1;
      monitor.silent = 0;
    } else {
      monitor.silent += 1;
      monitor.hot = 0;
    }
    if (monitor.hot >= 5) setSpeaking(key, true);
    if (monitor.silent >= 24) setSpeaking(key, false);
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
    connectWs(true);
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
      allowedCountries: config.allowed_country_codes || [],
      rtcIceServers: Array.isArray(config.rtc_ice_servers) && config.rtc_ice_servers.length
        ? config.rtc_ice_servers
        : [{ urls: ["stun:stun.l.google.com:19302"] }]
    };
    rtcConfig.iceServers = state.hostConfig.rtcIceServers;
  } catch (error) {
    notice(error.message || "Could not load host config", "error");
  }
}

function renderLoading() {
  root.innerHTML = `
    <main class="auth-screen">
      <section class="auth-card compact">
        <div class="brand-lockup">
          <img class="brand-logo" src="/mielcord_logo_st.png" alt="">
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
          <img class="brand-logo" src="/mielcord_logo_st.png" alt="">
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
    <div class="app-shell ${state.voice.channelId ? "in-call" : ""} ${state.mobileChannelsOpen ? "mobile-channels-open" : ""}">
      ${renderChannelPane()}
      <button class="mobile-drawer-backdrop" data-action="closeMobileChannels" aria-label="Close channel list"></button>
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
    <aside class="channel-pane" id="channelPane" aria-label="Channels">
      <header class="server-header">
        <div class="server-title">
          <img class="server-logo" src="/mielcord_logo_st.png" alt="">
          <div>
            <h2>${escapeHtml(guild?.name || "Mielcord")}</h2>
            <p>${escapeHtml(guild?.description || state.user.username)}</p>
          </div>
        </div>
        <div class="server-header-actions">
          ${canAdmin()
            ? `<button class="icon-button" data-open-modal="guildSettings" title="Guild settings">${icon("settings")}</button>`
            : `<button class="icon-button" data-open-modal="memberDirectory" title="Members">${icon("users")}</button>`}
          <button class="icon-button mobile-drawer-close" data-action="closeMobileChannels" title="Close channels" aria-label="Close channels">${icon("close")}</button>
        </div>
      </header>
      <div class="channel-list-scroll">
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
      </div>
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
      ${users.map((entry) => {
        const isSpeaking = state.speaking.has(Number(entry.user.id)) || !!entry.state?.speaking;
        return `
        <div class="voice-roster-user ${isSpeaking ? "speaking" : ""}" data-user-id="${entry.user.id}" data-peer-user-id="${entry.user.id}">
          ${renderAvatar(entry.user, "mini")}
          <span class="voice-roster-name">${escapeHtml(entry.user.display_name || entry.user.username)}</span>
          <span class="voice-roster-icons">
            ${entry.state?.muted ? icon("micOff") : ""}
            ${entry.state?.screen ? icon("screen") : ""}
          </span>
        </div>
      `;
      }).join("")}
    </div>
  `;
}

function renderVoiceDock() {
  const inVoice = !!state.voice.channelId;
  const ringable = inVoice && !state.voice.ghost ? ringableMembers() : [];
  return `
    <section class="voice-dock ${inVoice ? "connected" : ""} ${state.voice.ghost ? "ghost" : ""}">
      <div>
        <strong>${inVoice ? escapeHtml(state.voice.channelName) : "Voice"}</strong>
        <span>${inVoice ? (state.voice.ghost ? "Ghost listening" : "Connected") : "Disconnected"}</span>
      </div>
      ${inVoice ? `<div class="dock-actions">
        ${state.voice.ghost ? `<button class="icon-button active" title="Ghost listening">${icon("ghost")}</button>` : `
          <button class="icon-button ${state.voice.muted ? "danger" : ""}" data-action="toggleMute" title="Mute">${icon(state.voice.muted ? "micOff" : "mic")}</button>
          <button class="icon-button ${state.voice.deafened ? "danger" : ""}" data-action="toggleDeafen" title="Deafen">${icon("headphones")}</button>
          <button class="icon-button ${state.voice.camera ? "active" : ""}" data-action="toggleCamera" title="Camera">${icon("camera")}</button>
          <button class="icon-button ${state.voice.screen ? "active" : ""}" data-action="toggleScreen" title="Screen">${icon("screen")}</button>
        `}
        <button class="icon-button danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
      </div>` : ""}
      ${inVoice && !state.voice.ghost ? `
        <div class="dock-ring">
          <select class="ring-select" data-ring-target title="Ring user" ${ringable.length ? "" : "disabled"}>
            <option value="">${ringable.length ? "Ring user" : "No one to ring"}</option>
            ${ringable.map((member) => `<option value="${member.user_id}">${escapeHtml(member.nickname || member.display_name || member.username)}</option>`).join("")}
          </select>
          <button class="icon-button" data-action="ringUser" title="Ring selected user" ${ringable.length ? "" : "disabled"}>${icon("bell")}</button>
        </div>
      ` : ""}
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
      <button class="icon-button" data-open-modal="themeSettings" title="Client colors">${icon("brush")}</button>
      <button class="icon-button" data-open-modal="profileSettings" title="User settings">${icon("settings")}</button>
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
  const callExpanded = !!state.voice.channelId && !state.callCollapsed;
  return `
    <main class="chat-pane ${callExpanded ? "call-only" : ""}">
      ${renderMobileTopbar()}
      ${state.voice.channelId ? renderCallWindow() : ""}
      ${callExpanded ? "" : `
        ${state.searchResults.length ? renderSearchResults() : ""}
        <section class="message-list" id="messageList">
          ${state.messages.map(renderMessage).join("") || `<div class="empty-state">No messages yet</div>`}
        </section>
        <div class="typing-line">${renderTypingLine()}</div>
        <div class="attachment-preview-slot" data-attachment-preview>${renderAttachmentPreview()}</div>
        <form class="composer" data-action="sendMessage">
          ${state.editingMessageId ? `<button type="button" data-action="cancelEdit">Cancel</button>` : ""}
          <label class="attach-button" title="Attach image or ZIP">
            ${icon("file")}
            <input name="attachment" type="file" accept="image/png,image/jpeg,image/gif,image/webp,.zip,application/zip,application/x-zip-compressed" ${editable ? "" : "disabled"}>
          </label>
          <textarea name="content" rows="1" maxlength="4000" ${editable ? "" : "disabled"} placeholder="${editable ? "Message" : "Read only"}"></textarea>
          <button class="primary send-button" type="submit" ${editable ? "" : "disabled"}>${state.editingMessageId ? iconText("save", "Save") : iconText("send", "Send")}</button>
        </form>
      `}
    </main>
  `;
}

function renderMobileTopbar() {
  const channel = activeChannel();
  const guild = activeGuild();
  const inVoice = !!state.voice.channelId;
  const showingCall = inVoice && !state.callCollapsed;
  const voiceCount = inVoice ? Math.max(1, voiceUsersFor(state.voice.channelId).length) : 0;
  const title = showingCall ? (guild?.name || "Mielcord") : (channel?.name || "Mielcord");
  const subtitle = showingCall
    ? `${state.voice.channelName} · ${voiceCount} connected`
    : inVoice
      ? `In ${state.voice.channelName}`
      : `${state.online.size} online`;
  return `
    <header class="mobile-topbar">
      <button class="icon-button mobile-menu-button" data-action="toggleMobileChannels" aria-controls="channelPane" aria-expanded="${state.mobileChannelsOpen}" title="Channels">${icon("menu")}</button>
      <div class="mobile-context">
        ${icon(showingCall ? "voice" : "hash")}
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(subtitle)}</span>
        </div>
      </div>
      <div class="mobile-topbar-actions">
        <button class="icon-button" data-open-modal="memberDirectory" title="Members">${icon("users")}</button>
      </div>
    </header>
  `;
}

function renderCallControlDock() {
  if (state.voice.ghost) {
    return `
      <footer class="call-control-dock ghost-controls">
        <span class="ghost-pill">${icon("ghost")} Ghost listening</span>
        <button class="call-control" data-action="toggleCallCollapse" title="Back to chat">${icon("message")}</button>
        <button class="call-control danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
      </footer>
    `;
  }
  return `
    <footer class="call-control-dock">
      <button class="call-control ${state.voice.deafened ? "danger" : ""}" data-action="toggleDeafen" title="Deafen">${icon("headphones")}</button>
      <button class="call-control ${state.voice.muted ? "danger" : ""}" data-action="toggleMute" title="Mute">${icon(state.voice.muted ? "micOff" : "mic")}</button>
      <button class="call-control ${state.voice.camera ? "active" : ""}" data-action="toggleCamera" title="Camera">${icon("camera")}</button>
      <button class="call-control ${state.voice.screen ? "active" : ""}" data-action="toggleScreen" title="Share screen">${icon("screen")}</button>
      <button class="call-control call-chat-toggle" data-action="toggleCallCollapse" title="Back to chat">${icon("message")}</button>
      <button class="call-control danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
    </footer>
  `;
}

function renderCollapsedCallControls() {
  if (state.voice.ghost) {
    return `
      <div class="collapsed-call-actions">
        <button class="icon-button active" title="Ghost listening">${icon("ghost")}</button>
        <button class="icon-button" data-action="toggleCallCollapse" title="Open call">${icon("focus")}</button>
        <button class="icon-button danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
      </div>
    `;
  }
  return `
    <div class="collapsed-call-actions">
      <button class="icon-button ${state.voice.muted ? "danger" : ""}" data-action="toggleMute" title="Mute">${icon(state.voice.muted ? "micOff" : "mic")}</button>
      <button class="icon-button ${state.voice.deafened ? "danger" : ""}" data-action="toggleDeafen" title="Deafen">${icon("headphones")}</button>
      <button class="icon-button" data-action="toggleCallCollapse" title="Open call">${icon("focus")}</button>
      <button class="icon-button danger" data-action="leaveVoice" title="Leave">${icon("phoneOff")}</button>
    </div>
  `;
}

function renderCallWindow() {
  const peers = [...state.voice.peers.values()];
  const total = peers.length + (state.voice.ghost ? 0 : 1);
  const hasScreenShare = state.voice.screen || peers.some((peer) => peer.state?.screen);
  return `
    <section class="call-window ${state.callCollapsed ? "collapsed" : ""} ${state.voice.screen ? "has-local-screen" : ""} ${hasScreenShare ? "has-screen-share" : ""}">
      <header class="call-window-header">
        <div class="call-title">
          <strong>${escapeHtml(state.voice.channelName || "Voice")}</strong>
          <span>${total} connected</span>
        </div>
        <div class="call-header-tools">
          ${state.voice.ghost ? "" : `
            <select class="quality-select" data-action="streamQuality" title="Stream quality">
              <option value="720p" ${state.streamQuality === "720p" ? "selected" : ""}>720p</option>
              <option value="1080p" ${state.streamQuality === "1080p" ? "selected" : ""}>1080p</option>
              <option value="1440p" ${state.streamQuality === "1440p" ? "selected" : ""}>1440p</option>
              <option value="4k" ${state.streamQuality === "4k" ? "selected" : ""}>4K</option>
              <option value="5k" ${state.streamQuality === "5k" ? "selected" : ""}>5K</option>
              <option value="source" ${state.streamQuality === "source" ? "selected" : ""}>Full</option>
            </select>
            ${state.voice.screen ? `<button class="icon-button" data-action="changeScreen" title="Change shared window">${icon("window")}</button>` : ""}
          `}
          <button class="icon-button" data-open-modal="memberDirectory" title="Members">${icon("users")}</button>
        </div>
        ${state.callCollapsed ? renderCollapsedCallControls() : ""}
      </header>
      ${state.callCollapsed ? "" : `${renderVoiceStage()}${renderCallControlDock()}`}
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

function videoGridLayout(count) {
  const total = Math.max(1, Number(count) || 1);
  const pane = document.querySelector(".chat-pane") || document.documentElement;
  const call = document.querySelector(".call-window:not(.collapsed)");
  const paneWidth = call?.clientWidth || pane.clientWidth || window.innerWidth;
  const paneHeight = call?.clientHeight || pane.clientHeight || window.innerHeight;
  const compact = paneWidth <= 760 || paneHeight <= 620;
  const gap = compact ? 7 : 14;
  const stageWidth = Math.max(1, paneWidth - (compact ? 14 : 28));
  const stageHeight = Math.max(1, paneHeight - (compact ? 78 : 158));

  const portrait = stageHeight > stageWidth * 1.25;
  const minimumCols = portrait && total >= 7 ? 3 : portrait && total >= 3 ? 2 : 1;
  let best = {
    cols: 1,
    rows: total,
    tileSide: Math.min(stageWidth, stageHeight / total),
    score: -Infinity
  };
  for (let cols = minimumCols; cols <= total; cols += 1) {
    const rows = Math.ceil(total / cols);
    const cellWidth = (stageWidth - gap * (cols - 1)) / cols;
    const cellHeight = (stageHeight - gap * (rows - 1)) / rows;
    if (cellWidth <= 0 || cellHeight <= 0) continue;
    const tileSide = Math.min(cellWidth, cellHeight);
    const emptySlots = cols * rows - total;
    const score = tileSide * tileSide * total - emptySlots * tileSide * tileSide * 0.18;
    if (score > best.score) best = { cols, rows, tileSide, score };
  }
  return {
    cols: best.cols,
    rows: best.rows,
    tileSize: Math.max(1, Math.floor(best.tileSide))
  };
}

function callParticipants() {
  const participants = [];
  if (!state.voice.ghost) {
    participants.push({
      id: "local",
      user: state.user,
      media: {
        muted: state.voice.muted,
        camera: state.voice.camera,
        screen: state.voice.screen,
        local: true
      }
    });
  }
  for (const peer of state.voice.peers.values()) {
    participants.push({
      id: "peer-" + peer.user.id,
      user: peer.user,
      media: peer.state || {}
    });
  }
  return participants;
}

function activeScreenShares() {
  const shares = [];
  if (!state.voice.ghost && state.voice.screen) {
    shares.push({
      id: "screen-local",
      user: state.user,
      media: {
        muted: state.voice.muted,
        camera: state.voice.camera,
        screen: true,
        stream_quality: state.streamQuality,
        local: true
      }
    });
  }
  for (const peer of state.voice.peers.values()) {
    if (!peer.state?.screen) continue;
    shares.push({
      id: "screen-peer-" + peer.user.id,
      user: peer.user,
      media: peer.state || {}
    });
  }
  return shares;
}

function renderVoiceStage() {
  if (!state.voice.channelId) return "";
  const participants = callParticipants();
  const shares = activeScreenShares();
  const dominant = shares.find((share) => share.id === state.focusedVideoId) || shares[0] || null;

  if (dominant) {
    const secondaryShares = shares.filter((share) => share.id !== dominant.id);
    const stripCount = Math.max(1, participants.length + secondaryShares.length);
    const callWidth = document.querySelector(".call-window:not(.collapsed)")?.clientWidth || window.innerWidth;
    const compactStage = callWidth <= 720 || window.innerHeight <= 620;
    const compactRows = compactStage && stripCount > 4
      ? 2
      : stripCount > 8
        ? 2
        : 1;
    const compactCols = Math.ceil(stripCount / compactRows);
    return `
      <section class="voice-stage has-screen">
        <div class="stream-layout">
          <div class="stream-spotlight">
            ${renderVideoTile(dominant.id, dominant.user, dominant.media, {
              source: "screen",
              spotlight: true
            })}
          </div>
          <div class="participant-strip" style="--strip-count:${stripCount}; --strip-cols:${compactCols}; --strip-rows:${compactRows};">
            ${participants.map((entry) => renderVideoTile(entry.id, entry.user, entry.media, {
              source: "camera",
              compact: true
            })).join("")}
            ${secondaryShares.map((entry) => renderVideoTile(entry.id, entry.user, entry.media, {
              source: "screen",
              compact: true,
              preview: true
            })).join("")}
          </div>
        </div>
      </section>
    `;
  }

  const layout = videoGridLayout(participants.length || 1);
  const hasFocus = !!state.focusedVideoId && !state.fullscreenVideoId &&
    participants.some((entry) => entry.id === state.focusedVideoId);
  return `
    <section class="voice-stage participants-only">
      <div class="video-grid participant-grid ${hasFocus ? "has-focus" : ""}"
        data-participant-count="${participants.length}"
        style="--video-cols:${layout.cols}; --video-rows:${layout.rows}; --tile-size:${layout.tileSize}px; --participant-count:${participants.length};">
        ${participants.map((entry) => renderVideoTile(entry.id, entry.user, entry.media, {
          source: "camera"
        })).join("")}
      </div>
    </section>
  `;
}

function avatarImageUrl(person, size = 256) {
  const value = String(person?.avatar_url || "");
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.hostname === "gravatar.com" || url.hostname.endsWith(".gravatar.com")) {
      url.searchParams.set("s", String(Math.max(64, Math.min(2048, size))));
    }
    return url.href;
  } catch {
    return value;
  }
}

function renderAvatar(person, classes = "") {
  const name = person.display_name || person.username || "?";
  const url = avatarImageUrl(person, 256);
  return `
    <div class="avatar ${classes}" style="--avatar:${escapeHtml(person.avatar_color || "#d99a23")}">
      ${url ? `<img src="${escapeHtml(url)}" alt="" decoding="async">` : initials(name)}
    </div>
  `;
}

function renderAvatarFallback(person) {
  const name = person.display_name || person.username || "?";
  const url = avatarImageUrl(person, 512);
  return url
    ? `<img class="call-avatar-image" src="${escapeHtml(url)}" alt="" decoding="async">`
    : initials(name);
}

function renderVideoTile(id, user, media, options = {}) {
  const local = id === "local" || id === "screen-local";
  const match = String(id).match(/peer-(\d+)$/);
  const userId = local ? Number(state.user?.id || 0) : Number(match?.[1] || 0);
  const source = options.source === "screen" ? "screen" : "camera";
  const focused = state.focusedVideoId === id;
  const fullscreened = state.fullscreenVideoId === id;
  const isSpeaking = source === "camera" &&
    (state.speaking.has(userId) || !!media.speaking);
  const sourceActive = source === "screen" ? !!media.screen : !!media.camera;
  const tileClass = [
    "video-tile",
    source === "screen" ? "stream-tile screening" : "participant-tile",
    options.compact ? "compact-tile" : "",
    options.spotlight ? "spotlight-tile" : "",
    options.preview ? "stream-preview-tile" : "",
    focused ? "focused" : "",
    fullscreened ? "browser-fullscreen" : "",
    isSpeaking ? "speaking" : ""
  ].filter(Boolean).join(" ");
  const badges = [
    media.muted && source === "camera" ? "muted" : "",
    source === "screen" ? (media.stream_quality || "screen") : "",
    local ? "you" : ""
  ].filter(Boolean);
  const width = Number(media.screen_width || 0);
  const height = Number(media.screen_height || 0);
  const aspect = source === "screen" && width > 0 && height > 0
    ? Math.max(0.25, Math.min(6, width / height))
    : 16 / 9;

  return `
    <article class="${tileClass}" data-video-id="${id}" data-user-id="${userId}"
      data-media-source="${source}" style="--stream-aspect:${aspect};"
      ${!local ? `data-peer-user-id="${userId}"` : ""}>
      <video id="video-${id}" autoplay playsinline muted></video>
      <div class="video-fallback" style="--avatar:${escapeHtml(user.avatar_color || "#d99a23")}">
        ${renderAvatarFallback(user)}
      </div>
      ${sourceActive ? `<div class="media-kind-badge" title="${source === "screen" ? "Screen share" : "Camera"}">${icon(source === "screen" ? "screen" : "camera")}</div>` : ""}
      <div class="media-status" data-media-status></div>
      <footer>
        <strong>${escapeHtml(user.display_name || user.username)}</strong>
        <span>${escapeHtml(badges.join(" "))}</span>
      </footer>
      <div class="video-actions">
        ${options.compact && source === "camera" ? "" : `
          <button class="icon-button ${focused ? "active" : ""}" data-action="focusVideo" data-video-id="${id}"
            title="${focused ? "Back to layout" : source === "screen" ? "Show this stream" : "Large tile"}"
            aria-label="${focused ? "Back to layout" : source === "screen" ? "Show this stream" : "Large tile"}">
            ${icon(focused ? "grid" : "window")}
          </button>
        `}
        <button class="icon-button ${fullscreened ? "active" : ""}" data-action="fullscreenVideo" data-video-id="${id}"
          title="${fullscreened ? "Exit fullscreen" : "Browser fullscreen"}"
          aria-label="${fullscreened ? "Exit fullscreen" : "Browser fullscreen"}">
          ${icon("fullscreen")}
        </button>
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
        ${!message.deleted && message.attachment ? `<a class="message-file" href="${escapeHtml(message.attachment.download_url)}" download="${escapeHtml(message.attachment.name || "attachment.zip")}">${icon("file")}<span>${escapeHtml(message.attachment.name || "attachment.zip")}<em>${formatFileSize(message.attachment.size || 0)}</em></span></a>` : ""}
      </div>
      ${actions}
    </article>
  `;
}

function linkify(html) {
  return html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const mobile = online && state.mobileOnline.has(member.user_id);
  const roles = (member.roles || []).map((roleId) => state.snapshot.roles.find((role) => role.id === roleId)).filter(Boolean);
  return `
    <article class="member-card">
      ${renderAvatar(member, online ? "online" : "")}
      <div>
        <strong>${escapeHtml(member.nickname || member.display_name || member.username)}</strong>
        <span class="member-status">${online ? "online" : "offline"}${mobile ? icon("phone") : ""}</span>
        <div class="role-pills">${roles.slice(0, 3).map((role) => `<em style="--role:${escapeHtml(role.color)}">${escapeHtml(role.name)}</em>`).join("")}</div>
      </div>
    </article>
  `;
}

function voiceUserIds() {
  const ids = new Set();
  for (const room of state.voicePresence.values()) {
    for (const userId of room.keys()) ids.add(Number(userId));
  }
  return ids;
}

function voiceChannelNameForUser(userId) {
  for (const [channelId, room] of state.voicePresence.entries()) {
    if (room.has(Number(userId))) {
      const channel = state.snapshot?.channels.find((item) => item.id === Number(channelId));
      return channel?.name || "Voice";
    }
  }
  return "";
}

function renderDirectoryMember(member) {
  const userId = Number(member.user_id);
  const online = state.online.has(userId);
  const mobile = online && state.mobileOnline.has(userId);
  const voiceName = voiceChannelNameForUser(userId);
  const roles = (member.roles || []).map((roleId) => state.snapshot.roles.find((role) => role.id === roleId)).filter(Boolean);
  return `
    <article class="directory-member-card ${online ? "online" : "offline"}">
      ${renderAvatar(member, online ? "online" : "")}
      <div>
        <strong>${escapeHtml(member.nickname || member.display_name || member.username)}</strong>
        <span>${online ? "Online" : "Offline"}${mobile ? ` ${icon("phone")} Mobile` : ""}${voiceName ? ` ${icon("voice")} ${escapeHtml(voiceName)}` : ""}</span>
        <div class="role-pills">${roles.slice(0, 4).map((role) => `<em style="--role:${escapeHtml(role.color)}">${escapeHtml(role.name)}</em>`).join("")}</div>
      </div>
    </article>
  `;
}

function renderMemberDirectoryModal() {
  const members = state.snapshot?.members || [];
  const voiceIds = voiceUserIds();
  const sorted = [...members].sort((a, b) => {
    const aOnline = state.online.has(Number(a.user_id)) ? 0 : 1;
    const bOnline = state.online.has(Number(b.user_id)) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    const aName = (a.nickname || a.display_name || a.username || "").toLowerCase();
    const bName = (b.nickname || b.display_name || b.username || "").toLowerCase();
    return aName.localeCompare(bName);
  });
  return `
    <section class="modal-card member-directory-modal">
      <header class="settings-header">
        <div>
          <h2>Members</h2>
          <p>${members.length} members on this host</p>
        </div>
        <button class="icon-button" data-close-modal type="button">${icon("close")}</button>
      </header>
      <div class="member-summary-grid">
        <div><strong>${state.online.size}</strong><span>Online</span></div>
        <div><strong>${state.mobileOnline.size}</strong><span>Mobile</span></div>
        <div><strong>${voiceIds.size}</strong><span>In voice</span></div>
      </div>
      <div class="member-directory-list">
        ${sorted.map(renderDirectoryMember).join("") || `<p class="empty">No members</p>`}
      </div>
    </section>
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


function renderThemeControls() {
  return `
    <div class="theme-presets">
      ${Object.entries(THEME_PRESETS).map(([id, preset]) => `
        <button class="theme-preset ${state.clientTheme.preset === id ? "active" : ""}" type="button" data-action="applyThemePreset" data-theme-preset="${id}">
          <span class="theme-swatch-row">${preset.swatches.map((color) => `<i style="--swatch:${escapeHtml(color)}"></i>`).join("")}</span>
          <strong>${escapeHtml(preset.label)}</strong>
          <span>${escapeHtml(preset.description)}</span>
        </button>
      `).join("")}
    </div>
    <div class="theme-grid">
      ${THEME_CONTROLS.map(([key, label]) => `
        <label class="theme-color-row">
          <span>${escapeHtml(label)}</span>
          <input type="color" value="${escapeHtml(state.clientTheme[key] || DEFAULT_THEME[key])}" data-theme-color="${key}">
        </label>
      `).join("")}
    </div>
  `;
}

function renderThemeSettingsModal() {
  return `
    <section class="modal-card theme-modal">
      <header class="settings-header">
        <div>
          <h2>Client colors</h2>
          <p>Saved on this browser</p>
        </div>
        <button class="icon-button" data-close-modal type="button">${icon("close")}</button>
      </header>
      <div data-theme-settings>${renderThemeControls()}</div>
      <div class="theme-actions">
        <button class="danger" type="button" data-action="resetTheme">${iconText("brush", "Reset colors")}</button>
      </div>
    </section>
  `;
}

function renderSettingsNav(active) {
  const tabs = [
    ["account", "Account", "Profile and email"],
    ["voice", "Voice / Mic", "Devices and sensitivity"],
    ["accessibility", "Accessibility", "Client comfort"]
  ];
  return `
    <nav class="settings-tabs">
      ${tabs.map(([id, label, detail]) => `
        <button type="button" class="settings-tab ${active === id ? "active" : ""}" data-action="setSettingsTab" data-settings-tab="${id}">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(detail)}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderAccountSettings() {
  return `
    <section class="settings-panel account-settings-panel">
      <form class="account-profile-form" data-action="updateProfile">
        <div class="profile-preview">
          ${renderAvatar(state.user || {}, "profile-avatar")}
          <div>
            <strong>${escapeHtml(state.user?.display_name || state.user?.username || "")}</strong>
            <span>${escapeHtml(state.user?.email || "No email loaded")}</span>
          </div>
        </div>
        <label>Display name<input name="display_name" value="${escapeHtml(state.user?.display_name || "")}" maxlength="40"></label>
        <label>Email<input name="email" type="email" value="${escapeHtml(state.user?.email || "")}" autocomplete="email"></label>
        <button class="primary" type="submit">${iconText("save", "Save profile")}</button>
      </form>
      <section class="client-settings account-session-settings">
        <header>
          <strong>Session</strong>
          <span>This browser</span>
        </header>
        <button class="settings-logout danger" type="button" data-action="logout">${iconText("logout", "Log out")}</button>
      </section>
    </section>
  `;
}

function renderVoiceSettings() {
  const micTesting = !!state.deviceTest.micStream;
  const cameraTesting = !!state.deviceTest.cameraStream;
  const micStatus = micTesting ? (state.voice.channelId ? "Voice muted for test" : "Monitoring locally") : "Ready";
  const sensitivity = Math.max(0, Math.min(100, Number(state.clientSettings.micSensitivity || 65)));
  return `
    <section class="settings-panel">
      <section class="client-settings audio-device-settings" data-device-settings>
        ${renderDeviceSettings()}
      </section>
      <section class="client-settings mic-sensitivity-settings">
        <header>
          <strong>Mic sensitivity</strong>
          <span data-mic-sensitivity-value>${sensitivity}%</span>
        </header>
        <input type="range" min="0" max="100" value="${sensitivity}" data-mic-sensitivity>
        <p>Higher sensitivity catches quieter voices. Lower it if background noise lights you up.</p>
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
    </section>
  `;
}

function renderAccessibilitySettings() {
  return `
    <section class="settings-panel">
      <section class="client-settings">
        <header>
          <strong>Notifications</strong>
          <span>This browser</span>
        </header>
        <label class="settings-toggle">
          <input type="checkbox" data-action="toggleRingAlerts" ${state.clientSettings.ringAlerts ? "checked" : ""}>
          <span>Ring tone and desktop notification</span>
        </label>
      </section>
      <section class="client-settings">
        <header>
          <strong>Overlay data</strong>
          <span>Electron-ready</span>
        </header>
        <p>Use <code>window.MielcordOverlay</code>, listen for <code>mielcord:voice-overlay</code>, or subscribe to <code>overlay:subscribe</code> on the WebSocket.</p>
      </section>
    </section>
  `;
}

function renderSettingsPanel(active) {
  if (active === "voice") return renderVoiceSettings();
  if (active === "accessibility") return renderAccessibilitySettings();
  return renderAccountSettings();
}

function renderProfileSettingsModal() {
  const active = state.settingsTab || "account";
  return `
    <section class="modal-card profile-modal">
      <header class="settings-header">
        <div>
          <h2>User settings</h2>
          <p>${active === "voice" ? "Audio, devices, and mic pickup" : active === "accessibility" ? "Client-side comfort options" : "Account and Gravatar"}</p>
        </div>
        <button class="icon-button" data-close-modal type="button">${icon("close")}</button>
      </header>
      <div class="profile-settings-layout">
        ${renderSettingsNav(active)}
        <div class="profile-settings-content">
          ${renderSettingsPanel(active)}
        </div>
      </div>
      <footer class="profile-settings-footer">
        <span class="settings-version">Mielcord v${escapeHtml(state.appVersion || APP_VERSION)}</span>
      </footer>
    </section>
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
  if (kind === "profileSettings") state.settingsTab = state.settingsTab || "account";
  const forms = {
    guildSettings: renderGuildSettingsModal(),
    memberDirectory: renderMemberDirectoryModal(),
    profileSettings: renderProfileSettingsModal(),
    themeSettings: renderThemeSettingsModal(),
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
  if (kind === "profileSettings") refreshMediaDevices().catch(() => {});
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
  state.mobileOnline = new Set(snapshot.mobile_user_ids || []);
  applyVoicePresence(snapshot.voice || {});
  const preferred = snapshot.channels.find((channel) => channel.id === preferredChannelId && channel.type === "text");
  const existing = snapshot.channels.find((channel) => channel.id === state.activeChannelId && channel.type === "text");
  const first = snapshot.channels.find((channel) => channel.type === "text");
  const channel = preferred || existing || first;
  state.activeChannelId = channel?.id || null;
  state.searchResults = [];
  if (state.activeChannelId) await loadMessages(state.activeChannelId);
  render();
  processPendingVoiceHandoff();
}

async function loadMessages(channelId) {
  const data = await api(`/api/channels/${channelId}/messages`);
  state.messages = data.messages || [];
  state.activeChannelId = channelId;
}

function connectWs(activateDevice = false) {
  disconnectWs(false);
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/ws`);
  state.ws = ws;
  state.wsLastPong = Date.now();
  ws.addEventListener("open", () => {
    state.wsLastPong = Date.now();
    startWsHeartbeat();
    wsSend("overlay:subscribe", {});
    if (activateDevice) wsSend("device:activate", {});
  });
  ws.addEventListener("message", (event) => {
    if (state.ws !== ws) return;
    try {
      const packet = JSON.parse(event.data);
      handleRealtime(packet.event, packet.payload || {});
    } catch {}
  });
  ws.addEventListener("close", () => {
    if (state.ws !== ws) return;
    stopWsHeartbeat();
    if (!state.user) return;
    clearTimeout(state.wsReconnect);
    state.wsReconnect = setTimeout(connectWs, 1600);
  });
}

function disconnectWs(clear = true) {
  clearTimeout(state.wsReconnect);
  stopWsHeartbeat();
  const ws = state.ws;
  if (clear) state.ws = null;
  if (ws) {
    try { ws.close(); } catch {}
  }
  if (clear) state.ws = null;
}

function wsSend(event, payload = {}) {
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ event, payload }));
  }
}

function startWsHeartbeat() {
  stopWsHeartbeat();
  state.wsHeartbeat = setInterval(() => {
    if (state.ws?.readyState !== WebSocket.OPEN) return;
    if (Date.now() - state.wsLastPong > 75000) {
      try { state.ws.close(); } catch {}
      return;
    }
    wsSend("ping", { t: Date.now() });
  }, 25000);
}

function stopWsHeartbeat() {
  if (state.wsHeartbeat) clearInterval(state.wsHeartbeat);
  state.wsHeartbeat = null;
}

function restoreVoiceAfterReconnect() {
  if (!state.voice.channelId || state.ws?.readyState !== WebSocket.OPEN) return;
  wsSend(state.voice.ghost ? "voice:ghost_join" : "voice:join", {
    channel_id: state.voice.channelId,
    resume: true
  });
  if (!state.voice.ghost) wsSend("voice:state", voiceStatePayload());
}

async function processPendingVoiceHandoff() {
  const handoff = state.pendingVoiceHandoff;
  if (!handoff || !state.snapshot || state.ws?.readyState !== WebSocket.OPEN) return;
  const channel = state.snapshot.channels.find(
    (item) => item.id === Number(handoff.channel_id) && item.type === "voice"
  );
  if (!channel) return;
  state.pendingVoiceHandoff = null;
  try {
    await joinVoice(channel.id, !!handoff.ghost);
    notice(`Voice moved to this device: ${channel.name}`);
  } catch (error) {
    notice(
      `Voice is still available in ${channel.name}. Tap the channel to join: ${error.message || error}`,
      "error"
    );
  }
}

function handleRealtime(event, payload) {
  if (event === "hello") {
    applyVoicePresence(payload.voice || {});
    const mobileForGuild = payload.mobile_user_ids?.[String(state.activeGuildId)];
    if (Array.isArray(mobileForGuild)) state.mobileOnline = new Set(mobileForGuild);
    state.wsLastPong = Date.now();
    render();
    restoreVoiceAfterReconnect();
  } else if (event === "pong") {
    state.wsLastPong = Date.now();
  } else if (event === "error") {
    notice(payload.message || "Realtime error", "error");
  } else if (event === "session:replaced") {
    notice(payload.message || "Another device connected. Your account stays signed in.");
    if (state.voice.channelId) leaveVoice(false);
  } else if (event === "voice:handoff") {
    state.pendingVoiceHandoff = payload;
    processPendingVoiceHandoff();
  } else if (event === "voice:transferred") {
    notice(payload.message || "Voice moved to another device. You are still signed in here.");
    if (state.voice.channelId) leaveVoice(false);
  } else if (event === "voice:resume_blocked") {
    notice(payload.message || "Voice is active on another device.");
    if (state.voice.channelId) leaveVoice(false);
  } else if (event === "overlay:snapshot") {
    state.overlayState = payload;
    window.MielcordOverlay = payload;
    window.dispatchEvent(new CustomEvent("mielcord:voice-overlay", { detail: payload }));
  } else if (event === "message:create") {
    if (payload.channel_id === state.activeChannelId && !state.messages.some((message) => message.id === payload.id)) {
      const shouldStick = isNearMessageBottom();
      state.messages.push(payload);
      render();
      if (shouldStick) scrollMessages();
    }
  } else if (event === "message:update") {
    state.messages = state.messages.map((message) => message.id === payload.id ? payload : message);
    render();
  } else if (event === "message:delete") {
    if (payload.permanent) {
      state.messages = state.messages.filter((message) => message.id !== payload.id);
    } else {
      state.messages = state.messages.map((message) => message.id === payload.id ? { ...message, deleted: true, content: "", image: null, attachment: null, deleted_at: Date.now() / 1000 } : message);
    }
    render();
  } else if (event.startsWith("channel:") || event.startsWith("role:") || event === "guild:update" || event === "member:join" || event === "member:remove") {
    if (state.activeGuildId) loadGuild(state.activeGuildId).catch((error) => notice(error.message, "error"));
  } else if (event === "presence:update") {
    if (payload.status === "online") {
      state.online.add(payload.user_id);
      if (payload.mobile) state.mobileOnline.add(payload.user_id);
      else state.mobileOnline.delete(payload.user_id);
    }
    if (payload.status === "offline") {
      state.online.delete(payload.user_id);
      state.mobileOnline.delete(payload.user_id);
    }
    render();
  } else if (event === "typing:start") {
    if (payload.channel_id === state.activeChannelId && payload.user?.id !== state.user.id) {
      state.typing.set(payload.user.id, { user: payload.user, at: Date.now() });
      renderTypingOnly();
      setTimeout(renderTypingOnly, 3600);
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
  } else if (event === "voice:speaking") {
    setSpeaking(payload.user_id, !!payload.speaking);
  } else if (event === "voice:state") {
    setVoicePresence(payload.channel_id, payload.user || state.voice.peers.get(payload.user_id)?.user || state.user, payload.state || {});
    const peer = state.voice.peers.get(Number(payload.user_id));
    if (peer) updatePeerMediaState(peer, payload.state || {});
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

function setMicSensitivity(value) {
  const clean = Math.max(0, Math.min(100, Number(value || 65)));
  state.clientSettings.micSensitivity = clean;
  saveClientString("micSensitivity", String(clean));
  const label = document.querySelector("[data-mic-sensitivity-value]");
  if (label) label.textContent = `${clean}%`;
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

function isNearMessageBottom() {
  const list = document.getElementById("messageList");
  if (!list) return true;
  return list.scrollHeight - list.scrollTop - list.clientHeight < 120;
}

function scrollMessages() {
  requestAnimationFrame(() => {
    const list = document.getElementById("messageList");
    if (list) list.scrollTop = list.scrollHeight;
  });
}

function renderTypingOnly() {
  const line = document.querySelector(".typing-line");
  if (line) line.innerHTML = renderTypingLine();
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
  const userId = Number(user.id);
  const room = state.voicePresence.get(Number(channelId)) || new Map();
  room.set(userId, { user, state: mediaState, channelId: Number(channelId) });
  state.voicePresence.set(Number(channelId), room);
  if (Object.prototype.hasOwnProperty.call(mediaState, "speaking")) {
    if (mediaState.speaking) state.speaking.add(userId);
    else state.speaking.delete(userId);
  }
  publishOverlayState();
  if (shouldRender) render();
}

function removeVoicePresence(userId) {
  for (const room of state.voicePresence.values()) room.delete(Number(userId));
  publishOverlayState();
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

function setMobileChannelsOpen(open) {
  state.mobileChannelsOpen = !!open;
  const shell = document.querySelector(".app-shell");
  shell?.classList.toggle("mobile-channels-open", state.mobileChannelsOpen);
  document.querySelectorAll('[data-action="toggleMobileChannels"]').forEach((button) => {
    button.setAttribute("aria-expanded", String(state.mobileChannelsOpen));
  });
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button, .search-hit");
  if (!button) return;

  if (button.dataset.openModal) {
    setMobileChannelsOpen(false);
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
    setMobileChannelsOpen(false);
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

  if (action === "toggleMobileChannels") setMobileChannelsOpen(!state.mobileChannelsOpen);
  if (action === "closeMobileChannels") setMobileChannelsOpen(false);
  if (action === "logout") await safe(logout);
  if (action === "clearSearch") {
    state.searchResults = [];
    render();
  }
  if (action === "clearAttachment") clearAttachedFile();
  if (action === "resetTheme") resetClientTheme();
  if (action === "applyThemePreset") applyThemePreset(button.dataset.themePreset);
  if (action === "setSettingsTab") {
    state.settingsTab = button.dataset.settingsTab || "account";
    refreshProfileSettingsModal();
    if (state.settingsTab === "voice") refreshMediaDevices().catch(() => {});
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
  if (action === "ghostJoinVoice") {
    setMobileChannelsOpen(false);
    await safe(() => joinVoice(Number(button.dataset.ghostChannelId), true));
  }
  if (action === "toggleMute") toggleMute();
  if (action === "toggleDeafen") toggleDeafen();
  if (action === "refreshDevices") await safe(refreshMediaDevices);
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
  if (action === "adminServerMute") await safe(() => adminServerMute(Number(button.dataset.userId)));
  if (action === "adminKickMember") await safe(() => adminKickMember(Number(button.dataset.userId)));
  if (action === "adminBanMember") await safe(() => adminBanMember(Number(button.dataset.userId)));
  if (action === "adminTempBanMember") await safe(() => adminTempBanMember(Number(button.dataset.userId)));
  if (action === "leaveVoice") leaveVoice();
  if (action === "loadInvites") await safe(loadInvites);
  if (action === "loadAudit") await safe(loadAudit);
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal], .modal-close")) closeModal();
});

function syncViewportHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--viewport-height", `${Math.round(height)}px`);
}

function refreshCallLayout() {
  const grid = document.querySelector(".participant-grid[data-participant-count]");
  if (grid) {
    const count = Math.max(1, Number(grid.dataset.participantCount) || 1);
    const layout = videoGridLayout(count);
    grid.style.setProperty("--video-cols", String(layout.cols));
    grid.style.setProperty("--video-rows", String(layout.rows));
    grid.style.setProperty("--tile-size", `${layout.tileSize}px`);
  }

  const strip = document.querySelector(".participant-strip");
  if (strip) {
    const count = Math.max(1, strip.children.length);
    const callWidth = document.querySelector(".call-window:not(.collapsed)")?.clientWidth || window.innerWidth;
    const compactStage = callWidth <= 720 || window.innerHeight <= 620;
    const rows = compactStage && count > 4 ? 2 : count > 8 ? 2 : 1;
    strip.style.setProperty("--strip-count", String(count));
    strip.style.setProperty("--strip-rows", String(rows));
    strip.style.setProperty("--strip-cols", String(Math.ceil(count / rows)));
  }
}

function handleLayoutResize() {
  syncViewportHeight();
  const mobileLayout = window.matchMedia("(max-width: 900px), (pointer: coarse) and (max-width: 1024px)").matches;
  if (!mobileLayout && state.mobileChannelsOpen) setMobileChannelsOpen(false);
  if (!state.voice.channelId || state.callCollapsed) return;
  clearTimeout(state.resizeRender);
  state.resizeRender = setTimeout(refreshCallLayout, 80);
}

syncViewportHeight();
window.addEventListener("resize", handleLayoutResize);
window.visualViewport?.addEventListener("resize", handleLayoutResize);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.mobileChannelsOpen) setMobileChannelsOpen(false);
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
  if (event.target.matches('.composer input[name="attachment"]')) {
    const file = event.target.files?.[0] || null;
    if (file && !IMAGE_MIME_TYPES.includes(file.type) && !isZipFile(file)) {
      notice("Attach a PNG, JPEG, GIF, WebP, or ZIP file.", "error");
      clearAttachedFile(event.target);
      return;
    }
    if (file && IMAGE_MIME_TYPES.includes(file.type) && file.size > 2_000_000) {
      notice("Image is too large. Keep it under 2 MB.", "error");
      clearAttachedFile(event.target);
      return;
    }
    if (file && isZipFile(file) && file.size > 50_000_000) {
      notice("ZIP file is too large. Keep it under 50 MB.", "error");
      clearAttachedFile(event.target);
      return;
    }
    setAttachedFile(file);
  }
  if (event.target.matches('[data-action="streamQuality"]')) {
    state.streamQuality = STREAM_PROFILES[event.target.value] ? event.target.value : "1080p";
    saveClientString("streamQuality", state.streamQuality);
    safe(applyActiveStreamQuality);
  }
  if (event.target.matches('[data-action="toggleRingAlerts"]')) {
    setRingAlerts(event.target.checked);
  }
  if (event.target.matches('[data-device-select]')) {
    safe(() => setClientDevice(event.target.dataset.deviceSelect, event.target.value));
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches('[data-theme-color]')) {
    setThemeColor(event.target.dataset.themeColor, event.target.value);
  }
  if (event.target.matches('[data-mic-sensitivity]')) {
    setMicSensitivity(event.target.value);
  }
  if (event.target.matches('[data-peer-volume]')) {
    const userId = Number(event.target.dataset.peerVolume);
    peerSettings(userId).volume = Number(event.target.value) / 100;
    savePeerSettings(userId);
    applyPeerMediaSettings(userId);
  }
  if (event.target.matches('[data-peer-stream-volume]')) {
    const userId = Number(event.target.dataset.peerStreamVolume);
    peerSettings(userId).streamVolume = Number(event.target.value) / 100;
    savePeerSettings(userId);
    applyPeerMediaSettings(userId);
  }
});

document.addEventListener("contextmenu", (event) => {
  const target = event.target.closest("[data-peer-user-id]");
  if (!target) return;
  const userId = Number(target.dataset.peerUserId);
  if (!userId || userId === state.user?.id) return;
  event.preventDefault();
  showPeerMenu(event, userId, target.dataset.mediaSource || "voice");
});

let peerMenuLongPress = null;
let peerMenuPressPoint = null;

function cancelPeerMenuLongPress() {
  if (peerMenuLongPress) clearTimeout(peerMenuLongPress);
  peerMenuLongPress = null;
  peerMenuPressPoint = null;
}

document.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") return;
  const target = event.target.closest("[data-peer-user-id]");
  const userId = Number(target?.dataset.peerUserId || 0);
  if (!target || !userId || userId === state.user?.id) return;
  cancelPeerMenuLongPress();
  peerMenuPressPoint = {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    target,
    userId
  };
  peerMenuLongPress = setTimeout(() => {
    const press = peerMenuPressPoint;
    peerMenuLongPress = null;
    peerMenuPressPoint = null;
    if (!press?.target.isConnected) return;
    showPeerMenu(press, press.userId, press.target.dataset.mediaSource || "voice");
    try { navigator.vibrate?.(18); } catch {}
  }, 520);
}, { passive: true });

document.addEventListener("pointermove", (event) => {
  const press = peerMenuPressPoint;
  if (!press || press.pointerId !== event.pointerId) return;
  if (Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > 12) {
    cancelPeerMenuLongPress();
  }
}, { passive: true });

for (const eventName of ["pointerup", "pointercancel"]) {
  document.addEventListener(eventName, cancelPeerMenuLongPress, { passive: true });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".peer-menu") && !event.target.closest("[data-peer-user-id]")) closePeerMenu();
});

function documentFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}

function exitDocumentFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  return exit ? exit.call(document) : Promise.resolve();
}

async function requestDocumentFullscreen() {
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
  if (!request) throw new Error("Fullscreen is not available in this browser.");
  try {
    return await request.call(target, { navigationUI: "hide" });
  } catch {
    return request.call(target);
  }
}

async function fullscreenVideo(videoId) {
  if (![...document.querySelectorAll("[data-video-id]")].some((node) => node.dataset.videoId === videoId)) {
    throw new Error("Video tile was not found.");
  }
  const current = documentFullscreenElement();
  if (state.fullscreenVideoId === videoId) {
    state.fullscreenVideoId = null;
    render();
    if (current) await exitDocumentFullscreen();
    return;
  }
  if (current) await exitDocumentFullscreen();
  state.fullscreenVideoId = videoId;
  state.focusedVideoId = null;
  try {
    await requestDocumentFullscreen();
    render();
  } catch (error) {
    state.fullscreenVideoId = null;
    render();
    throw error;
  }
}

function handleDocumentFullscreenChange() {
  if (!documentFullscreenElement() && state.fullscreenVideoId) {
    state.fullscreenVideoId = null;
    render();
  }
}

["fullscreenchange", "webkitfullscreenchange", "msfullscreenchange"].forEach((eventName) => {
  document.addEventListener(eventName, handleDocumentFullscreenChange);
});

function closePeerMenu() {
  document.querySelectorAll(".peer-menu").forEach((node) => node.remove());
}

function toggleLocalPeerMute(userId) {
  const settings = peerSettings(userId);
  settings.muted = !settings.muted;
  savePeerSettings(userId);
  applyPeerMediaSettings(userId);
  closePeerMenu();
  render();
}

async function adminServerMute(userId) {
  await api(`/api/guilds/${state.activeGuildId}/members/${userId}/voice`, { method: "POST", body: { muted: true, deafened: false } });
  closePeerMenu();
  notice("User server-muted.");
}

async function adminKickMember(userId) {
  const reason = prompt("Kick reason", "") || "";
  await api(`/api/guilds/${state.activeGuildId}/members/${userId}`, { method: "DELETE", body: { reason } });
  closePeerMenu();
  notice("User kicked from site.");
}

async function adminBanMember(userId) {
  const reason = prompt("Ban reason", "") || "";
  await api(`/api/guilds/${state.activeGuildId}/members/${userId}/ban`, { method: "POST", body: { reason } });
  closePeerMenu();
  notice("User banned from site.");
}

async function adminTempBanMember(userId) {
  const hours = Number(prompt("Tempban hours", "24") || 24);
  const reason = prompt("Tempban reason", "") || "";
  await api(`/api/guilds/${state.activeGuildId}/members/${userId}/tempban`, { method: "POST", body: { hours, reason } });
  closePeerMenu();
  notice(`User tempbanned for ${Math.max(1, Math.min(hours || 24, 8760))}h.`);
}

function showPeerMenu(event, userId, mediaSource = "voice") {
  closePeerMenu();
  const member = state.snapshot?.members.find((item) => item.user_id === userId);
  const peer = [...state.voicePresence.values()].flatMap((room) => [...room.values()]).find((entry) => entry.user.id === userId);
  const label = member?.display_name || peer?.user?.display_name || peer?.user?.username || "User";
  const settings = peerSettings(userId);
  const streamMenu = mediaSource === "screen";
  const menu = document.createElement("div");
  menu.className = "peer-menu";
  menu.innerHTML = `
    <strong>${escapeHtml(label)}</strong>
    ${streamMenu ? `
      <label>${iconText("screen", "Stream volume")}
        <input type="range" min="0" max="200" value="${Math.round(settings.streamVolume * 100)}" data-peer-stream-volume="${userId}">
      </label>
    ` : ""}
    <label>${iconText("volume", "Voice volume")}
      <input type="range" min="0" max="200" value="${Math.round(settings.volume * 100)}" data-peer-volume="${userId}">
    </label>
    <button data-action="localMutePeer" data-user-id="${userId}">${iconText(settings.muted ? "mic" : "micOff", settings.muted ? "Unmute locally" : "Mute locally")}</button>
    ${hasPermission("mute_members") ? `<button data-action="adminDisconnectVoice" data-user-id="${userId}">${iconText("phoneOff", "Kick from voice")}</button>` : ""}
    ${hasPermission("mute_members") ? `<button data-action="adminServerMute" data-user-id="${userId}">${iconText("micOff", "Server mute")}</button>` : ""}
    ${hasPermission("kick_members") ? `<button data-action="adminKickMember" data-user-id="${userId}">${iconText("logout", "Kick from site")}</button>` : ""}
    ${hasPermission("ban_members") ? `<button class="danger" data-action="adminTempBanMember" data-user-id="${userId}">${iconText("bell", "Tempban 24h")}</button>` : ""}
    ${hasPermission("ban_members") ? `<button class="danger" data-action="adminBanMember" data-user-id="${userId}">${iconText("trash", "Ban from site")}</button>` : ""}
  `;
  document.body.appendChild(menu);
  const menuWidth = menu.offsetWidth || 250;
  const menuHeight = menu.offsetHeight || 190;
  menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))}px`;
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
  connectWs(true);
  if (state.guilds.length) await loadGuild(state.guilds[0].id, state.guilds[0].default_channel_id);
  render();
}

async function register(form) {
  const data = Object.fromEntries(new FormData(form));
  const result = await api("/api/register", { method: "POST", body: data });
  state.user = result.user;
  state.appVersion = result.version || APP_VERSION;
  state.guilds = result.guilds || [];
  connectWs(true);
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
  state.pendingVoiceHandoff = null;
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
  const file = state.attachedFile || form.elements.attachment?.files?.[0] || null;
  if ((!content && !file) || !state.activeChannelId) return;
  if (state.editingMessageId) {
    await api(`/api/messages/${state.editingMessageId}`, { method: "PATCH", body: { content } });
    state.editingMessageId = null;
  } else {
    const media = file ? await readComposerFile(file) : { image: null, attachment: null };
    await api(`/api/channels/${state.activeChannelId}/messages`, { method: "POST", body: { content, image: media.image, attachment: media.attachment } });
  }
  textarea.value = "";
  textarea.style.height = "auto";
  clearAttachedFile(form.elements.attachment);
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
  const screenTrack = state.voice.screenStream?.getVideoTracks()[0] || null;
  const screenSettings = screenTrack?.getSettings?.() || {};
  return {
    muted: state.voice.muted,
    camera: state.voice.camera,
    screen: state.voice.screen,
    camera_stream_id: state.voice.cameraStream?.id || "",
    screen_stream_id: state.voice.screenStream?.id || "",
    screen_width: Math.round(Number(screenSettings.width || 0)),
    screen_height: Math.round(Number(screenSettings.height || 0)),
    screen_frame_rate: Math.round(Number(screenSettings.frameRate || 0)),
    stream_quality: state.voice.screen ? state.streamQuality : ""
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
    audio: audioInputConstraints(),
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
      applyAudioOutput(audio);
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
    audio: audioInputConstraints(),
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

async function restartLocalAudio() {
  const oldStream = state.voice.localAudio;
  state.voice.localAudio = null;
  const stream = await ensureAudio();
  await syncLocalMediaToAllPeers();
  oldStream?.getTracks().forEach((track) => track.stop());
  applyLocalMuteTracks();
  publishVoiceState();
}

function createPeerRecord(user, mediaState = {}, channelId = state.voice.channelId) {
  const now = performance.now();
  return {
    user,
    state: { ...mediaState },
    channelId,
    streams: {
      audio: new MediaStream(),
      screenAudio: new MediaStream(),
      camera: new MediaStream(),
      screen: new MediaStream()
    },
    trackMeta: new Map(),
    health: {
      expectedSince: { camera: now, screen: now },
      lastHealthyAt: now,
      lastRecoveryAt: 0,
      recoveryAttempts: 0,
      previousFrames: 0,
      previousBytes: 0
    }
  };
}

function ensurePeerMedia(peer) {
  if (!peer.streams) peer.streams = {};
  for (const source of ["audio", "screenAudio", "camera", "screen"]) {
    if (!peer.streams[source]) peer.streams[source] = new MediaStream();
  }
  if (!peer.trackMeta) peer.trackMeta = new Map();
  if (!peer.health) {
    const now = performance.now();
    peer.health = {
      expectedSince: { camera: now, screen: now },
      lastHealthyAt: now,
      lastRecoveryAt: 0,
      recoveryAttempts: 0,
      previousFrames: 0,
      previousBytes: 0
    };
  }
  return peer;
}

function liveTracks(stream, kind = null) {
  if (!stream) return [];
  return stream.getTracks().filter((track) => track.readyState === "live" && (!kind || track.kind === kind));
}

function removeTrackFromPeerStreams(peer, track) {
  ensurePeerMedia(peer);
  Object.values(peer.streams).forEach((stream) => {
    if (stream.getTracks().includes(track)) stream.removeTrack(track);
  });
}

function moveRemoteTrack(peer, track, source) {
  ensurePeerMedia(peer);
  removeTrackFromPeerStreams(peer, track);
  const resolvedSource = track.kind === "audio"
    ? (source === "screen-audio" ? "screen-audio" : "audio")
    : (source === "screen" ? "screen" : "camera");
  const target = resolvedSource === "screen-audio"
    ? peer.streams.screenAudio
    : peer.streams[resolvedSource];
  if (!target.getTracks().includes(track)) target.addTrack(track);
  const meta = peer.trackMeta.get(track.id) || { track, streamId: "" };
  meta.source = resolvedSource;
  peer.trackMeta.set(track.id, meta);
}

function classifyRemoteTrack(peer, track, streamId = "", negotiatedSource = "") {
  if (track.kind === "audio") {
    if (negotiatedSource === "screen-audio") return "screen-audio";
    if (streamId && streamId === peer.state?.screen_stream_id) return "screen-audio";
    return "audio";
  }
  if (negotiatedSource === "screen" || negotiatedSource === "camera") return negotiatedSource;
  if (streamId && streamId === peer.state?.screen_stream_id) return "screen";
  if (streamId && streamId === peer.state?.camera_stream_id) return "camera";

  const screenOccupied = [...peer.trackMeta.values()].some(
    (meta) => meta.source === "screen" && meta.track?.readyState === "live"
  );
  const cameraOccupied = [...peer.trackMeta.values()].some(
    (meta) => meta.source === "camera" && meta.track?.readyState === "live"
  );
  if (peer.state?.screen && !screenOccupied) return "screen";
  if (peer.state?.camera && !cameraOccupied) return "camera";
  return peer.state?.screen && !peer.state?.camera ? "screen" : "camera";
}

function reconcilePeerMedia(peer) {
  ensurePeerMedia(peer);
  for (const [trackId, meta] of peer.trackMeta) {
    if (!meta.track || meta.track.readyState === "ended") {
      if (meta.track) removeTrackFromPeerStreams(peer, meta.track);
      peer.trackMeta.delete(trackId);
      continue;
    }
    const source = classifyRemoteTrack(peer, meta.track, meta.streamId, meta.source);
    moveRemoteTrack(peer, meta.track, source);
  }
}

function updatePeerMediaState(peer, nextState = {}) {
  ensurePeerMedia(peer);
  const now = performance.now();
  const previousScreen = !!peer.state?.screen;
  if (!peer.state?.camera && nextState.camera) peer.health.expectedSince.camera = now;
  if (!previousScreen && nextState.screen) peer.health.expectedSince.screen = now;
  peer.state = { ...nextState };
  reconcilePeerMedia(peer);

  if (previousScreen && !nextState.screen) {
    const videoId = "screen-peer-" + peer.user.id;
    state.voice.videoFrameTimes.delete(videoId);
    if (state.focusedVideoId === videoId) state.focusedVideoId = null;
    if (state.fullscreenVideoId === videoId) {
      state.fullscreenVideoId = null;
      if (documentFullscreenElement()) exitDocumentFullscreen().catch(() => {});
    }
  }
}

function handleVoiceJoined(payload) {
  state.voice.channelId = payload.channel.id;
  state.voice.channelName = payload.channel.name;
  state.voice.ghost = !!payload.ghost;
  state.voice.peers.clear();
  state.voice.pcs.forEach((pc) => pc.close());
  state.voice.pcs.clear();
  stopMediaHealthMonitor();
  stopAllSpeakingMonitors();
  if (state.voice.ghost) {
    state.voice.muted = true;
    state.voice.camera = false;
    state.voice.screen = false;
    state.voice.localAudio?.getTracks().forEach((track) => track.stop());
    state.voice.localAudio = null;
  } else {
    setVoicePresence(state.voice.channelId, state.user, voiceStatePayload());
  }
  for (const peer of payload.peers || []) {
    setVoicePresence(state.voice.channelId, peer.user, peer.state || {});
    state.voice.peers.set(
      Number(peer.user.id),
      createPeerRecord(peer.user, peer.state || {}, state.voice.channelId)
    );
  }
  if (!state.voice.ghost) {
    playTone("join");
    publishVoiceState();
  }
  render();
  startMediaHealthMonitor();
  for (const peer of payload.peers || []) {
    createPeer(Number(peer.user.id), true).catch((error) => notice(error.message, "error"));
  }
}

function handlePeerJoined(payload) {
  const userId = Number(payload.user.id);
  setVoicePresence(payload.channel_id, payload.user, payload.state || {});
  if (!state.voice.ghost && userId !== state.user.id) playTone("join");
  if (payload.channel_id !== state.voice.channelId || userId === state.user.id) {
    render();
    return;
  }
  const existing = state.voice.peers.get(userId);
  if (existing) {
    existing.user = payload.user;
    updatePeerMediaState(existing, payload.state || {});
  } else {
    state.voice.peers.set(
      userId,
      createPeerRecord(payload.user, payload.state || {}, payload.channel_id)
    );
  }
  render();
  if (state.voice.ghost) {
    createPeer(userId, true).catch((error) => notice(error.message, "error"));
  }
}

function closePeerConnection(userId) {
  const key = Number(userId);
  const pc = state.voice.pcs.get(key);
  const meta = pc?._mielcord;
  if (meta?.restartTimer) clearTimeout(meta.restartTimer);
  if (meta?.negotiationTimer) clearTimeout(meta.negotiationTimer);
  if (pc) pc.close();
  state.voice.pcs.delete(key);
}

function restartPeerIce(userId, pc, delay = 0) {
  if (!pc || pc.signalingState === "closed") return;
  const meta = pc._mielcord;
  if (!meta) return;
  if (meta.restartTimer) clearTimeout(meta.restartTimer);
  meta.restartTimer = setTimeout(() => {
    if (!state.voice.channelId || pc.signalingState === "closed") return;
    const now = Date.now();
    if (now - meta.lastIceRestartAt < 6000) return;
    meta.lastIceRestartAt = now;
    negotiate(userId, true).catch(() => {});
  }, delay);
}

function removePeer(userId) {
  const key = Number(userId);
  closePeerConnection(key);
  state.voice.peers.delete(key);
  stopSpeakingMonitor(key);
  for (const videoId of ["peer-" + key, "screen-peer-" + key]) {
    state.voice.videoFrameTimes.delete(videoId);
    if (state.fullscreenVideoId === videoId) {
      state.fullscreenVideoId = null;
      if (documentFullscreenElement()) exitDocumentFullscreen().catch(() => {});
    }
    if (state.focusedVideoId === videoId) state.focusedVideoId = null;
  }
  render();
}

function localTrackDescriptors() {
  const descriptors = [];
  const append = (stream, source) => {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      const resolvedSource = source === "screen" && track.kind === "audio" ? "screen-audio" : source;
      track._mielcordSource = resolvedSource;
      descriptors.push({ track, stream, source: resolvedSource });
    }
  };
  append(state.voice.localAudio, "audio");
  append(state.voice.cameraStream, "camera");
  append(state.voice.screenStream, "screen");
  return descriptors.filter(({ track }) => track.readyState === "live");
}

function screenTrackHint(track) {
  const surface = track?.getSettings?.().displaySurface || "";
  return surface === "browser" || surface === "window" ? "detail" : "motion";
}

async function configureSender(sender, source) {
  const track = sender?.track;
  if (!sender || !track) return;
  try {
    if ("contentHint" in track) {
      if (source === "audio") track.contentHint = "speech";
      if (source === "camera") track.contentHint = "motion";
      if (source === "screen") track.contentHint = screenTrackHint(track);
      if (source === "screen-audio") track.contentHint = "music";
    }
  } catch {}

  let parameters;
  try {
    parameters = sender.getParameters();
  } catch {
    return;
  }
  if (!parameters.encodings?.length) return;
  const encoding = parameters.encodings[0];
  if (track.kind === "audio") {
    encoding.maxBitrate = source === "screen-audio" ? 192_000 : 128_000;
    encoding.priority = "high";
    encoding.networkPriority = "high";
  } else if (source === "screen") {
    const profile = streamProfile();
    const peerFactor = Math.max(1, Math.sqrt(Math.max(1, state.voice.peers.size)));
    encoding.maxBitrate = Math.max(2_500_000, Math.round(profile.maxBitrate / peerFactor));
    encoding.maxFramerate = profile.frameRate;
    encoding.scaleResolutionDownBy = 1;
    encoding.priority = "high";
    encoding.networkPriority = "high";
    parameters.degradationPreference = screenTrackHint(track) === "detail"
      ? "maintain-resolution"
      : "maintain-framerate";
  } else {
    encoding.maxBitrate = 4_500_000;
    encoding.maxFramerate = 30;
    encoding.scaleResolutionDownBy = 1;
    encoding.priority = "medium";
    encoding.networkPriority = "medium";
    parameters.degradationPreference = "maintain-framerate";
  }
  try {
    await sender.setParameters(parameters);
  } catch {}
}

async function configureAllSenders(pc) {
  await Promise.all(
    pc.getSenders().map((sender) =>
      configureSender(sender, sender._mielcordSource).catch(() => {})
    )
  );
}

async function syncLocalTracks(pc) {
  let topologyChanged = false;
  for (const descriptor of localTrackDescriptors()) {
    let sender = pc.getSenders().find(
      (candidate) => candidate._mielcordSource === descriptor.source
    );
    if (sender) {
      if (sender.track !== descriptor.track) {
        await sender.replaceTrack(descriptor.track);
      }
    } else {
      sender = pc.addTrack(descriptor.track, descriptor.stream);
      sender._mielcordSource = descriptor.source;
      topologyChanged = true;
    }
    sender._mielcordSource = descriptor.source;
    await configureSender(sender, descriptor.source);
  }
  return topologyChanged;
}

function localSourceMap(pc) {
  const sources = {};
  for (const transceiver of pc.getTransceivers()) {
    const source = transceiver.sender?._mielcordSource;
    if (transceiver.mid && source) sources[transceiver.mid] = source;
  }
  return sources;
}

function sendRtcDescription(userId, pc) {
  if (!pc.localDescription) return;
  wsSend("rtc:signal", {
    channel_id: state.voice.channelId,
    target_user_id: userId,
    signal: {
      description: pc.localDescription,
      sources: localSourceMap(pc)
    }
  });
}

async function createPeer(userId, initiator = false) {
  const key = Number(userId);
  if (state.voice.pcs.has(key)) return state.voice.pcs.get(key);
  const pc = new RTCPeerConnection(rtcConfig);
  pc._mielcord = {
    polite: Number(state.user?.id || 0) > key,
    makingOffer: false,
    ignoreOffer: false,
    isSettingRemoteAnswerPending: false,
    needsNegotiation: false,
    pendingIceRestart: false,
    pendingCandidates: [],
    remoteSources: {},
    signalChain: Promise.resolve(),
    restartTimer: null,
    negotiationTimer: null,
    lastIceRestartAt: 0
  };
  state.voice.pcs.set(key, pc);
  const peer = state.voice.peers.get(key);
  if (peer) ensurePeerMedia(peer);

  pc.addEventListener("icecandidate", (event) => {
    if (!event.candidate) return;
    wsSend("rtc:signal", {
      channel_id: state.voice.channelId,
      target_user_id: key,
      signal: {
        candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
      }
    });
  });

  pc.addEventListener("track", (event) => {
    const currentPeer = state.voice.peers.get(key);
    if (!currentPeer) return;
    ensurePeerMedia(currentPeer);
    const streamId = event.streams?.[0]?.id || "";
    const negotiatedSource = pc._mielcord.remoteSources[event.transceiver?.mid] || "";
    const source = classifyRemoteTrack(currentPeer, event.track, streamId, negotiatedSource);
    currentPeer.trackMeta.set(event.track.id, {
      track: event.track,
      streamId,
      source
    });
    moveRemoteTrack(currentPeer, event.track, source);

    const refresh = () => {
      reconcilePeerMedia(currentPeer);
      syncMediaElements();
    };
    event.track.addEventListener("unmute", refresh);
    event.track.addEventListener("mute", refresh);
    event.track.addEventListener("ended", () => {
      const endedSource = currentPeer.trackMeta.get(event.track.id)?.source;
      removeTrackFromPeerStreams(currentPeer, event.track);
      currentPeer.trackMeta.delete(event.track.id);
      if (endedSource === "audio") stopSpeakingMonitor(key);
      syncMediaElements();
    });
    if (event.track.kind === "audio" && source === "audio") {
      startSpeakingMonitor(key, currentPeer.streams.audio);
    }
    refresh();
  });

  pc.addEventListener("negotiationneeded", () => {
    negotiate(key).catch(() => {});
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    if (pc.iceConnectionState === "failed") restartPeerIce(key, pc, 0);
    if (pc.iceConnectionState === "disconnected") restartPeerIce(key, pc, 3000);
  });

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") {
      markPeerMediaHealthy(key);
      configureAllSenders(pc).catch(() => {});
    }
    if (pc.connectionState === "failed") restartPeerIce(key, pc, 0);
    if (pc.connectionState === "disconnected") restartPeerIce(key, pc, 3000);
  });

  await syncLocalTracks(pc);
  if (initiator) await negotiate(key);
  return pc;
}

async function negotiate(userId, iceRestart = false) {
  const key = Number(userId);
  const pc = state.voice.pcs.get(key) || await createPeer(key, false);
  const meta = pc._mielcord;
  if (!meta || pc.signalingState === "closed") return;
  if (iceRestart) meta.pendingIceRestart = true;
  if (meta.makingOffer || pc.signalingState !== "stable") {
    meta.needsNegotiation = true;
    return;
  }
  try {
    meta.makingOffer = true;
    await syncLocalTracks(pc);
    if (meta.pendingIceRestart) {
      meta.pendingIceRestart = false;
      try { pc.restartIce(); } catch {}
    }
    await pc.setLocalDescription();
    await configureAllSenders(pc);
    sendRtcDescription(key, pc);
    meta.needsNegotiation = false;
  } finally {
    meta.makingOffer = false;
  }
}

async function flushPendingCandidates(pc) {
  const meta = pc._mielcord;
  if (!meta || !pc.remoteDescription) return;
  const candidates = meta.pendingCandidates.splice(0);
  for (const candidate of candidates) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      if (!meta.ignoreOffer) throw error;
    }
  }
}

async function processRtcSignal(userId, signal) {
  const key = Number(userId);
  const pc = state.voice.pcs.get(key) || await createPeer(key, false);
  const meta = pc._mielcord;
  if (!meta || pc.signalingState === "closed") return;

  if (signal.description) {
    if (signal.sources && typeof signal.sources === "object") {
      meta.remoteSources = { ...meta.remoteSources, ...signal.sources };
    }
    const description = signal.description;
    const readyForOffer = !meta.makingOffer &&
      (pc.signalingState === "stable" || meta.isSettingRemoteAnswerPending);
    const offerCollision = description.type === "offer" && !readyForOffer;
    meta.ignoreOffer = !meta.polite && offerCollision;
    if (meta.ignoreOffer) return;

    meta.isSettingRemoteAnswerPending = description.type === "answer";
    try {
      await pc.setRemoteDescription(description);
    } finally {
      meta.isSettingRemoteAnswerPending = false;
    }
    await flushPendingCandidates(pc);

    if (description.type === "offer") {
      await syncLocalTracks(pc);
      await pc.setLocalDescription();
      await configureAllSenders(pc);
      sendRtcDescription(key, pc);
    } else {
      await configureAllSenders(pc);
    }
    const peer = state.voice.peers.get(key);
    if (peer) {
      reconcilePeerMedia(peer);
      syncMediaElements();
    }
    if (meta.needsNegotiation && pc.signalingState === "stable") {
      clearTimeout(meta.negotiationTimer);
      meta.negotiationTimer = setTimeout(() => negotiate(key).catch(() => {}), 0);
    }
    return;
  }

  if (signal.candidate) {
    if (meta.ignoreOffer) return;
    if (!pc.remoteDescription) {
      meta.pendingCandidates.push(signal.candidate);
    } else {
      await pc.addIceCandidate(signal.candidate);
    }
  }
}

async function handleRtcSignal(payload) {
  const userId = Number(payload.from_user_id);
  const signal = payload.signal || {};
  let pc = state.voice.pcs.get(userId);
  if (!pc) pc = await createPeer(userId, false);
  const meta = pc._mielcord;
  meta.signalChain = meta.signalChain
    .catch(() => {})
    .then(() => processRtcSignal(userId, signal));
  return meta.signalChain;
}

function toggleMute() {
  if (state.voice.ghost) return;
  state.voice.muted = !state.voice.muted;
  playTone(state.voice.muted ? "mute" : "unmute");
  applyLocalMuteTracks();
  publishVoiceState();
  render();
}

function toggleDeafen() {
  if (!state.voice.channelId) return;
  state.voice.deafened = !state.voice.deafened;
  playTone(state.voice.deafened ? "mute" : "unmute");
  for (const userId of state.voice.peers.keys()) applyPeerMediaSettings(userId);
  render();
}

async function syncLocalMediaToPeer(userId, pc) {
  const topologyChanged = await syncLocalTracks(pc);
  if (topologyChanged) await negotiate(userId);
}

async function syncLocalMediaToAllPeers() {
  await Promise.all(
    [...state.voice.pcs.entries()].map(([userId, pc]) =>
      syncLocalMediaToPeer(userId, pc).catch(() => {})
    )
  );
}

async function replaceLocalSourceOnPeer(pc, descriptors, sourceNames) {
  let topologyChanged = false;
  for (const source of sourceNames) {
    const descriptor = descriptors.find((item) => item.source === source) || null;
    let sender = pc.getSenders().find((candidate) => candidate._mielcordSource === source);
    if (sender) {
      if (sender.track !== descriptor?.track) {
        await sender.replaceTrack(descriptor?.track || null);
      }
    } else if (descriptor) {
      sender = pc.addTrack(descriptor.track, descriptor.stream);
      sender._mielcordSource = source;
      topologyChanged = true;
    }
    if (sender && descriptor) {
      sender._mielcordSource = source;
      await configureSender(sender, source);
    }
  }
  return topologyChanged;
}

async function replaceLocalSourcesEverywhere(sourceNames) {
  const descriptors = localTrackDescriptors();
  await Promise.all(
    [...state.voice.pcs.entries()].map(async ([userId, pc]) => {
      const topologyChanged = await replaceLocalSourceOnPeer(pc, descriptors, sourceNames);
      if (topologyChanged) await negotiate(userId);
    })
  );
}

async function toggleCamera() {
  if (!state.voice.channelId || state.voice.ghost) return;
  if (state.voice.cameraStream) {
    const oldStream = state.voice.cameraStream;
    state.voice.cameraStream = null;
    state.voice.camera = false;
    publishVoiceState();
    await replaceLocalSourcesEverywhere(["camera"]);
    oldStream.getTracks().forEach((track) => track.stop());
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
      try { track.contentHint = "motion"; } catch {}
    });
    state.voice.cameraStream = stream;
    state.voice.camera = true;
    publishVoiceState();
    await replaceLocalSourcesEverywhere(["camera"]);
  }
  render();
}

async function captureScreenStream() {
  const devices = mediaDevices();
  if (!devices?.getDisplayMedia) {
    throw new Error("Screen sharing is not available in this browser.");
  }
  const stream = await devices.getDisplayMedia({
    video: streamConstraints(),
    audio: true,
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
    systemAudio: "include"
  });
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("No video track was returned for this screen share.");
  }
  try {
    await videoTrack.applyConstraints(streamConstraints());
  } catch {}
  stream.getTracks().forEach((track) => {
    track._mielcordSource = track.kind === "video" ? "screen" : "screen-audio";
    try {
      track.contentHint = track.kind === "video" ? screenTrackHint(track) : "music";
    } catch {}
  });
  videoTrack.addEventListener("ended", () => {
    if (state.voice.screenStream !== stream) return;
    stopScreenShare().catch(() => {});
  });
  return stream;
}

async function installScreenStream(stream) {
  const oldStream = state.voice.screenStream;
  state.voice.screenStream = stream;
  state.voice.screen = true;
  publishVoiceState();
  await replaceLocalSourcesEverywhere(["screen", "screen-audio"]);
  oldStream?.getTracks().forEach((track) => track.stop());
  if (!oldStream) playTone("stream");
  render();
}

async function startScreenShare() {
  const stream = await captureScreenStream();
  await installScreenStream(stream);
}

async function stopScreenShare() {
  const oldStream = state.voice.screenStream;
  if (!oldStream && !state.voice.screen) return;
  state.voice.screenStream = null;
  state.voice.screen = false;
  state.voice.videoFrameTimes.delete("screen-local");
  if (state.focusedVideoId === "screen-local") state.focusedVideoId = null;
  if (state.fullscreenVideoId === "screen-local") {
    state.fullscreenVideoId = null;
    if (documentFullscreenElement()) exitDocumentFullscreen().catch(() => {});
  }
  publishVoiceState();
  await replaceLocalSourcesEverywhere(["screen", "screen-audio"]);
  oldStream?.getTracks().forEach((track) => track.stop());
  playTone("stopStream");
  render();
}

async function toggleScreen() {
  if (!state.voice.channelId || state.voice.ghost) return;
  if (state.voice.screenStream) {
    await stopScreenShare();
  } else {
    await startScreenShare();
  }
}

async function changeScreenShare() {
  if (!state.voice.channelId || state.voice.ghost) return;
  const stream = await captureScreenStream();
  await installScreenStream(stream);
}

async function applyActiveStreamQuality() {
  const track = state.voice.screenStream?.getVideoTracks()[0] || null;
  if (track) {
    try {
      await track.applyConstraints(streamConstraints());
    } catch (error) {
      notice("The browser kept the closest supported stream resolution: " + (error.message || error));
    }
  }
  await Promise.all(
    [...state.voice.pcs.values()].map(async (pc) => {
      const sender = pc.getSenders().find((item) => item._mielcordSource === "screen");
      if (sender) await configureSender(sender, "screen");
    })
  );
  if (state.voice.screen) publishVoiceState();
}

async function renegotiateAll() {
  await Promise.all(
    [...state.voice.pcs.keys()].map((userId) => negotiate(userId).catch(() => {}))
  );
}

function leaveVoice(notify = true) {
  const previousGhost = state.voice.ghost;
  const previousChannelId = state.voice.channelId;
  if (notify) wsSend("voice:leave", {});
  state.voice.pcs.forEach((pc) => pc.close());
  state.voice.pcs.clear();
  state.voice.peers.clear();
  stopMediaHealthMonitor();
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
  state.voice.deafened = false;
  state.voice.camera = false;
  state.voice.screen = false;
  state.voice.ghost = false;
  state.focusedVideoId = null;
  state.fullscreenVideoId = null;
  if (documentFullscreenElement()) exitDocumentFullscreen().catch(() => {});
  state.callCollapsed = false;
  cleanupRemoteAudioElements();
  if (previousChannelId) {
    if (!previousGhost) removeVoicePresence(state.user?.id);
    if (!previousGhost) playTone("leave");
  }
  render();
}

function remoteAudioLayer() {
  let layer = document.getElementById("remoteAudioLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "remoteAudioLayer";
    layer.className = "remote-audio-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function ensureRemoteAudioElement(userId, source = "voice") {
  const layer = remoteAudioLayer();
  const streamAudio = source === "screen";
  const id = streamAudio ? `audio-screen-peer-${userId}` : `audio-peer-${userId}`;
  let audio = document.getElementById(id);
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = id;
    audio.dataset.peerAudio = `${userId}:${source}`;
    audio.autoplay = true;
    audio.playsInline = true;
    layer.appendChild(audio);
  }
  return audio;
}

function syncRemoteAudioElements() {
  const active = new Set();
  for (const [userId, peer] of state.voice.peers) {
    ensurePeerMedia(peer);
    const sources = [
      { name: "voice", stream: peer.streams.audio },
      { name: "screen", stream: peer.streams.screenAudio }
    ];
    for (const source of sources) {
      if (!liveTracks(source.stream, "audio").length) continue;
      const key = `${userId}:${source.name}`;
      active.add(key);
      const audio = ensureRemoteAudioElement(userId, source.name);
      if (audio.srcObject !== source.stream) audio.srcObject = source.stream;
      applyPeerMediaSettings(userId);
      const play = audio.play();
      if (play?.catch) play.catch(() => {});
    }
  }
  const layer = document.getElementById("remoteAudioLayer");
  layer?.querySelectorAll("[data-peer-audio]").forEach((node) => {
    if (!active.has(node.dataset.peerAudio)) node.remove();
  });
}

function cleanupRemoteAudioElements() {
  document.getElementById("remoteAudioLayer")?.remove();
}

function videoMediaForId(videoId) {
  if (videoId === "local") {
    return {
      stream: state.voice.cameraStream,
      expected: !!state.voice.camera,
      source: "camera",
      userId: Number(state.user?.id || 0)
    };
  }
  if (videoId === "screen-local") {
    return {
      stream: state.voice.screenStream,
      expected: !!state.voice.screen,
      source: "screen",
      userId: Number(state.user?.id || 0)
    };
  }
  if (videoId.startsWith("screen-peer-")) {
    const userId = Number(videoId.slice("screen-peer-".length));
    const peer = state.voice.peers.get(userId);
    ensurePeerMedia(peer || {});
    return {
      stream: peer?.streams?.screen || null,
      expected: !!peer?.state?.screen,
      source: "screen",
      userId
    };
  }
  if (videoId.startsWith("peer-")) {
    const userId = Number(videoId.slice("peer-".length));
    const peer = state.voice.peers.get(userId);
    ensurePeerMedia(peer || {});
    return {
      stream: peer?.streams?.camera || null,
      expected: !!peer?.state?.camera,
      source: "camera",
      userId
    };
  }
  return { stream: null, expected: false, source: "", userId: 0 };
}

function setVideoStatus(videoId, kind = "", message = "") {
  const tile = document.querySelector('[data-video-id="' + videoId + '"]');
  if (!tile) return;
  tile.classList.toggle("media-waiting", kind === "waiting");
  tile.classList.toggle("media-recovering", kind === "recovering");
  const status = tile.querySelector("[data-media-status]");
  if (status) status.textContent = message;
}

function noteVideoFrame(videoId, video) {
  state.voice.videoFrameTimes.set(videoId, performance.now());
  video.classList.add("has-video");
  setVideoStatus(videoId, "", "");
}

function monitorVideoFrames(video, videoId, track) {
  const monitorKey = track?.id || "";
  if (!track || video._mielcordFrameTrackId === monitorKey) return;
  video._mielcordFrameTrackId = monitorKey;

  const note = () => {
    if (!video.isConnected || video._mielcordFrameTrackId !== monitorKey) return false;
    noteVideoFrame(videoId, video);
    return true;
  };
  video.addEventListener("loadeddata", note, { once: true });
  video.addEventListener("playing", note, { once: true });
  video.addEventListener("timeupdate", note);

  if (typeof video.requestVideoFrameCallback === "function") {
    const onFrame = () => {
      if (!note()) return;
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }
}

function attachVideoMedia(videoId) {
  const video = document.getElementById("video-" + videoId);
  if (!video) return;
  const media = videoMediaForId(videoId);
  const stream = media.stream;
  const track = liveTracks(stream, "video")[0] || null;

  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.playsInline = true;

  if (!track) {
    if (video.srcObject) video.srcObject = null;
    video.classList.remove("has-video");
    state.voice.videoFrameTimes.delete(videoId);
    setVideoStatus(
      videoId,
      media.expected ? "waiting" : "",
      media.expected ? (media.source === "screen" ? "Connecting stream..." : "Connecting camera...") : ""
    );
    return;
  }

  if (video.srcObject !== stream) video.srcObject = stream;
  monitorVideoFrames(video, videoId, track);
  const play = video.play();
  if (play?.catch) play.catch(() => {});
  const hasDecodedFrame = video.videoWidth > 0 && video.readyState >= 2 && !track.muted;
  video.classList.toggle("has-video", hasDecodedFrame);
  if (hasDecodedFrame) {
    noteVideoFrame(videoId, video);
  } else if (media.expected) {
    setVideoStatus(
      videoId,
      "waiting",
      media.source === "screen" ? "Starting stream..." : "Starting camera..."
    );
  }
}

function videoIdsForPeer(userId, peer) {
  const ids = [];
  if (peer?.state?.camera) ids.push("peer-" + userId);
  if (peer?.state?.screen) ids.push("screen-peer-" + userId);
  return ids;
}

function markPeerMediaHealthy(userId) {
  const peer = state.voice.peers.get(Number(userId));
  if (!peer) return;
  ensurePeerMedia(peer);
  peer.health.lastHealthyAt = performance.now();
  peer.health.recoveryAttempts = 0;
  for (const videoId of videoIdsForPeer(userId, peer)) {
    setVideoStatus(videoId, "", "");
  }
}

async function recoverPeerMedia(userId, pc, peer, stalledVideoIds, statsProgressed) {
  const now = performance.now();
  if (now - peer.health.lastRecoveryAt < 8000) return;
  peer.health.lastRecoveryAt = now;
  peer.health.recoveryAttempts += 1;

  for (const videoId of stalledVideoIds) {
    const video = document.getElementById("video-" + videoId);
    if (video) {
      video.muted = true;
      const play = video.play();
      if (play?.catch) play.catch(() => {});
    }
    setVideoStatus(videoId, "recovering", "Recovering video...");
  }

  for (const receiver of pc.getReceivers()) {
    if (receiver.track?.kind !== "video") continue;
    try {
      const request = receiver.requestKeyFrame?.();
      if (request?.catch) request.catch(() => {});
    } catch {}
  }

  const connectionBroken = ["failed", "disconnected"].includes(pc.connectionState) ||
    ["failed", "disconnected"].includes(pc.iceConnectionState);
  if (connectionBroken || !statsProgressed || peer.health.recoveryAttempts % 3 === 0) {
    restartPeerIce(userId, pc, 0);
  } else {
    await negotiate(userId).catch(() => {});
  }
}

async function checkMediaHealth() {
  if (!state.voice.channelId || document.visibilityState !== "visible") return;
  const now = performance.now();
  for (const [userId, peer] of state.voice.peers) {
    const pc = state.voice.pcs.get(userId);
    if (!pc || pc.signalingState === "closed") continue;
    ensurePeerMedia(peer);

    let frames = 0;
    let bytes = 0;
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        const kind = report.kind || report.mediaType;
        if (report.type === "inbound-rtp" && kind === "video" && !report.isRemote) {
          frames += Number(report.framesDecoded || report.framesReceived || 0);
          bytes += Number(report.bytesReceived || 0);
        }
      });
    } catch {}

    const statsProgressed =
      frames > peer.health.previousFrames || bytes > peer.health.previousBytes;
    peer.health.previousFrames = Math.max(peer.health.previousFrames, frames);
    peer.health.previousBytes = Math.max(peer.health.previousBytes, bytes);

    const stalled = [];
    for (const source of ["camera", "screen"]) {
      if (!peer.state?.[source]) continue;
      const videoId = source === "screen" ? "screen-peer-" + userId : "peer-" + userId;
      const video = document.getElementById("video-" + videoId);
      const lastFrame = state.voice.videoFrameTimes.get(videoId) || 0;
      const visuallyHealthy = !!video &&
        video.videoWidth > 0 &&
        video.readyState >= 2 &&
        !video.paused &&
        (typeof video.requestVideoFrameCallback !== "function" || now - lastFrame < 6000);
      if (visuallyHealthy) {
        setVideoStatus(videoId, "", "");
        peer.health.expectedSince[source] = now;
      } else if (now - peer.health.expectedSince[source] > 7000) {
        stalled.push(videoId);
      }
    }

    if (!stalled.length) {
      if (videoIdsForPeer(userId, peer).length) markPeerMediaHealthy(userId);
      continue;
    }
    await recoverPeerMedia(userId, pc, peer, stalled, statsProgressed);
  }
}

function startMediaHealthMonitor() {
  stopMediaHealthMonitor(false);
  state.voice.healthTimer = setInterval(() => {
    checkMediaHealth().catch(() => {});
  }, 3000);
}

function stopMediaHealthMonitor(clearFrames = true) {
  if (state.voice.healthTimer) clearInterval(state.voice.healthTimer);
  state.voice.healthTimer = null;
  if (clearFrames) state.voice.videoFrameTimes.clear();
}

function syncMediaElements() {
  if (state.voice.localAudio) {
    startSpeakingMonitor(state.user?.id, state.voice.localAudio, () => state.voice.muted);
  }
  document.querySelectorAll(".video-tile[data-video-id]").forEach((tile) => {
    attachVideoMedia(tile.dataset.videoId || "");
  });
  for (const [userId, peer] of state.voice.peers) {
    ensurePeerMedia(peer);
    if (liveTracks(peer.streams.audio, "audio").length) {
      startSpeakingMonitor(userId, peer.streams.audio);
    }
    applyPeerMediaSettings(userId);
  }
  syncRemoteAudioElements();
  renderSpeakingHighlights();
}

init();
