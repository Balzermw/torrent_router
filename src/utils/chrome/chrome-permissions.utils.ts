import { LoggerService } from '../../services/logger/logger.service';

function getPermissions(): typeof chrome.permissions | undefined {
  try {
    return typeof chrome === 'undefined' ? undefined : chrome.permissions;
  } catch {
    return undefined;
  }
}

export function originPatternFromUrl(url: string): string | undefined {
  try {
    return `${new URL(url).origin}/*`;
  } catch {
    return undefined;
  }
}

export async function ensureOriginPermission(url: string): Promise<boolean> {
  const origin = originPatternFromUrl(url);
  if (!origin) return false;

  const permissions = getPermissions();
  if (!permissions?.contains || !permissions.request) return true;

  try {
    if (await permissions.contains({ origins: [origin] })) return true;
    return await permissions.request({ origins: [origin] });
  } catch (error) {
    LoggerService.warn('Unable to request host permission.', { origin, error });
    return false;
  }
}
