import type { StoreOrProxy } from '../../../models/store.model';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChromeMessageType } from '../../../models/message.model';
import { defaultSettings } from '../../../models/settings.model';
import { defaultTorrentRouterSettings } from '../../../models/torrent-router.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { trackerOriginPatterns } from '../../../utils/chrome/chrome-permissions.utils';
import { onTrackerScriptEvents, syncTrackerScripts } from './tracker-scripts.handler';

vi.mock('../../../utils/webex.utils', async importOriginal => ({
  ...await importOriginal<typeof import('../../../utils/webex.utils')>(),
  getManifest: () => ({ content_scripts: [{ js: ['scripts/contentScript.js'] }] }),
}));
vi.mock('../../../services/logger/logger.service', () => ({ LoggerService: { warn: vi.fn(), debug: vi.fn() } }));

type MessageListener = (message: { type: ChromeMessageType }, sender: { url?: string }, sendResponse: (response: unknown) => void) => boolean | void;

const browser = {
  runtime: {
    id: 'fixture-extension',
    onMessage: {
      addListener: vi.fn<(listener: MessageListener) => void>(),
      removeListener: vi.fn<(listener: MessageListener) => void>(),
    },
  },
  permissions: {
    contains: vi.fn(async (_permission: { origins?: string[] }) => false),
    onAdded: { addListener: vi.fn(), removeListener: vi.fn() },
    onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  scripting: {
    getRegisteredContentScripts: vi.fn(async () => [] as { id: string; matches: string[] }[]),
    unregisterContentScripts: vi.fn(async () => undefined),
    updateContentScripts: vi.fn(async () => undefined),
    registerContentScripts: vi.fn(async () => undefined),
    executeScript: vi.fn(async () => undefined),
  },
  tabs: { query: vi.fn(async () => [{ id: 17 }]) },
};

describe('tracker site access', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', browser);
    vi.clearAllMocks();
    browser.permissions.contains.mockResolvedValue(false);
    browser.scripting.getRegisteredContentScripts.mockResolvedValue([]);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes tracker domains without requesting all-site access', () => {
    expect(trackerOriginPatterns(['https://Tracker.Example/', '*.tracker.example'])).toEqual(['*://*.tracker.example/*']);
    expect(() => trackerOriginPatterns(['*'])).toThrow('Invalid tracker host');
  });

  it('registers only permitted hosts and activates existing tracker tabs', async () => {
    browser.permissions.contains.mockImplementation(async permission => permission.origins?.[0] === '*://*.tracker.example/*');
    await syncTrackerScripts({ ...defaultTorrentRouterSettings, hosts: ['tracker.example', 'denied.example'] });
    expect(browser.scripting.registerContentScripts).toHaveBeenCalledWith([expect.objectContaining({
      matches: ['*://*.tracker.example/*'],
      js: ['scripts/contentScript.js'],
      persistAcrossSessions: true,
    })]);
    expect(browser.scripting.executeScript).toHaveBeenCalledWith({ target: { tabId: 17 }, files: ['scripts/contentScript.js'] });
  });

  it('removes registration after permission is revoked or routing is disabled', async () => {
    browser.scripting.getRegisteredContentScripts.mockResolvedValue([{ id: 'torrent-router-trackers', matches: ['*://*.tracker.example/*'] }]);
    await syncTrackerScripts(defaultTorrentRouterSettings);
    expect(browser.scripting.unregisterContentScripts).toHaveBeenCalledWith({ ids: ['torrent-router-trackers'] });
    browser.permissions.contains.mockResolvedValue(true);
    await syncTrackerScripts({ ...defaultTorrentRouterSettings, enabled: false });
    expect(browser.scripting.registerContentScripts).not.toHaveBeenCalled();
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('reports missing site access without claiming scripts were registered', async () => {
    const status = await syncTrackerScripts({ ...defaultTorrentRouterSettings, hosts: ['broadcasthe.net'] });
    expect(status).toEqual({ enabled: true, configuredOrigins: ['*://*.broadcasthe.net/*'], registeredOrigins: [], failedTabIds: [] });
  });

  it('reports injection failures instead of silently confirming success', async () => {
    browser.permissions.contains.mockResolvedValue(true);
    browser.scripting.executeScript.mockRejectedValueOnce(new Error('Access denied'));
    const status = await syncTrackerScripts({ ...defaultTorrentRouterSettings, hosts: ['broadcasthe.net'] });
    expect(status.registeredOrigins).toEqual(['*://*.broadcasthe.net/*']);
    expect(status.failedTabIds).toEqual([17]);
  });

  it('acknowledges access checks from extension settings and rejects website callers', async () => {
    const store = { getState: () => ({ settings: defaultSettings }), subscribe: () => () => {} } as unknown as StoreOrProxy;
    const cleanup = onTrackerScriptEvents(store);
    const listener = browser.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn<(response: unknown) => void>();
    try {
      listener({ type: ChromeMessageType.trackerScriptsSync }, { url: 'https://broadcasthe.net/series.php?id=42' }, sendResponse);
      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      sendResponse.mockClear();
      listener({ type: ChromeMessageType.trackerScriptsSync }, { url: 'chrome-extension://fixture-extension/options.html' }, sendResponse);
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse.mock.calls[0][0]).toMatchObject({ success: true, payload: { registeredOrigins: [] } });
    } finally {
      cleanup();
    }
    expect(browser.runtime.onMessage.removeListener).toHaveBeenCalled();
  });

  it('handles background registration failures without an unhandled rejection', async () => {
    browser.scripting.getRegisteredContentScripts.mockRejectedValueOnce(new Error('Registration unavailable'));
    const store = { getState: () => ({ settings: defaultSettings }), subscribe: () => () => {} } as unknown as StoreOrProxy;
    const cleanup = onTrackerScriptEvents(store);
    try {
      await vi.waitFor(() => expect(LoggerService.warn).toHaveBeenCalledWith('Unable to enable tracker interception.', expect.any(Error)));
    } finally {
      cleanup();
    }
  });
});
