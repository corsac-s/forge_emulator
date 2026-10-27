// Databank: shows the databank entries the phone stored on the watch
// (the same ones as the stock databank face), read with Ollee.databank().
// L: next entry, 1 to 10 and round again. An empty entry shows "no dat".
// A: pause the scroll, or play it again.
// The day digits show the entry number, 1 to 10. Text that fits in the 6
// clock digits is shown as is. Longer text (up to 20 characters) scrolls
// through once when the entry comes up, then stops back at the start.
// In the emulator, edit the entries in the Databank panel.
var COUNT = 10;          // Ollee.databank(i) is undefined for i >= 10
var SCROLL_MS = 350;     // per character, as on the stock databank face
var WIDTH = 6;           // clock digits
const subscribe = E_L_SHORT + E_A_SHORT;

var idx = 0;             // entry shown, 0-9
var off = 0;             // scroll position in the entry's text
var scrollId = -1;

function text() {
  return Ollee.databank(idx);
}

function stopScroll() {
  if (scrollId !== -1) Ollee.clearInterval(scrollId);
  scrollId = -1;
}

// 6 characters of text + ' ' from `off`, wrapping, so the end and the start
// are one space apart as they go by
function windowAt(t, o) {
  var loop = t + ' ';
  var w = '';
  for (var k = 0; k < WIDTH; k++) w += loop.charAt((o + k) % loop.length);
  return w;
}

function show() {
  var t = text();
  Ollee.drawDay(String(idx + 1));
  if (t === '') Ollee.drawMain('no dat');
  // Padded on the right so short text starts at the left digit
  else Ollee.drawMain(t.length <= WIDTH ? (t + '      ').slice(0, WIDTH) : windowAt(t, off));
}

function scrollStep() {
  var t = text();
  // The entry was cleared or shortened by the phone mid-scroll
  if (t.length <= WIDTH) { off = 0; stopScroll(); show(); return; }
  off = (off + 1) % (t.length + 1);
  show();
  // One full pass done: stop at the start, so the timer only runs while
  // there's something moving
  if (off === 0) stopScroll();
}

function startScroll() {
  stopScroll();
  if (text().length > WIDTH) scrollId = Ollee.setInterval(scrollStep, SCROLL_MS);
}

// Show entry `i` from its start, scrolling it if it's long
function select(i) {
  stopScroll();
  idx = i;
  off = 0;
  show();
  startScroll();
}

function l_short() {
  Ollee.beep();
  select((idx + 1) % COUNT);
}

function a_short() {
  if (scrollId !== -1) { stopScroll(); return; }
  startScroll();
}

function enter() {
  Ollee.clear();
  // Same entry as last time, re-read in case the phone changed it
  select(idx);
}

function exit() {
  stopScroll();
}
