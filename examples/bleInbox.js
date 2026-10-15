// BLE inbox: keeps receiving Forge BLE messages while the watch shows
// another face, using a background subscription (Ollee.subscribe).
// Connect with a generic BLE app (e.g. nRF Connect; see bleEcho.js for the
// service and characteristics) and write text to RX.
// A message that arrives while you're on another face beeps and is counted;
// enter this face to read the latest one, with the unread count on the day
// digits. Button A turns background receiving off and on; L clears the inbox.
var last = '';
var unread = 0;
var background = false;
// Buttons only reach the face while it's on screen
const subscribe = E_A_SHORT + E_L_SHORT;

function setBackground(on) {
  background = on && Ollee.subscribe(E_BLE_RX);
  if (!on) Ollee.unsubscribe(E_BLE_RX);
}

function show() {
  Ollee.drawMain(last || 'none');
  Ollee.drawDay(unread);
  Ollee.drawLap(background);
}

// Runs when the script loads (upload and boot), so messages are received
// before the face has ever been opened
function init() {
  setBackground(true);
}

function enter() {
  Ollee.clear();
  show();
  unread = 0;
}

// Called for every message while subscribed, on screen or not. Leaving the
// face doesn't unsubscribe; only Ollee.unsubscribe does.
function ble_rx(data) {
  last = data;
  if (Ollee.active()) {
    show();
  } else {
    unread++;
    Ollee.beep();
  }
}

function a_short() {
  setBackground(!background);
  Ollee.drawMain(background ? 'bG on ' : 'bG off');
  Ollee.drawLap(background);
}

function l_short() {
  last = '';
  unread = 0;
  show();
}
