import type { TorrentCaptureRequest } from '../../../models/torrent-router.model';

import { Subject } from 'rxjs';

export interface TorrentRouterDialogPayload {
  open: boolean;
  request?: TorrentCaptureRequest;
}

export const torrentRouterDialog$ = new Subject<TorrentRouterDialogPayload>();
