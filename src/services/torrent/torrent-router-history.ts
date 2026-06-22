import type { DestinationFavorite, TorrentRouterPresetId, TorrentRouterSettings } from '../../models/torrent-router.model';

const maxDestinationsPerTracker = 8;
const maxFavoriteDestinations = 30;
const trackerKeyUnsafeRegex = /[^a-z0-9.-]+/g;
const repeatedSeparatorRegex = /[.-]{2,}/g;
const edgeSeparatorRegex = /^-|-$/g;
const historyKeySeparator = '__preset__';
const favoriteIdUnsafeRegex = /[^a-z0-9]+/g;
const pathSeparatorRegex = /[/\\]+/;

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

function favoriteId(path: string): string {
  const id = path
    .trim()
    .toLowerCase()
    .replace(favoriteIdUnsafeRegex, '-')
    .replace(repeatedSeparatorRegex, '-')
    .replace(edgeSeparatorRegex, '');

  return `favorite-${id || 'destination'}`;
}

function fallbackFavoriteLabel(path: string): string {
  return path.split(pathSeparatorRegex).filter(Boolean).pop() || path || 'Favorite destination';
}

function uniqueFavorites(favorites: DestinationFavorite[]): DestinationFavorite[] {
  const paths = new Set<string>();
  return favorites.filter((favorite) => {
    const key = favorite.path.trim().toLowerCase();
    if (!key || paths.has(key)) return false;
    paths.add(key);
    return true;
  });
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

export function getFavoriteDestinationSuggestions(settings: TorrentRouterSettings, presetId?: TorrentRouterPresetId): DestinationFavorite[] {
  const favorites = settings.favorites ?? [];
  if (!presetId) return favorites;

  return [...favorites].sort((a, b) => {
    const aScore = a.presetId === presetId ? 0 : 1;
    const bScore = b.presetId === presetId ? 0 : 1;
    return aScore - bScore;
  });
}

export function addDestinationFavorite(
  settings: TorrentRouterSettings,
  favorite: Pick<DestinationFavorite, 'path'> & Partial<Omit<DestinationFavorite, 'path'>>,
  limit = maxFavoriteDestinations,
): TorrentRouterSettings {
  const path = favorite.path.trim();
  if (!path) return settings;

  const existing = settings.favorites?.find(item => item.path.trim().toLowerCase() === path.toLowerCase());
  const nextFavorite: DestinationFavorite = {
    id: existing?.id ?? favorite.id ?? favoriteId(path),
    label: favorite.label?.trim() || existing?.label || fallbackFavoriteLabel(path),
    path,
    presetId: favorite.presetId ?? existing?.presetId,
    tracker: favorite.tracker ?? existing?.tracker,
  };

  return {
    ...settings,
    favorites: uniqueFavorites([nextFavorite, ...(settings.favorites ?? []).filter(item => item.id !== nextFavorite.id)]).slice(0, limit),
  };
}

export function removeDestinationFavorite(settings: TorrentRouterSettings, id: DestinationFavorite['id']): TorrentRouterSettings {
  return {
    ...settings,
    favorites: (settings.favorites ?? []).filter(favorite => favorite.id !== id),
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
