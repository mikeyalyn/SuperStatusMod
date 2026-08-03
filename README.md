# Forge Mobile for Revenge

Forge Mobile is an experimental Android port of the Forge custom-status userscript. Version 0.1.2 supports Revenge's normal direct plugin installer as well as its newer spec-3 repository format. The settings adapt to narrow cover screens and unfolded/tablet layouts.

## What it includes

- Local custom status text for your own account
- A custom colored status glyph over your own Discord avatar
- Automatic removal of Discord's native presence badge while the Forge badge is active
- Cover-screen and unfolded layouts for the Samsung Galaxy Z Fold
- Twelve presets, a status builder, saved creations, and JSON transfer
- Reversible patches: disabling the plugin restores Discord's normal rendering

This is a local visual modification. Other people and unmodified Discord clients will not see the Forge icon or styling.

## Important warning

Revenge and Forge Mobile modify Discord's client and are unofficial. Discord updates can break component patches, and Discord's Terms of Service prohibit modifying or reverse-engineering its client. Use this only if you understand and accept that risk.

## Install Revenge on Android

1. Download the current non-root Revenge Manager release from `https://github.com/revenge-mod/revenge-manager/releases/latest`.
2. Follow Revenge Manager's instructions to patch and install Discord.
3. Open the modified Discord installation and confirm that a Revenge section appears in Settings.

## Put Forge Mobile on GitHub

1. Open your public GitHub repository. For the screenshot example, it is `mikeyalyn/SuperStatusMod`.
2. Upload every item from this folder to the repository root, preserving the `builds/lynhud.forgemobile/` folders.
3. Confirm that GitHub shows `manifest.json`, `repo.json`, `README.md`, and `builds` at the top level.
4. Confirm that the repository's branch is named `main`.

The root `manifest.json` is required by the normal **Install a plugin** box.

## Install it through Revenge

1. Open Discord Settings → Revenge → Plugins.
2. Tap **Install a plugin**.
3. Paste the repository's raw base URL. For the screenshot example, paste exactly:
   `https://raw.githubusercontent.com/mikeyalyn/SuperStatusMod/main/`
4. Do **not** add `repo.json` or `manifest.json` to that URL.
5. Install and enable **Forge Mobile**, then open its settings.

Revenge automatically adds `manifest.json` to the base URL. Pasting a URL ending in `repo.json` makes it look for the invalid path `repo.json/manifest.json`, which caused the installation error in the screenshot.

## Optional spec-3 repository installation

If a future Revenge build exposes **Add Repository** inside its plugin browser, that separate screen can use:
`https://raw.githubusercontent.com/mikeyalyn/SuperStatusMod/main/repo.json`

Do not use that URL in the normal **Install a plugin** box.

## Update an existing installation

1. Upload the new package files to GitHub, replacing the old copies.
2. Open Discord Settings → Revenge → Plugins and tap **Forge Mobile**.
3. Tap **Refetch**, then fully close and reopen Discord.

Version 0.1.2 directly patches Discord's current mobile Avatar component so selected Forge icons appear on the profile badge and update reactively.

## Troubleshooting

- If installation still reports `Failed to fetch manifest`, open `https://raw.githubusercontent.com/mikeyalyn/SuperStatusMod/main/manifest.json` in a browser. It must show JSON rather than a GitHub 404 page.
- If GitHub's default branch is not `main`, replace `main` in the URL with the actual branch name.
- If Discord's native badge remains visible, open Forge Mobile's Compatibility section and toggle **Hide Discord status badge** off and on, then reopen your profile.
- If Discord crashes during startup, disable Forge Mobile from Revenge safe mode and note the Discord build number.

## Repository layout

```text
manifest.json
repo.json
README.md
builds/
  lynhud.forgemobile/
    manifest.json
    index.js
```
