import type { TorrentUploadPayload } from '../../../models/torrent-router.model';

import { firstValueFrom } from 'rxjs';

import { ChromeMessageType } from '../../../models/message.model';
import { TaskCreateType } from '../../../models/synology.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { QueryService } from '../../../services/query/query.service';
import { onMessage } from '../../../utils/chrome/chrome-message.utils';

const torrentContentType = 'application/x-bittorrent';

function base64ToBytes(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function messageFromError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

async function createTorrentTask(payload?: TorrentUploadPayload): Promise<void> {
  if (!payload?.data?.length) throw new Error('Torrent payload is empty.');
  if (!payload.destination?.trim()) throw new Error('Choose a Synology destination folder.');

  const bytes = base64ToBytes(payload.data);
  if (!bytes.byteLength) throw new Error('Torrent payload is empty.');

  LoggerService.info('Torrent Router creating Synology task from background.', {
    tracker: payload.tracker,
    filename: payload.filename,
    size: payload.size,
    decodedSize: bytes.byteLength,
    destination: payload.destination,
    source: payload.source,
  });

  const torrentBytes = toArrayBuffer(bytes);
  const torrent = new File([torrentBytes], payload.filename || 'download.torrent', {
    type: payload.contentType || torrentContentType,
  });

  await firstValueFrom(
    QueryService.createTask(
      {
        type: TaskCreateType.file,
        destination: payload.destination.trim(),
        create_list: false,
        torrent,
      },
      {
        source: payload.source ?? payload.tracker,
        torrent,
      },
    ),
  );
}

export function onTorrentRouterEvents() {
  LoggerService.debug('Subscribing to torrent router events.');

  onMessage<TorrentUploadPayload>([ChromeMessageType.torrentUpload]).subscribe(({ message: { payload }, sendResponse }) => {
    void createTorrentTask(payload)
      .then(() => sendResponse({ success: true }))
      .catch((error: unknown) => {
        LoggerService.error('Torrent Router upload failed.', {
          payload: payload && {
            ...payload,
            data: payload.data ? `[base64:${payload.data.length}]` : undefined,
          },
          error,
        });
        sendResponse({ success: false, error: messageFromError(error) });
      });
  });
}
