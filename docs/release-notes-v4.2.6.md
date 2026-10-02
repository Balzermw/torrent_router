# Synology Torrent Router v4.2.6

- Stop the legacy browser-download interceptor from pausing supported private tracker torrents or forwarding their URLs to the NAS, including older settings that have not enabled BTN yet. If page capture is unavailable or routing is disabled, the normal browser download is left alone.
- After saving Torrent Router settings, wait for the background registration check and show a site-access confirmation or specific error. Missing permissions and failed injection into open tabs are no longer silent.
- Restrict registration-status requests to extension pages, and keep them serialized with permission/settings updates.

For BTN, enable BroadcasTheNet under Downloads > Torrent Router, Save, approve site access, and refresh the tracker page. A captured torrent opens a destination prompt; a normal Chrome download has not been sent to Synology.

The user confirmed BTN downloads work with Torrent Router disabled, isolating the block to this extension in their setup. This release removes the legacy private-URL interception path and improves access diagnostics. It does not disable or bypass other browser security/filtering components. The updated live BTN-to-NAS flow still requires manual acceptance.
