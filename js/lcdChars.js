// Port of the 7(+1)-segment character table and per-position remapping
// quirks from ollee_watch_app_oap_dev/lib/components/watchFace.dart
// (WatchFaceDisplay.lcdCharacterSet / displayPosition), which itself
// mirrors ui/lcd_helper.c on the firmware side.

const SEGMENT_A = 1 << 0;
const SEGMENT_B = 1 << 1;
const SEGMENT_C = 1 << 2;
const SEGMENT_D = 1 << 3;
const SEGMENT_E = 1 << 4;
const SEGMENT_F = 1 << 5;
const SEGMENT_G = 1 << 6;
const SEGMENT_H = 1 << 7;

// Indexed by (charCode - 0x20); mirrors lcdCharacterSet in watchFace.dart.
const LCD_CHARACTER_SET = [
  0,    // (space)
  96,   // ! (L in the top half for positions 4 and 6)
  34,   // "
  99,   // # (degree symbol)
  45,   // $
  0,    // % (unused)
  68,   // & ("lowercase 7" for positions 4 and 6)
  32,   // '
  57,   // (
  15,   // )
  192,  // * (the + sign for use in position 0)
  112,  // +
  4,    // ,
  64,   // -
  64,   // .
  18,   // /
  63,   // 0
  6,    // 1
  91,   // 2
  79,   // 3
  102,  // 4
  109,  // 5
  125,  // 6
  7,    // 7
  127,  // 8
  111,  // 9
  0,    // : (unused)
  0,    // ; (unused)
  88,   // <
  72,   // =
  76,   // >
  83,   // ?
  255,  // @ (all segments on)
  119,  // A
  127,  // B
  57,   // C
  63,   // D
  121,  // E
  113,  // F
  61,   // G
  118,  // H
  137,  // I (only works in position 0)
  30,   // J
  117,  // K
  56,   // L
  183,  // M (only works in position 0)
  55,   // N
  63,   // O
  115,  // P
  103,  // Q
  247,  // R (only works in position 1)
  109,  // S
  129,  // T (only works in position 0/1)
  62,   // U
  62,   // V
  190,  // W (only works in position 0)
  126,  // X
  110,  // Y
  27,   // Z
  57,   // [
  36,   // backslash
  15,   // ]
  35,   // ^
  8,    // _
  2,    // `
  95,   // a
  124,  // b
  88,   // c
  94,   // d
  123,  // e
  113,  // f
  111,  // g
  116,  // h
  16,   // i
  66,   // j
  117,  // k
  48,   // l
  183,  // m (only works in position 0)
  84,   // n
  92,   // o
  115,  // p
  103,  // q
  80,   // r
  109,  // s
  120,  // t
  98,   // u
  28,   // v
  190,  // w (only works in position 0)
  126,  // x
  110,  // y
  27,   // z
  60,   // { (overriden as "il" ligature)
  54,   // | (overriden as "ll" ligature)
  30,   // } (overriden as "li" ligature)
  20,   // ~
];

// Which segment images actually exist/are ever lit for a given position:
// only positions 0/1 (weekday digits) get the extra 'h' segment, and only
// position 0 ever gets 'i' - positions 2-9 (day + clock digits) are plain
// 7-segment. Mirrors the h/i gating in lcdSegmentsForPosition() below.
function segmentsForPosition(position) {
  if (position === 0) return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  if (position === 1) return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
}

// Returns the set of segments ('a'..'i') to light for a given display
// position (0-9) and single character, applying the same per-position
// character remapping quirks as watchFace.dart's displayPosition().
function lcdSegmentsForPosition(position, character) {
  if (!character) character = ' ';

  if (position === 4 || position === 6) {
    if (character === '7') character = '&';
    else if (character === 'A') character = 'a';
    else if (character === 'o') character = 'O';
    else if (character === 'L') character = '!';
    else if (character === 'M' || character === 'm' || character === 'N') character = 'n';
    else if (character === 'c') character = 'C';
    else if (character === 'J') character = 'j';
    else if (['v', 'V', 'U', 'W', 'w'].includes(character)) character = 'u';
  } else {
    if (character === 'u') character = 'v';
    else if (character === 'j') character = 'J';
  }

  if (position > 1) {
    if (character === 'T') character = 't';
    if (character === 'I') character = 'l';
  }
  if (position === 1) {
    if (character === 'a') character = 'A';
    else if (character === 'o') character = 'O';
    else if (character === 'i') character = 'l';
    else if (character === 'n') character = 'N';
    else if (character === 'r') character = 'R';
    else if (character === 'd') character = 'D';
    else if (['v', 'V', 'u'].includes(character)) character = 'U';
    else if (character === 'b') character = 'B';
    else if (character === 'c') character = 'C';
    else if (character === 'p' || character === 'P') character = 'A';
  } else {
    if (character === 'R') character = 'r';
  }

  const asciiValue = character.charCodeAt(0);
  let characterValue = 0;
  if (asciiValue === 0x00) {
    characterValue = 0x00;
  } else if (asciiValue >= 0x20 && (asciiValue - 0x20) < LCD_CHARACTER_SET.length) {
    characterValue = LCD_CHARACTER_SET[asciiValue - 0x20];
  }

  const segs = {
    a: (characterValue & SEGMENT_A) !== 0,
    b: (characterValue & SEGMENT_B) !== 0,
    c: (characterValue & SEGMENT_C) !== 0,
    d: (characterValue & SEGMENT_D) !== 0,
    e: (characterValue & SEGMENT_E) !== 0,
    f: (characterValue & SEGMENT_F) !== 0,
    g: (characterValue & SEGMENT_G) !== 0,
    h: (characterValue & SEGMENT_H) !== 0 && (position === 0 || position === 1),
    i: false,
  };

  if (position === 0) {
    if (character === 'B' || character === 'D' || character === '@') segs.i = true;
  } else if (position === 1) {
    if (character === 'T') { segs.e = true; segs.f = true; segs.h = true; }
    if (character === 'B' || character === 'D' || character === '@' || character === 'R') segs.h = true;
  }

  return segs;
}
