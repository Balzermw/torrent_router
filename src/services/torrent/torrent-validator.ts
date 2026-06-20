import type { TorrentValidationInput, TorrentValidationResult } from '../../models/torrent-router.model';

const binaryTorrentMimeTypes = new Set([
  'application/x-bittorrent',
  'application/octet-stream',
  'application/download',
  'binary/octet-stream',
]);

const textLikeMimeRegex = /^text\/|html|xml|json|javascript/i;
const htmlSniffRegexes = [/^\s*<!doctype\s+html/i, /^\s*<html\b/i, /^\s*<head\b/i, /^\s*<body\b/i, /^\s*<script\b/i, /^\s*<\?xml\b/i, /^\s*</];
const loginPageRegex = /login|sign\s*in|cloudflare|just a moment|enable javascript|captcha/i;

function textSample(bytes: ArrayBuffer, length = 4096): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.byteLength, length)));
}

function normalizedMime(contentType?: string | null): string {
  return contentType?.split(';')?.[0]?.trim()?.toLowerCase() ?? '';
}

function looksLikeBencodedTorrent(sample: string): boolean {
  const trimmed = sample.trimStart();
  if (!trimmed.startsWith('d')) return false;

  const hasInfoDictionary = sample.includes('4:info');
  const hasTracker = sample.includes('8:announce') || sample.includes('13:announce-list');
  return hasInfoDictionary && hasTracker;
}

export function validateTorrentBytes({ bytes, contentType, filename }: TorrentValidationInput): TorrentValidationResult {
  if (!bytes?.byteLength) {
    return { valid: false, reason: 'The tracker returned an empty response instead of a torrent file.' };
  }

  const mime = normalizedMime(contentType);
  const name = filename?.toLowerCase() ?? '';
  const sample = textSample(bytes);

  if (mime && textLikeMimeRegex.test(mime) && !binaryTorrentMimeTypes.has(mime)) {
    return { valid: false, reason: `The tracker returned ${mime}, not torrent data.` };
  }

  if (htmlSniffRegexes.some(regex => regex.test(sample)) || loginPageRegex.test(sample)) {
    return { valid: false, reason: 'The tracker returned a web page instead of an authenticated torrent file.' };
  }

  if (!looksLikeBencodedTorrent(sample)) {
    return { valid: false, reason: 'The response does not look like a valid bencoded torrent file.' };
  }

  if (name && (name.endsWith('.html') || name === 'index.html')) {
    return { valid: false, reason: `The tracker returned ${filename}, not a torrent file.` };
  }

  return { valid: true };
}

export function assertValidTorrentBytes(input: TorrentValidationInput): void {
  const result = validateTorrentBytes(input);
  if (!result.valid) throw new Error(result.reason);
}
