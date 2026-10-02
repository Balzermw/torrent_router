import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultTorrentRouterSettings } from '../../../models/torrent-router.model';
import { trackerOriginPatterns } from '../../../utils/chrome/chrome-permissions.utils';
import { syncTrackerScripts } from './tracker-scripts.handler';

vi.mock('../../../utils/webex.utils', async importOriginal => ({
  ...await importOriginal<typeof import('../../../utils/webex.utils')>(),
  getManifest: () => ({ content_scripts: [{ js: ['scripts/contentScript.js'] }] }),
}));
vi.mock('../../../services/logger/logger.service', () => ({ LoggerService: { warn: vi.fn(), debug: vi.fn() } }));

const browser = {
  permissions: { contains: vi.fn(async (_permission: { origins?: string[] }) => false) },
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
});
