import { describe, expect, it } from 'vitest';

import { validateTorrentBytes } from './torrent-validator';

function bytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

describe('torrent-validator', () => {
  it('accepts bencoded torrent-shaped bytes', () => {
    const result = validateTorrentBytes({
      bytes: bytes('d8:announce14:https://tracker4:infod4:name4:test6:pieces20:abcdefghijklmnopqrstee'),
      contentType: 'application/x-bittorrent',
      filename: 'test.torrent',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects html returned as index.html', () => {
    const result = validateTorrentBytes({
      bytes: bytes('<!doctype html><html><title>Login</title></html>'),
      contentType: 'text/html; charset=utf-8',
      filename: 'index.html',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('text/html');
  });

  it('rejects login pages even when the content type is generic', () => {
    const result = validateTorrentBytes({
      bytes: bytes('<html><body>Please sign in to continue</body></html>'),
      contentType: 'application/octet-stream',
      filename: 'download.torrent',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('web page');
  });
});
