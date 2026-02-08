# Asset Setup Guide

This game uses the **Cute Fantasy Free** asset pack, which is **not included in the repository** due to license restrictions (non-redistributable).

## Where to Get the Assets

1. Download the Cute Fantasy Free asset pack from: https://pixelfrog-assets.itch.io/cute-fantasy
2. The free version is used for this non-commercial project

## Installation

1. Download and extract the `Cute_Fantasy_Free` folder
2. Place it in: `public/assets/Cute_Fantasy_Free/`

Your directory structure should look like:
```
public/
├── assets/
│   └── Cute_Fantasy_Free/
│       ├── Player/
│       ├── Enemies/
│       ├── Tiles/
│       ├── Outdoor decoration/
│       ├── Animals/
│       └── read_me.txt
```

## License Note

**Cute Fantasy Free License (Free Version):**
- ✅ Can use in non-commercial projects
- ✅ Can modify the assets
- ❌ Cannot redistribute or resell (even if modified)

This is why the assets are not included in the git repository.

## Swapping Asset Packs

The game is designed to support easy asset pack swapping:
- All asset configuration is centralized in `src/config/assets.ts`
- To use a different asset pack, update `ASSET_BASE_PATH` and sprite mappings in that file
