import type { SnackNotification } from '../../../models/notification.model';
import type { StoreOrProxy } from '../../../models/store.model';
import type { ChromeMessage, Manifest } from '../../../utils/webex.utils';

import { combineLatest, map, of, takeWhile } from 'rxjs';

import { AppLinks } from '../../../models/links.model';
import { ChromeMessageType } from '../../../models/message.model';
import { NotificationLevel } from '../../../models/notification.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { getPopup } from '../../../store/selectors/state.selector';
import { onInstalled$ } from '../../../utils/chrome/chrome-message.utils';
import { store$ } from '../../../utils/rxjs.utils';
import { getManifest } from '../../../utils/webex.utils';

interface InstalledPayload { open: boolean; previousVersion?: string; nextVersion: string }

function canInjectContentScript(tab: chrome.tabs.Tab): tab is chrome.tabs.Tab & { id: number; url: string } {
  if (tab.id === undefined || !tab.url) return false;

  try {
    const url = new URL(tab.url);
    const isWebPage = url.protocol === 'http:' || url.protocol === 'https:';
    const isChromeWebStore = url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'));
    return isWebPage && !isChromeWebStore;
  } catch {
    return false;
  }
}

async function injectScript(tab: chrome.tabs.Tab & { id: number; url: string }, files: string[]): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files,
    });
  } catch (error) {
    LoggerService.debug('Skipping content script injection for tab.', { url: tab.url, error });
  }
}

async function injectContentScriptsSafely(): Promise<void> {
  const contentScripts = getManifest().content_scripts ?? [];

  await Promise.all(
    contentScripts.map(async (script) => {
      if (!script.js?.length || !script.matches?.length) return;

      try {
        const tabs = await chrome.tabs.query({ url: script.matches });
        await Promise.all(tabs.filter(canInjectContentScript).map(async tab => injectScript(tab, script.js!)));
      } catch (error) {
        LoggerService.debug('Unable to query tabs for content script injection.', error);
      }
    }),
  );
}

function sendUpdateMessage(message: ChromeMessage<ChromeMessageType, SnackNotification>): void {
  chrome.runtime.sendMessage(message, () => {
    const error = chrome.runtime.lastError;
    if (error) LoggerService.debug('Update notification skipped because no extension view is listening.', error.message);
  });
}

export function onInstalledEvents(store: StoreOrProxy) {
  LoggerService.debug('Subscribing to install events.');

  // re-inject content scripts in open tabs
  void injectContentScriptsSafely();

  // Subscribe to installed until first popup open
  combineLatest([store$<boolean>(store, getPopup), onInstalled$, of<Manifest>(getManifest())])
    .pipe(
      // take while popup is closed and new version available
      map(([open, { previousVersion }, { version }]) => {
        const payload: InstalledPayload = { open, previousVersion, nextVersion: version };
        LoggerService.info('Service worker installed', payload);
        return payload;
      }),
      takeWhile(({ open, previousVersion, nextVersion }) => previousVersion !== nextVersion && !open, true),
      map<InstalledPayload, ChromeMessage<ChromeMessageType, SnackNotification>>(({ nextVersion }) => ({
        type: ChromeMessageType.notificationSnack,
        payload: {
          message: {
            title: `Updated to version ${nextVersion}`,
            message: `
            A new update (version ${nextVersion}) has just been installed.
    
            To now more about the changes, please click on the button below.`,
            priority: NotificationLevel.info,
            buttons: [
              {
                title: 'see release notes',
                url: AppLinks.Release,
              },
            ],
          },
          options: { persist: true },
        },
      })),
    )
    .subscribe(sendUpdateMessage);
}
