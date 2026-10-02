import type { Subject } from 'rxjs';

import type { StoreOrProxy } from '../../../models/store.model';
import type { DownloadItem } from '../../../utils/chrome/chrome-download.utils';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultTorrentRouterSettings } from '../../../models/torrent-router.model';
import { InterceptService } from '../../../services/download/intercept.service';
import { onFilename$ } from '../../../utils/chrome/chrome-download.utils';
import { onDownloadEvents } from './download.handler';

vi.mock('../../../utils/chrome/chrome-download.utils', async () => {
  const { EMPTY, Subject } = await import('rxjs');
  return { onFilename$: new Subject(), onStatus$: () => EMPTY };
});
vi.mock('../../../services/download/intercept.service', async () => {
  const { of } = await import('rxjs');
  return { InterceptService: { transfer: vi.fn(() => of(undefined)), openMenu: vi.fn(() => of(undefined)) } };
});
vi.mock('../../../services/logger/logger.service', () => ({ LoggerService: { debug: vi.fn(), info: vi.fn() } }));
vi.mock('../../../services/notification/notification.service', () => ({ NotificationService: { downloadFinished: vi.fn(), downloadError: vi.fn() } }));
vi.mock('../../../store/selectors/settings.selector', async importOriginal => ({
  ...await importOriginal<typeof import('../../../store/selectors/settings.selector')>(),
  getSettingsDownloadsInterceptEnabled: () => true,
  getSettingsDownloadsNotifications: () => false,
  getSettingsDownloadsIntercept: () => ({ all: true, erase: false, resume: true, modal: false, active: [] }),
  getTorrentRouterSettings: () => ({ ...defaultTorrentRouterSettings, hosts: ['iptorrents.com', 'torrentleech.org'] }),
}));

describe('legacy download interception ownership', () => {
  beforeAll(() => {
    onDownloadEvents({ getState: () => ({}), subscribe: () => () => {} } as unknown as StoreOrProxy);
  });
  beforeEach(() => vi.clearAllMocks());

  it.each([
    'https://broadcasthe.net/torrents.php?action=download&id=123&authkey=fixture-auth',
    'https://torrentleech.org/download/123/Example.Show.torrent',
    'https://iptorrents.com/download.php/123/123.torrent',
  ])('does not pause or send a private tracker URL to the NAS: %s', (url) => {
    const suggest = vi.fn();
    (onFilename$ as Subject<[DownloadItem, () => void]>).next([{ id: 17, url, finalUrl: url, filename: 'example.torrent' } as DownloadItem, suggest]);
    expect(suggest).toHaveBeenCalledTimes(1);
    expect(InterceptService.transfer).not.toHaveBeenCalled();
    expect(InterceptService.openMenu).not.toHaveBeenCalled();
  });

  it('keeps generic URL transfer behavior intact', () => {
    const url = 'https://example.com/file.zip';
    (onFilename$ as Subject<[DownloadItem, () => void]>).next([{ id: 17, url, finalUrl: url, filename: 'file.zip' } as DownloadItem, vi.fn()]);
    expect(InterceptService.transfer).toHaveBeenCalledTimes(1);
  });
});
