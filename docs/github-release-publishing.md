# Publish A GitHub Release

Use this when publishing Synology Torrent Router as a manual Chrome extension download from your own GitHub repository.

## One-Time Repository Setup

1. Create or open the GitHub repository:

   ```text
   https://github.com/Balzermw/torrent_router
   ```

2. In this local checkout, point `origin` at your new repository.

   If `origin` still points to the upstream project, keep it as `upstream`:

   ```powershell
   git remote rename origin upstream
   git remote add origin https://github.com/Balzermw/torrent_router.git
   ```

   If you already renamed or removed `origin`, just add your repository:

   ```powershell
   git remote add origin https://github.com/Balzermw/torrent_router.git
   ```

3. Push the release branch and release tag:

   ```powershell
   git push -u origin HEAD:main
   git push origin v4.2.1
   ```

## Build The Download Zip

From the repository root:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run build:extension
corepack pnpm run package:github
```

The release asset is created at:

```text
store-artifacts\synology-torrent-router-4.2.1-chrome-extension.zip
```

## Create The GitHub Release

1. Open your GitHub repository in a browser.
2. Go to `Releases`.
3. Click `Draft a new release`.
4. Create a new tag:

   ```text
   v4.2.1
   ```

5. Set the release title:

   ```text
   Synology Torrent Router v4.2.1
   ```

6. Paste the notes from:

   ```text
   docs\release-notes-v4.2.1.md
   ```

7. Upload this asset:

   ```text
   store-artifacts\synology-torrent-router-4.2.1-chrome-extension.zip
   ```

8. Publish the release.

## Install Instructions For Users

Tell users to:

1. Download the `synology-torrent-router-4.2.1-chrome-extension.zip` release asset.
2. Extract it to a permanent folder.
3. Open `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the extracted folder that directly contains `manifest.json`.

The detailed install guide is:

```text
docs\manual-install.md
```

## Optional GitHub CLI Flow

If GitHub CLI is installed and authenticated, you can publish from PowerShell:

```powershell
git push -u origin HEAD:main
git push origin v4.2.1
gh release create v4.2.1 `
  store-artifacts\synology-torrent-router-4.2.1-chrome-extension.zip `
  --title "Synology Torrent Router v4.2.1" `
  --notes-file docs\release-notes-v4.2.1.md
```

The local `v4.2.1` tag should already point at the release commit. If it does not exist locally, create it only after the release commit is ready.
