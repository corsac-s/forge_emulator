// stopwatch with flyback function
//
// Press A to start and stop the stopwatch
// Press L to reset
// © 2026 Yves-Alexis Perez <corsac@corsac.net>
// SPDX-License-Identifier: AGPL-3.0-or-later
// TODO:
// - use drawDay() to count the days (not that it's really useful)
// - reduce interval to 1s once we switch to hour mode

const subscribe = E_A_SHORT + E_L_SHORT;

var running = false;
var timer = -1;
var colon = -1;

var sw = 0;
var exitedAt = -1;
var colonOn = true;
var leg = 0;

function init() {
}

function enter() {
  log("enter(): running=" + running + " timer=" + timer + " sw=" + sw + " exitedAt=" + exitedAt);
  if(running) {
    var now = new Date();
    var elapsed = now - exitedAt;
    sw += elapsed;
    timer = Ollee.setInterval('tick()', 10);
    colon = Ollee.setInterval(toggleColon, 500);
  }
  log("enter(): running=" + running + " timer=" + timer + " sw=" + sw + " exitedAt=" + exitedAt);
  Ollee.clear();
  Ollee.drawColon(1);
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

  if(display["hours"])
    Ollee.drawMain(pad(display["hours"]) + pad(display["minutes"]) + pad(display["seconds"]));
  else
    Ollee.drawMain(pad(display["minutes"]) + pad(display["seconds"]) + pad(display["centiseconds"]));
  Ollee.drawDay(leg);
}

function exit() {
  log("exit(): running=" + running + " sw=" + sw + " exitedAt=" + exitedAt);
  exitedAt = new Date();

}

function toggleColon() {
  if (colonOn) {
    colonOn=false;
    Ollee.drawColon(0);
  } else {
    colonOn=true;
    Ollee.drawColon(1);
  }
  return colonOn;
}

function tick() {
  sw +=10;
  draw();
}

function start() {
  if(leg == 0)
    leg=1;
  running = true;
  timer = Ollee.setInterval('tick()', 10);
  colon = Ollee.setInterval(toggleColon, 500);
  draw();
  log("exit(): running=" + running + " sw=" + sw);
}

function stop() {
  running = false;
  Ollee.clearInterval(timer)
  Ollee.clearInterval(colon)
  draw();
  Ollee.drawColon(1);
  colonOn=true;
  log("stop(): running=" + running + " sw=" + sw);
}

function reset() {
  sw = 0;
  leg++;
  draw();
}

// A button pressed: start/stop the stopwatch
function a_short() {
  log("a_short(): running=" + running)
  if(running)
    stop();
  else
    start();
  log("a_short(): running=" + running)
}

// L button pressed: reset the stopwatch
function l_short() {
  log("l_short(): sw=" + sw + " leg=" + leg);
  reset();
}
