// BLE echo: talks to a phone over the Forge BLE service.
// Connect with a generic BLE app (e.g. nRF Connect) and find the service
// C6FB0001-A37D-40AC-89BE-887D25E1F5B3:
//   - enable notifications on TX (C6FB0003-...) to receive from the watch
//   - write text to RX (C6FB0002-...), up to 20 bytes per write
// Each write is shown on the main display and echoed back as "echo:<text>".
// A sends the current step count; L sends a counter that goes up each press.
// The PM indicator shows whether a phone is connected (checked every second),
// and the A/L sends are skipped with "no ble" while nothing is connected.
var count = 0;
var connId = -1;
var wasConnected = null;
const subscribe = E_BLE_RX + E_A_SHORT + E_L_SHORT;

function showConnection() {
  var c = Ollee.connected();
  if (c === wasConnected) return;
  wasConnected = c;
  Ollee.drawPM(c);
  Ollee.drawMain(c ? 'ble   ' : 'no ble');
}

function enter() {
  Ollee.clear();
  wasConnected = null;
  showConnection();
  connId = Ollee.setInterval(showConnection, 1000);
}

function exit() {
  if (connId !== -1) Ollee.clearInterval(connId);
  connId = -1;
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
