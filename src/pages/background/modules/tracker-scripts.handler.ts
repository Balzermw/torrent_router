import type { StoreOrProxy } from '../../../models/store.model';
import type { TorrentRouterSettings, TrackerScriptStatus } from '../../../models/torrent-router.model';

import { ChromeMessageType } from '../../../models/message.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { getTorrentRouterSettings } from '../../../store/selectors/settings.selector';
import { onMessage } from '../../../utils/chrome/chrome-message.utils';
import { trackerOriginPatterns } from '../../../utils/chrome/chrome-permissions.utils';
import { store$ } from '../../../utils/rxjs.utils';
import { getManifest } from '../../../utils/webex.utils';

const trackerScriptId = 'torrent-router-trackers';

export async function syncTrackerScripts(settings: TorrentRouterSettings): Promise<TrackerScriptStatus> {
  const origins = settings.enabled ? trackerOriginPatterns(settings.hosts) : [];
  const status: TrackerScriptStatus = { enabled: settings.enabled, configuredOrigins: origins, registeredOrigins: [], failedTabIds: [] };
  const granted = await Promise.all(origins.map(async origin => await chrome.permissions.contains({ origins: [origin] }) ? origin : undefined));
  const matches = granted.filter((origin): origin is string => !!origin);
  const [existing] = await chrome.scripting.getRegisteredContentScripts({ ids: [trackerScriptId] });
  if (!matches.length) {
    if (existing) await chrome.scripting.unregisterContentScripts({ ids: [trackerScriptId] });
    return status;
  }

  const js = getManifest().content_scripts?.[0]?.js;
  if (!js?.length) throw new Error('The extension build is missing its tracker content script.');
  const registration: chrome.scripting.RegisteredContentScript = {
    id: trackerScriptId,
    js,
    matches,
    runAt: 'document_idle',
    persistAcrossSessions: true,
  };
  if (existing) await chrome.scripting.updateContentScripts([registration]);
  else await chrome.scripting.registerContentScripts([registration]);
  status.registeredOrigins = matches;

  const tabs = await chrome.tabs.query({ url: matches });
  await Promise.all(tabs.map(async (tab) => {
    if (tab.id === undefined) return;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: js });
    } catch (error) {
      status.failedTabIds.push(tab.id);
      LoggerService.debug('Tracker tab closed or site access changed before injection.', { tabId: tab.id, error });
    }
  }));
  return status;
}

export function onTrackerScriptEvents(store: StoreOrProxy) {
  // Serialize updates so a permission change cannot race an earlier registration.
  let pending = Promise.resolve();
  const sync = async () => {
    const result = pending.then(async () => syncTrackerScripts(getTorrentRouterSettings(store.getState())));
    pending = result.then(() => undefined).catch(error => LoggerService.warn('Unable to enable tracker interception.', error));
    return result;
  };
  const schedule = () => {
    void sync().catch(() => undefined);
  };
  const subscription = store$(store, getTorrentRouterSettings).subscribe(schedule);
  chrome.permissions.onAdded.addListener(schedule);
  chrome.permissions.onRemoved.addListener(schedule);
  const messages = onMessage([ChromeMessageType.trackerScriptsSync]).subscribe(({ sender, sendResponse }) => {
    if (!sender.url?.startsWith(`chrome-extension://${chrome.runtime.id}/`)) {
      sendResponse({ success: false, error: { name: 'Error', message: 'Tracker access checks must run from extension settings.' } });
      return;
    }
    void sync().then(payload => sendResponse({ success: true, payload })).catch((error: unknown) => {
      sendResponse({ success: false, error: { name: 'Error', message: error instanceof Error ? error.message : String(error) } });
    });
  });
  return () => {
    subscription.unsubscribe();
    messages.unsubscribe();
    chrome.permissions.onAdded.removeListener(schedule);
    chrome.permissions.onRemoved.removeListener(schedule);
  };
}
