// Countdown to a target date.
// Day mode (default): days left, right-aligned on the main digits, and
// "d" on the day digits.
// Press A to toggle time mode: HH:MM:SS left in the current day, "t" on
// the day digits, ticking every second.

// Target: year, month (0-11), day, hour, minute, second
var TARGET = new Date(2026, 11, 25, 0, 0, 0);   // 25 Dec 2026
const subscribe = E_A_SHORT;

var timeMode = false;
var timer = -1;

function pad(n) { return ('0' + n).slice(-2); }

function draw() {
  var diff = Math.floor((TARGET.getTime() - new Date().getTime()) / 1000);
  if (diff < 0) {
    Ollee.drawColon(0);
    Ollee.drawMain(' DONE ');
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

function a_short() {
  timeMode = !timeMode;
  draw();
}

function enter() {
  Ollee.clear();
  timeMode = false;
  if (timer < 0) timer = Ollee.setInterval('draw()', 1000);
  draw();
}

function exit() {
  if (timer >= 0) Ollee.clearInterval(timer);
  timer = -1;
}
