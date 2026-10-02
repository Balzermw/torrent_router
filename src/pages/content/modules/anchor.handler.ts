import { fromEventPattern } from 'rxjs';

import { LoggerService } from '../../../services/logger/logger.service';
import { redactTrackerUrl } from '../../../services/torrent/torrent-router.service';
import { buildTorrentCaptureRequest } from '../../../services/torrent/tracker-adapters';
import { storeProxy } from '../../../store/store-proxy';
import { anchor$, lastClick$ } from '../service/anchor.service';
import { torrentRouterDialog$ } from '../service/torrent-router-dialog.service';

/**
 * List of supported protocols
 */
const DOWNLOAD_ONLY_PROTOCOLS = ['magnet', 'thunder', 'flashget', 'qqdl', 'ed2k'];

/**
 * Check if the url starts with the given protocol(s)
 * @param url the url to test
 * @param protocols the protocol(s)
 */
function startsWithAnyProtocol(url: string, protocols: string | string[]) {
  if (typeof protocols === 'string') {
    return url.startsWith(`${protocols}:`);
  }
  return protocols.some(protocol => url.startsWith(`${protocol}:`));
}

/**
 * Finds the HTMLAnchorElement in the e element's parent tree with the given tree depth
 * @param e the element
 * @param depth the tree depth
 */
function recursivelyFindAnchorAncestor(e: HTMLElement | null, depth = 10): HTMLAnchorElement | undefined {
  if (e == null) {
    return undefined;
  }
  if (e instanceof HTMLAnchorElement) {
    return e;
  }
  if (depth === 0) {
    return undefined;
  }
  return recursivelyFindAnchorAncestor(e.parentElement, depth - 1);
}

/**
 * Inspired by https://github.com/seansfkelley/nas-download-manager/blob/master/src/content/index.ts
 * Detect if the click event is on a supported downloadable link
 * @param event mouse event
 */
function listener(event: MouseEvent | SubmitEvent) {
  if (event instanceof MouseEvent) {
    const anchor = recursivelyFindAnchorAncestor(event.target as HTMLElement);
    lastClick$.next({ event, anchor });
  }
  if (event instanceof MouseEvent && (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;

  const torrentCapture = buildTorrentCaptureRequest(event, storeProxy.getState()?.settings?.torrentRouter);
  if (torrentCapture) {
    event.preventDefault();
    event.stopImmediatePropagation();
    LoggerService.info('Torrent Router intercepted download.', {
      tracker: torrentCapture.tracker,
      method: torrentCapture.method,
      url: redactTrackerUrl(torrentCapture.url),
    });
    torrentRouterDialog$.next({ open: true, request: torrentCapture });
    return;
  }

  if (!(event instanceof MouseEvent)) return;
  // The legacy link switch controls magnets; Torrent Router has its own switch.
  if (storeProxy.getState()?.settings?.content?.intercept === false) return;
  const anchor = recursivelyFindAnchorAncestor(event.target as HTMLElement);
  if (!anchor?.href) return;
  if (!startsWithAnyProtocol(anchor.href, DOWNLOAD_ONLY_PROTOCOLS)) return;
  anchor$.next({
    event,
    anchor,
    form: {
      uri: anchor.href,
      source: document.URL,
    },
  });
  event.preventDefault();
}

function addAnchorClickListener() {
  document.addEventListener('click', listener, true);
  document.addEventListener('submit', listener, true);
  document.addEventListener('contextmenu', listener, true);
}
function removeAnchorClickListener() {
  document.removeEventListener('click', listener, true);
  document.removeEventListener('submit', listener, true);
  document.removeEventListener('contextmenu', listener, true);
}

export const clickListener$ = fromEventPattern<MouseEvent | SubmitEvent>(addAnchorClickListener, removeAnchorClickListener);
