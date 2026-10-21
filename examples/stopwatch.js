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
var sec = 0;
var hour = 0;

function init() {
}

function enter() {
  Ollee.clear();
  log(timer);
  draw();
}

function pad(n) {
  return ('0' + n).slice(-2);
}

function draw() {
  Ollee.drawMain(pad(hour) + pad(sec) + pad(sw));
}

function exit() {
}

function tick() {
  sw +=1;
  if (sw && (sw % 100 == 0)) {
    sec+=1;
    log("sec=" + sec + " sw=" + sw)
  }
  if (sec && (sec % 60 == 0)) {
    sec=0;
    hour+=1;
    log("hour=" + hour + " sec=" + sec + " sw=" + sw)
  }
  draw()
}

function start() {
  running = true;
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
  if(running)
    stop()
  else
    start()
}

// L button pressed: reset the stopwatch
function l_short() {
  sw = sec = hour = 0;
  draw();
  log("reset");
}
