import type { TorrentRouterSettings } from '../../models/torrent-router.model';

import { describe, expect, it } from 'vitest';

import { defaultTorrentRouterSettings, TorrentRouterPresetId } from '../../models/torrent-router.model';
import {
  addDestinationFavorite,
  getFavoriteDestinationSuggestions,
  getTrackerDestinationSuggestions,
  rememberTrackerDestination,
  removeDestinationFavorite,
  trackerDestinationHistoryKey,
} from './torrent-router-history';

function settingsWithHistory(destinationHistory: TorrentRouterSettings['destinationHistory'] = {}): TorrentRouterSettings {
  return {
    ...defaultTorrentRouterSettings,
    destinationHistory,
  };
}

describe('torrent-router-history', () => {
  it('normalizes tracker names into stable storage keys', () => {
    expect(trackerDestinationHistoryKey(' IPTorrents ')).toBe('iptorrents');
    expect(trackerDestinationHistoryKey('www.TorrentLeech.org')).toBe('www.torrentleech.org');
    expect(trackerDestinationHistoryKey('My Anonamouse')).toBe('my-anonamouse');
  });

  it('remembers destinations newest first and dedupes existing paths', () => {
    let settings = settingsWithHistory();

    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/video');
    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/comics');
    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/video');

    expect(getTrackerDestinationSuggestions(settings, 'iptorrents')).toEqual(['/volume1/video', '/volume1/comics']);
  });

  it('keeps destination suggestions scoped to the tracker', () => {
    let settings = settingsWithHistory();

    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/tv');
    settings = rememberTrackerDestination(settings, 'TorrentLeech', '/volume1/downloads');

    expect(getTrackerDestinationSuggestions(settings, 'IPTorrents')).toEqual(['/volume1/tv']);
    expect(getTrackerDestinationSuggestions(settings, 'TorrentLeech')).toEqual(['/volume1/downloads']);
  });

  it('caps saved destinations per tracker', () => {
    let settings = settingsWithHistory();

    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/one', undefined, 3);
    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/two', undefined, 3);
    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/three', undefined, 3);
    settings = rememberTrackerDestination(settings, 'IPTorrents', '/volume1/four', undefined, 3);

    expect(getTrackerDestinationSuggestions(settings, 'IPTorrents')).toEqual(['/volume1/four', '/volume1/three', '/volume1/two']);
  });

  it('prioritizes tracker and preset-specific destinations before generic tracker suggestions', () => {
    let settings = settingsWithHistory();

    settings = rememberTrackerDestination(settings, 'MyAnonamouse', '/volume1/books', TorrentRouterPresetId.ebooks);
    settings = rememberTrackerDestination(settings, 'MyAnonamouse', '/volume1/comics', TorrentRouterPresetId.comics);

    expect(getTrackerDestinationSuggestions(settings, 'MyAnonamouse', TorrentRouterPresetId.comics)).toEqual(['/volume1/comics', '/volume1/books']);
    expect(getTrackerDestinationSuggestions(settings, 'MyAnonamouse', TorrentRouterPresetId.ebooks)).toEqual(['/volume1/books', '/volume1/comics']);
  });

  it('dedupes preset-specific and generic tracker suggestions', () => {
    let settings = settingsWithHistory();

    settings = rememberTrackerDestination(settings, 'MyAnonamouse', '/volume1/comics');
    settings = rememberTrackerDestination(settings, 'MyAnonamouse', '/volume1/comics', TorrentRouterPresetId.comics);

    expect(getTrackerDestinationSuggestions(settings, 'MyAnonamouse', TorrentRouterPresetId.comics)).toEqual(['/volume1/comics']);
  });

  it('ignores empty tracker names and destinations', () => {
    const settings = settingsWithHistory();

    expect(rememberTrackerDestination(settings, '', '/volume1/tv')).toBe(settings);
    expect(rememberTrackerDestination(settings, 'IPTorrents', '   ')).toBe(settings);
    expect(getTrackerDestinationSuggestions(settings, '')).toEqual([]);
  });

  it('saves favorite destinations newest first and dedupes by path', () => {
    let settings = settingsWithHistory();

    settings = addDestinationFavorite(settings, { label: 'TV / Plex', path: '/volume1/plex/tv', presetId: TorrentRouterPresetId.tv });
    settings = addDestinationFavorite(settings, { label: 'Comics', path: '/volume1/comics', presetId: TorrentRouterPresetId.comics });
    settings = addDestinationFavorite(settings, { label: 'Plex TV', path: '/volume1/plex/tv', presetId: TorrentRouterPresetId.tv });

    expect(settings.favorites).toHaveLength(2);
    expect(settings.favorites[0]).toMatchObject({ label: 'Plex TV', path: '/volume1/plex/tv', presetId: TorrentRouterPresetId.tv });
  });

  it('prioritizes favorites for the selected preset', () => {
    let settings = settingsWithHistory();

    settings = addDestinationFavorite(settings, { label: 'Comics', path: '/volume1/comics', presetId: TorrentRouterPresetId.comics });
    settings = addDestinationFavorite(settings, { label: 'TV', path: '/volume1/tv', presetId: TorrentRouterPresetId.tv });

    expect(getFavoriteDestinationSuggestions(settings, TorrentRouterPresetId.comics).map(favorite => favorite.path)).toEqual(['/volume1/comics', '/volume1/tv']);
  });

  it('removes favorite destinations by id', () => {
    let settings = addDestinationFavorite(settingsWithHistory(), { label: 'TV', path: '/volume1/tv', presetId: TorrentRouterPresetId.tv });
    const [favorite] = settings.favorites;

    settings = removeDestinationFavorite(settings, favorite.id);

    expect(settings.favorites).toEqual([]);
  });
});
