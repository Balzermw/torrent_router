import fs from 'fs-extra';

import pkg from '../package.json';
import { contentPort, getDirName, isDev, outDir, port, resolveParent } from './utils';

const Endpoints = {
  Dev: 'http://localhost' as const,
} as const;

const defaultTrackerOrigins = [
  '*://iptorrents.com/*',
  '*://*.iptorrents.com/*',
  '*://torrentleech.org/*',
  '*://*.torrentleech.org/*',
  '*://torrentleech.cc/*',
  '*://*.torrentleech.cc/*',
  '*://myanonamouse.net/*',
  '*://*.myanonamouse.net/*',
];

function getExtensionPages(_dev: boolean, _port: number) {
  if (_dev && _port) return `script-src 'self' ${Endpoints.Dev}:${_port}; object-src 'self' ${Endpoints.Dev}:${_port}`;
  return "script-src 'self'; object-src 'self'";
}

function getHostPermissions(_dev: boolean, _port: number) {
  const permissions: string[] = _dev ? ['http://*/*', 'https://*/*'] : [...defaultTrackerOrigins];
  if (_dev) permissions.push(`${Endpoints.Dev}:${_port}/*`, `${Endpoints.Dev}:${contentPort}/*`);
  return permissions;
}

function getContentScriptMatches(_dev: boolean) {
  return _dev ? ['http://*/*', 'https://*/*'] : defaultTrackerOrigins;
}

function getHtmlPath(page: string, _dev: boolean) {
  return _dev ? `pages/${page}/index.html` : `${page}.html`;
}

export const manifest = {
  manifest_version: 3,
  name: 'Synology Torrent Router',
  version: pkg.version,
  description: pkg.description,
  default_locale: 'en',
  icons: {
    16: 'assets/icons/icon-16.png',
    32: 'assets/icons/icon-32.png',
    64: 'assets/icons/icon-64.png',
    128: 'assets/icons/icon-128.png',
    256: 'assets/icons/icon-256.png',
  },
  options_page: getHtmlPath('options', isDev),
  background: {
    service_worker: 'scripts/background.js',
    type: 'module' as const,
  },
  action: {
    default_title: 'Synology Torrent Router',
    default_popup: getHtmlPath('popup', isDev),
    default_icon: {
      16: 'assets/icons/icon-16.png',
      32: 'assets/icons/icon-32.png',
      64: 'assets/icons/icon-64.png',
      128: 'assets/icons/icon-128.png',
      256: 'assets/icons/icon-256.png',
    },
  },
  side_panel: {
    default_path: getHtmlPath('panel', isDev),
  },
  content_scripts: [
    {
      matches: getContentScriptMatches(isDev),
      js: ['scripts/contentScript.js'],
    },
  ],
  permissions: ['scripting', 'contextMenus', 'notifications', 'storage', 'tabs', 'downloads', 'sidePanel'],
  host_permissions: getHostPermissions(isDev, port),
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  web_accessible_resources: [
    {
      resources: isDev ? ['*.html', '*preamble.js'] : ['*.html'],
      matches: isDev ? ['<all_urls>'] : defaultTrackerOrigins,
    },
  ],
  content_security_policy: {
    extension_pages: getExtensionPages(isDev, port),
  },
};

export async function writeManifest() {
  fs.ensureDirSync(resolveParent(outDir));
  fs.writeJSONSync(resolveParent(`${outDir}/manifest.json`), manifest, {
    spaces: 2,
  });
  console.info(`Writing manifest.json to '${getDirName()}/${outDir}/manifest.json'`);
}
