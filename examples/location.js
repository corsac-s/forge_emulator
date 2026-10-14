// Location: shows the latitude/longitude set by the paired phone, to one
// decimal place. Press A to toggle between latitude ("la" on the day
// digits) and longitude ("lo").
// The LCD has no decimal point, so a dash stands in for it. Shown to one
// decimal so every value fits the 6 digits: 43.65 -> "43-7",
// -179.99 -> "-180-0".
// Shows "sync" if the phone hasn't set a location yet (both are 0).
var showLon = false;
const subscribe = E_A_SHORT;

function format(deg) {
  var tenths = Math.round(Math.abs(deg) * 10);
  var whole = Math.floor(tenths / 10);
  var sign = deg < 0 && tenths > 0 ? '-' : '';
  return (sign + whole + '-' + (tenths % 10)).padStart(6, ' ');
}

function draw() {
  var lat = Ollee.latitude();
  var lon = Ollee.longitude();
  Ollee.drawDay(showLon ? '1o' : '1a');
  if (lat == 0 && lon == 0) Ollee.drawMain('sync  ');
  else Ollee.drawMain(format(showLon ? lon : lat));
}

function a_short() {
  showLon = !showLon;
  draw();
}

function enter() {
  Ollee.clear();
  draw();
}
