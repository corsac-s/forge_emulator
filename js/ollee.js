// Emulates the `Ollee` global object exposed to Forge scripts by the
// firmware's Espruino bindings (Ollee_watch_fw_app/Ollee/espruino_embedded.c).
// Method-for-method mirror of the JSON-annotated jswrap_ollee_*/gen_jswrap_Ollee_*
// functions there, backed by a WatchFace instance instead of real LCD hardware.

// Bit values from forge_interpreter.h's `enum forge_subscription`.
const E_A_SHORT = 1 << 0;
const E_A_LONG = 1 << 1;
const E_L_SHORT = 1 << 2;
const E_L_LONG = 1 << 3;
const E_TILT = 1 << 4;
const E_BUTTONS = 1 << 5;
const E_TAP = 1 << 6;
const E_BLE_RX = 1 << 7;
const E_CLOCK_MINUTE = 1 << 8;
const E_CLOCK_HOUR = 1 << 9;
const E_BLE_CONNECT = 1 << 10;
const E_BLE_DISCONNECT = 1 << 11;

// Values passed to a script's button(btn, event, millis) handler.
const B_A = 0;
const B_L = 1;
const E_DOWN = 0;
const E_UP = 1;

const EJS_TIMER_SLOTS = 4;

// E_* bits Ollee.subscribe accepts (FORGE_BG_EVENTS in forge_interpreter.h)
const FORGE_BG_EVENTS = E_BLE_RX | E_CLOCK_MINUTE | E_CLOCK_HOUR | E_BLE_CONNECT | E_BLE_DISCONNECT;

// Forge BLE service limits (forge_ble.h): bytes per GATT write/notification,
// and bytes Ollee.send() can have waiting to go out.
const FORGE_BLE_MAX_DATA_LEN = 20;
const FORGE_BLE_TX_BUF_SIZE = 256;

// Converts a string to the bytes the firmware would send or receive, as a
// "binary string" (one char per byte, 0-255) like Espruino uses. A string
// already made of 0-255 char codes (e.g. one ble_rx() received) is taken
// byte-for-byte; anything else is UTF-8 encoded, matching how non-ASCII text
// in a script's source reaches the watch.
function toByteString(str) {
  if (/^[\x00-\xff]*$/.test(str)) return str;
  return Array.from(new TextEncoder().encode(str), (b) => String.fromCharCode(b)).join('');
}

// Flattens an Ollee.hmacSha1 argument to bytes the way the firmware's
// jsvIterateBufferCallback does: a string is its bytes (see toByteString),
// a number is one byte, and arrays/typed arrays are walked element by
// element. Anything else is a TypeError, as on the watch.
function toHmacBytes(v, out) {
  if (typeof v === 'number' || typeof v === 'boolean') {
    out.push(Number(v) & 255);
  } else if (typeof v === 'string') {
    const s = toByteString(v);
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  } else if (ArrayBuffer.isView(v)) {
    for (let i = 0; i < v.length; i++) out.push(Number(v[i]) & 255);
  } else if (Array.isArray(v)) {
    v.forEach((el) => toHmacBytes(el, out));
  } else {
    throw new TypeError(`Expecting Number or iterable, got ${v === null ? 'null' : typeof v}`);
  }
  return out;
}

function sha1Bytes(bytes) {
  const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
  const m = bytes.slice();
  const bits = bytes.length * 8;
  m.push(0x80);
  while (m.length % 64 !== 56) m.push(0);
  // 64-bit big-endian bit length (the high word only matters past 512 MB)
  const hi = Math.floor(bits / 0x100000000);
  m.push(hi >>> 24, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
    bits >>> 24, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);
  const w = new Array(80);
  for (let o = 0; o < m.length; o += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
    }
    for (let i = 16; i < 80; i++) {
      const t = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (t << 1) | (t >>> 31);
    }
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? ((b & c) | (~b & d)) + 0x5A827999
        : i < 40 ? (b ^ c ^ d) + 0x6ED9EBA1
        : i < 60 ? ((b & c) | (b & d) | (c & d)) + 0x8F1BBCDC
        : (b ^ c ^ d) + 0xCA62C1D6;
      const t = (((a << 5) | (a >>> 27)) + e + w[i] + f) | 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0;
  }
  const out = [];
  for (let i = 0; i < 20; i++) out.push((h[i >> 2] >>> (24 - 8 * (i & 3))) & 255);
  return out;
}

// How long the speaker icon stays lit after beep(). Longer than the 80 ms
// tone itself so it's actually visible; matches the wf-beep-flash animation.
const BEEP_ICON_MS = 250;

// Static face name the firmware shows on the weekday/mode digits while the
// Forge face is active (FORGE_MODE_NAME in forge_interpreter.h). Scripts
// can't change it, and Ollee.clear() restores it. Slots are lettered: slot 0
// is 'FA', and future slots will be 'FB', 'FC', 'FD'.
const FORGE_MODE_NAME = 'FA';

class OlleeRuntime {
  constructor(watchface, log) {
    this.wf = watchface;
    this.log = log || (() => {});
    this._timerSlots = new Array(EJS_TIMER_SLOTS).fill(null);
    // Set by the script runner after evaluating a script, so that
    // string-form setTimeout/setInterval callbacks run in the script's
    // own scope (matching how the firmware re-parses/executes them there).
    this.scopeEval = null;
    // Set by the script runner to report a timer callback that threw and
    // wasn't caught by the script itself (setTimeout/setInterval callbacks
    // otherwise run outside of any try/catch the runner wraps hooks in).
    this.onUncaughtError = null;
    this._batteryVolts = 2.9;
    this._temperatureC = 23.0;
    this._steps = 5000;
    // Whether the emulated phone is connected (the "phone connected" box),
    // and where Ollee.send()'s notifications go - both set by app.js.
    this.bleConnected = () => true;
    this.onBleNotify = null;
    // Whether the face is on screen - set by app.js
    this.isActive = () => true;
    // E_* bits subscribed with Ollee.subscribe (background delivery)
    this.bgSubs = 0;
  }

  // --- Face state / background events (forge_slot_is_active,
  // forge_bg_subscribe in forge_interpreter.c) ---

  active() { return !!this.isActive(); }

  subscribe(events) {
    events = Number(events) | 0;
    if (events === 0 || (events & ~FORGE_BG_EVENTS)) return false;
    this.bgSubs |= events;
    return true;
  }

  unsubscribe(events) {
    events = Number(events) | 0;
    if (events === 0 || (events & ~FORGE_BG_EVENTS)) return false;
    this.bgSubs &= ~events;
    return true;
  }

  // --- Drawing (ignored while the face isn't on screen, since another
  // face owns the display) ---

  // Right-aligned on the 6 clock digits, matching the firmware's
  // jswrap_ollee_draw_main (first 6 chars kept, then left-padded).
  drawMain(clock) { if (this.active()) this.wf.setClockDigits(String(clock).slice(0, 6).padStart(6, ' ')); }
  // Right-aligned on the 2 day digits the same way (jswrap_ollee_draw_day).
  drawDay(day) { if (this.active()) this.wf.setDayDigits(String(day).slice(0, 2).padStart(2, ' ')); }
  drawColon(val) { if (this.active()) this.wf.setColon(!!val); }
  drawLap(val) { if (this.active()) this.wf.setLap(!!val); }
  drawPM(val) { if (this.active()) this.wf.setPm(!!val); }
  drawHR(val) { if (this.active()) this.wf.setHr(!!val); }
  // No drawBell/drawChime: the bell and chime indicators belong to the
  // system (alarm / hourly chime), so scripts can't set them and clear()
  // leaves them as they are (screen_clear_keep_bell_chime in the firmware).
  clear() {
    if (!this.active()) return;
    this.wf.clear({ keepBellChime: true });
    this.wf.setWeekdayDigits(FORGE_MODE_NAME);
  }

  // --- Feedback ---

  beep() {
    if (this.wf.state.audioDisabled) {
      this.log('muted beep()');
      return;
    }
    this.log('beep()');
    this._flashElement(this.wf.root, 'wf-beep-flash');
    this.wf.showAudio(BEEP_ICON_MS);
    this._playBeep(2048);
  }

  // buzzer_beep_very_short: same length as beep(), but an LPTIM period of 8
  // instead of 16 ticks, so about 4 kHz rather than 2 kHz.
  beepShort() {
    if (this.wf.state.audioDisabled) {
      this.log('muted beepShort()');
      return;
    }
    this.log('beepShort()');
    this._flashElement(this.wf.root, 'wf-beep-flash');
    this.wf.showAudio(BEEP_ICON_MS);
    this._playBeep(4096);
  }

  led_on() { this.wf.setLed(true); this.log('led_on()'); }
  led_off() { this.wf.setLed(false); this.log('led_off()'); }

  _flashElement(el, cls) {
    el.classList.remove(cls);
    // Force reflow so re-adding the class restarts the CSS animation.
    void el.offsetWidth;
    el.classList.add(cls);
  }

  _playBeep(frequency) {
    try {
      const ctx = OlleeRuntime._audioCtx || (OlleeRuntime._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio is best-effort; ignore if the browser blocks autoplay.
    }
  }

  // --- Sensors / misc ---

  hwRand() {
    return Math.floor(Math.random() * (0xEFFF + 1));
  }

  // HMAC-SHA1 (jswrap_ollee_hmac_sha1). Native and effectively instant on
  // the watch, so it's synchronous here too rather than using WebCrypto.
  hmacSha1(key, message) {
    let k = toHmacBytes(key, []);
    const msg = toHmacBytes(message, []);
    if (k.length > 64) k = sha1Bytes(k);
    while (k.length < 64) k.push(0);
    const inner = sha1Bytes(k.map((b) => b ^ 0x36).concat(msg));
    return new Uint8Array(sha1Bytes(k.map((b) => b ^ 0x5C).concat(inner)));
  }

  // Plain SHA-1 (jswrap_ollee_sha1). Takes bytes the same way as hmacSha1.
  sha1(data) {
    return new Uint8Array(sha1Bytes(toHmacBytes(data, [])));
  }

  temperature() {
    // Real hardware samples the accelerometer's onboard temp sensor;
    // emulate with a gently drifting value.
    this._temperatureC += (Math.random() - 0.5) * 0.2;
    return Math.round(this._temperatureC * 100) / 100;
  }

  // Today's step count (sm_pedometer_get_steps on hardware); a fixed
  // placeholder here since there's no accelerometer to count with.
  steps() {
    return this._steps;
  }

  // Fixed to Toronto; on the watch this is the location the paired phone
  // set over OAP, stored in thousandths of a degree (so 3 decimal places).
  latitude() { return 43.653; }
  longitude() { return -79.383; }

  battery() {
    return Math.round(this._batteryVolts * 1000) / 1000;
  }

  // --- Forge BLE service (jswrap_ollee_send / forge_ble.c) ---

  // Whether a phone is connected (jswrap_ollee_connected), driven by the
  // "phone connected" box.
  connected() {
    return !!this.bleConnected();
  }

  // Sends as FORGE_BLE_MAX_DATA_LEN-byte notifications. The emulator sends
  // them instantly, so the 256-byte TX buffer only limits a single call.
  send(data) {
    const bytes = toByteString(String(data));
    if (!this.connected() || bytes.length === 0 || bytes.length > FORGE_BLE_TX_BUF_SIZE) return false;
    for (let i = 0; i < bytes.length; i += FORGE_BLE_MAX_DATA_LEN) {
      if (this.onBleNotify) this.onBleNotify(bytes.slice(i, i + FORGE_BLE_MAX_DATA_LEN));
    }
    return true;
  }

  get tz_offset() {
    return -(new Date().getTimezoneOffset()) / 60;
  }

  get hw_version() {
    return 'EMULATOR';
  }

  get version() { return '0.1'; }
  get version_major() { return 0; }
  get version_minor() { return 1; }

  // --- Timers (Ollee.setTimeout/setInterval share 4 slots, matching
  // EJS_TIMER_SLOTS in forge_interpreter.c) ---

  _runCallback(callback) {
    try {
      if (typeof callback === 'function') {
        callback();
      } else if (typeof callback === 'string') {
        if (this.scopeEval) this.scopeEval(callback);
        else this.log(`(no script scope to run: ${callback})`);
      }
    } catch (e) {
      if (this.onUncaughtError) this.onUncaughtError(e);
    }
  }

  setTimeout(callback, delay) {
    if (typeof callback !== 'function' && typeof callback !== 'string') return -1;
    const slot = this._timerSlots.findIndex((s) => s === null);
    if (slot === -1) return -1;
    const delayMs = delay < 1 ? 1 : delay;
    const handle = setTimeout(() => {
      this._timerSlots[slot] = null;
      this._runCallback(callback);
    }, delayMs);
    this._timerSlots[slot] = { handle, periodic: false };
    return slot;
  }

  setInterval(callback, delay) {
    if (typeof callback !== 'function' && typeof callback !== 'string') return -1;
    const slot = this._timerSlots.findIndex((s) => s === null);
    if (slot === -1) return -1;
    const delayMs = delay < 1 ? 1 : delay;
    const handle = setInterval(() => this._runCallback(callback), delayMs);
    this._timerSlots[slot] = { handle, periodic: true };
    return slot;
  }

  clearTimeout(id) { this._clearSlot(id); }
  clearInterval(id) { this._clearSlot(id); }

  _clearSlot(id) {
    if (id === undefined || id === null) {
      this._timerSlots.forEach((s, i) => this._clearSlotIndex(i));
      return;
    }
    this._clearSlotIndex(id);
  }

  _clearSlotIndex(i) {
    const slot = this._timerSlots[i];
    if (!slot) return;
    if (slot.periodic) clearInterval(slot.handle);
    else clearTimeout(slot.handle);
    this._timerSlots[i] = null;
  }
}

// Espruino's Date on the firmware never applies a UTC offset or DST (see
// espruino_embedded.c's setCorrectTimeZone/jsdGetEffectiveTimeZone - Ollee
// never calls E.setTimeZone/E.setDST, so `zone` is always 0): whatever wall
// clock the RTC holds is decoded as-is, with getHours()/getDate()/etc.
// reading the stored ms as if it were already UTC. The host browser's real
// `Date` instead applies the machine's actual OS timezone/DST to every
// local getter and to the (year, month, day, ...) constructor form, so a
// script's own Date math (see examples/countdown.js) would silently pick up
// a real-world UTC offset the firmware never has. OlleeDate mirrors the
// firmware instead: field-based construction and every wall-clock getter
// go through the real Date's *UTC* variants, so the stored ms is always
// exactly the fields a script gave it (or read from it), zone-free.
class OlleeDate {
  constructor(...args) {
    if (args.length === 0) {
      this._ms = OlleeDate.now();
    } else if (args.length === 1) {
      this._ms = typeof args[0] === 'string' ? Date.parse(args[0]) : Number(args[0]);
    } else {
      const [year, month, day = 1, hours = 0, minutes = 0, seconds = 0, ms = 0] = args;
      this._ms = Date.UTC(year, month, day, hours, minutes, seconds, ms);
    }
  }

  static now() {
    const real = new Date();
    return Date.UTC(
      real.getFullYear(), real.getMonth(), real.getDate(),
      real.getHours(), real.getMinutes(), real.getSeconds(), real.getMilliseconds()
    );
  }

  getTime() { return this._ms; }
  valueOf() { return this._ms; }
  setTime(ms) { this._ms = ms; return this._ms; }

  getFullYear() { return new Date(this._ms).getUTCFullYear(); }
  getMonth() { return new Date(this._ms).getUTCMonth(); }
  getDate() { return new Date(this._ms).getUTCDate(); }
  getDay() { return new Date(this._ms).getUTCDay(); }
  getHours() { return new Date(this._ms).getUTCHours(); }
  getMinutes() { return new Date(this._ms).getUTCMinutes(); }
  getSeconds() { return new Date(this._ms).getUTCSeconds(); }
  getMilliseconds() { return new Date(this._ms).getUTCMilliseconds(); }
  // Firmware's Date never applies a timezone shift either.
  getTimezoneOffset() { return 0; }

  toISOString() { return new Date(this._ms).toISOString(); }
  toString() { return new Date(this._ms).toUTCString(); }
}
