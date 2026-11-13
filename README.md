# agmon-officer

Virtual Office for [AGMon](https://github.com/thanhdevapp/agent-factory): a 2D PixiJS office where every running AI agent session gets an animated desk, subagents appear as companion drones, and Chill Mode turns the office into a full-screen ambient view.

This is a free, open-source AGMon plugin. It runs in the AGMon plugin sandbox (opaque-origin iframe, no network access, no `unsafe-eval`) and talks to the host only through the permissions declared in `public/agmon-extension.json`.

## Install

In AGMon, open the Plugins panel and install **Virtual Office** from the catalog. GitHub-sourced plugins must be enabled on the host with `AGMON_PLUGIN_GITHUB_SOURCES=1`.

The installable tree is the `plugin/` directory of this repository at a pinned commit. The catalog entry records the commit SHA and a SHA-256 of that tree, and AGMon refuses to install anything that does not match.

## Permissions

| Permission | Why |
| --- | --- |
| `traces:subscribe` | Receive live agent session snapshots to animate desks |
| `workbench:openSession` | Open a session when you click its desk |
| `storage:pluginScope` | Remember skin, floor theme and pet choices |
| `theme:subscribe` | Follow the host light/dark theme |

## Develop

```bash
npm install
npm run dev     # Vite dev server
npm run build   # writes the installable tree to plugin/
```

`plugin/` is committed on purpose: it is what AGMon downloads and hashes. Rebuild and commit it with every release, then update the catalog entry with the new commit SHA and tree hash.

## License

MIT. See [LICENSE](LICENSE).
