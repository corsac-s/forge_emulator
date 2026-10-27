# Install and run the emulator

The emulator is a static web page. There's nothing to install, just a web
browser.

## 1. Get the code

```
git clone https://github.com/olleewatch/forge_emulator
cd forge_emulator
```

Or download the ZIP from GitHub and unzip it.

## 2. Open it

Double-click `index.html`, or drag it into your browser. The editor starts with
the template face loaded. Use **Load file** to open other examples from the
`examples/` folder.

## 3. Try it

1. Click **Run**. The face shows `hello` and the status says *running*.
2. Click **A** (or press the `a` key). The watch beeps.
3. Click **M** (or press `m`). You're on the home screen. Press it again to go
   back to the face.

## Emulator components

| Panel | What it's for |
| --- | --- |
| **output** | The watch display. **Character set** shows how each character looks on the LCD. |
| **input** | The watch's L, M and A buttons, plus TILT and TAP gestures. Keyboard: `l` `m` `a` `t` `p`. Click a button for a short press, or hold it down for a long press (1 s for A, 1.5 s for L). HOLD lights on the watch when the long press registers. |
| **Bluetooth** | Plays a phone app writing to the watch, and toggles "phone connected" (which fires `ble_connect()`/`ble_disconnect()`). |
| **Clock** | Fires minute/hour clock events on demand. |
| **Databank** | The 10 databank entries `Ollee.databank()` returns. This data is read only, and can be set with the Ollee Watch App. Edit them here to test your face with different text. |
| **controls** | File name, Load/Save, Run/Stop. |
| **source** | The script editor, with a size bar showing bytes used against the watch's limit. |
| **log** | Script output and errors. **Copy log** copies it. |

Next: [write your first watchface](first-watchface.md).
