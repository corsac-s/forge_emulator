// Countdown to a target date.
// Day mode (default): days left, right-aligned on the main digits, and
// "d" on the day digits.
// Press A to toggle time mode: HH:MM:SS left in the current day, "t" on
// the day digits, refreshed every second.
// Press L to edit the target: L steps through year -> month -> day -> done.
// A increments the blinking field; hold A to increment every 250 ms.
//
// To save power, a timer only runs while something on screen changes faster
// than once an hour: in time mode, and while editing. Day mode has no timer;
// clock_hour() redraws it, so the day count still rolls over at midnight.
// Time mode uses a 1000 ms interval rather than E_CLOCK_SECOND: whole-second
// intervals run on the low-power RTC scheduler too, and unlike a `subscribe`
// bit the interval can be stopped in day mode.

// Target: year, month (0-11), day, hour, minute, second
var TARGET = new Date(2026, 11, 25, 0, 0, 0);   // 25 Dec 2026
const subscribe = E_A_SHORT + E_A_LONG + E_L_SHORT + E_BUTTONS + E_CLOCK_HOUR;

var timeMode = false;
var timer = -1;
var ticks = 0;
// Edit state: field -1 = not editing, 0 = year, 1 = month, 2 = day.
var field = -1;
var ey, em, ed;
var blinkOn = true;
var fast = false;

function pad(n) { return ('0' + n).slice(-2); }

function daysIn(y, m) { return new Date(y, m, 0).getDate(); }

function draw() {
  if (field >= 0) { drawEdit(); return; }

  var diff = Math.floor((TARGET.getTime() - new Date().getTime()) / 1000);
  if (diff < 0) {
    Ollee.drawColon(0);
    Ollee.drawMain(' done ');
    Ollee.drawDay('  ');
    return;
  }

  if (timeMode) {
    var h = Math.floor(diff / 3600) % 24;
    var m = Math.floor(diff / 60) % 60;
    var s = diff % 60;
    Ollee.drawMain(pad(h) + pad(m) + pad(s));
    Ollee.drawColon(1);
    Ollee.drawDay(' t');
  } else {
    Ollee.drawMain(Math.floor(diff / 86400));
    Ollee.drawColon(0);
    Ollee.drawDay(' d');
  }
}

function drawEdit() {
  var show = blinkOn || fast;
  Ollee.drawColon(0);
  if (field == 0) {
    Ollee.drawMain(show ? ey : '');
    Ollee.drawDay('  ');
  } else {
    Ollee.drawMain((field == 2 || show ? pad(em) : '  ') + '    ');
    Ollee.drawDay(field == 1 || show ? pad(ed) : '  ');
  }
}

function inc() {
  if (field == 0) {
    ey = ey >= 2099 ? new Date().getFullYear() : ey + 1;
  } else if (field == 1) {
    em = em % 12 + 1;
  } else {
    ed = ed % daysIn(ey, em) + 1;
  }
  if (ed > daysIn(ey, em)) ed = daysIn(ey, em);
  // Show the new value straight away rather than mid-blink.
  blinkOn = true;
  ticks = 0;
  draw();
}

// Runs every 250 ms while editing: fast-increments while A is held, and
// blinks the edited field every 500 ms.
function tick() {
  ticks++;
  if (fast) inc();
  else if (ticks % 2 == 0) { blinkOn = !blinkOn; draw(); }
}

function stopTimer() {
  if (timer >= 0) Ollee.clearInterval(timer);
  timer = -1;
}

// Starts the timer the current mode needs, if any: tick() every 250 ms while
// editing, draw() every second in time mode, none in day mode.
function updateTimer() {
  stopTimer();
  if (field >= 0) timer = Ollee.setInterval('tick()', 250);
  else if (timeMode) timer = Ollee.setInterval('draw()', 1000);
}

// Day mode's only refresh. Midnight is on the hour, so this catches the
// day count changing.
function clock_hour() {
  draw();
}

function a_short() {
  if (field >= 0) inc();
  else { timeMode = !timeMode; updateTimer(); draw(); }
}

function a_long() {
  if (field >= 0) fast = true;
}

function button(btn, ev) {
  if (btn == B_A && ev == E_UP && fast) {
    fast = false;
    ticks = 0;
    draw();
  }
}

function l_short() {
  fast = false;
  if (field < 0) {
    ey = TARGET.getFullYear();
    em = TARGET.getMonth() + 1;
    ed = TARGET.getDate();
  }
  field++;
  if (field > 2) {
    field = -1;
    TARGET = new Date(ey, em - 1, ed, 0, 0, 0);
  }
  blinkOn = true;
  ticks = 0;
  // Entering edit mode starts the 250 ms tick; leaving it goes back to the
  // display mode's timer (or none)
  if (field <= 0) updateTimer();
  draw();
}

// Opens in day mode, which needs no timer
function enter() {
  Ollee.clear();
  timeMode = false;
  field = -1;
  fast = false;
  stopTimer();
  draw();
}

function exit() {
  stopTimer();
}
