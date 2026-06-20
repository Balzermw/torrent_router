# Chrome Web Store Reviewer Notes

## Extension Purpose

Synology Torrent Router routes user-selected, authorized torrent and magnet downloads to a user-configured Synology Download Station. It asks the user to choose a destination folder before uploading a validated `.torrent` file to the NAS.

The extension does not scrape trackers, bypass authentication, automate content discovery, or provide copyrighted content.

## Test Setup

The extension requires a Synology Download Station-compatible endpoint for full end-to-end testing. For review, use one of these options:

1. A local Synology NAS with Download Station enabled.
2. A controlled test/mock endpoint that implements the Synology `SYNO.API.Info`, `SYNO.API.Auth`, `SYNO.FileStation.List`, and `SYNO.DownloadStation.Task` create endpoints.

No real private tracker account is required to validate the main behavior. The core validation path accepts a regular `.torrent` response from a supported test page and rejects HTML/login/error pages.

## Suggested Review Flow

1. Load the extension.
2. Open Options or the extension panel.
3. Configure a local/test Synology endpoint.
4. Approve Chrome's host permission prompt for that endpoint.
5. Configure destination presets under Downloads > Torrent Router.
6. Visit a supported test page with a `.torrent` download link.
7. Click the download link.
8. Confirm the destination prompt appears.
9. Choose a destination folder.
10. Send the torrent.
11. Confirm a success notification states that the torrent was sent to Synology Download Station and includes the selected folder path.

## Expected Failure Behavior

- Invalid Synology credentials show a readable login failure.
- Offline NAS shows a readable network/API failure.
- Invalid destination shows a readable Download Station error.
- HTML/login pages returned by a tracker are rejected and not uploaded.
- Empty or malformed torrent payloads are rejected and not uploaded.

## Permissions Explanation

- `storage`: saves local settings, destination presets, and extension preferences.
- `notifications`: shows success and failure messages.
- `downloads`: supports existing local browser download workflows inherited from the Download Station client.
- `contextMenus`: supports user-triggered task actions from page/context menus.
- `tabs`: supports extension panel/popup routing and active-tab messaging.
- `scripting`: safely injects content scripts on supported sites after install/update.
- `sidePanel`: supports the extension side panel UI.
- `host_permissions`: limited default access for supported tracker pages.
- `optional_host_permissions`: allows the user to grant exact access to their configured NAS or custom sites at runtime.

## Affiliation And License

This extension is not affiliated with Synology Inc., Google, Chrome, dvcol, or any torrent tracker.

This project is based on `dvcol/synology-download`, which is MIT licensed. The upstream copyright and license notice are preserved.
