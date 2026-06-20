import * as React from 'react';

import { SettingHeader } from '../../../../models/settings.model';
import { SettingsHeader } from '../settings-header';
import { SettingsDownloadsHistory } from './settings-downloads-history';
import { SettingsDownloadsIntercept } from './settings-downloads-intercept';
import { SettingsDownloadsLocal } from './settings-downloads-local';
import { SettingsTorrentRouter } from './settings-torrent-router';

export function SettingsDownloads() {
  return (
    <React.Fragment>
      <SettingsHeader label={SettingHeader.downloads} />
      <SettingsDownloadsLocal />
      <SettingsTorrentRouter />
      <SettingsDownloadsIntercept />
      <SettingsDownloadsHistory />
    </React.Fragment>
  );
}

export default SettingsDownloads;
