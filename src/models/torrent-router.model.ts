export enum TorrentRouterPresetId {
  tv = 'tv',
  comics = 'comics',
  ebooks = 'ebooks',
  manual = 'manual',
}

export interface DestinationPreset {
  id: TorrentRouterPresetId;
  label: string;
  path: string;
  hints: string[];
}

export interface TorrentRouterSettings {
  enabled: boolean;
  hosts: string[];
  presets: DestinationPreset[];
  destinationHistory: Record<string, string[]>;
}

export type TorrentRequestMethod = 'GET' | 'POST';

export interface TorrentRequestBody {
  type: 'form';
  enctype?: string;
  entries: [string, string][];
}

export interface TorrentCaptureRequest {
  url: string;
  method: TorrentRequestMethod;
  body?: TorrentRequestBody;
  filename?: string;
  title?: string;
  category?: string;
  tracker: string;
  source: string;
}

export interface TorrentPayload {
  file: File;
  filename: string;
  contentType: string;
  size: number;
}

export interface TorrentUploadPayload {
  data: string;
  size: number;
  filename: string;
  contentType: string;
  destination: string;
  source?: string;
  tracker?: string;
}

export interface TorrentValidationInput {
  bytes: ArrayBuffer;
  contentType?: string | null;
  filename?: string;
}

export interface TorrentValidationResult {
  valid: boolean;
  reason?: string;
}

export const defaultDestinationPresets: DestinationPreset[] = [
  {
    id: TorrentRouterPresetId.tv,
    label: 'TV / Plex',
    path: '',
    hints: ['tv', 'television', 'season', 'episode', 's01e'],
  },
  {
    id: TorrentRouterPresetId.comics,
    label: 'Comics / Comga',
    path: '',
    hints: ['comic', 'comics', 'manga', 'graphic novel', 'cbr', 'cbz'],
  },
  {
    id: TorrentRouterPresetId.ebooks,
    label: 'Ebooks / Ebook ingest',
    path: '',
    hints: ['ebook', 'e-book', 'book', 'epub', 'mobi', 'azw3', 'pdf'],
  },
  {
    id: TorrentRouterPresetId.manual,
    label: 'Manual',
    path: '',
    hints: [],
  },
];

export const defaultTorrentRouterSettings: TorrentRouterSettings = {
  enabled: true,
  hosts: ['iptorrents.com', 'torrentleech.org', 'myanonamouse.net'],
  presets: defaultDestinationPresets,
  destinationHistory: {},
};
