// BLE echo: talks to a phone over the Forge BLE service.
// Connect with a generic BLE app (e.g. nRF Connect) and find the service
// C6FB0001-A37D-40AC-89BE-887D25E1F5B3:
//   - enable notifications on TX (C6FB0003-...) to receive from the watch
//   - write text to RX (C6FB0002-...), up to 20 bytes per write
// Each write is shown on the main display and echoed back as "echo:<text>".
// A sends the current step count; L sends a counter that goes up each press.
// The LAP indicator shows whether a phone is connected. Rather than polling
// Ollee.connected() on a timer, the face reads it once in enter() and then
// follows the ble_connect()/ble_disconnect() events, beeping on each change.
// The A/L sends are skipped with "no ble" while nothing is connected.
var count = 0;
const subscribe = E_BLE_RX + E_A_SHORT + E_L_SHORT + E_BLE_CONNECT + E_BLE_DISCONNECT;

function showConnection(connected) {
  Ollee.drawLap(connected);
  Ollee.drawMain(connected ? 'ble' : 'no ble');
}

// Connection changes while the face is off screen aren't delivered, so start
// from the current state
function enter() {
  Ollee.clear();
  showConnection(Ollee.connected());
}

function ble_connect() {
  showConnection(true);
  Ollee.beep();
}

function ble_disconnect() {
  showConnection(false);
  Ollee.beep();
}

// Sends msg if a phone is connected; otherwise shows "no ble" instead.
function sendIfConnected(msg) {
  if (!Ollee.connected()) {
    Ollee.drawMain('no ble');
    return;
  }
  if (!Ollee.send(msg)) Ollee.drawMain('busy  ');
}

// data holds the bytes of one BLE write, as a string
function ble_rx(data) {
  Ollee.drawMain(data);
  Ollee.beep();
  Ollee.send('echo:' + data);
}

function a_short() {
  sendIfConnected('steps:' + Ollee.steps());
}

function l_short() {
  count++;
  Ollee.drawDay(count % 100);
  sendIfConnected('count:' + count);
}
