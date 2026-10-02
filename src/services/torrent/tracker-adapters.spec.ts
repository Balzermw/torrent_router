import type { TorrentRouterSettings } from '../../models/torrent-router.model';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultTorrentRouterSettings, TorrentRouterPresetId } from '../../models/torrent-router.model';
import { buildTorrentCaptureRequest, guessDestinationPreset, hostMatchesPattern } from './tracker-adapters';

const settings: TorrentRouterSettings = {
  ...defaultTorrentRouterSettings,
  hosts: ['iptorrents.com', 'torrentleech.org'],
};

const mamSettings: TorrentRouterSettings = {
  ...defaultTorrentRouterSettings,
  hosts: ['myanonamouse.net'],
};

function setUrl(url: string) {
  window.history.pushState({}, '', url);
}

function clickEvent(target: Element): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, button: 0 });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('tracker-adapters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
    setUrl('/torrents/?id=1');
  });
  afterEach(() => vi.restoreAllMocks());

  it('matches hosts and wildcard patterns', () => {
    expect(hostMatchesPattern('www.iptorrents.com', 'iptorrents.com')).toBe(true);
    expect(hostMatchesPattern('books.mam.example', '*.mam.example')).toBe(true);
    expect(hostMatchesPattern('example.com', 'iptorrents.com')).toBe(false);
  });

  it('detects IPTorrents download links', () => {
    document.body.innerHTML = '<a id="download" href="https://iptorrents.com/download.php?id=123">Download torrent</a>';
    const link = document.querySelector('#download')!;

    const request = buildTorrentCaptureRequest(clickEvent(link), settings);

    expect(request).toMatchObject({
      url: 'https://iptorrents.com/download.php?id=123',
      method: 'GET',
      tracker: 'IPTorrents',
    });
  });

  it('rejects unknown download-like links unless they are torrent files', () => {
    setUrl('/search');
    document.body.innerHTML = '<a id="download" href="https://example.com/download.php?id=123">Download</a>';
    const link = document.querySelector('#download')!;

    expect(buildTorrentCaptureRequest(clickEvent(link), settings)).toBeUndefined();
  });

  it('allows generic .torrent links on unknown hosts', () => {
    setUrl('/search');
    document.body.innerHTML = '<a id="download" href="https://example.com/files/release.torrent">Download</a>';
    const link = document.querySelector('#download')!;

    expect(buildTorrentCaptureRequest(clickEvent(link), settings)?.filename).toBe('release.torrent');
  });

  it('preserves POST form fields and clicked submit value', () => {
    document.body.innerHTML = `
      <form action="https://iptorrents.com/download.php" method="post">
        <input type="hidden" name="id" value="123" />
        <button id="download" name="action" value="download">Download torrent</button>
      </form>
    `;
    const button = document.querySelector('#download')!;

    const request = buildTorrentCaptureRequest(clickEvent(button), settings);

    expect(request?.method).toBe('POST');
    expect(request?.body?.entries).toContainEqual(['id', '123']);
    expect(request?.body?.entries).toContainEqual(['action', 'download']);
  });

  it('captures a keyboard form submission and honors submitter overrides', () => {
    document.body.innerHTML = `
      <form action="/search" method="get">
        <input name="csrf" value="test-token" />
        <input name="action" value="other" />
        <button formaction="https://iptorrents.com/download.php" formmethod="post" name="action" value="download">Download</button>
      </form>
    `;
    const form = document.querySelector('form')!;
    const button = document.querySelector('button')!;
    const event = new SubmitEvent('submit', { submitter: button });
    Object.defineProperty(event, 'target', { value: form });
    expect(buildTorrentCaptureRequest(event, settings)).toMatchObject({
      url: 'https://iptorrents.com/download.php',
      method: 'POST',
      body: { entries: [['csrf', 'test-token'], ['action', 'other'], ['action', 'download']] },
    });
  });

  it('reads form attributes when named fields shadow DOM properties', () => {
    document.body.innerHTML = '<form action="https://iptorrents.com/download.php" method="post"><input name="method" value="download" /><button name="action" value="download">Download</button></form>';
    const form = document.querySelector('form')!;
    Object.defineProperty(form, 'action', { value: document.querySelector('button') });
    Object.defineProperty(form, 'method', { value: document.querySelector('input') });
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('button')!), settings)).toMatchObject({
      url: 'https://iptorrents.com/download.php',
      method: 'POST',
      body: { enctype: 'application/x-www-form-urlencoded' },
    });
  });

  it('detects clicks on SVG icons inside torrent links', () => {
    document.body.innerHTML = '<a href="https://iptorrents.com/download.php?id=123"><svg><path /></svg></a>';
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('path')!), settings)?.tracker).toBe('IPTorrents');
  });

  it('supports the TorrentLeech alternate domain with older saved settings', () => {
    document.body.innerHTML = '<a href="https://www.torrentleech.cc/download/123">Download</a>';
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('a')!), settings)?.tracker).toBe('TorrentLeech');
  });

  it('captures the TorrentLeech image button and nearby release name without title attributes', () => {
    document.title = 'TorrentLeech.org';
    document.body.innerHTML = '<table><tr><td><a href="/torrent/123">Example Show S01E07 1080p</a></td><td><a href="https://www.torrentleech.org/download/123/Example.Show.torrent"><img alt="download button" /></a></td></tr></table>';
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('img')!), settings)).toMatchObject({
      tracker: 'TorrentLeech',
      title: 'Example Show S01E07 1080p',
      filename: 'Example.Show.torrent',
    });
  });

  it('captures BTN DL links with authentication parameters unchanged and episode context', () => {
    vi.spyOn(document, 'URL', 'get').mockReturnValue('https://broadcasthe.net/series.php?id=42');
    document.title = 'Example Show :: BroadcasTheNet';
    const url = 'https://broadcasthe.net/torrents.php?id=123&action=download&authkey=fixture-auth&torrent_pass=fixture-pass';
    document.body.innerHTML = `<table><tr><td><a href="/torrents.php?id=123" title="View Torrent">S13E06</a></td><td><a href="${url}" title="Download">DL</a></td></tr></table>`;
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('a[title="Download"]')!), defaultTorrentRouterSettings)).toMatchObject({
      url,
      method: 'GET',
      tracker: 'BroadcasTheNet',
      title: 'Example Show S13E06',
    });
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('a[title="Download"]')!), settings)).toBeUndefined();
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('a[title="View Torrent"]')!), defaultTorrentRouterSettings)).toBeUndefined();
  });

  it('does not intercept the BTN series collector as a single torrent', () => {
    document.body.innerHTML = '<form action="https://broadcasthe.net/series.php"><input name="action" value="download" /><button>Download</button></form>';
    expect(buildTorrentCaptureRequest(clickEvent(document.querySelector('button')!), defaultTorrentRouterSettings)).toBeUndefined();
  });

  it('leaves modified clicks and non-web links to the browser', () => {
    document.body.innerHTML = '<a href="https://iptorrents.com/download.php?id=123">Download</a>';
    const link = document.querySelector('a')!;
    const event = new MouseEvent('click', { button: 0, ctrlKey: true });
    Object.defineProperty(event, 'target', { value: link });
    expect(buildTorrentCaptureRequest(event, settings)).toBeUndefined();
    link.href = 'javascript:downloadTorrent()';
    expect(buildTorrentCaptureRequest(clickEvent(link), settings)).toBeUndefined();
  });

  it('uses the page title instead of noisy CSS and promo text around a download link', () => {
    document.title = 'I Have a Crush at Work, Vol. 5 | MyAnonamouse';
    document.body.innerHTML = `
      <section class="details">
        <style>
          /* Every selector is scoped to .fwc26 so nothing leaks to your site */
          .fwc26 { font-family: Barlow Condensed, sans-serif; animation: fwc26-sweep 6.5s ease-in-out infinite; }
          @keyframes fwc26-sweep { 0% { transform: scale(1); } }
        </style>
        <div class="fwc26">Live on IPTV FIFA World Cup 2026 Premium Streaming Trusted by Thousands</div>
        <a id="download" href="https://www.myanonamouse.net/tor/download/demo-token?demo=100000">Download</a>
      </section>
    `;
    const link = document.querySelector('#download')!;

    const request = buildTorrentCaptureRequest(clickEvent(link), mamSettings);

    expect(request?.title).toBe('I Have a Crush at Work, Vol. 5');
    expect(request?.title).not.toContain('Every selector');
    expect(request?.title).not.toContain('Premium Streaming');
  });

  it('prefers a nearby release title over the download action label', () => {
    document.body.innerHTML = `
      <table>
        <tr class="torrent-row">
          <td><a class="torrent-title" title="Example Show S01E07 1080p WEBRip x265" href="/torrent/123">Example Show</a></td>
          <td><a id="download" href="https://torrentleech.org/download/123">Download</a></td>
        </tr>
      </table>
    `;
    const link = document.querySelector('#download')!;

    const request = buildTorrentCaptureRequest(clickEvent(link), settings);

    expect(request?.title).toBe('Example Show S01E07 1080p WEBRip x265');
  });

  it('guesses destination presets from title and filename hints', () => {
    const preset = guessDestinationPreset(
      { title: 'Example Show S01E01 1080p', filename: 'example-show.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.tv);
  });

  it('uses comic filetypes before noisy page words like series', () => {
    const preset = guessDestinationPreset(
      {
        title: 'I Have a Crush at Work Vol. 5 Series Info Filetypes cbz',
        filename: 'i-have-a-crush-at-work.torrent',
      },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.comics);
  });

  it('uses TV episode patterns for show releases', () => {
    const preset = guessDestinationPreset(
      { title: 'Dutton Ranch S01E07 1080p WEBRip x265', filename: 'Dutton.Ranch.S01E07.1080p.WEBRip.x265.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.tv);
  });

  it('uses season pack patterns for TV releases', () => {
    const preset = guessDestinationPreset(
      { title: 'Example Show S02 Complete 1080p WEB-DL', filename: 'Example.Show.S02.Complete.1080p.WEB-DL.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.tv);
  });

  it('does not classify plain movie-style video releases as TV', () => {
    const preset = guessDestinationPreset(
      { title: 'Example Movie 2024 1080p WEBRip x265', filename: 'Example.Movie.2024.1080p.WEBRip.x265.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.manual);
  });

  it('uses ebook filetypes for book releases', () => {
    const preset = guessDestinationPreset(
      { title: 'Example Novel EPUB', filename: 'example-novel.epub.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.ebooks);
  });

  it('prefers Comics for comic PDFs over generic ebook PDF handling', () => {
    const preset = guessDestinationPreset(
      { title: 'Example Comic Book PDF', category: 'Comics', filename: 'example-comic.pdf.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.comics);
  });

  it('does not treat Mobile as a mobi ebook hint', () => {
    const preset = guessDestinationPreset(
      { title: 'Las Culturistas Culture Awards 2026 AAC MP4-Mobile', filename: 'Las.Culturistas.Culture.Awards.2026.AAC.MP4-Mobile.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.manual);
  });

  it('still matches a real mobi ebook token', () => {
    const preset = guessDestinationPreset(
      { title: 'Example Book MOBI', filename: 'example-book.mobi.torrent' },
      defaultTorrentRouterSettings.presets,
    );

    expect(preset.id).toBe(TorrentRouterPresetId.ebooks);
  });
});
