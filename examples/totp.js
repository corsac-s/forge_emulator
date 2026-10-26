// TOTP/HOTP authenticator for Ollee Watch Forge.
//
// TOTP: name for 5s, then the code. Day digits count down to the next code.
//   Holding L pins the current code: if the period rolls over mid-hold the
//   countdown sits at 0 and the old code stays up until release.
// HOTP: name, then the counter (PM lit), then the code. Day digits show L
//   clicks since this credential came up. That count is display only.
//   L click = +1 (short beep), L held 5s = -1 (long beep).
// A cycles credentials. L on the name/counter screen just skips ahead.
//
// Secrets live here rather than coming over BLE, which caps writes at 20
// bytes. Base32 as the service hands it out. Case, spaces and '=' are fine.
// SHA1 only. It's what everyone issues in practice and the only hash the
// firmware does natively.
//   n  name, 6 chars max on screen      t  'T' or 'H'
//   s  base32 secret                    d  digits, max 6 (default 6)
//   p  TOTP period (default 30)         c  HOTP starting counter (default 0)
// The rfc-* entries use the RFC 4226/6238 test key, so they can be checked
// against the published tables. Swap in your own.

// Test codes with - https://totp.danhersam.com/
const CREDS = [
  { n: 'rfc-t', t: 'T', s: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' },
  { n: 'rfc-h', t: 'H', s: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', c: 0 }
];

// Seconds. Fudge factor for a drifting clock or a bad tz_offset from the phone.
const TIME_ADJ = 0;

const NAME_MS = 5000;
const CNT_MS = 5000;
const HOTP_DEC_MS = 5000;

// E_CLOCK_SECOND ticks the TOTP countdown off the low-power RTC scheduler,
// with no timer slot to manage. It only runs while the face is on screen.
const subscribe = E_A_SHORT + E_BUTTONS + E_CLOCK_SECOND;

var ci = 0;
var ph = 0;            // 0 name, 1 counter (HOTP only), 2 code
var ses = 0;
var nameT = -1;        // timer ids: -1 means not running
var decT = -1;
var lHeld = false;
var lUsed = false;     // current L press already spent, don't count it on release
var shown = -1;        // TOTP step currently on screen

// --- HOTP ---

// Uint8Array rather than a plain array: Espruino spends a whole variable per
// array element, a typed array spends one byte.
function b32(s) {
  var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', v = 0, n = 0, o = [], i, x;
  s = s.toUpperCase();
  for (i = 0; i < s.length; i++) {
    x = A.indexOf(s.charAt(i));
    if (x < 0) continue;
    v = (v << 5 | x) & 4095; n += 5;
    if (n >= 8) { n -= 8; o.push(v >> n & 255); }
  }
  return new Uint8Array(o);
}

// RFC 4226 on top of the firmware's native HMAC. Last result is cached
// because draw() runs every second.
function code(c, n) {
  if (c.mk === n) return c.mv;
  if (!c.k) c.k = b32(c.s);
  if (!c.k.length) throw 'key';
  // Counter is a 64-bit big-endian. Shifts only see the low 32 bits, so the
  // high word needs one division. Uint8Array stores mask to a byte for free.
  var m = new Uint8Array(8), hi = Math.floor(n / 4294967296), i, h, f, v, d = c.d || 6;
  for (i = 0; i < 4; i++) { m[3 - i] = hi >>> 8 * i; m[7 - i] = n >>> 8 * i; }
  h = Ollee.hmacSha1(c.k, m);
  f = h[19] & 15;
  v = ((h[f] & 127) << 24 | h[f + 1] << 16 | h[f + 2] << 8 | h[f + 3]) % Math.pow(10, d);
  v = '' + v;
  while (v.length < d) v = '0' + v;
  c.mk = n; c.mv = v;
  return v;
}

// --- display ---

// The watch's Date is zoneless local time, so the offset has to come back off.
function unix() {
  return Math.floor((new Date().getTime() - Ollee.tz_offset * 3600000) / 1000) + TIME_ADJ;
}

function draw() {
  var c = CREDS[ci], p = c.p || 30, t, st, rem, txt;
  Ollee.drawPM(ph == 1);
  try {
    if (c.t == 'H') {
      Ollee.drawDay(ses % 100);
      txt = ph == 0 ? 0 : ph == 1 ? ('' + (c.c || 0)).slice(-6) : code(c, c.c || 0);
    } else {
      t = unix(); st = Math.floor(t / p); rem = p - t % p;
      if (st != shown) {
        // Only pin once the code is actually visible. Otherwise holding L
        // through the name screen would pin a code nobody has seen.
        if (lHeld && shown >= 0 && ph == 2) rem = 0;
        else shown = st;
      }
      Ollee.drawDay(rem);
      txt = ph == 0 ? 0 : code(c, shown);
    }
  } catch (e) {
    // An uncaught throw disables the face, so a bad secret shows Err instead.
    txt = ' Err  ';
  }
  Ollee.drawMain(txt || (c.n + '      ').slice(0, 6));
}

// Once a second while on screen. HOTP has nothing that changes with time.
// The tick isn't aligned to the clock's second, so the countdown (and the
// code at a rollover) can update up to ~1 s late; draw() works from the
// current time, so it never drifts further than that.
function clock_second() {
  if (CREDS[ci].t != 'H') draw();
}

// Callbacks reset their own id before doing anything else. Slots get reused,
// so clearing a stale id could kill some other timer.
function stop(id) { if (id >= 0) Ollee.clearTimeout(id); return -1; }

// --- screens ---

function showName() {
  nameT = stop(nameT);
  ph = 0;
  ses = 0;
  shown = -1;
  nameT = Ollee.setTimeout(nameDone, NAME_MS);
  draw();
}
function nameDone() { nameT = -1; next(); }
function next() {
  nameT = stop(nameT);
  if (ph == 0 && CREDS[ci].t == 'H') {
    ph = 1;
    nameT = Ollee.setTimeout(nameDone, CNT_MS);
  } else ph = 2;
  draw();
}

// --- input ---

function a_short() {
  // Kill any pending decrement so it can't land on the next credential.
  decT = stop(decT);
  lUsed = true;
  ci = (ci + 1) % CREDS.length;
  showName();
}

function hotpDec() {
  decT = -1;
  lUsed = true;
  var c = CREDS[ci];
  if (c.c > 0) { c.c--; if (ses > 0) ses--; }
  Ollee.beep();   // long beep: tells the user they can let go
  draw();
}

// Raw edges instead of l_short/l_long: the click has to count on release, or
// every 5s hold would do +1 first. l_long is also fixed at 1.5s.
function button(btn, ev) {
  if (btn != B_L) return;
  var c = CREDS[ci];
  if (ev == E_DOWN) {
    lHeld = true;
    lUsed = ph < 2;
    if (lUsed) next();
    else if (c.t == 'H') decT = Ollee.setTimeout(hotpDec, HOTP_DEC_MS);
  } else {
    lHeld = false;
    decT = stop(decT);
    if (c.t == 'H' && !lUsed) { c.c = (c.c || 0) + 1; ses++; Ollee.beepShort(); }
    draw();
  }
}

// --- lifecycle ---

// HOTP counters stay in RAM only. Forge has no storage, so a reboot resets
// them to `c` above.
function enter() {
  Ollee.clear();
  lHeld = false;
  showName();
}

// The firmware kills our timers on exit anyway, this just keeps the ids honest.
function exit() {
  nameT = stop(nameT);
  decT = stop(decT);
  lHeld = false;
}