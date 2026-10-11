var MODES = ['6 ', '20', 'CN', 'RN'];   // d6, d20, coin, random 1-99
var mode = 0;
const subscribe = E_A_SHORT + E_L_SHORT;

function rollValue() {
  switch (MODES[mode]) {
    case '6 ':  return 1 + Math.floor(6.0 * Ollee.hwRand() / 0xEFFF);
    case '20': return 1 + Math.floor(Math.random() * 20);
    case 'CN':  return (Ollee.hwRand() & 1) ? 'HEAD' : 'TAIL';
    case 'RN':  return 1 + Math.floor(Math.random() * 99);
  }
}

function draw(result) {
  Ollee.drawMain(('  ' + result).slice(-6));
  Ollee.drawDay(MODES[mode]);
}

function a_short() {
  Ollee.beep();
  draw(rollValue());
};

function l_short() {
  mode = (mode + 1) % MODES.length;
  draw('----');
};

function enter() {
  Ollee.clear();
  draw('ROLL');
}
