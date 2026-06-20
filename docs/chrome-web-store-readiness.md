# Chrome Web Store Readiness

This branch is for preparing Synology Torrent Router for Chrome Web Store review.

## Store-Safe Positioning

Single purpose:

> Routes user-selected, authorized torrent and magnet downloads from the browser to the user's own Synology Download Station, with a destination-folder prompt.

Avoid public listing language that implies scraping, bypassing access controls, automated discovery, or unauthorized media downloading. The extension should be described as user-initiated routing for content the user is authorized to access.

## Pre-Submission Checklist

- [x] Replace inherited icon artwork with original generated utility icons.
- [ ] Replace screenshots with original Chrome Web Store screenshots after final UI review.
- [x] Draft store copy in `docs/chrome-web-store-listing.md`.
- [x] Preserve the upstream MIT license and copyright attribution.
- [x] Add in-app/open-source credits:
  - "Based on dvcol/synology-download, MIT licensed."
  - "Not affiliated with Synology Inc., Google, Chrome, dvcol, or any tracker."
- [x] Reduce manifest permissions before submission:
  - Remove permissions that are not needed for the current product surface.
  - Replace broad host access with optional/site-specific host permissions where possible.
  - Avoid blanket `http://*/*` and `https://*/*` in the public build unless there is no narrower technical option.
- [ ] Make custom tracker permissions fully opt-in and dynamically injected. The current public baseline grants default tracker hosts and keeps broad host access optional for NAS/custom-site runtime prompts.
- [x] Add a privacy policy draft in `docs/privacy-policy.md`.
- [ ] Add the final hosted privacy policy URL in the Chrome Web Store dashboard.
- [x] Privacy policy must disclose:
  - NAS connection settings and credentials are stored locally.
  - Destination presets and recent destinations are stored locally.
  - Tracker URLs/torrent payloads are used only to fulfill user-initiated downloads.
  - Data is sent only to user-selected tracker/NAS endpoints, not to a developer-owned server.
  - Logs may contain diagnostic metadata and should redact private tracker tokens.
- [x] Add test instructions for reviewers in `docs/chrome-web-store-reviewer-notes.md`:
  - How to configure a local/test Synology endpoint or mock endpoint.
  - How to use a demo `.torrent` link.
  - Expected destination prompt and success notification.
- [ ] Confirm no hardcoded NAS hostnames, usernames, passwords, destination folders, private tracker tokens, or real torrent URLs are present.
- [ ] Confirm the extension works after a clean install with empty settings.
- [ ] Confirm bad NAS credentials, offline NAS, and invalid folder errors are readable.
- [ ] Run final pre-submit checks:
  - `npm run lint:type`
  - focused ESLint on touched files
  - router unit tests
  - `npm run build:extension`

## Icon Direction

Use an original icon that communicates "route a user-selected download into a NAS folder" without using protected logos or tracker branding.

Preferred visual ingredients:

- Download arrow
- Folder or destination path
- Small NAS/storage-bay shape
- Routing line or node
- Clean Chrome-extension-style app icon
- Colors: teal/cyan, graphite, white, small warm accent

Avoid:

- Synology logo or product trade dress
- Chrome logo
- Tracker names/logos
- Pirate imagery
- Torrent site branding
- Text inside the icon
- Copyrighted media symbols

## ChatGPT Image Prompts

Prompt 1:

> Create a polished app icon for a Chrome extension called "Synology Torrent Router". The icon should show a clean download arrow flowing along a curved route line into a folder sitting in front of a small generic NAS storage device. Use an original design, no text, no logos, no Synology branding, no Chrome logo, no tracker branding. Style: modern vector-like 3D, crisp edges, teal and cyan routing line, graphite storage device, white folder highlight, subtle warm accent. Centered composition, readable at 16px, square 1024x1024 PNG.

Prompt 2:

> Design a minimal browser extension icon for "Torrent Router": a small generic two-bay NAS silhouette, a folder tab, and a downward arrow connected by a route path with one node. Make it friendly, technical, and trustworthy. No text, no copyrighted logos, no brand marks, no pirate imagery. Use a dark graphite base with cyan/teal highlights and a small amber destination dot. Flat vector style with slight depth, high contrast, square 1024x1024.

Prompt 3:

> Generate an original Chrome extension icon representing "send this download to my NAS folder." Show a download arrow transforming into a path line that lands in a folder, with a tiny generic storage box behind it. Clean icon grid, no text, no company logos, no tracker logos. Visual tone: practical, calm, secure, home-lab friendly. Colors: deep charcoal, bright cyan, soft white, tiny lime success accent. Must remain legible at 16x16 and 32x32.

Prompt 4:

> Create a simple line-art app icon for a download routing tool. Use three shapes only: a down arrow, a route curve, and a folder/NAS destination. Original artwork only. Do not include the Synology logo, Chrome logo, torrent logos, tracker names, text, or media/copyright symbols. Use a transparent background version and a square-background version. Palette: teal, blue-gray, white, and a tiny orange accent. 1024x1024.

Prompt 5:

> Make a premium but restrained app icon for a NAS download destination picker. Depict a folder with a small network-storage device and a glowing route line ending in a check mark. No words, no logos, no brand-specific device shapes, no piracy imagery. It should feel like a trustworthy utility for a home server power user. Modern macOS/Chrome extension icon style, soft shadows, high legibility, square 1024x1024 PNG.

Negative prompt to append:

> No text, no letters, no Synology logo, no Chrome logo, no BitTorrent logo, no tracker logos, no pirate skulls, no copyrighted media icons, no brand marks, no website screenshots, no clutter, no photorealistic people.

## Icon Export Sizes

Generate or downscale the final icon to:

- `16x16`
- `32x32`
- `64x64`
- `128x128`
- `256x256`
- optional source: `1024x1024`

Current manifest icon paths are under `assets/icons/`.
