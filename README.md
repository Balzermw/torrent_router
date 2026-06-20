# Synology Torrent Router

Synology Torrent Router is a Chrome MV3 extension that routes user-selected, authorized torrent and magnet downloads to your own Synology Download Station.

It is intended for local/home NAS use. When you click a supported torrent download link, the extension asks for a destination folder, validates that the tracker returned a real `.torrent` file, and uploads it to Download Station.

## Features

- Send user-selected `.torrent` files to Synology Download Station.
- Keep the existing Download Station task UI for viewing and managing tasks.
- Prompt for a destination folder before upload.
- Browse Synology folders when choosing preset paths.
- Save destination presets for TV/Plex, Comics/Comga, Ebooks, and manual paths.
- Remember recent destination folders per tracker/preset.
- Validate torrent payloads and reject HTML/login/error pages.
- Continue supporting magnet and URL task creation.
- Store NAS settings and presets locally in Chrome extension storage.

## Download And Install

This extension is distributed through GitHub Releases as an unpacked Chrome extension zip.

1. Download the latest `synology-torrent-router-*-chrome-extension.zip` from the GitHub Releases page.
2. Extract the zip to a permanent folder, such as:
   `C:\Users\<you>\Extensions\synology-torrent-router`
3. Open Chrome and go to:
   `chrome://extensions`
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
6. Select the extracted folder that contains `manifest.json`.
7. Pin the extension if you want quick access.

Chrome loads unpacked extensions from the extracted folder. If you delete or move that folder, Chrome will no longer be able to run the extension.

More detailed setup notes are in [docs/manual-install.md](docs/manual-install.md).
Publisher notes are in [docs/github-release-publishing.md](docs/github-release-publishing.md).

## Basic Setup

1. Open the extension options or panel.
2. Go to `Connection`.
3. Configure your Synology NAS address, such as `https://192.168.x.x:5001`.
4. Approve Chrome's host-access prompt for your NAS when asked.
5. Test login.
6. Go to `Downloads > Torrent Router`.
7. Configure destination preset folders.
8. On a supported tracker page, click a torrent download link and choose the destination.

## Supported Sites

The public build includes default content-script coverage for:

- IPTorrents
- TorrentLeech
- MyAnonamouse

Custom tracker hosts can be added in settings, but full dynamic injection for arbitrary custom tracker pages may require a future release.

## Privacy

The extension does not run a hosted backend service. NAS settings, destination presets, and preferences are stored locally in Chrome extension storage. Torrent payloads are fetched only after a user clicks a supported download link and are sent only to the user's configured Synology Download Station.

See [docs/privacy-policy.md](docs/privacy-policy.md).

## Important Limits

- This extension is for content you are authorized to access.
- It does not scrape trackers.
- It does not bypass login, 2FA, CAPTCHA, paywalls, or access controls.
- It does not automate content discovery.
- It does not provide torrent content.
- v1 is focused on local LAN Synology Download Station use.

## Build From Source

Requirements:

- Node.js 20.19 or newer
- pnpm 10.18 or newer, usually through Corepack

Install dependencies:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
```

Build the unpacked extension:

```sh
corepack pnpm run build:extension
```

The unpacked extension is written to:

```text
build/
```

Create a release zip:

```powershell
corepack pnpm run package:github
```

Run tests:

```sh
corepack pnpm run test:unit
```

## Credits

This project is based on [`dvcol/synology-download`](https://github.com/dvcol/synology-download), which is MIT licensed. The upstream copyright and license notice are preserved in [LICENSE](LICENSE).

This project is not affiliated with Synology Inc., Google, Chrome, dvcol, or any torrent tracker.

## License

MIT
