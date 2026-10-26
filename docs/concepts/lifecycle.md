# Lifecycle

Your script doesn't run in a loop. The watch calls functions in it, found by
their exact top-level name, when something happens. All of them are optional.

## Timeline

```
upload / boot ─► script top level runs ─► init()
                                             │
                    ┌────────────────────────┘
                    ▼
     M pressed ─► enter() ─► events, timers ... ─► M pressed ─► exit()
         ▲                                                        │
         └───────────── home screen / other faces ◄───────────────┘
                        (background events only)
```

| Hook | When it runs | Notes |
| --- | --- | --- |
| *top-level code* | Once, when the script loads | Declare variables and `subscribe` here. |
| `init()` | Once, at upload and at each boot | The face isn't on screen yet, so draw calls are ignored. Good for `Ollee.subscribe(...)`. |
| `enter()` | Each time the face comes on screen | Draw the whole screen here and start timers. |
| `exit()` | Each time the face leaves the screen | Stop timers and reset the ids you stored. |

In the emulator, **Run** loads the script, runs `init()`, then `enter()`. The
**M** button toggles between the face (`enter()`) and the home screen
(`exit()`). **Stop** unloads the script.

## Events

Event hooks fire only if **both** the function exists **and** its bit is set in
the top-level `subscribe` value:

```js
const subscribe = E_A_SHORT + E_L_SHORT + E_CLOCK_MINUTE;
```

| Bit | Hook | Fires when |
| --- | --- | --- |
| `E_A_SHORT` | `a_short()` | A pressed (on the way down) |
| `E_A_LONG` | `a_long()` | A still held after 1 s |
| `E_L_SHORT` | `l_short()` | L pressed |
| `E_L_LONG` | `l_long()` | L still held after 1.5 s |
| `E_BUTTONS` | `button(btn, event, millis)` | A or L goes down or up |
| `E_TILT` | `tilt()` | Wrist tilt gesture |
| `E_TAP` | `tap()` | Triple tap |
| `E_BLE_RX` | `ble_rx(data)` | A phone writes to the Forge BLE service |
| `E_CLOCK_MINUTE` | `clock_minute()` | Each new minute |
| `E_CLOCK_HOUR` | `clock_hour()` | Each new hour (after `clock_minute()`) |
| `E_CLOCK_SECOND` | `clock_second()` | Every second (foreground only) |
| `E_BLE_CONNECT` | `ble_connect()` | A phone connects over BLE |
| `E_BLE_DISCONNECT` | `ble_disconnect()` | The phone disconnects |

Bits in `subscribe` only deliver while the face is **on screen**. See
[Input](input.md) for the details of each.

## Background events

Five events can keep reaching your script while another face is showing:
`E_BLE_RX`, `E_CLOCK_MINUTE`, `E_CLOCK_HOUR`, `E_BLE_CONNECT` and
`E_BLE_DISCONNECT`. Turn that on with `Ollee.subscribe(...)`, usually from
`init()`:

```js
function init() {
  Ollee.subscribe(E_CLOCK_HOUR);   // clock_hour() runs on every face
}

function clock_hour() {
  Ollee.beep();
  if (Ollee.active()) Ollee.drawMain('hour');  // draw only if on screen
}
```

- `Ollee.subscribe` and `Ollee.unsubscribe` only accept those five bits and
  return `false` for anything else. `E_CLOCK_SECOND` isn't one of them: a
  once-a-second wake-up all day would drain the battery.
- Leaving the face doesn't unsubscribe. Only `Ollee.unsubscribe` does (or an
  error, or reloading the script).
- `Ollee.active()` tells you whether your face is on screen. Draw calls are
  silently ignored while it's `false`.

See [examples/chime.js](../../examples/chime.js) and
[examples/bleInbox.js](../../examples/bleInbox.js).

## Timers

```js
var id = Ollee.setInterval(tick, 1000);   // or Ollee.setTimeout(fn, ms)
Ollee.clearInterval(id);
```

- There are **4 timer slots**, shared by `setTimeout` and `setInterval`. When
  they're all in use, the call returns `-1`.
- The callback can be a function or a string of code, e.g.
  `Ollee.setInterval('tick()', 250)`. The string runs in your script's scope.
- **Whole-second delays** (`1000`, `2000`, ...) run on the low-power RTC
  scheduler, and their first call can come up to 1 s early. Other delays under
  60000 ms are accurate to the millisecond but use more power. See
  [the API reference](../api/README.md#timers).
- For a display that changes every second, subscribing to `E_CLOCK_SECOND`
  and drawing in `clock_second()` needs no timer at all.
- **Leaving the face cancels all its timers.** Start them in `enter()`, and set
  your stored ids back to `-1` in `exit()` so you don't clear a slot that's
  been reused:

```js
var tickId = -1;

function enter() {
  Ollee.clear();
  tickId = Ollee.setInterval(draw, 1000);
}

function exit() {
  if (tickId !== -1) Ollee.clearInterval(tickId);
  tickId = -1;
}
```

- `Ollee.clearTimeout()` / `Ollee.clearInterval()` with no argument clears
  every slot.

## Errors

If any hook or timer callback throws an error it doesn't catch, the watch
**disables the face**: no more hooks, timers or background events run until
the script is loaded again. The emulator does the same and logs
`Uncaught error, face would be disabled on watch`.

A syntax error stops the script from loading at all.
