# Display

The Ollee Watch has a segment LCD, not a pixel screen. You turn on fixed
segments and icons, so a face is mostly digits and simple text.

## Layout

```
  ┌──────────────────────────────┐
  │  FA        19                │   weekday (0-1)   day (2-3)
  │                              │
  │      1 2 : 3 4  5 6          │   clock (4-9)
  │                              │
  │  LAP  PM  HR  bell  chime    │   indicators
  └──────────────────────────────┘
```

| Area | Positions | How you draw it |
| --- | --- | --- |
| Weekday digits | 0–1 | You can't. They show the face's slot name (`FA`, `FB` or `FC`) while your face is on screen. |
| Day digits | 2–3 | `Ollee.drawDay(text)`: 2 characters |
| Clock digits | 4–9 | `Ollee.drawMain(text)`: 6 characters |
| Colon | | `Ollee.drawColon(on)` |
| LAP, PM, HR | | `Ollee.drawLap(on)`, `Ollee.drawPM(on)`, `Ollee.drawHR(on)` |
| Bell, chime | | You can't. They show the system alarm and hourly chime. |

## Drawing text

`drawMain` and `drawDay` take a string or a number. They keep the **first** 6
(or 2) characters and **right-align** what's left by padding with spaces on the
left:

```js
Ollee.drawMain(42);         // "    42"
Ollee.drawMain('hello');    // " hello"
Ollee.drawMain('1234  ');   // "1234  " (trailing spaces keep it left)
Ollee.drawMain('toolongtext'); // "toolon"
Ollee.drawDay(7);           // " 7"
```

To show a time, pad the parts yourself and turn on the colon:

```js
function pad(n) { return ('0' + n).slice(-2); }
Ollee.drawMain(pad(h) + pad(m) + pad(s));   // 12:34 56
Ollee.drawColon(1);
```

Each draw call updates only its own area. `Ollee.clear()` blanks the digits and
the colon/LAP/PM/HR indicators, leaving the bell, chime and face name as they are.
Call it at the start of `enter()` so you don't inherit whatever was on screen
before.

Draw calls do nothing while your face isn't on screen (during `init()`, or
while another face is showing). See [Lifecycle](lifecycle.md).

## What characters look like

Each digit has 7 segments, so:

- **Digits 0–9** look right everywhere.
- **Many letters work**, in upper or lower case: `A b C d E F G H J L n o P q r
  S t U y` and others. The display picks whichever form it can draw, so
  `'R'` shows as `r` and `'T'` as `t` on these digits.
- **Some letters can't be drawn** on the day or clock digits: `M`, `W`, `K`,
  `X`, `V`, `Z` and `I` are approximations at best.
- **Symbols:** `-` (and `.`, which also draws a dash), `_`, `=`, `#` (degree
  sign), `"`, `'`, `[` `]`, `?`. `:` and `%` draw nothing. Use `drawColon` for
  the colon.
- `{` `|` `}` draw two narrow letters in one digit: `il`, `ll` and `li`.
- The first hour digit and first minute digit (positions 4 and 6) have a
  different segment layout and remap some characters, for example `L` and `7`.

**Open the emulator's Character set panel** to see exactly how every character
looks in each position. When a word won't fit or doesn't read well, use a short
code instead: `on`/`oFF`, `bAtt`, `Lo`/`Hi`.

There's no decimal point. [examples/location.js](../../examples/location.js)
uses a dash in its place.
