<picture>
  <source media="(prefers-color-scheme: dark)" srcset="ollee-forge-logo-dark.png">
  <img src="ollee-forge-logo-light.png" alt="Ollee Watch Forge" width="300">
</picture>

# Ollee Watch Forge (Beta 1)

Build custom watchfaces for the Ollee Watch in plain JavaScript. The watch runs a
JavaScript interpreter, so your script runs on it as-is: no compiling, no SDK, no
toolchain to install. Write a short script against the simple `Ollee` API (by hand
or with an AI agent), test it in this browser emulator, then upload it to your watch.

Status:
- **Beta 1**: Emulator support only. Deploying to the watch will be in Beta 2.

<!-- TODO: screenshot or GIF of the emulator running a watchface -->

## Quickstart
1. Clone the repository `git clone https://github.com/olleewatch/forge_emulator`
2. Open `index.html`
3. Click **Run**. The template face loads by default. Edit it in the browser,
   or use **Load file** to open one of the [examples](examples/).

## Documentation
- 🚀 [Your first watchface](docs/getting-started/first-watchface.md)
- 🤖 [Building with AI agents](docs/getting-started/using-ai-agents.md)
- 📐 [How watchfaces work](docs/concepts/architecture.md)
- 📚 [API reference](docs/api/README.md)
- 💡 [Examples](examples/)
- 📖 [All docs](docs/index.md)

## Community
Feedback, questions, bugs, and share your examples: [Discussions](../../discussions)

Join the discussion in the Forge channel on the [Ollee Watch Discord](https://discord.gg/BsTnx7YcKm).

## License

<!-- TODO: choose a license and add a LICENSE file. -->

Minification uses [Terser](https://github.com/terser/terser), vendored in
`js/vendor/` under its own license (`js/vendor/terser.LICENSE.txt`).
