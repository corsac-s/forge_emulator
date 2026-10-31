// stopwatch with flyback function
//
// Press A to start and stop the stopwatch
// Press L to reset
// © 2026 Yves-Alexis Perez <corsac@corsac.net>
// SPDX-License-Identifier: AGPL-3.0-or-later
// TODO:
// - use drawDay() to count the days (not that it's really useful)
// - reduce interval to 1s once we switch to hour mode

const subscribe = E_A_SHORT + E_L_SHORT + E_L_LONG;

var running = false;
var timer = -1;
var colon = -1;

var sw = 0;
var exitedAt = -1;
var colonOn = true;
var leg = 0;
var legs = Array();
legs[0]=0;

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
  draw(sw, leg);
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


function draw(time, leg_nb) {
  let display = msToTime(time);

  if(display["hours"])
    Ollee.drawMain(pad(display["hours"]) + pad(display["minutes"]) + pad(display["seconds"]));
  else
    Ollee.drawMain(pad(display["minutes"]) + pad(display["seconds"]) + pad(display["centiseconds"]));
  Ollee.drawDay(leg_nb);
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
  draw(sw, leg);
}

function start() {
  if(leg == 0)
    leg=1;
  running = true;
  timer = Ollee.setInterval('tick()', 10);
  colon = Ollee.setInterval(toggleColon, 500);
  draw(sw, leg);
  log("exit(): running=" + running + " sw=" + sw);
}

function stop() {
  running = false;
  Ollee.clearInterval(timer)
  Ollee.clearInterval(colon)
  draw(sw, leg);
  Ollee.drawColon(1);
  colonOn=true;
  log("stop(): running=" + running + " sw=" + sw);
}

function flyback() {
  legs[0]+=sw
  legs[leg] = sw
  log("legs[" + leg + "]=" + legs[leg])
  sw = 0;
  leg++;
  draw(sw, leg);
}

function reset() {
  sw = 0;
  leg = 0;
  draw(sw, leg);
}

function display_previous_leg() {
  // TODO: display next (or previous?) leg data
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

// L button pressed: flyback or reset depending on the conditions
function l_short() {
  log("l_short(): sw=" + sw + " leg=" + leg + " legs.length=" + legs.length);
  if(running)
    if(leg<39) // the day display doesn't really handle fine over 39
      flyback();
    else
      reset();
  else
    if (legs.length > 1)
      display_previous_leg();
    else
      reset();
}

// L button hold: unconditionnal reset
function l_long() {
  reset();
}
