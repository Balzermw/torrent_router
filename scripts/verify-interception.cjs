const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

const build = path.resolve(__dirname, '../build');
const artifacts = path.resolve(__dirname, '../store-artifacts/browser-check');
fs.mkdirSync(artifacts, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'torrent-router-check-'));
const extension = path.join(profile, 'fixture-extension');
fs.cpSync(build, extension, { recursive: true });
// Fixture-only grant: production BTN access remains an explicit settings opt-in.
const manifestPath = path.join(extension, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.host_permissions.push('*://*.broadcasthe.net/*');
fs.writeFileSync(manifestPath, JSON.stringify(manifest));

const html = `<!doctype html><html><head><title>Example Show S01E07 | IPTorrents</title></head><body>
<h1>Example Show S01E07</h1>
<a id="download" href="/download.php?id=123" onclick="window.downloads++; return false"><svg width="24" height="24"><rect width="24" height="24" /></svg>Download torrent</a>
<form action="/download.php" method="post" onsubmit="window.downloads++">
<input name="csrf" value="fixture-csrf" /><button name="action" value="download">Download form</button></form>
<script>window.downloads = 0;</script></body></html>`;
const tlHtml = `<!doctype html><title>TorrentLeech.org</title><table><tr>
<td><a href="/torrent/123">Example Show S01E07 1080p</a></td>
<td><a id="download" href="/download/123/Example.Show.S01E07.torrent" onclick="window.downloads++; return false"><img alt="download button" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect width='24' height='24'/%3E%3C/svg%3E"></a></td>
</tr></table><script>window.downloads=0;</script>`;
const btnHtml = `<!doctype html><title>Example Show :: BroadcasTheNet</title><table><tr>
<td><a title="View Torrent" href="/torrents.php?id=123">S13E06</a></td>
<td><a id="download" title="Download" href="/torrents.php?action=download&amp;id=123&amp;authkey=fixture-auth&amp;torrent_pass=fixture-pass" onclick="window.downloads++; return false">DL</a></td>
</tr></table><script>window.downloads=0;</script>`;

function findDialog(node) {
  const attributes = node.attributes || [];
  for (let i = 0; i < attributes.length; i += 2) {
    if (attributes[i] === 'role' && attributes[i + 1] === 'dialog') return node;
  }
  for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) {
    const result = findDialog(child);
    if (result) return result;
  }
}

async function dialogObject(session) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    const dialog = findDialog(root);
    if (dialog) {
      const { object } = await session.send('DOM.resolveNode', { nodeId: dialog.nodeId });
      return object.objectId;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Torrent Router destination prompt did not appear.');
}

async function run() {
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: 'chromium',
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    viewport: { width: 1280, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const errors = [];
  context.on('weberror', event => errors.push(event.error().message));
  context.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await context.route(/https:\/\/(?:www\.)?(?:iptorrents\.com|torrentleech\.(?:cc|org)|broadcasthe\.net)\//, route => route.fulfill({
      contentType: 'text/html',
      body: route.request().url().includes('torrentleech.') ? tlHtml : route.request().url().includes('broadcasthe.net') ? btnHtml : html,
    }));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await page.goto('https://www.iptorrents.com/details.php?id=123');
    await page.locator('synology-download-content').waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    let browserDownloads = 0;
    page.on('download', () => browserDownloads++);
    await page.locator('#download svg').click();
    const objectId = await dialogObject(session);
    const textResult = await session.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function() { return this.innerText; }', returnByValue: true });
    assert.match(textResult.result.value, /Torrent Router/);
    assert.match(textResult.result.value, /Example Show S01E07/);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.downloads), 0);
    assert.equal(browserDownloads, 0);
    await page.screenshot({ path: path.join(artifacts, 'desktop.png') });

    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.iptorrents.com/*' });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['scripts/contentScript.js'] });
    });
    assert.equal(await page.locator('synology-download-content').count(), 1);
    const afterInjection = await dialogObject(session);
    const stillOpen = await session.send('Runtime.callFunctionOn', { objectId: afterInjection, functionDeclaration: 'function() { return this.innerText; }', returnByValue: true });
    assert.match(stillOpen.result.value, /Example Show S01E07/);
    await session.send('Runtime.callFunctionOn', { objectId: afterInjection, functionDeclaration: 'function() { [...this.querySelectorAll("button")].find(button => button.textContent.trim() === "Cancel").click(); }' });
    await page.waitForTimeout(400);

    await page.locator('input[name="csrf"]').focus();
    await page.keyboard.press('Enter');
    await dialogObject(session);
    assert.equal(await page.evaluate(() => window.downloads), 0);
    assert.equal(browserDownloads, 0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifacts, 'mobile.png') });
    await page.goto('https://www.torrentleech.cc/details.php?id=123');
    await page.locator('synology-download-content').waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    await page.locator('#download').click();
    const alternateDialog = await dialogObject(session);
    const alternateText = await session.send('Runtime.callFunctionOn', { objectId: alternateDialog, functionDeclaration: 'function() { return this.innerText; }', returnByValue: true });
    assert.match(alternateText.result.value, /TorrentLeech/);
    assert.match(alternateText.result.value, /Example Show S01E07/);

    // A second extension can destroy the shared root. Reinjection must recover.
    await page.evaluate(() => {
      const root = document.querySelector('synology-download-content');
      root.dispatchEvent(new CustomEvent('onDestroy'));
      root.remove();
    });
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.torrentleech.cc/*' });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['scripts/contentScript.js'] });
    });
    await page.locator('synology-download-content').waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    await page.locator('#download img').click();
    await dialogObject(session);

    for (const url of ['https://www.torrentleech.org/torrents/top/index', 'https://broadcasthe.net/series.php?id=42']) {
      await page.goto(url);
      await page.locator('synology-download-content').waitFor({ state: 'attached' });
      await page.waitForTimeout(700);
      await page.locator('#download').click();
      const dialog = await dialogObject(session);
      const result = await session.send('Runtime.callFunctionOn', { objectId: dialog, functionDeclaration: 'function() { return this.innerText; }', returnByValue: true });
      assert.match(result.result.value, /Example Show S(?:01E07|13E06)/);
      assert.match(result.result.value, url.includes('broadcasthe.net') ? /BroadcasTheNet/ : /TorrentLeech/);
      assert.equal(await page.evaluate(() => window.downloads), 0);
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifacts, 'btn-mobile.png') });
    assert.equal(browserDownloads, 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: ['inline click and SVG interception', 'keyboard POST submission', 'no browser download', 'reinjection preserves open prompt', 'destroyed root recovery', 'TorrentLeech org/cc image buttons', 'BTN permission-based injection and DL links', 'no page errors'], screenshots: artifacts }, null, 2));
  } finally {
    await context.close();
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(profile).startsWith('torrent-router-check-'));
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
