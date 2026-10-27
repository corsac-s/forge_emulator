# API reference

This is the hand-written overview of everything a Forge script can use.

<!-- TODO: link to the generated API reference once it's published. -->

- [Hooks](#hooks): functions you define, which the watch calls
- [Constants](#constants): `E_*` and `B_*` values
- [`Ollee` object](#ollee-object): display, feedback, sensors, BLE, timers, info
- [Other globals](#other-globals): `Date`, `console`, `log`

## Hooks

Define these as top-level functions. All are optional. Event hooks also need
their bit in `subscribe`. See [Lifecycle](../concepts/lifecycle.md).

| Hook | Needs | Called |
| --- | --- | --- |
| `init()` | | At upload and each boot. The face isn't on screen. |
| `enter()` | | When the face comes on screen |
| `exit()` | | When the face leaves the screen |
| `a_short()` | `E_A_SHORT` | A pressed |
| `a_long()` | `E_A_LONG` | A held 1000 ms |
| `l_short()` | `E_L_SHORT` | L pressed |
| `l_long()` | `E_L_LONG` | L held 1500 ms |
| `button(btn, event, millis)` | `E_BUTTONS` | A or L down/up. `btn` is `B_A`/`B_L`, `event` is `E_DOWN`/`E_UP`, `millis` is the system tick count in ms, which stops while the watch sleeps, so time with `new Date().getTime()` instead ([details](../concepts/input.md#raw-downup-buttonbtn-event-millis)). |
| `tilt()` | `E_TILT` | Wrist tilt |
| `tap()` | `E_TAP` | Triple tap |
| `ble_rx(data)` | `E_BLE_RX` | A phone wrote ≤ 20 bytes. `data` is a byte string. |
| `clock_minute()` | `E_CLOCK_MINUTE` | Each new minute |
| `clock_hour()` | `E_CLOCK_HOUR` | Each new hour |
| `clock_second()` | `E_CLOCK_SECOND` | Every second, while the face is on screen |
| `ble_connect()` | `E_BLE_CONNECT` | A phone connected over BLE |
| `ble_disconnect()` | `E_BLE_DISCONNECT` | The phone disconnected |

And one top-level value:

```js
const subscribe = E_A_SHORT + E_L_SHORT;   // bitmask of events to receive while on screen
```

## Constants

### Event bits

| Name | Value | Background? |
| --- | --- | --- |
| `E_A_SHORT` | `1 << 0` | |
| `E_A_LONG` | `1 << 1` | |
| `E_L_SHORT` | `1 << 2` | |
| `E_L_LONG` | `1 << 3` | |
| `E_TILT` | `1 << 4` | |
| `E_BUTTONS` | `1 << 5` | |
| `E_TAP` | `1 << 6` | |
| `E_BLE_RX` | `1 << 7` | ✓ |
| `E_CLOCK_MINUTE` | `1 << 8` | ✓ |
| `E_CLOCK_HOUR` | `1 << 9` | ✓ |
| `E_BLE_CONNECT` | `1 << 10` | ✓ |
| `E_BLE_DISCONNECT` | `1 << 11` | ✓ |
| `E_CLOCK_SECOND` | `1 << 12` | |

"Background" bits can also be passed to `Ollee.subscribe`.

### Button values

| Name | Value | Meaning |
| --- | --- | --- |
| `B_A` | 0 | A button (`button()`'s `btn`) |
| `B_L` | 1 | L button |
| `E_DOWN` | 0 | Pressed (`button()`'s `event`) |
| `E_UP` | 1 | Released |

## `Ollee` object

### Display

All draw calls do nothing while `Ollee.active()` is `false`. See
[Display](../concepts/display.md).

| Call | Does |
| --- | --- |
| `Ollee.drawMain(text)` | Shows the first 6 characters of `text` on the clock digits, right-aligned |
| `Ollee.drawDay(text)` | Shows the first 2 characters on the day digits, right-aligned |
| `Ollee.drawColon(on)` | Colon on/off |
| `Ollee.drawLap(on)` | LAP indicator on/off |
| `Ollee.drawPM(on)` | PM indicator on/off |
| `Ollee.drawHR(on)` | HR indicator on/off |
| `Ollee.clear()` | Blanks the digits and the colon/LAP/PM/HR indicators. Leaves the bell, chime and face name. |

### Feedback

| Call | Does |
| --- | --- |
| `Ollee.beep()` | Short beep. Silent if the watch is muted. |
| `Ollee.beepShort()` | Very short beep. Silent if the watch is muted. |
| `Ollee.led_on()` | Turns the LED on (stays on) |
| `Ollee.led_off()` | Turns the LED off |

### Sensors and data

| Call | Returns |
| --- | --- |
| `Ollee.temperature()` | Temperature in °C (from the accelerometer's sensor) |
| `Ollee.steps()` | Today's step count |
| `Ollee.battery()` | Battery voltage in volts |
| `Ollee.hwRand()` | Hardware random integer, 0 to `0xEFFF` |
| `Ollee.latitude()` | Latitude in degrees, as set by the paired phone (3 decimals). 0 if not set. |
| `Ollee.longitude()` | Longitude in degrees, likewise |
| `Ollee.databank(index)` | Text of databank entry `index`, 0 to 9: the entries (up to 20 characters each) the phone stores for the watch's databank face. `''` if the entry is empty, `undefined` if `index` isn't 0 to 9. Each call reads the stored entry, so it picks up the phone's changes. Text over 6 characters needs scrolling ([Display](../concepts/display.md#showing-longer-text)). In the emulator, edit the entries in the **Databank** panel. |
| `Ollee.hmacSha1(key, message)` | HMAC-SHA1 of `message` with `key`, as a 20-byte `Uint8Array`. Each argument can be a string (one byte per character), an array of numbers 0-255, or a `Uint8Array`, of any length.|
| `Ollee.sha1(data)` | Plain (unkeyed) SHA-1 of `data`, as a 20-byte `Uint8Array`. `data` takes the same forms as `hmacSha1`'s arguments. Use it for checksums and content IDs. To authenticate with a secret, use `hmacSha1`. |

### Face state and background events

| Call | Does |
| --- | --- |
| `Ollee.active()` | `true` while your face is on screen |
| `Ollee.subscribe(bits)` | Receive `E_BLE_RX` / `E_CLOCK_MINUTE` / `E_CLOCK_HOUR` / `E_BLE_CONNECT` / `E_BLE_DISCONNECT` even off screen. Returns `false` for other bits. |
| `Ollee.unsubscribe(bits)` | Stops background delivery of those bits |

### Bluetooth

See [Input](../concepts/input.md#bluetooth-ble_rxdata).

| Call | Does |
| --- | --- |
| `Ollee.connected()` | `true` if a phone is connected. To react to changes instead of polling, use `ble_connect()`/`ble_disconnect()`. |
| `Ollee.send(data)` | Sends up to 256 bytes to the phone as 20-byte notifications. Returns `false` if not connected, empty, or too long. Non-byte text is sent UTF-8 encoded. |

### Timers

4 slots shared by timeouts and intervals. All are cancelled when the face
leaves the screen. See [Lifecycle](../concepts/lifecycle.md#timers).

| Call | Does |
| --- | --- |
| `Ollee.setTimeout(fn, ms)` | Runs `fn` once after `ms`. Returns a slot id, or `-1` if no slot is free. |
| `Ollee.setInterval(fn, ms)` | Runs `fn` every `ms`. Same return value. |
| `Ollee.clearTimeout(id)` | Cancels a timer. With no `id`, cancels all of them. |
| `Ollee.clearInterval(id)` | Same as `clearTimeout` |

`fn` can be a function or a string of code (run in your script's scope).

Timing:

- **Up to 60000 ms:** accurate to the millisecond (the watch's 1 ms
  scheduler). A pending timer keeps a high-power timer running, so only keep
  timers while you need them.
- **Over 60000 ms:** the low-power RTC scheduler, which only counts whole
  seconds. `ms` is rounded down to whole seconds and the first call can come
  up to 1 s early. The longest delay is 60000 s (about 16.7 h). Longer ones
  return `-1`.

To update the display every second, don't use `Ollee.setInterval(fn, 1000)`:
subscribe to `E_CLOCK_SECOND` and draw in `clock_second()`. It runs on the
low-power RTC scheduler and uses no timer slot.

### Info

These are properties, not calls.

| Property | Value |
| --- | --- |
| `Ollee.version` | Forge API version string, e.g. `'0.1'` |
| `Ollee.version_major`, `Ollee.version_minor` | The same as numbers |
| `Ollee.hw_version` | Hardware version string (`'EMULATOR'` in the emulator) |
| `Ollee.tz_offset` | The watch's UTC offset in hours |

## Other globals

### `Date`

The watch's `Date` has **no timezone**. `new Date()` holds the watch's local
wall-clock time, and `getHours()`, `getDate()` etc. return it directly.
`getTimezoneOffset()` is always 0, and `new Date(y, m, d, ...)` creates exactly
those fields. Use `Ollee.tz_offset` if you need the offset from UTC.

### `console`, `log`

`console.log`, `console.warn`, `console.error` and `log` print to the
emulator's log panel.
