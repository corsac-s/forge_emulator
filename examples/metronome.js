// Metronome: beeps at `bpm` while the face is on screen.
// L = -1 bpm, A = +1 bpm on release. Long-press either button to keep
// stepping every 100 ms until it's released.
var bpm = 120, tickId = -1, repeatId = -1, dir = 0;
var MIN_BPM = 20, MAX_BPM = 300, REPEAT_MS = 100;
const subscribe = E_BUTTONS + E_A_LONG + E_L_LONG;

function show() {
  Ollee.drawMain(bpm);
}

function stopTimer(id) {
  if (id !== -1) Ollee.clearInterval(id);
  return -1;
}

function startTicking() {
  tickId = stopTimer(tickId);
  tickId = Ollee.setInterval('Ollee.beep()', Math.round(60000 / bpm));
}

function step(d) {
  bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm + d));
  show();
}

function stepRepeat() {
  step(dir);
}

// Long press: step now, then keep stepping every REPEAT_MS until E_UP.
function startRepeat(d) {
  repeatId = stopTimer(repeatId);
  dir = d;
  step(dir);
  repeatId = Ollee.setInterval('stepRepeat()', REPEAT_MS);
}

function a_long() { startRepeat(1); }
function l_long() { startRepeat(-1); }

function button(btn, evt, ms) {
  if (evt !== E_UP) return;
  var d = btn === B_A ? 1 : -1;
  if (d === dir) {
    // Releasing the long-pressed button ends its repeat.
    repeatId = stopTimer(repeatId);
    dir = 0;
  } else {
    // A short press counts once, on release.
    step(d);
  }
  startTicking();
}

function enter() {
  Ollee.clear();
  show();
  startTicking();
}

function exit() {
  tickId = stopTimer(tickId);
  repeatId = stopTimer(repeatId);
  dir = 0;
}
