// I/O demo: exercises the watch's inputs and outputs from a menu.
// L = next menu item, A = select it (and act on it again once selected).
//   batt  - battery voltage in mV (A again refreshes)
//   temp  - temperature, sampled every second; A again toggles #C / #F
//   steps - not implemented yet
//   beep  - A beeps the buzzer
//   light - A toggles the LED, shows on/off
//   gest  - waits for a tilt, shows "tilt" for 2 s, then "ready" again
// Leaving an item (L) or the face (M) stops its timers and turns the LED off.
var ITEMS = ['batt ', 'Tsens', 'steps ', 'beep ', 'Light', 'gest '];
var item = 0, active = false, useF = false, ledOn = false;
var tempId = -1, gestId = -1;
const subscribe = E_A_SHORT + E_L_SHORT + E_TILT + E_TAP;

function showItem() {
  Ollee.drawMain(ITEMS[item]);
  Ollee.drawDay(' ' + (item + 1));
}

// Same integer math and "%4ld#C" / "%4ld#F" layout as sm_temperature.c
// ('#' is the degree symbol).
function showTemp() {
  var c100 = (Ollee.temperature() * 100) | 0;
  var t = useF ? (((c100 * 900 / 500) | 0) + 3200) / 100 | 0 : c100 / 100 | 0;
  Ollee.drawMain(t + (useF ? '#F' : '#C'));
}

function gestReady() {
  gestId = -1;
  Ollee.drawMain('ready');
}

// Undo whatever the active item started.
function deactivate() {
  if (tempId !== -1) Ollee.clearInterval(tempId);
  if (gestId !== -1) Ollee.clearTimeout(gestId);
  tempId = gestId = -1;
  if (ledOn) Ollee.led_off();
  ledOn = active = false;
}

function a_short() {
  var first = !active;
  active = true;
  switch (ITEMS[item]) {
    case 'batt ':
      Ollee.drawMain(Math.round(Ollee.battery() * 1000));
      break;
    case 'Tsens':
      if (first) tempId = Ollee.setInterval('showTemp()', 1000);
      else useF = !useF;
      showTemp();
      break;
    case 'steps ':
      Ollee.drawMain(Ollee.steps());
      break; // not implemented yet
    case 'beep ':
      Ollee.beep();
      break;
    case 'Light':
      ledOn = !ledOn;
      if (ledOn) Ollee.led_on();
      else Ollee.led_off();
      Ollee.drawMain(ledOn ? 'on' : 'off');
      break;
    case 'gest ':
      if (first) gestReady();
      break;
  }
}

function l_short() {
  deactivate();
  item = (item + 1) % ITEMS.length;
  showItem();
}

function tilt() {
  log("Tilt");
  if (!active || ITEMS[item] !== 'gest ') return;
  if (gestId !== -1) Ollee.clearTimeout(gestId);
  Ollee.drawMain('tilt ');
  gestId = Ollee.setTimeout('gestReady()', 2000);
}

function tap() {
  log("tap");
  if (!active || ITEMS[item] !== 'gest ') return;
  if (gestId !== -1) Ollee.clearTimeout(gestId);
  Ollee.drawMain('tap  ');
  gestId = Ollee.setTimeout('gestReady()', 2000);
}

function enter() {
  Ollee.clear();
  showItem();
}

function exit() {
  deactivate();
}
