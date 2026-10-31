# DeckRoulette (with Sort)

A fork of [chrisae9/deck-roulette](https://github.com/chrisae9/deck-roulette)
that adds sorting to the list screens. It is kept in sync with the parent
(currently based on v1.3.27).

Decky Loader plugin for opening a random game from your library or Steam
collections.

![DeckRoulette shortcuts in the Decky Quick Access menu](screenshots/002_quick_access.png)

## Features

- Choose from Locally Installed Games, My Games, or any Steam collection.
- Pin, unpin, and reorder game lists in Quick Access.
- Browse unpinned collections and return to the last selected list.
- Exclude collections from Locally Installed Games and My Games while keeping
  them available as individual roulette lists.

## Sorting (added in this fork)

A **🔀 Sort** button appears in two places and cycles through three orders:

| Mode | Order |
| --- | --- |
| **Alphabetical** (default) | A–Z, the same as the parent plugin |
| **Recently Rouletted** | Lists you most recently used the roulette button on come first |
| **Recently Opened** | Lists containing the most recently played games come first |

- **Quick Access → Browse Other Lists…** sorts the unpinned lists.
- **Customize Shortcuts → Available Shortcuts** sorts the lists you can pin.

Notes:

- *Locally Installed Games* and *My Games* always stay at the top.
- Lists that tie (for example, never rouletted) fall back to A–Z.
- Your pinned shortcuts keep the manual order you set.
- The chosen sort and the roulette history are remembered between sessions.
  They are stored on the Deck in the Steam UI's local storage, so they are not
  part of the plugin's `settings.json`.

## Installing

Download `DeckRoulette-with-sort-<version>.zip` from the
[Releases](https://github.com/SilvertongueRED/deck-roulette-with-sort/releases)
page, copy it to your Steam Deck, then in Decky: **Settings → General → turn on
Developer Mode → Developer → Install Plugin from ZIP**. Remove any other
DeckRoulette install first, because they share the same plugin name.

## Development

```sh
npx -y pnpm@9.4.0 install --frozen-lockfile
npx -y pnpm@9.4.0 test
npx -y pnpm@9.4.0 build
```
