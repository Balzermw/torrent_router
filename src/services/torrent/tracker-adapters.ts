import type { DestinationPreset, TorrentCaptureRequest, TorrentRequestBody, TorrentRequestMethod, TorrentRouterSettings } from '../../models/torrent-router.model';

import {
  defaultTorrentRouterSettings,
  TorrentRouterPresetId,
} from '../../models/torrent-router.model';

interface TrackerAdapter {
  name: string;
  hosts: string[];
  downloadPatterns: RegExp[];
}

const adapters: TrackerAdapter[] = [
  {
    name: 'IPTorrents',
    hosts: ['iptorrents.com'],
    downloadPatterns: [/\/download(?:\.php|\/|\?)/i, /\.torrent(?:$|[?#])/i],
  },
  {
    name: 'TorrentLeech',
    hosts: ['torrentleech.org', 'torrentleech.cc'],
    downloadPatterns: [/\/download(?:\/|\?)/i, /\.torrent(?:$|[?#])/i],
  },
  {
    name: 'MyAnonamouse',
    hosts: ['myanonamouse.net', 'mam.*'],
    downloadPatterns: [/\/tor\/download/i, /\/download(?:\.php|\/|\?)/i, /\.torrent(?:$|[?#])/i],
  },
];

const downloadTextRegex = /\b(?:download|torrent|snatch|get torrent)\b/i;
const blockedProtocolRegex = /^(?:magnet|ed2k|thunder|flashget|qqdl):/i;
const torrentFilenameRegex = /\.torrent(?:$|[?#])/i;
const protocolPrefixRegex = /^https?:\/\//i;
const pathTailRegex = /\/.*$/;
const regexSpecialCharsRegex = /[.+?^${}()|[\]\\]/g;
const wildcardRegex = /\*/g;
const whitespaceRegex = /\s+/g;
const torrentDownloadUrlRegex = /download|torrent|tor\/download/i;
const contextContainerSelector = 'tr, li, article, section, .torrent, .torrent-row, .row, .release, .details';
const titleCandidateSelector = [
  'a[title]',
  '[data-title]',
  '[data-name]',
  '.torrent-title',
  '.torrent_name',
  '.torrentName',
  '.release-title',
  '.title',
  'h1',
  'h2',
  'h3',
].join(',');
const cssNoiseRegex = /\/\*|@keyframes|linear-gradient|radial-gradient|rgba?\(|font-family|box-shadow|text-shadow|z-index|animation:|transition:|pointer-events|user-select|\.fwc\d+/i;
const markupNoiseRegex = /<style|<\/style|<script|<\/script|<!doctype|<html/i;
const actionOnlyRegex = /^(?:download|download torrent|get torrent|torrent|snatch|freeleech|vip|temporary vip)$/i;
const leadingActionWordsRegex = /^(?:(?:download|get torrent|torrent|snatch)\s+)+/i;
const temporaryVipPrefixRegex = /^temporary\s+vip\s+torrent\s+(?:title\s*)?/i;
const titlePrefixRegex = /^title\s+/i;
const sitePrefixRegex = /^(?:myanonamouse|my anonamouse|iptorrents|torrentleech)\s*[-|:]\s*/i;
const siteSuffixRegex = /\s+\|\s*(?:myanonamouse|my anonamouse|iptorrents|torrentleech).*$/i;
const trailingPartialWordRegex = /\s+\S*$/;
const punctuationNoiseRegex = /[{};]/g;
const maxContextTextLength = 240;
const episodeCodeRegex = /(?:^|[^a-z0-9])s\d{2}e\d{2}(?:[^a-z0-9]|$)/i;
const seasonEpisodeRegex = /(?:^|[^a-z0-9])(?:season|series)\s*\d{1,2}\s*(?:episode|ep)\s*\d{1,3}(?:[^a-z0-9]|$)/i;
const sceneEpisodeRegex = /(?:^|[^a-z0-9])\d{1,2}x\d{2}(?:[^a-z0-9]|$)/i;
const seasonPackRegex = /(?:^|[^a-z0-9])(?:s\d{2}|season\s+\d{1,2})[^a-z0-9]+(?:complete|pack|1080p|720p|2160p|web[-.\s]?dl|webrip|hdtv)(?:[^a-z0-9]|$)/i;
const comicFiletypeRegex = /(?:^|[^a-z0-9])(?:cbz|cbr|cbt|cba)(?:[^a-z0-9]|$)/i;
const comicCategoryRegex = /(?:^|[^a-z0-9])(?:comic|comics|manga|manhwa|manhua|graphic\s+novel|tankobon)(?:[^a-z0-9]|$)/i;
const comicSequenceRegex = /(?:^|[^a-z0-9])(?:vol(?:ume)?\.?\s+\d+|ch(?:apter)?\.?\s+\d+|issue\s+(?:#\s*)?\d+|omnibus)(?:[^a-z0-9]|$)/i;
const ebookFiletypeRegex = /(?:^|[^a-z0-9])(?:epub|mobi|azw3|azw|pdf|djvu|fb2)(?:[^a-z0-9]|$)/i;
const ebookCategoryRegex = /(?:^|[^a-z0-9])(?:ebook|e-book|book|books|novel|kindle)(?:[^a-z0-9]|$)/i;
const tvCategoryRegex = /(?:^|[^a-z0-9])(?:tv|television|tv[-\s]?show|episode|episodes)(?:[^a-z0-9]|$)/i;
const tvReleaseRegex = /(?:^|[^a-z0-9])(?:web[-.\s]?dl|webrip|hdtv|pdtv|dsr|hdtvrip)(?:[^a-z0-9]|$)/i;

const strongMatchThreshold = 40;

function normalizeHost(host: string): string {
  return host.replace(protocolPrefixRegex, '').replace(pathTailRegex, '').toLowerCase();
}

export function hostMatchesPattern(host: string, pattern: string): boolean {
  const normalizedHost = normalizeHost(host);
  const normalizedPattern = normalizeHost(pattern.trim());
  if (!normalizedPattern) return false;
  if (normalizedPattern.includes('*')) {
    const escaped = normalizedPattern.replace(regexSpecialCharsRegex, '\\$&').replace(wildcardRegex, '.*');
    return new RegExp(`(?:^|\\.)${escaped}$`, 'i').test(normalizedHost);
  }
  return normalizedHost === normalizedPattern || normalizedHost.endsWith(`.${normalizedPattern}`);
}

function isConfiguredHost(host: string, settings?: TorrentRouterSettings): boolean {
  const hosts = settings?.hosts?.length ? settings.hosts : defaultTorrentRouterSettings.hosts;
  return hosts.some(pattern => hostMatchesPattern(host, pattern));
}

function getAdapter(host: string): TrackerAdapter | undefined {
  return adapters.find(adapter => adapter.hosts.some(pattern => hostMatchesPattern(host, pattern)));
}

function findElementAncestor<T extends HTMLElement>(element: HTMLElement | null, predicate: (el: HTMLElement) => el is T, depth = 10): T | undefined {
  if (!element || depth < 0) return undefined;
  if (predicate(element)) return element;
  return findElementAncestor(element.parentElement, predicate, depth - 1);
}

function findAnchor(element: HTMLElement | null): HTMLAnchorElement | undefined {
  return findElementAncestor(element, (el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement);
}

function findSubmitButton(element: HTMLElement | null): HTMLButtonElement | HTMLInputElement | undefined {
  return findElementAncestor(
    element,
    (el): el is HTMLButtonElement | HTMLInputElement =>
      el instanceof HTMLButtonElement || (el instanceof HTMLInputElement && ['button', 'submit', 'image'].includes(el.type)),
  );
}

function textWithoutNoisyChildren(element?: Element | null): string | undefined {
  if (!element) return undefined;

  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('script, style, noscript, template, svg').forEach(node => node.remove());
  return clone.textContent ?? undefined;
}

function trimContextText(text: string): string {
  if (text.length <= maxContextTextLength) return text;

  const clipped = text.slice(0, maxContextTextLength).replace(trailingPartialWordRegex, '').trim();
  return `${clipped || text.slice(0, maxContextTextLength).trim()}...`;
}

function cleanContextText(value?: string | null): string {
  const normalized = value?.replace(whitespaceRegex, ' ').trim() ?? '';
  if (!normalized) return '';
  if (cssNoiseRegex.test(normalized) || markupNoiseRegex.test(normalized)) return '';
  if (normalized.length > maxContextTextLength * 2 && (normalized.match(punctuationNoiseRegex)?.length ?? 0) > 8) return '';

  const cleaned = normalized
    .replace(sitePrefixRegex, '')
    .replace(siteSuffixRegex, '')
    .replace(leadingActionWordsRegex, '')
    .replace(temporaryVipPrefixRegex, '')
    .replace(titlePrefixRegex, '')
    .trim();

  if (!cleaned || actionOnlyRegex.test(cleaned)) return '';
  return trimContextText(cleaned);
}

function elementTextCandidates(element?: Element | null): Array<string | null | undefined> {
  if (!(element instanceof HTMLElement)) return [];
  return [
    element.getAttribute('download'),
    element.getAttribute('title'),
    element.getAttribute('aria-label'),
    element.getAttribute('data-title'),
    element.getAttribute('data-name'),
    textWithoutNoisyChildren(element),
  ];
}

function firstCleanContextText(candidates: Array<string | null | undefined>): string {
  return candidates.map(cleanContextText).find(Boolean) ?? '';
}

function titleElementCandidates(element?: HTMLElement, container?: Element | null): HTMLElement[] {
  const candidates = [
    element?.closest<HTMLElement>('[title], [data-title], [data-name]'),
    ...Array.from(container?.querySelectorAll<HTMLElement>(titleCandidateSelector) ?? []),
    document.querySelector<HTMLElement>('h1, h2'),
  ];

  return candidates.filter((candidate, index): candidate is HTMLElement => !!candidate && candidates.indexOf(candidate) === index);
}

function closestContextText(element?: HTMLElement): string {
  const container = element?.closest(contextContainerSelector);
  const titleCandidates = titleElementCandidates(element, container).flatMap(candidate => elementTextCandidates(candidate));

  return firstCleanContextText([
    element?.getAttribute('download'),
    element?.getAttribute('title'),
    element?.getAttribute('aria-label'),
    ...titleCandidates,
    document.title,
    element?.textContent,
    textWithoutNoisyChildren(container),
  ]);
}

function filenameFromUrl(url: string): string | undefined {
  try {
    const path = new URL(url, document.URL).pathname.split('/').filter(Boolean).pop();
    if (!path) return undefined;
    return decodeURIComponent(path.endsWith('.torrent') ? path : `${path}.torrent`);
  } catch {
    return undefined;
  }
}

function requestLooksLikeTorrent(url: string, text: string, adapter?: TrackerAdapter): boolean {
  if (blockedProtocolRegex.test(url)) return false;
  if (torrentFilenameRegex.test(url)) return true;
  if (adapter?.downloadPatterns.some(pattern => pattern.test(url))) return true;
  return downloadTextRegex.test(text) && torrentDownloadUrlRegex.test(url);
}

function formBody(form: HTMLFormElement, submitter?: HTMLButtonElement | HTMLInputElement): TorrentRequestBody {
  const data = new FormData(form);
  if (submitter?.name && !data.has(submitter.name)) data.append(submitter.name, submitter.value ?? '');
  const entries = Array.from(data.entries()).flatMap<[string, string]>(([key, value]) => (typeof value === 'string' ? [[key, value]] : []));
  return {
    type: 'form',
    enctype: form.enctype,
    entries,
  };
}

function buildRequestUrl(baseUrl: string, body?: TorrentRequestBody): string {
  if (!body?.entries?.length) return baseUrl;
  const url = new URL(baseUrl, document.URL);
  body.entries.forEach(([key, value]) => url.searchParams.append(key, value));
  return url.toString();
}

function hintMatches(text: string, hint: string): boolean {
  const normalizedHint = hint.toLowerCase().trim();
  if (!normalizedHint) return false;
  if (normalizedHint === 's01e') return episodeCodeRegex.test(text);

  const escaped = normalizedHint.replace(regexSpecialCharsRegex, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(text);
}

function presetById(presets: DestinationPreset[], id: TorrentRouterPresetId): DestinationPreset | undefined {
  return presets.find(preset => preset.id === id);
}

function scorePreset(text: string, presetId: TorrentRouterPresetId): number {
  switch (presetId) {
    case TorrentRouterPresetId.comics:
      return [
        comicFiletypeRegex.test(text) ? 90 : 0,
        comicCategoryRegex.test(text) ? 85 : 0,
        comicSequenceRegex.test(text) && comicCategoryRegex.test(text) ? 35 : 0,
        comicCategoryRegex.test(text) && ebookFiletypeRegex.test(text) ? 45 : 0,
      ].reduce((sum, score) => sum + score, 0);
    case TorrentRouterPresetId.ebooks:
      return [
        ebookFiletypeRegex.test(text) ? 75 : 0,
        ebookCategoryRegex.test(text) ? 40 : 0,
      ].reduce((sum, score) => sum + score, 0);
    case TorrentRouterPresetId.tv:
      return [
        episodeCodeRegex.test(text) ? 95 : 0,
        sceneEpisodeRegex.test(text) ? 90 : 0,
        seasonEpisodeRegex.test(text) ? 90 : 0,
        seasonPackRegex.test(text) ? 70 : 0,
        tvCategoryRegex.test(text) ? 45 : 0,
        tvReleaseRegex.test(text) && tvCategoryRegex.test(text) ? 25 : 0,
      ].reduce((sum, score) => sum + score, 0);
    case TorrentRouterPresetId.manual:
      return 0;
    default:
      return 0;
  }
}

export function guessDestinationPreset(
  request: Pick<TorrentCaptureRequest, 'title' | 'category' | 'filename'>,
  presets: DestinationPreset[],
): DestinationPreset {
  const text = [request.title, request.category, request.filename].filter(Boolean).join(' ').toLowerCase();
  const manual = presetById(presets, TorrentRouterPresetId.manual) ?? presets[0];

  const scored = [TorrentRouterPresetId.comics, TorrentRouterPresetId.ebooks, TorrentRouterPresetId.tv]
    .map(id => ({ id, score: scorePreset(text, id) }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score >= strongMatchThreshold) {
    return presetById(presets, scored[0].id) ?? manual;
  }

  const matched = presets.find(preset => preset.id !== TorrentRouterPresetId.manual && preset.hints.some(hint => hintMatches(text, hint)));
  return matched ?? manual;
}

export function buildTorrentCaptureRequest(event: MouseEvent, settings?: TorrentRouterSettings): TorrentCaptureRequest | undefined {
  if (settings?.enabled === false) return undefined;
  if (event.button !== 0) return undefined;

  const target = event.target as HTMLElement | null;
  const anchor = findAnchor(target);
  const submitter = findSubmitButton(target);
  const form = submitter?.form;

  if (form?.action) {
    const text = closestContextText(submitter);
    const body = formBody(form, submitter);
    const method: TorrentRequestMethod = form.method?.toUpperCase() === 'POST' ? 'POST' : 'GET';
    const action = new URL(form.action, document.URL).toString();
    const adapter = getAdapter(new URL(action).host);
    const configured = isConfiguredHost(new URL(action).host, settings);
    const url = method === 'GET' ? buildRequestUrl(action, body) : action;
    if (!configured && !torrentFilenameRegex.test(url)) return undefined;
    if (!requestLooksLikeTorrent(url, text, adapter)) return undefined;
    return {
      url,
      method,
      body: method === 'POST' ? body : undefined,
      filename: filenameFromUrl(url),
      title: text || document.title,
      tracker: adapter?.name ?? new URL(url).host,
      source: document.URL,
    };
  }

  if (!anchor?.href) return undefined;

  const anchorUrl = new URL(anchor.href, document.URL).toString();
  const adapter = getAdapter(new URL(anchorUrl).host);
  const configured = isConfiguredHost(new URL(anchorUrl).host, settings);
  if (!configured && !torrentFilenameRegex.test(anchorUrl)) return undefined;

  const text = closestContextText(anchor);
  if (!requestLooksLikeTorrent(anchorUrl, text, adapter)) return undefined;

  return {
    url: anchorUrl,
    method: 'GET',
    filename: anchor.download || filenameFromUrl(anchorUrl),
    title: text || anchor.href,
    tracker: adapter?.name ?? new URL(anchorUrl).host,
    source: document.URL,
  };
}
