# Chrome Web Store Listing Draft

## Name

Synology Torrent Router

## Short Description

Send user-selected torrent and magnet downloads to your Synology Download Station with a destination-folder prompt.

## Detailed Description

Synology Torrent Router helps home NAS users route authorized, user-selected torrent and magnet downloads from Chrome to their own Synology Download Station.

When you click a supported torrent download link, the extension asks where the download should go, validates that the tracker returned a real `.torrent` file, and sends it to Download Station using Synology's local APIs. Destination presets help route TV, comics, ebooks, and manual downloads into the right NAS folders.

Core features:

- Send user-selected torrent files to Synology Download Station.
- Keep existing Download Station task viewing and management workflows.
- Prompt for a Synology destination folder before upload.
- Save destination presets and tracker-specific recent folders locally.
- Validate torrent payloads and reject HTML/login/error pages.
- Continue supporting magnet and URL task creation.
- Store settings locally in Chrome extension storage.

Important limitations:

- This extension is for content you are authorized to access.
- It does not scrape trackers.
- It does not bypass login, 2FA, CAPTCHA, paywalls, or access controls.
- It does not discover or recommend content.
- It does not provide a hosted proxy or remote backend.
- v1 is intended for local LAN Synology Download Station use.

Privacy:

The extension stores NAS settings, destination presets, and preferences locally in Chrome. It sends data only to the user-selected tracker/NAS endpoints needed to complete user-initiated actions. It does not sell data, run ads, or send private torrent/NAS data to a developer-owned server.

Affiliation:

This extension is not affiliated with Synology Inc., Google, Chrome, dvcol, or any torrent tracker. It is based on `dvcol/synology-download`, MIT licensed, with attribution preserved.

## Category

Productivity

## Language Notes

Avoid promotional language that implies piracy, scraping, discovery, or bypassing private tracker protections. Keep the emphasis on user-initiated routing, validation, destination selection, and local NAS control.
