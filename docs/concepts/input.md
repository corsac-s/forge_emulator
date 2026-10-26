# Input

Every input reaches your script as a hook call. Each one also needs its bit in
`subscribe` (or, for background events, `Ollee.subscribe`). See
[Lifecycle](lifecycle.md#events).

## Buttons

The watch has three buttons: **L**, **M** and **A**. Your script gets **L** and **A**. **M** always switches between your
face and the home screen.

### Short and long press

| Hook | Bit | Fires |
| --- | --- | --- |
| `a_short()` | `E_A_SHORT` | As soon as A goes down |
| `a_long()` | `E_A_LONG` | Once, if A is still held after **1000 ms** |
| `l_short()` | `E_L_SHORT` | As soon as L goes down |
| `l_long()` | `E_L_LONG` | Once, if L is still held after **1500 ms** |

A long press always comes **after** the short press of the same push. If you
don't want both to act, either:

- act on release instead (see `button()` below), as
  [examples/metronome.js](../../examples/metronome.js) does, or
- make the short press harmless, then have the long press add to it.

### Raw down/up: `button(btn, event, millis)`

Subscribe with `E_BUTTONS` to get every edge:

```js
const subscribe = E_BUTTONS;

function button(btn, event, millis) {
  // btn:    B_A or B_L
  // event:  E_DOWN or E_UP
  // millis: ms since boot when it happened (wraps at 2^32)
  if (btn === B_A && event === E_UP) Ollee.beep();
}
```

Use it to measure press length, act on release, or detect A+L held together.
In the emulator, hold several keys (`a` + `l`) to test combos.

## Gestures

| Hook | Bit | Fires |
| --- | --- | --- |
| `tilt()` | `E_TILT` | On a wrist-tilt gesture |
| `tap()` | `E_TAP` | On a triple tap on the watch |

In the emulator these are the **TILT** and **TAP** buttons (keys `t` and `p`).

## Bluetooth: `ble_rx(data)`

A phone app can write to the watch's **Forge BLE service**:

| | UUID |
| --- | --- |
| Service | `C6FB0001-A37D-40AC-89BE-887D25E1F5B3` |
| RX (phone writes) | `C6FB0002-...` |
| TX (watch notifies) | `C6FB0003-...` |

- Each write is at most **20 bytes** and arrives as one `ble_rx(data)` call.
  `data` is a string with one character per byte (codes 0–255).
- It's delivered while your face is on screen with `E_BLE_RX` in `subscribe`,
  or at any time after `Ollee.subscribe(E_BLE_RX)`. Otherwise it's dropped.
- Reply with `Ollee.send(data)` (up to 256 bytes, sent as 20-byte
  notifications). It returns `false` if no phone is connected, `data` is
  empty, or it's too long. `Ollee.connected()` tells you whether a phone is
  connected.

In the emulator, the **Bluetooth** panel plays the phone: type up to 20 bytes
and click **Send**, and untick **phone connected** to test the disconnected
case. What the watch sends shows in the log. On a real watch, a generic BLE app
such as nRF Connect works for testing. See
[examples/bleEcho.js](../../examples/bleEcho.js).

## Bluetooth connection: `ble_connect()` / `ble_disconnect()`

| Hook | Bit | Fires |
| --- | --- | --- |
| `ble_connect()` | `E_BLE_CONNECT` | When a phone connects to the watch |
| `ble_disconnect()` | `E_BLE_DISCONNECT` | When the phone's connection ends |

- They fire for any BLE connection: the Ollee app or a generic app like nRF
  Connect.
- `Ollee.connected()` already has the new value when the hook runs.
- Use them instead of polling `Ollee.connected()` on a timer. A change while
  your face is off screen isn't delivered (unless you `Ollee.subscribe` to it),
  so read `Ollee.connected()` once in `enter()` to draw the starting state.
- Don't count on `Ollee.send` from `ble_connect()`. The phone usually hasn't
  turned on notifications yet, so the data is likely lost. Wait for the
  phone's first `ble_rx` message, or send a little later.
- Both can run in the background with `Ollee.subscribe`, for example to beep
  when the phone goes out of range.

In the emulator, ticking **phone connected** fires `ble_connect()`, and
unticking it fires `ble_disconnect()`.
[examples/bleEcho.js](../../examples/bleEcho.js) uses both to show the
connection state.

## Clock events

| Hook | Bit | Fires |
| --- | --- | --- |
| `clock_minute()` | `E_CLOCK_MINUTE` | At each new minute |
| `clock_hour()` | `E_CLOCK_HOUR` | At each new hour, right after `clock_minute()` |

These are the cheapest way to keep a clock face current. You don't need a
timer. Both can also run in the background with `Ollee.subscribe`.

In the emulator they follow your computer's clock, and the **Clock** panel's
**Minute tick** and **Hour tick** buttons fire one right away (without changing
the time `new Date()` returns).
