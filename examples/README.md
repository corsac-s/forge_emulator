# Examples

Load any of these in the emulator with **Load file**, then click **Run**.

| Example | What it shows |
| --- | --- |
| [template.js](template.js) | Starting point with `init`/`enter`/`exit` and a button. The emulator loads it by default. |
| [dice_roller.js](dice_roller.js) | Modes on button L, `Ollee.hwRand()` |
| [countdown.js](countdown.js) | Date math, editing values with blink, hold-to-repeat with `a_long` + `button()`, a seconds display on `clock_second()` |
| [metronome.js](metronome.js) | Acting on button release, string timer callbacks |
| [ioDemo.js](ioDemo.js) | A menu over battery, temperature, steps, beep (A) and very short beep (hold A), LED, tilt and tap |
| [location.js](location.js) | `Ollee.latitude()`/`longitude()` |
| [databank.js](databank.js) | Reading the phone's databank entries with `Ollee.databank()` ("no dat" for an empty one), and scrolling text longer than 6 characters on a timer that stops when it's done |
| [chime.js](chime.js) | A clock driven by `clock_minute()`, and a background `clock_hour()` chime via `Ollee.subscribe` |
| [bleEcho.js](bleEcho.js) | Two-way Bluetooth with a phone app, with the connection state from `ble_connect()`/`ble_disconnect()` |
| [bleInbox.js](bleInbox.js) | Receiving Bluetooth messages in the background |
| [totp.js](totp.js) | TOTP/HOTP authenticator (RFC 6238/4226) built on `Ollee.hmacSha1()`, with the countdown ticked by `clock_second()` |
