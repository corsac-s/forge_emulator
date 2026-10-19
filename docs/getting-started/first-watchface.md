# Your first watchface

In this tutorial you'll build a tally counter: **A** counts up, **L** resets,
and holding **A** counts up by 10. Along the way you'll use the main ideas
behind every Forge face.

Have the emulator open first ([install](install.md)).

## Step 1: Show something

Clear the editor and type:

```js
function enter() {
  Ollee.clear();
  Ollee.drawMain('0');
}
```

Click **Run**. The display shows `0` at the right of the clock digits.

`enter()` runs every time your face comes on screen. The watch finds it by its
exact name, so the spelling matters. `Ollee.clear()` blanks the display, and
`Ollee.drawMain()` writes up to 6 characters on the big clock digits,
right-aligned.

## Step 2: React to a button

```js
var count = 0;
const subscribe = E_A_SHORT;

function enter() {
  Ollee.clear();
  Ollee.drawMain(count);
}

function a_short() {
  count++;
  Ollee.drawMain(count);
}
```

Run it and press **A** (or the `a` key) a few times.

Two things make `a_short` fire:

1. A top-level function named `a_short` exists.
2. Its bit, `E_A_SHORT`, is in `subscribe`.

If you leave either out, the button does nothing. That's the most common
"why doesn't my button work?" mistake.

## Step 3: Add a second button

Add `E_L_SHORT` to `subscribe` and an `l_short` handler:

```js
const subscribe = E_A_SHORT + E_L_SHORT;

function l_short() {
  count = 0;
  Ollee.drawMain(count);
  Ollee.beep();
}
```

## Step 4: Long press

A long press fires *after* the short press, once the button has been held for
1 second (A) or 1.5 seconds (L). So holding A gives you +1 and then +10:

```js
const subscribe = E_A_SHORT + E_A_LONG + E_L_SHORT;

function a_long() {
  count += 10;
  Ollee.drawMain(count);
}
```

## Step 5: Leaving and coming back

Press **M**. You're on the home screen. Press **M** again and your face comes
back with the count intact, because the script stayed loaded and `enter()` ran
again. That's why we draw in `enter()` and not only once at the start.

## The finished face

```js
// Tally counter: A +1, hold A +10, L resets.
var count = 0;
const subscribe = E_A_SHORT + E_A_LONG + E_L_SHORT;

function show() {
  Ollee.drawMain(count);
}

function enter() {
  Ollee.clear();
  show();
}

function a_short() {
  count++;
  show();
}

function a_long() {
  count += 10;
  show();
}

function l_short() {
  count = 0;
  show();
  Ollee.beep();
}
```

Give it a name in **File name** and click **Save script**. The size bar under
the editor shows how many of the watch's 8158 bytes it uses.

## Where next

- Learn when each hook runs: [Lifecycle](../concepts/lifecycle.md).
- See what the display can show: [Display](../concepts/display.md).
