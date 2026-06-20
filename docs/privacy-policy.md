# Privacy Policy

Effective date: 2026-06-20

Synology Torrent Router routes user-selected, authorized torrent and magnet downloads from supported browser pages to the user's own Synology Download Station.

## Data The Extension Stores

The extension may store the following data in Chrome local extension storage:

- Synology connection settings, such as protocol, host, port, username, session format, and optional saved password when the user enables "Remember me".
- Destination presets and recent destination folders.
- Tracker host settings.
- Extension preferences, task filters, notification settings, and diagnostic logging preferences.

This data is stored locally in the user's browser profile. It is not sold, rented, or shared with a developer-owned analytics or advertising service.

## Data The Extension Sends

The extension sends data only as needed to complete user-initiated actions:

- To the user's configured Synology NAS, using Synology Download Station and File Station APIs.
- To the tracker site the user is actively browsing, only to fetch the `.torrent` payload after the user clicks a download link or submits a download form.

The extension does not operate a hosted backend service for routing downloads. The developer does not receive the user's NAS credentials, torrent files, tracker cookies, private URLs, destination folders, or download history.

## Tracker Sessions And Torrent Files

When a user clicks a supported torrent download link, the extension may fetch the torrent file using the active browser session for that tracker. This is necessary so private trackers can return the actual `.torrent` file instead of a login page or HTML placeholder.

The extension validates that the response is bencoded torrent data before sending it to Synology Download Station. HTML pages, login pages, and invalid payloads are rejected.

## Logs

Diagnostic logs may include operational metadata such as tracker name, destination folder, validation result, file size, and error messages. Private tracker token paths and query strings should be redacted before logging. Users can review or export logs from the extension settings.

## Permissions

The extension requests only the permissions needed for its function:

- Storage for local settings.
- Notifications for success and failure messages.
- Downloads and context menus for existing Download Station task workflows.
- Tabs, scripting, and side panel support for extension UI and content-script behavior.
- Host permissions for supported tracker sites.
- Optional host permissions for user-configured NAS or custom sites, requested when needed.

## User Control

Users can:

- Disable Torrent Router in the extension settings.
- Remove saved credentials by disabling "Remember me" or clearing extension storage.
- Edit or clear destination presets and recent paths.
- Remove the extension from Chrome to delete extension-local data managed by Chrome.

## Affiliation

Synology Torrent Router is not affiliated with Synology Inc., Google, Chrome, dvcol, or any torrent tracker.

This project is based on `dvcol/synology-download`, which is MIT licensed. The upstream copyright and license notice are preserved.
