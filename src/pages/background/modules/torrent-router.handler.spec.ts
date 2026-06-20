import type { TorrentUploadPayload } from '../../../models/torrent-router.model';

import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ChromeMessageType } from '../../../models/message.model';

interface TestMessageEvent {
  message: {
    type: ChromeMessageType;
    payload?: TorrentUploadPayload;
  };
  sendResponse: (response?: unknown) => void;
}

const subscriptions: Array<(handler: TestMessageEvent) => void> = [];

vi.mock('../../../utils/chrome/chrome-message.utils', () => ({
  onMessage: vi.fn(() => ({
    subscribe: vi.fn((handler: (event: TestMessageEvent) => void) => {
      subscriptions.push(handler);
      return { unsubscribe: vi.fn() };
    }),
  })),
}));

vi.mock('../../../services/query/query.service', () => ({
  QueryService: {
    init: vi.fn(),
    createTask: vi.fn(() => of(undefined)),
  },
}));

vi.mock('../../../services/logger/logger.service', () => ({
  LoggerService: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const { onMessage } = await import('../../../utils/chrome/chrome-message.utils');
const { QueryService } = await import('../../../services/query/query.service');
const { onTorrentRouterEvents } = await import('./torrent-router.handler');

describe('torrent-router.handler', () => {
  it('uploads torrent bytes through QueryService from the background', async () => {
    onTorrentRouterEvents();

    const sendResponse = vi.fn();
    subscriptions[0]({
      message: {
        type: ChromeMessageType.torrentUpload,
        payload: {
          data: btoa('d8:announce'),
          size: 11,
          filename: 'example.torrent',
          contentType: 'application/x-bittorrent',
          destination: 'volume1/demo-library',
          source: 'https://www.myanonamouse.net/t/100000',
          tracker: 'MyAnonamouse',
        },
      },
      sendResponse,
    });

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: true }));

    const fileMatcher: unknown = expect.any(File);

    expect(onMessage).toHaveBeenCalledWith([ChromeMessageType.torrentUpload]);
    expect(QueryService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'volume1/demo-library',
        torrent: fileMatcher,
      }),
      expect.objectContaining({
        source: 'https://www.myanonamouse.net/t/100000',
        torrent: fileMatcher,
      }),
    );
  });
});
