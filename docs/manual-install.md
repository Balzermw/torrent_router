# Manual Install From GitHub Releases

Use this guide when installing Synology Torrent Router without the Chrome Web Store.

## Download

1. Open the GitHub Releases page for this repository.
2. Download the latest file named like:

   ```text
   synology-torrent-router-4.2.3-chrome-extension.zip
   ```

3. Do not load the zip directly in Chrome. Extract it first.

## Extract

Extract the zip to a folder that you will keep in place, for example:

```text
C:\Users\<you>\Extensions\synology-torrent-router
```

The selected folder must contain `manifest.json` directly inside it. If Chrome says the manifest is missing, you probably selected the parent folder instead of the extracted extension folder.

## Load In Chrome

1. Open Chrome.
2. Go to:

   ```text
   chrome://extensions
   ```

3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the extracted folder containing `manifest.json`.
6. Confirm the extension appears as `Synology Torrent Router`.

## Configure NAS Access

1. Open the extension panel or options page.
2. Go to `Connection`.
3. Enter your Synology NAS connection details.
4. For local DSM over HTTPS, a common format is:

   ```text
   https://192.168.x.x:5001
   ```

5. Click `Test Login` or `Save`.
6. Approve Chrome's host-access prompt for your NAS address.
7. Confirm login succeeds.

## Configure Destination Presets

1. Go to `Downloads > Torrent Router`.
2. Enable Torrent Router.
3. Configure tracker hosts if needed.
4. Set preset folders for:
   - TV / Plex
   - Comics / Comga
   - Ebooks / Ebook ingest
5. Use the folder button to browse Synology folders.
6. Save settings.

## Use

1. Visit a supported tracker site.
2. Click a torrent download link.
3. Choose or confirm the destination folder.
4. Click `Send`.
5. Confirm the success notification says the torrent was sent to Synology Download Station.

## Update

1. Download the newer release zip.
2. Extract it over the old extension folder or into a new permanent folder.
3. Go to `chrome://extensions`.
4. Click the reload icon on Synology Torrent Router.

If you extract to a new folder, remove the old unpacked extension entry and load the new folder.

## Uninstall

1. Go to `chrome://extensions`.
2. Find Synology Torrent Router.
3. Click `Remove`.
4. Delete the extracted extension folder if you no longer need it.

## Troubleshooting

- `Manifest file is missing or unreadable`: select the folder that directly contains `manifest.json`.
- `Login attempt failed`: confirm protocol, NAS IP/host, port, username, password, and SSL certificate state.
- `Chrome host access is required`: approve the Chrome permission prompt for your NAS address, then retry.
- Torrent prompt does not appear: confirm the tracker host is supported and the extension is enabled under `Downloads > Torrent Router`.
- Torrent upload fails with HTML/login page: log into the tracker in the current browser session and retry.

## Safety Notes

Use this extension only for content you are authorized to access. It does not bypass logins, 2FA, CAPTCHA, paywalls, or tracker rules.
