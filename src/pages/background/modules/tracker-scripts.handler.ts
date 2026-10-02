import type { StoreOrProxy } from '../../../models/store.model';
import type { TorrentRouterSettings } from '../../../models/torrent-router.model';

import { LoggerService } from '../../../services/logger/logger.service';
import { getTorrentRouterSettings } from '../../../store/selectors/settings.selector';
import { trackerOriginPatterns } from '../../../utils/chrome/chrome-permissions.utils';
import { store$ } from '../../../utils/rxjs.utils';
import { getManifest } from '../../../utils/webex.utils';

const trackerScriptId = 'torrent-router-trackers';

export async function syncTrackerScripts(settings: TorrentRouterSettings): Promise<void> {
  const origins = settings.enabled ? trackerOriginPatterns(settings.hosts) : [];
  const granted = await Promise.all(origins.map(async origin => await chrome.permissions.contains({ origins: [origin] }) ? origin : undefined));
  const matches = granted.filter((origin): origin is string => !!origin);
  const [existing] = await chrome.scripting.getRegisteredContentScripts({ ids: [trackerScriptId] });
  if (!matches.length) {
    if (existing) await chrome.scripting.unregisterContentScripts({ ids: [trackerScriptId] });
    return;
  }

  const js = getManifest().content_scripts?.[0]?.js;
  if (!js?.length) return;
  const registration: chrome.scripting.RegisteredContentScript = {
    id: trackerScriptId,
    js,
    matches,
    runAt: 'document_idle',
    persistAcrossSessions: true,
  };
  if (existing) await chrome.scripting.updateContentScripts([registration]);
  else await chrome.scripting.registerContentScripts([registration]);

  const tabs = await chrome.tabs.query({ url: matches });
  await Promise.all(tabs.map(async (tab) => {
    if (tab.id === undefined) return;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: js });
    } catch (error) {
      LoggerService.debug('Tracker tab closed or site access changed before injection.', { tabId: tab.id, error });
    }
  }));
}

export function onTrackerScriptEvents(store: StoreOrProxy) {
  // Serialize updates so a permission change cannot race an earlier registration.
  let pending = Promise.resolve();
  const sync = () => {
    pending = pending.then(async () => syncTrackerScripts(getTorrentRouterSettings(store.getState())))
      .catch(error => LoggerService.warn('Unable to enable tracker interception.', error));
  };
  const subscription = store$(store, getTorrentRouterSettings).subscribe(sync);
  chrome.permissions.onAdded.addListener(sync);
  chrome.permissions.onRemoved.addListener(sync);
  return () => {
    subscription.unsubscribe();
    chrome.permissions.onAdded.removeListener(sync);
    chrome.permissions.onRemoved.removeListener(sync);
  };
}
