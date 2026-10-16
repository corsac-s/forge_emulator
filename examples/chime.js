// Chime: a clock face that redraws once a minute, plus an hourly chime that
// rings whichever face the watch is showing.
// E_CLOCK_MINUTE is in `subscribe`, so clock_minute() runs each time the
// clock reaches a new minute while this face is on screen. No timer needed.
// E_CLOCK_HOUR is subscribed in the background with Ollee.subscribe, so
// clock_hour() runs on every hour even from another face, and beeps the
// hour (1-12 beeps).
// A turns the chime off and on (LAP shows it's on). L plays the chime now.
// In the emulator, the Clock panel's Minute tick / Hour tick buttons fire a
// tick right away.
const subscribe = E_CLOCK_MINUTE + E_A_SHORT + E_L_SHORT;

var chimeOn = false;
var left = 0; // beeps still to play

function pad(n) { return ('0' + n).slice(-2); }

function draw() {
  var d = new Date();
  Ollee.drawMain(pad(d.getHours()) + pad(d.getMinutes()) + '  ');
  Ollee.drawColon(1);
  Ollee.drawDay(d.getDate());
  Ollee.drawLap(chimeOn);
}

function setChime(on) {
  if (on) {
    chimeOn = Ollee.subscribe(E_CLOCK_HOUR);
  } else {
    Ollee.unsubscribe(E_CLOCK_HOUR);
    chimeOn = false;
  }
}

function ring() {
  Ollee.beep();
  if (--left > 0) Ollee.setTimeout(ring, 400);
}

function chime() {
  left = new Date().getHours() % 12 || 12;
  ring();
}

// Runs when the script loads (upload and boot), so the chime works before
// the face has ever been opened
function init() {
  setChime(true);
}

function enter() {
  Ollee.clear();
  draw();
}

// Only while the face is on screen (it's in `subscribe`, not Ollee.subscribe)
function clock_minute() {
  draw();
}

// On the hour, on screen or not. clock_minute() has already run for this
// tick if the face is on screen.
function clock_hour() {
  chime();
}

function a_short() {
  setChime(!chimeOn);
  draw();
}

function l_short() {
  chime();
}
