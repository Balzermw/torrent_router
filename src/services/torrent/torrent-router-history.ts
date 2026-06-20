import type { TorrentRouterPresetId, TorrentRouterSettings } from '../../models/torrent-router.model';

const maxDestinationsPerTracker = 8;
const trackerKeyUnsafeRegex = /[^a-z0-9.-]+/g;
const repeatedSeparatorRegex = /[.-]{2,}/g;
const edgeSeparatorRegex = /^-|-$/g;
const historyKeySeparator = '__preset__';

export function trackerDestinationHistoryKey(tracker?: string): string {
  return (tracker ?? '')
    .trim()
    .toLowerCase()
    .replace(trackerKeyUnsafeRegex, '-')
    .replace(repeatedSeparatorRegex, '-')
    .replace(edgeSeparatorRegex, '');
}

function trackerPresetDestinationHistoryKey(tracker?: string, presetId?: TorrentRouterPresetId): string {
  const key = trackerDestinationHistoryKey(tracker);
  return key && presetId ? `${key}${historyKeySeparator}${presetId}` : key;
}

function uniqueDestinations(destinations: string[]): string[] {
  return destinations.filter((destination, index) => destination && destinations.indexOf(destination) === index);
}

function rememberDestinationAtKey(
  history: TorrentRouterSettings['destinationHistory'],
  key: string,
  destination: string,
  limit: number,
): TorrentRouterSettings['destinationHistory'] {
  const existing = history?.[key] ?? [];
  return {
    ...(history ?? {}),
    [key]: [destination, ...existing.filter(item => item !== destination)].slice(0, limit),
  };
}

export function getTrackerDestinationSuggestions(settings: TorrentRouterSettings, tracker?: string, presetId?: TorrentRouterPresetId): string[] {
  const key = trackerDestinationHistoryKey(tracker);
  if (!key) return [];

  const presetKey = trackerPresetDestinationHistoryKey(tracker, presetId);
  if (!presetId || presetKey === key) return settings.destinationHistory?.[key] ?? [];

  return uniqueDestinations([...(settings.destinationHistory?.[presetKey] ?? []), ...(settings.destinationHistory?.[key] ?? [])]);
}

export function rememberTrackerDestination(
  settings: TorrentRouterSettings,
  tracker: string | undefined,
  destination: string,
  presetId?: TorrentRouterPresetId,
  limit = maxDestinationsPerTracker,
): TorrentRouterSettings {
  const key = trackerDestinationHistoryKey(tracker);
  const cleanDestination = destination.trim();
  if (!key || !cleanDestination) return settings;

  const presetKey = trackerPresetDestinationHistoryKey(tracker, presetId);
  const history = rememberDestinationAtKey(settings.destinationHistory, key, cleanDestination, limit);
  const nextHistory = presetId && presetKey !== key ? rememberDestinationAtKey(history, presetKey, cleanDestination, limit) : history;

  return {
    ...settings,
    destinationHistory: nextHistory,
  };
}
