import type { TorrentCaptureRequest, TorrentPayload, TorrentRequestBody } from '../../models/torrent-router.model';

import { lastValueFrom } from 'rxjs';

import { ChromeMessageType } from '../../models/message.model';
import { sendMessage } from '../../utils/chrome/chrome-message.utils';
import { LoggerService } from '../logger/logger.service';
import { assertValidTorrentBytes } from './torrent-validator';

const torrentContentType = 'application/x-bittorrent';
const utf8FilenameRegex = /filename\*=UTF-8''([^;]+)/i;
const asciiFilenameRegex = /filename="?([^";]+)"?/i;
const quoteRegex = /"/g;
const pathSeparatorRegex = /[\\/]/;
const base64ChunkSize = 0x8000;
const tokenPathRegex = /(download(?:\.php)?\/)[^/?#]+/i;

function bodyFromRequest(body?: TorrentRequestBody): BodyInit | undefined {
  if (!body?.entries?.length) return undefined;
  if (body.enctype?.includes('x-www-form-urlencoded')) return new URLSearchParams(body.entries);

  const formData = new FormData();
  body.entries.forEach(([key, value]) => formData.append(key, value));
  return formData;
}

function filenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const utf8 = utf8FilenameRegex.exec(header);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].replace(quoteRegex, ''));

  const ascii = asciiFilenameRegex.exec(header);
  if (ascii?.[1]) return ascii[1];
  return undefined;
}

function safeTorrentFilename(request: TorrentCaptureRequest, response: Response): string {
  const headerName = filenameFromContentDisposition(response.headers.get('content-disposition'));
  const name = headerName ?? request.filename ?? 'download.torrent';
  const withoutPath = name.split(pathSeparatorRegex).pop() ?? 'download.torrent';
  return withoutPath.toLowerCase().endsWith('.torrent') ? withoutPath : `${withoutPath}.torrent`;
}

export function redactTrackerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(tokenPathRegex, '$1[redacted]');
    return `${parsed.origin}${pathname}${parsed.search ? '?[redacted]' : ''}`;
  } catch {
    return '[invalid-url]';
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i += base64ChunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + base64ChunkSize));
  }

  return btoa(binary);
}

export async function fetchTorrentPayload(request: TorrentCaptureRequest): Promise<TorrentPayload> {
  LoggerService.info('Torrent Router fetching torrent payload.', {
    tracker: request.tracker,
    method: request.method,
    url: redactTrackerUrl(request.url),
    source: request.source,
  });

  const response = await fetch(request.url, {
    method: request.method,
    body: request.method === 'POST' ? bodyFromRequest(request.body) : undefined,
    credentials: 'include',
    redirect: 'follow',
    cache: 'no-store',
    headers: {
      Accept: `${torrentContentType}, application/octet-stream;q=0.9, */*;q=0.5`,
    },
  });

  const bytes = await response.arrayBuffer();
  const filename = safeTorrentFilename(request, response);
  const contentType = response.headers.get('content-type') ?? torrentContentType;

  if (!response.ok) {
    throw new Error(`The tracker returned HTTP ${response.status} while fetching ${filename}.`);
  }

  assertValidTorrentBytes({ bytes, contentType, filename });

  const file = new File([bytes], filename, { type: torrentContentType });
  LoggerService.info('Torrent Router validated torrent payload.', {
    tracker: request.tracker,
    filename,
    contentType,
    size: file.size,
  });
  return {
    file,
    filename,
    contentType,
    size: file.size,
  };
}

export async function submitTorrentCapture(request: TorrentCaptureRequest, destination: string): Promise<void> {
  const payload = await fetchTorrentPayload(request);
  const bytes = await payload.file.arrayBuffer();
  const data = arrayBufferToBase64(bytes);

  LoggerService.info('Torrent Router sending torrent upload to background.', {
    tracker: request.tracker,
    filename: payload.filename,
    size: payload.size,
    encodedSize: data.length,
    destination,
  });

  await lastValueFrom(sendMessage({
    type: ChromeMessageType.torrentUpload,
    payload: {
      data,
      size: payload.size,
      filename: payload.filename,
      contentType: payload.contentType,
      destination,
      source: request.source,
      tracker: request.tracker,
    },
  }));
}
