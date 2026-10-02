# Synology Torrent Router v4.2.5

- Support BroadcasTheNet individual DL links, preserving authentication query parameters.
- Add a BroadcasTheNet checkbox in Downloads > Torrent Router. Existing installations must enable it, Save, approve site access, and refresh the tracker page.
- Keep BTN Series Collector downloads in the browser; this version routes individual torrents, not archive collections.
- Make Torrent Router independent of the legacy magnet/link-interception switch.
- Restore initialization after another extension removes the content interface, and unmount old React subscriptions during teardown.
- Read TorrentLeech release names next to image download buttons without requiring title attributes.

Only keep one Download Station / Torrent Router extension enabled to avoid competing download handlers.

Verified with unit tests and an isolated Chromium-based browser using sanitized fixtures matching BTN and TorrentLeech controls. Live NAS uploads remain a manual acceptance check.
