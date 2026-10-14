// "Character set" reference panel: renders every entry of LCD_CHARACTER_SET
// (lcdChars.js, mirroring lcd_character_set in ui/lcd_helper.h) as a
// stand-alone segment glyph, ASCII-table style. Glyphs show the raw table
// bits only; the per-position remapping in lcdSegmentsForPosition() (and the
// position 0/1-only 'i' segment) isn't applied.

const CHARSET_SVG_NS = 'http://www.w3.org/2000/svg';

// Segment strokes in a 20x34 box. Previews are strictly 7-segment: bit 7
// (the centre bar 'h', only present in positions 0/1) isn't drawn.
const CHARSET_SEGMENT_LINES = {
  a: [5, 3, 15, 3],
  b: [17, 5, 17, 15],
  c: [17, 19, 17, 29],
  d: [5, 31, 15, 31],
  e: [3, 19, 3, 29],
  f: [3, 5, 3, 15],
  g: [5, 17, 15, 17],
};

const CHARSET_SEGMENT_BITS = {
  a: SEGMENT_A, b: SEGMENT_B, c: SEGMENT_C, d: SEGMENT_D,
  e: SEGMENT_E, f: SEGMENT_F, g: SEGMENT_G,
};

// Characters previewed as the character lcd_helper.c substitutes on most
// plain 7-segment positions (e.g. 'I' is shown as 'l').
const CHARSET_PREVIEW_SUBSTITUTES = {
  'I': 'l',
  'R': 'r',
  'T': 't',
  'j': 'J',
  'u': 'v',
};

function charSetGlyph(bits) {
  const svg = document.createElementNS(CHARSET_SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 34');
  svg.setAttribute('class', 'charset-glyph');
  for (const [seg, [x1, y1, x2, y2]] of Object.entries(CHARSET_SEGMENT_LINES)) {
    const line = document.createElementNS(CHARSET_SVG_NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', (bits & CHARSET_SEGMENT_BITS[seg]) ? 'seg-on' : 'seg-off');
    svg.appendChild(line);
  }
  return svg;
}

function buildCharSetPanel(panelEl) {
  const grid = document.createElement('div');
  grid.className = 'charset-grid';
  LCD_CHARACTER_SET.forEach((bits, i) => {
    const code = 0x20 + i;
    const ch = String.fromCharCode(code);
    const hex = '0x' + code.toString(16).toUpperCase();
    const cell = document.createElement('div');
    cell.className = 'charset-cell' + (bits === 0 && code !== 0x20 ? ' charset-unused' : '');
    cell.title = `'${ch}'  ${hex}  0b${bits.toString(2).padStart(8, '0')}`;
    const previewCh = CHARSET_PREVIEW_SUBSTITUTES[ch] || ch;
    cell.appendChild(charSetGlyph(LCD_CHARACTER_SET[previewCh.charCodeAt(0) - 0x20]));
    const label = document.createElement('span');
    label.className = 'charset-label';
    label.textContent = code === 0x20 ? 'SP' : ch;
    cell.appendChild(label);
    grid.appendChild(cell);
  });

  const note = document.createElement('p');
  note.className = 'charset-note';
  note.textContent = 'Not all characters appear the same in every position on the display. '
    + 'This is a limitation of the LCD segment display. Test first!';

  panelEl.append(grid, note);
}

(function initCharSetView() {
  const toggleBtn = document.getElementById('charset-btn');
  const panel = document.getElementById('charset-panel');
  buildCharSetPanel(panel);
  toggleBtn.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggleBtn.classList.toggle('active', open);
    toggleBtn.setAttribute('aria-expanded', String(open));
  });
})();
