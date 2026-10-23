// stopwatch with flyback function
//
// Press A to start and stop the stopwatch
// Press L to reset
// Template project: a minimal Forge watch face to copy and build on.
// It shows "hello" on the main display and beeps when A is pressed.
//
// Standard functions (all optional, found by their exact top-level name):
//   init()  - runs once when the script is loaded. Set up state here.
//   enter() - runs every time the face is shown (after init(), and each
//             time you come back from the home screen with M). Draw here.
//   exit()  - runs every time the face is left (M to the home screen).
//             Stop timers or save state here.
//
// Event handlers (a_short, a_long, l_short, l_long, tilt, tap, button, ble_rx,
// clock_minute, clock_hour) only fire if their E_* bit is set in `subscribe`
// below.

const subscribe = E_A_SHORT + E_L_SHORT;

var running = false;
var timer = -1;

var sw = 0;
var startedAt = -1;

function init() {
}

function enter() {
  log("enter(): running=" + running + " timer=" + timer + " sw=" + sw + " startedAt=" + startedAt);
  if(running) {
    var now = new Date();
    sw = now - startedAt;
    timer = Ollee.setInterval('tick()', 10);
  }
  log("enter(2): running=" + running + " timer=" + timer + " sw=" + sw + " startedAt=" + startedAt);
  Ollee.clear();
  draw();
}

function pad(n) {
  return ('0' + n).slice(-2);
}

function msToTime(duration) {
  let display = {}
  var centiseconds = Math.floor((duration % 1000) / 10),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  display["hours"] = hours;
  display["minutes"] = minutes;
  display["seconds"] = seconds;
  display["centiseconds"] = centiseconds;

  return display;
}


function draw() {
  let display = msToTime(sw);

  Ollee.drawMain(pad(display["minutes"]) + pad(display["seconds"]) + pad(display["centiseconds"]));
}

function exit() {
  log("exit(): running=" + running + " sw=" + sw + " startedAt=" + startedAt);
}

function tick() {
  sw +=10;
  log(sw);
  draw();
}

function start() {
  log("start()");
  running = true;
  startedAt = new Date()
  timer = Ollee.setInterval('tick()', 10);
  draw();
  log("started");
}

function stop() {
  running = false;
  Ollee.clearInterval(timer)
  draw();
  log("stopped");
}
// A button pressed: start/stop the stopwatch
function a_short() {
  log("running=" + running);
  if(running)
    stop();
  else
    start();
  log("end");
}

// L button pressed: reset the stopwatch
function l_short() {
  sw = sec = hour = 0;
  draw();
  log("reset");
}
