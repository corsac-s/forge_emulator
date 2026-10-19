<picture>
  <source media="(prefers-color-scheme: dark)" srcset="ollee-forge-logo-dark.png">
  <img src="ollee-forge-logo-light.png" alt="Ollee Watch Forge" width="300">
</picture>

# Ollee Watch Forge (Beta 1)

Build custom watchfaces for Ollee Watch. Code them yourself or with an AI agent,
test them in the browser emulator, and load them onto your watch.

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
Questions and show-and-tell: [Discussions](../../discussions)

## License

<!-- TODO: choose a license and add a LICENSE file. -->

Minification uses [Terser](https://github.com/terser/terser), vendored in
`js/vendor/` under its own license (`js/vendor/terser.LICENSE.txt`).
