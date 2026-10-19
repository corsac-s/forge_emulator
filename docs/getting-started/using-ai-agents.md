# Building with AI agents

AI coding agents (Claude Code, Codex, Cursor, Copilot and others) can write
Forge watchfaces well, as long as they know the watch's rules. This repo
includes [AGENTS.md](../../AGENTS.md), a short briefing that covers them. Most
agents read it automatically when they work in the repo.

## Option A: Run the agent in this repo

1. Clone the repo ([install](install.md)) and start your agent in the repo
   folder.
2. Ask for what you want, for example:

   > Write a Forge watchface in `my-faces/pomodoro.js`: a 25-minute work /
   > 5-minute break timer. A starts and pauses, L resets, beep when a period
   > ends. Show MM:SS on the main digits.

3. Load the file in the emulator (**Load file**), click **Run**, and try it.
4. If something's wrong, click **Copy log**, paste the log to the agent, and
   describe what you saw.

## Option B: Chat assistant, no repo

If you're using a chat assistant without file access, paste this before your
request:

> You are writing an Ollee Watch Forge watchface: one plain JavaScript file
> that runs on Espruino. Read the rules at
> https://github.com/olleewatch/forge_emulator/blob/main/AGENTS.md and the API at
> https://github.com/olleewatch/forge_emulator/blob/main/docs/api/README.md.
> Base your answer on examples/template.js in that repo.

If it can't browse the web, paste the contents of `AGENTS.md` and
`docs/api/README.md` instead. Then paste its script into the emulator's editor
and click **Run**.

## Tips

- **Name the inputs and outputs you want.** "A toggles X, L does Y, the day
  digits show Z" gets better results than "make a timer".
- **Ask it to keep the face small.** The script limit is 8158 bytes, and the
  agent can't see the size bar.
- **Check the characters.** Agents tend to write text the 7-segment display
  can't show well (`M`, `W`, `K`, `X`...). Open **Character set** to see what
  reads clearly.
- **Give it the log.** Uncaught errors show in the log with the hook that threw,
  which is usually all an agent needs to fix the bug.
