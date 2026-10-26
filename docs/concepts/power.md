# Power

The Ollee Watch runs for a long time on a small battery, and a Forge face
should keep it that way. Every time the watch wakes up to run your code, it
spends energy, so the guidance below comes down to running less often.

<!-- TODO: add measured numbers (current per wake-up, beep, LED, BLE) and a
     rough battery-life budget for a Forge face. -->

## Update rates

| Approach | Wakes | Use it for |
| --- | --- | --- |
| `clock_minute()` | Once a minute | Clocks, dates, anything that changes by the minute |
| `clock_hour()` | Once an hour | Chimes, hourly counters |
| `clock_second()` | Every second, on screen only | Seconds displays, countdowns |
| `Ollee.setInterval(fn, 1000)` | Every second | Seconds displays you start and stop |
| `Ollee.setInterval(fn, 100)` | 10× a second | Stopwatches, fast animations, only while needed |

Choose the slowest one that looks right. A clock showing `HH:MM` should redraw
on `clock_minute()`, not on a 1-second timer.

Whole seconds are much cheaper than anything in between. `clock_second()` and
timers of whole seconds (`1000`, `2000`, ...) run on the watch's low-power RTC
scheduler. Any other delay under a minute (`100`, `750`, `1500`) runs on a 1 ms
scheduler that keeps a high-power timer going for as long as the timer exists.

## Habits

- **Only run timers while they're needed.** Start fast timers when the user
  starts something, and stop them when it ends. The watch cancels a face's
  timers when the face leaves the screen, which helps, but a face left on
  screen all day with a 100 ms timer keeps waking the watch.
- **Compute from timestamps, don't count ticks.** Store a start time from
  `new Date().getTime()` and subtract. Then you can refresh the display less
  often (or not at all while off screen) without losing time.
  [examples/countdown.js](../../examples/countdown.js) works this way.
- **Keep background subscriptions few.** `Ollee.subscribe` wakes your script
  even while you're on other faces. Subscribe to what the feature needs, and
  offer a way to turn it off.
- **Use the LED and buzzer briefly.** `Ollee.led_on()` stays on until you call
  `Ollee.led_off()`. Pair them with a `setTimeout`, and turn it off in `exit()`.
- **Keep BLE messages short and rare.** Batch data into fewer `Ollee.send`
  calls instead of streaming.
- **Do the work once.** Precompute in `init()` or top-level code instead of on
  every tick.

## Battery level

`Ollee.battery()` returns the battery voltage in volts. A face can warn when it
gets low.

<!-- TODO: document the voltage range (full / low / empty) for the watch's battery. -->
