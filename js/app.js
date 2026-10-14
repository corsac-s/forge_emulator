// Wires the code editor + face + physical controls together, running
// Forge scripts against the OlleeRuntime emulator the same way
// forge_interpreter.c loads a script onto sm_forge0..3: parse top-level
// enter/exit/init/subscribe + event handlers, run enter() once "loaded".

const HOLD_MS_A = 1500; // BUTTON_A_HOLD_PERIOD
const HOLD_MS_L = 2000; // BUTTON_L_HOLD_PERIOD
const HOLD_MS_M = 1500; // BUTTON_C_HOLD_PERIOD

const wfRoot = document.getElementById('watchface');
const watchface = new WatchFace(wfRoot);

const logEl = document.getElementById('log');
function log(msg) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}
function logError(msg) {
  const line = document.createElement('div');
  line.className = 'log-line log-error';
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}
function logWarn(msg) {
  const line = document.createElement('div');
  line.className = 'log-line log-warn';
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// Wires a "Copy ..." button to put getText()'s result on the clipboard. The
// label briefly confirms the result since a clipboard write has no visible
// effect.
function createCopyButton(btn, getText) {
  const label = btn.querySelector('span');
  const idleText = label.textContent;
  let timer = null;
  btn.addEventListener('click', async () => {
    let text;
    try {
      await navigator.clipboard.writeText(getText());
      text = 'Copied!';
    } catch (e) {
      text = 'Copy failed';
    }
    label.textContent = text;
    clearTimeout(timer);
    timer = setTimeout(() => { label.textContent = idleText; }, 1500);
  });
}

// Every log line, one per line, as plain text.
createCopyButton(document.getElementById('copy-log-btn'),
  () => Array.from(logEl.children, (line) => line.textContent).join('\n'));

let ollee = null;
let hooks = null;
let effectiveSubs = 0;
let running = false;
// True once a hook has thrown an uncaught error - forge_script_exec_bounded
// disables (S_BLOCKED) a face that errors on real hardware, so once this is
// set no further hook/timer callbacks run until the next Run.
let faceDisabled = false;
// True while the loaded face has been left for the home screen (M was
// pressed) but not fully unloaded - hooks/ollee/timers stay alive so M
// can re-enter the same face, matching sm_forge's ejs[] instances staying
// resident while a different face is on screen.
let onHomeScreen = false;

const editor = document.getElementById('editor');
const editorMinified = document.getElementById('editor-minified');

// Whichever editor tab is showing - the original or the minified script.
createCopyButton(document.getElementById('copy-source-btn'),
  () => (editor.hidden ? editorMinified : editor).value);
const filenameInput = document.getElementById('filename-input');
const fileInput = document.getElementById('file-input');
const loadFileBtn = document.getElementById('load-file-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const minifyBtn = document.getElementById('minify-btn');
const saveMinifiedBtn = document.getElementById('save-minified-btn');
const tabOriginal = document.getElementById('tab-original');
const tabMinified = document.getElementById('tab-minified');
const runBtn = document.getElementById('run-btn');
const runMinBtn = document.getElementById('run-minified-btn');
const stopBtn = document.getElementById('stop-btn');
const statusEl = document.getElementById('status');

// forge_script_record_t's storage on real hardware bounds a script to this
// many bytes - kept as a single constant here so the limit (and its
// warning message) can be updated in one place if the firmware's limit changes.
const FORGE_SCRIPT_BYTE_LIMIT = 2054;
const FORGE_SCRIPT_BYTE_LIMIT_WARNING = `Forge faces currently have a limit of ${FORGE_SCRIPT_BYTE_LIMIT} bytes. You may be able to minify this script to meet the limit.`;
const FORGE_SCRIPT_MINIFIED_BYTE_LIMIT_WARNING = `Forge faces currently have a limit of ${FORGE_SCRIPT_BYTE_LIMIT} bytes . This minified script is too large.`;

function warnIfOverByteLimit(text, message) {
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > FORGE_SCRIPT_BYTE_LIMIT) logWarn(message);
}

function getFileName() {
  return filenameInput.value.trim() || 'untitled.js';
}
function getMinifiedFileName() {
  const name = getFileName();
  return /\.js$/i.test(name) ? name.replace(/\.js$/i, '.min.js') : `${name}.min.js`;
}
function updateTabLabels() {
  tabOriginal.textContent = getFileName();
  tabMinified.textContent = getMinifiedFileName();
}
filenameInput.addEventListener('input', updateTabLabels);
updateTabLabels();

function setActiveTab(tab) {
  tabOriginal.classList.toggle('active', tab === 'original');
  tabMinified.classList.toggle('active', tab === 'minified');
  editor.hidden = tab !== 'original';
  editorMinified.hidden = tab !== 'minified';
}
tabOriginal.addEventListener('click', () => setActiveTab('original'));
tabMinified.addEventListener('click', async () => {
  await ensureMinified();
  setActiveTab('minified');
});

// Tracks the original-editor text the minified tab was last generated from,
// so switching tabs only re-minifies when the script actually changed -
// an explicit Minify click always regenerates.
let minifiedSourceSnapshot = null;

// Runs the vendored Terser (js/vendor/terser.bundle.min.js) over the
// current script. `mangle: false` is load-bearing, not just a size/speed
// tradeoff: forge_interpreter.c's forge_face_setup looks up hook functions
// and `subscribe` by their literal top-level names (see runScript below),
// and a setTimeout/setInterval callback given as a *string* (e.g.
// `Ollee.setInterval('turboTick()', 250)`) is later eval'd by name too -
// Terser can't see into that string to rename the call along with the
// declaration, so renaming any identifier at all risks silently breaking
// such a script. compress-level cleanup (dead code, folding) and stripping
// whitespace/comments are still safe since they don't touch names.
async function minifyNow() {
  const source = editor.value;
  if (typeof Terser === 'undefined') {
    logError('Minify failed: Terser library not loaded.');
    return false;
  }
  const result = await Terser.minify(source, {
    mangle: false,
    compress: { toplevel: false },
    format: { comments: false },
  });
  if (result.error) {
    logError(`Minify failed: ${result.error.message}`);
    return false;
  }
  editorMinified.value = result.code;
  minifiedSourceSnapshot = source;
  warnIfOverByteLimit(result.code, FORGE_SCRIPT_BYTE_LIMIT_WARNING);
  return true;
}
async function ensureMinified() {
  if (minifiedSourceSnapshot === editor.value) return true;
  return minifyNow();
}
minifyBtn.addEventListener('click', async () => {
  if (await minifyNow()) setActiveTab('minified');
});

// Saves via the File System Access API's native Save-As dialog (name
// pre-filled from suggestedName) where available; otherwise falls back to
// a plain browser download with the same pre-filled name.
async function saveTextToFile(text, suggestedName) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      log(`Saved ${suggestedName}`);
    } catch (e) {
      if (e.name !== 'AbortError') logError(`Save failed: ${e.message}`);
    }
    return;
  }
  const blob = new Blob([text], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  log(`Downloaded ${suggestedName}`);
}

saveFileBtn.addEventListener('click', () => saveTextToFile(editor.value, getFileName()));
saveMinifiedBtn.addEventListener('click', async () => {
  if (await ensureMinified()) saveTextToFile(editorMinified.value, getMinifiedFileName());
});

loadFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    editor.value = text;
    filenameInput.value = file.name;
    updateTabLabels();
    setActiveTab('original');
    warnIfOverByteLimit(text, FORGE_SCRIPT_BYTE_LIMIT_WARNING);
  };
  reader.readAsText(file);
  fileInput.value = '';
});

// Populates the editor with a starter example on first load, the same way
// a user's own Load file pick would. Browsers block fetch() when the page is
// opened from disk (file://), so fall back to an embedded copy of
// examples/template.js. Keep the two in sync.
const DEFAULT_EXAMPLE = 'template.js';
const DEFAULT_EXAMPLE_FALLBACK = `// Template project: a minimal Forge watch face to copy and build on.
// It shows "hello" on the main display and beeps when A is pressed.
//
// Standard functions (all optional, found by their exact top-level name):
//   init()  - runs once when the script is loaded. Set up state here.
//   enter() - runs every time the face is shown (after init(), and each
//             time you come back from the home screen with M). Draw here.
//   exit()  - runs every time the face is left (M to the home screen).
//             Stop timers or save state here.
//
// Event handlers (a_short, a_long, l_short, l_long, tilt, tap, button)
// only fire if their E_* bit is set in \`subscribe\` below.

const subscribe = E_A_SHORT;

function init() {
}

function enter() {
  Ollee.clear();
  Ollee.drawMain('hello ');
}

function exit() {
}

// A button pressed: beep.
function a_short() {
  Ollee.beep();
}
`;

function loadDefaultExample(text) {
  editor.value = text;
  filenameInput.value = DEFAULT_EXAMPLE;
  updateTabLabels();
  warnIfOverByteLimit(text, FORGE_SCRIPT_BYTE_LIMIT_WARNING);
}

fetch(`examples/${DEFAULT_EXAMPLE}`)
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  })
  .then(loadDefaultExample)
  .catch(() => loadDefaultExample(DEFAULT_EXAMPLE_FALLBACK));

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = 'status ' + (cls || '');
}

function updateButtons() {
  runBtn.disabled = false;
  runMinBtn.disabled = false;
  stopBtn.disabled = !(running || onHomeScreen);
}

// Reports a hook/timer callback that threw and wasn't caught by the script
// itself - matches forge_script_exec_bounded disabling a face on error on
// real hardware (see forge_status_t: S_VALID -> S_BLOCKED).
function reportUncaughtError(e, label) {
  logError(`${label}() error: ${e.message}`);
  logError('Uncaught error, face would be disabled on watch');
  faceDisabled = true;
  effectiveSubs = 0;
  if (ollee) ollee._clearSlot(undefined); // a blocked face shouldn't keep ticking
  setStatus('disabled', 'error');
}

// Runs a forge hook, catching and reporting any error it doesn't catch
// itself. No-ops once the face has already been disabled by a prior error.
function runHook(fn, label, ...args) {
  if (faceDisabled || typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (e) {
    reportUncaughtError(e, label);
  }
}

// Fully unloads the current face: exits it if it's still entered (skipped
// if it was already left via the home screen), cancels its timers, and
// drops its hooks/runtime.
function teardownFace(callExit) {
  if (callExit) runHook(hooks && hooks.exit, 'exit');
  if (ollee) ollee._clearSlot(undefined); // cancel all outstanding timers
  running = false;
  onHomeScreen = false;
  faceDisabled = false;
  hooks = null;
  ollee = null;
  effectiveSubs = 0;
  updateButtons();
}

function stopScript(silent) {
  if (!running && !onHomeScreen) return;
  teardownFace(running);
  if (!silent) { setStatus('stopped', 'stopped'); log('-- face exited --'); }
}

// Leaves whatever face is currently entered (if any) and shows the static
// "Ollee" home screen - same transition as pressing M from a running face,
// but also used to put the page in this state on first load.
function showHomeScreen() {
  if (running) {
    runHook(hooks && hooks.exit, 'exit');
    running = false;
  }
  onHomeScreen = true;
  updateButtons();
  watchface.clear();
  watchface.setClockDigits(' o11ee');
  setStatus('home screen', 'stopped');
  log('-- home screen --');
}

function runScript(source) {
  teardownFace(running);

  watchface.clear();
  ollee = new OlleeRuntime(watchface, log);

  const paramNames = ['Ollee', 'E_A_SHORT', 'E_A_LONG', 'E_L_SHORT', 'E_L_LONG', 'E_TILT', 'E_BUTTONS', 'E_TAP', 'B_A', 'B_L', 'E_DOWN', 'E_UP', 'console', 'log', 'Date'];
  const hookNames = ['enter', 'exit', 'init', 'a_short', 'a_long', 'l_short', 'l_long', 'tilt', 'tap', 'button'];

  const exportsObj = hookNames.map((n) => `${n}: (typeof ${n} !== 'undefined') ? ${n} : undefined`).join(',\n    ');
  const wrapped = `
    ${source}
    ;
    var __forge_exports = {
    ${exportsObj},
    subscribe: (typeof subscribe !== 'undefined') ? subscribe : 0
    };
    var __forge_eval = function(__code) { return eval(__code); };
    return { exports: __forge_exports, evalInScope: __forge_eval };
  `;

  const scriptConsole = {
    log: (...args) => log(args.map(String).join(' ')),
    error: (...args) => logError(args.map(String).join(' ')),
    warn: (...args) => log('[warn] ' + args.map(String).join(' ')),
  };

  let factory;
  try {
    factory = new Function(...paramNames, wrapped);
  } catch (e) {
    logError(`Syntax error: ${e.message}`);
    setStatus('syntax error', 'error');
    return;
  }

  let result;
  try {
    result = factory(ollee, E_A_SHORT, E_A_LONG, E_L_SHORT, E_L_LONG, E_TILT, E_BUTTONS, E_TAP, B_A, B_L, E_DOWN, E_UP, scriptConsole, log, OlleeDate);
  } catch (e) {
    logError(`Script error: ${e.message}`);
    setStatus('script error', 'error');
    return;
  }

  ollee.scopeEval = result.evalInScope;
  ollee.onUncaughtError = (e) => reportUncaughtError(e, 'timer');
  hooks = result.exports;

  const subs = hooks.subscribe || 0;
  effectiveSubs = 0;
  if ((subs & E_A_SHORT) && typeof hooks.a_short === 'function') effectiveSubs |= E_A_SHORT;
  if ((subs & E_A_LONG) && typeof hooks.a_long === 'function') effectiveSubs |= E_A_LONG;
  if ((subs & E_L_SHORT) && typeof hooks.l_short === 'function') effectiveSubs |= E_L_SHORT;
  if ((subs & E_L_LONG) && typeof hooks.l_long === 'function') effectiveSubs |= E_L_LONG;
  if ((subs & E_TILT) && typeof hooks.tilt === 'function') effectiveSubs |= E_TILT;
  if ((subs & E_TAP) && typeof hooks.tap === 'function') effectiveSubs |= E_TAP;
  if ((subs & E_BUTTONS) && typeof hooks.button === 'function') effectiveSubs |= E_BUTTONS;

  running = true;
  onHomeScreen = false;
  updateButtons();
  setStatus('running', 'running');
  log('-- face loaded --');
  log('-- face entered --');

  runHook(hooks.init, 'init');
  watchface.setWeekdayDigits(FORGE_MODE_NAME);
  runHook(hooks.enter, 'enter');
}

runBtn.addEventListener('click', () => {
  warnIfOverByteLimit(editor.value, FORGE_SCRIPT_BYTE_LIMIT_WARNING);
  runScript(editor.value);
});
runMinBtn.addEventListener('click', async () => {
  if (!(await ensureMinified())) return;
  warnIfOverByteLimit(editorMinified.value, FORGE_SCRIPT_MINIFIED_BYTE_LIMIT_WARNING);
  runScript(editorMinified.value);
});
stopBtn.addEventListener('click', () => stopScript());
updateButtons();

// --- Physical button A/L wiring: DOWN fires *_short immediately, a still
// held button fires *_long once after the hold period, and release fires
// button(btn, E_UP, millis) if subscribed - mirroring button.c's
// DOWN/HOLD/UP firing order. ---

// HAL_GetTick() on real hardware returns a uint32_t ms-since-boot tick that
// wraps at 2^32 - Date.now() is ms-since-epoch, so mod it into the same
// range rather than handing scripts a much larger absolute timestamp.
function millisNow() {
  return Date.now() % 0x100000000;
}

// Wraps a button's press/release logic in {press, release} so it can be
// driven by either its on-screen mouse events or the keyboard (see below) -
// the `held` guard makes both call paths idempotent (a repeated press while
// already held, from OS keyboard auto-repeat or an overlapping mouse event,
// is a no-op) so mixing input sources can't double-fire a hook or leave the
// on-screen button stuck lit.
// The HOLD icon lights once the hold period elapses whether or not the
// script subscribes to *_long - it shows the physical hold registering.
function createHoldableButton({ el, holdMs, shortBit, shortHook, longBit, longHook, btnConst, setVisual, setHold }) {
  let holdTimer = null;
  let held = false;
  function press() {
    if (!running || held) return;
    held = true;
    setVisual(true);
    if (effectiveSubs & shortBit) runHook(hooks[shortHook], shortHook);
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (!held) return;
      setHold(true);
      if (effectiveSubs & longBit) runHook(hooks[longHook], longHook);
    }, holdMs);
    if (effectiveSubs & E_BUTTONS) runHook(hooks.button, 'button', btnConst, E_DOWN, millisNow());
  }
  function release() {
    if (!held) return;
    held = false;
    setVisual(false);
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    setHold(false);
    if (running && (effectiveSubs & E_BUTTONS)) runHook(hooks.button, 'button', btnConst, E_UP, millisNow());
  }
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
  return { press, release };
}

const buttonA = createHoldableButton({
  el: document.getElementById('btn-a'),
  holdMs: HOLD_MS_A,
  shortBit: E_A_SHORT, shortHook: 'a_short',
  longBit: E_A_LONG, longHook: 'a_long',
  btnConst: B_A,
  setVisual: (v) => watchface.setButtonA(v),
  setHold: (v) => watchface.setButtonHold('A', v),
});

const buttonL = createHoldableButton({
  el: document.getElementById('btn-l'),
  holdMs: HOLD_MS_L,
  shortBit: E_L_SHORT, shortHook: 'l_short',
  longBit: E_L_LONG, longHook: 'l_long',
  btnConst: B_L,
  setVisual: (v) => watchface.setButtonL(v),
  setHold: (v) => watchface.setButtonHold('L', v),
});

// The M (mode) button isn't part of the forge_subscription bitmask - on
// real hardware it switches away from the current watch face to the mode
// screen rather than being an event a Forge script can subscribe to.
// Pressing it toggles: from a running face it fires exit() and shows the
// home screen (leaving hooks/timers resident, same as sm_forge's ejs[]
// instances staying loaded while another face is on screen); pressing it
// again from the home screen re-enters the same face by calling enter().
function createModeButton(el, setVisual, setHold) {
  let held = false;
  let holdTimer = null;
  function press() {
    if (held) return;
    held = true;
    setVisual(true);
    holdTimer = setTimeout(() => { holdTimer = null; if (held) setHold(true); }, HOLD_MS_M);
    if (onHomeScreen) {
      if (!hooks) return; // nothing loaded to re-enter
      running = true;
      onHomeScreen = false;
      updateButtons();
      setStatus('running', 'running');
      log('-- face re-entered --');
      watchface.setWeekdayDigits(FORGE_MODE_NAME);
      runHook(hooks.enter, 'enter');
    } else {
      showHomeScreen();
    }
  }
  function release() {
    if (!held) return;
    held = false;
    setVisual(false);
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    setHold(false);
  }
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
  return { press, release };
}

const buttonM = createModeButton(
  document.getElementById('btn-m'),
  (v) => watchface.setButtonM(v),
  (v) => watchface.setButtonHold('M', v),
);

// Tilt and tap are momentary buttons here (rather than a hardware sensor):
// each press simulates one tilt gesture / triple tap (Event_ACCEL_TRIPLE_TAP),
// firing E_TILT's or E_TAP's handler on press-down
// like the A/L buttons do for their own subscriptions.
function createMomentaryButton({ el, bit, hook, setVisual }) {
  let held = false;
  function press() {
    if (!running || held) return;
    held = true;
    setVisual(true);
    if (effectiveSubs & bit) runHook(hooks[hook], hook);
  }
  function release() {
    if (!held) return;
    held = false;
    setVisual(false);
  }
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
  return { press, release };
}

const buttonTilt = createMomentaryButton({
  el: document.getElementById('btn-tilt'),
  bit: E_TILT, hook: 'tilt',
  setVisual: (v) => watchface.setTilt(v),
});

const buttonTap = createMomentaryButton({
  el: document.getElementById('btn-tap'),
  bit: E_TAP, hook: 'tap',
  setVisual: (v) => watchface.setTap(v),
});

// Keyboard wiring: L/M/A/T/P mirror the on-screen buttons, and unlike a mouse
// (which can only hold one button down at a time) a keyboard can hold
// several keys at once, so this is how multi-button combos get tested.
// Ignored while the user is typing in the filename field or script editor.
const KEY_BUTTON_MAP = { l: buttonL, m: buttonM, a: buttonA, t: buttonTilt, p: buttonTap };

function isEditableTarget(el) {
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

const heldKeys = new Set();

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const btn = KEY_BUTTON_MAP[key];
  if (!btn || e.repeat || heldKeys.has(key)) return;
  if (isEditableTarget(document.activeElement)) return;
  heldKeys.add(key);
  btn.press();
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  const btn = KEY_BUTTON_MAP[key];
  if (!btn) return;
  heldKeys.delete(key);
  btn.release();
});

showHomeScreen();
