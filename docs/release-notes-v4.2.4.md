# Synology Torrent Router v4.2.4

Fixes and cleans up torrent interception:

- Intercepts recognized tracker links before page click handlers start a browser download.
- Handles keyboard form submissions, SVG download icons, and submit-button URL/method overrides while preserving form fields.
- Reads form attributes safely when named fields such as `action` hide the form's native URL property in Chrome.
- Supports TorrentLeech's alternate .cc domain with older saved tracker settings.
- Requests site access when saving tracker hosts and registers interception on approved sites, including already open tabs.
- Prevents repeated background-worker injections from resetting an open destination prompt.
- Recovers from stale content roots after an extension reload and releases old connection ports.
- Finishes the browser filename callback when no destination-dialog receiver is available.
- Shortens the torrent summary, fixes select API usage, and exposes disabled link interception in router settings.

After updating, reload the extension and refresh tracker tabs. In Downloads > Torrent Router, click Save and approve any requested tracker access. The separate Browser download interception settings apply to legacy browser-download transfers.

Validation: 712 unit tests passed, the production extension build passed, and a Playwright smoke check in Chromium-based Edge verified mocked tracker clicks, POST forms, alternate-domain capture, and reinjection. A live upload using your tracker session and NAS remains a manual check.

This project is an MIT-licensed fork of [dvcol/synology-download](https://github.com/dvcol/synology-download), which provides the original Synology authentication and task management foundation.
