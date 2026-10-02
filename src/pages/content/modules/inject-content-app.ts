import { AppInstance } from '../../../models/app-instance.model';
import { ServiceInstance } from '../../../models/settings.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { QueryService } from '../../../services/query/query.service';
import { storeProxy } from '../../../store/store-proxy';
import { portConnect } from '../../../utils/chrome/chrome-message.utils';
import { getManifest } from '../../../utils/webex.utils';
import { ContentAppWc } from '../components/content-app-wc';
import { clickListener$ } from './anchor.handler';
import { listenToScrapeDownloadEvents, listenToScrapEvents } from './scraper.handler';

const { name, version } = getManifest();
const injection = new Date().toISOString();

LoggerService.debug('Content script injected.', { name, version, injection });

const rootContainerId = `${AppInstance.content}-root`;
const onDestroyEvent = 'onDestroy';
const destroyedEvent = 'destroyed';

/**
 * Emits 'onDestroy' event on component and await 'destroyed 'callback before resolving
 * @param el the element on which to call 'onDestroy'
 */
async function waitDestroyed(el: Element): Promise<void> {
  const promise = new Promise<void>((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    const finish = () => {
      clearTimeout(timeout);
      el.removeEventListener(destroyedEvent, finish);
      resolve();
    };
    // Reloaded extensions can leave a DOM root whose old context cannot respond.
    timeout = setTimeout(finish, 500);
    el.addEventListener(destroyedEvent, finish, { once: true });
    el.dispatchEvent(new CustomEvent(onDestroyEvent));
  });
  el.parentElement?.removeChild(el);
  return promise;
}

/**
 * Remove old instances of the component and trigger destroy lifecycle
 */
export async function removeOldInstances(): Promise<void | void[]> {
  const previous = document.body?.querySelectorAll(`#${rootContainerId}`);
  if (previous?.length) {
    LoggerService.debug(`Found exiting instance of '${rootContainerId}'`, previous);
    return Promise.all(Array.from(previous, async el => waitDestroyed(el)));
  }
  return Promise.resolve();
}

/**
 * Subscribe to magnet link clicks and scrapping events and unsubscribe on destroy
 * @param root the root element to watch for destroy cycle
 */
function listenUntilDestroy(root: HTMLElement) {
  // Attach click listener
  const clicks = clickListener$.subscribe();
  const scraps = listenToScrapEvents().subscribe();
  const scrapeDownloads = listenToScrapeDownloadEvents().subscribe();

  // remove it when destroying
  root.addEventListener(onDestroyEvent, () => {
    LoggerService.debug(`Unsubscribing to events from '${rootContainerId}'.`, { version, injection });
    clicks.unsubscribe();
    scraps.unsubscribe();
    scrapeDownloads.unsubscribe();
    root.dispatchEvent(new CustomEvent(destroyedEvent));
  });
}

/**
 * TODO: Remove if/when persistent MV3 service worker are introduced
 *
 * Refresh connection port to service worker to keep it alive
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=1152255
 * @see https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
 */
function connect(root: HTMLElement) {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let port: chrome.runtime.Port | undefined;
  const reconnect = () => {
    if (disposed) return;
    try {
      if (!chrome.runtime?.id) return;
      port = portConnect({ name: AppInstance.content });
      port.onDisconnect.addListener(() => {
        const error = chrome.runtime?.lastError;
        if (error) LoggerService.debug('Content connection disconnected.', error.message);
        if (!disposed) timer = setTimeout(reconnect, 1000);
      });
    } catch {
      // The page will receive a fresh content script after an extension reload.
    }
  };
  root.addEventListener(onDestroyEvent, () => {
    disposed = true;
    clearTimeout(timer);
    try {
      port?.disconnect();
    } catch {
      // An invalidated extension context has already disconnected the port.
    }
  }, { once: true });
  reconnect();
}

/**
 * Open a modal popup for custom download actions
 */
export async function injectContentApp(onDestroy?: () => void): Promise<void> {
  // if page is not a valid html document with body, skip injection
  if (!document.body) return;

  // init store
  await storeProxy.ready();

  // Pass store to services and init
  LoggerService.init({ store: storeProxy, source: ServiceInstance.Content, isProxy: true });
  QueryService.init(storeProxy, ServiceInstance.Content, true);
  NotificationService.init(storeProxy, ServiceInstance.Content, true);

  // purging old instances
  await removeOldInstances();

  // Create a root element to host app
  const root = document.createElement(AppInstance.content);
  root.id = rootContainerId;
  root.dataset.version = version;
  root.dataset.injection = injection;
  root.dataset.context = 'content-script';
  root.style.all = 'initial';
  document.body.appendChild(root);
  if (onDestroy) root.addEventListener(onDestroyEvent, onDestroy, { once: true });

  // attach listeners
  listenUntilDestroy(root);

  // Register as open
  connect(root);

  // render component
  const unmount = ContentAppWc.prototype.render(root, storeProxy);
  root.addEventListener(onDestroyEvent, unmount, { once: true });
}
