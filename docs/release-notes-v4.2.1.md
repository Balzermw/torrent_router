# Synology Torrent Router v4.2.1

Initial public GitHub release candidate for manual Chrome installation.

## Fork And Attribution

This build is a fork of [`dvcol/synology-download`](https://github.com/dvcol/synology-download), an MIT-licensed Synology Download Station Chrome extension. The original project provides the existing Synology auth/task UI and much of the extension foundation.

I built this fork because the torrent-download routing behavior I needed was not working reliably in my tracker workflow. Some tracker download clicks could save an HTML page, such as `index.html`, instead of a usable authenticated `.torrent` file. This release adds a Torrent Router flow that captures user-clicked torrent responses, validates the payload, prompts for a Synology destination folder, and uploads the torrent to Download Station.

Attribution to the upstream project is preserved in the repository license and documentation. This fork is not affiliated with the upstream maintainer, Synology, Chrome, Google, or any torrent tracker.

## Highlights

- Adds Torrent Router flow for user-selected private-tracker `.torrent` downloads.
- Prompts for Synology destination folder before upload.
- Supports destination presets for TV/Plex, Comics/Comga, Ebooks, and Manual.
- Saves tracker/preset-specific recent destination suggestions locally.
- Validates torrent bytes and rejects HTML/login/error pages before upload.
- Uploads validated `.torrent` files to Synology Download Station.
- Keeps existing Synology Download Station task management UI.
- Keeps magnet/URL task creation support.
- Adds Synology folder browsing for preset configuration and send-time destination selection.
- Adds success notifications with selected Synology destination folder.
- Adds diagnostic logging with tracker-token redaction.
- Adds original app icon assets.
- Narrows required public host permissions to default supported tracker hosts and uses optional host permissions for NAS/custom-site access.

## Supported Default Tracker Hosts

- IPTorrents
- TorrentLeech
- MyAnonamouse

## Manual Install

1. Download `synology-torrent-router-4.2.1-chrome-extension.zip`.
2. Extract the zip.
3. Open Chrome at `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the extracted folder containing `manifest.json`.

See [manual-install.md](manual-install.md) for full setup and troubleshooting.

## Notes

This extension is for content the user is authorized to access. It does not scrape trackers, bypass login/2FA/CAPTCHA, automate content discovery, or provide torrent content.

This project is based on `dvcol/synology-download`, MIT licensed, with attribution preserved.
