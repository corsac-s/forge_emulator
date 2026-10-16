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
