import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultTorrentRouterSettings } from '../../../models/torrent-router.model';
import { anchor$ } from '../service/anchor.service';
import { torrentRouterDialog$ } from '../service/torrent-router-dialog.service';
import { clickListener$ } from './anchor.handler';

const state = vi.hoisted(() => ({ settings: { content: { intercept: true }, torrentRouter: { enabled: true } } }));
vi.mock('../../../store/store-proxy', () => ({ storeProxy: { getState: () => state } }));
vi.mock('../../../services/logger/logger.service', () => ({ LoggerService: { info: vi.fn(), debug: vi.fn() } }));

describe('tracker interception events', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    state.settings.content.intercept = true;
    state.settings.torrentRouter = { ...defaultTorrentRouterSettings };
  });

  it('opens one router prompt before the tracker onclick handler downloads', () => {
    document.body.innerHTML = '<a href="https://iptorrents.com/download.php?id=123"><span>Download</span></a>';
    const trackerDownload = vi.fn();
    document.querySelector('a')!.addEventListener('click', trackerDownload);
    const prompt = vi.fn();
    const dialogSub = torrentRouterDialog$.subscribe(prompt);
    const clicks = clickListener$.subscribe();
    try {
      const event = new MouseEvent('click', { button: 0, bubbles: true, cancelable: true });
      document.querySelector('span')!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(trackerDownload).not.toHaveBeenCalled();
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(prompt.mock.calls[0][0]).toMatchObject({ open: true, request: { tracker: 'IPTorrents' } });
    } finally {
      clicks.unsubscribe();
      dialogSub.unsubscribe();
    }
  });

  it('intercepts Enter submissions and removes its listeners on teardown', () => {
    document.body.innerHTML = '<form action="https://iptorrents.com/download.php" method="post"><input name="csrf" value="demo" /><button>Download</button></form>';
    const prompt = vi.fn();
    const dialogSub = torrentRouterDialog$.subscribe(prompt);
    const clicks = clickListener$.subscribe();
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: document.querySelector('button')! });
    document.querySelector('form')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    clicks.unsubscribe();
    document.querySelector('form')!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    expect(prompt).toHaveBeenCalledTimes(1);
    dialogSub.unsubscribe();
  });

  it('keeps magnet handling and respects the interception switch', () => {
    document.body.innerHTML = '<a href="magnet:?xt=urn:btih:test">Download</a>';
    const prompt = vi.fn();
    const magnetSub = anchor$.subscribe(prompt);
    const clicks = clickListener$.subscribe();
    try {
      const click = () => document.querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      click();
      expect(prompt).toHaveBeenCalledTimes(1);
      state.settings.content.intercept = false;
      click();
      expect(prompt).toHaveBeenCalledTimes(1);
    } finally {
      clicks.unsubscribe();
      magnetSub.unsubscribe();
    }
  });

  it('uses the router switch independently of legacy magnet interception', () => {
    document.body.innerHTML = '<a href="https://torrentleech.org/download/123/test.torrent"><img alt="download button" /></a>';
    state.settings.content.intercept = false;
    const prompt = vi.fn();
    const dialogSub = torrentRouterDialog$.subscribe(prompt);
    const clicks = clickListener$.subscribe();
    try {
      const click = () => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        document.querySelector('img')!.dispatchEvent(event);
        return event;
      };
      expect(click().defaultPrevented).toBe(true);
      expect(prompt).toHaveBeenCalledTimes(1);
      state.settings.torrentRouter.enabled = false;
      expect(click().defaultPrevented).toBe(false);
      expect(prompt).toHaveBeenCalledTimes(1);
    } finally {
      clicks.unsubscribe();
      dialogSub.unsubscribe();
    }
  });
});
