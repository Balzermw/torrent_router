import type { PortalProps } from '@mui/material/Portal';
import type { FC } from 'react';

import type { DestinationPreset, TorrentCaptureRequest } from '../../../models/torrent-router.model';

import { zIndexMax } from '@dvcol/web-extension-utils';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Subject, takeUntil } from 'rxjs';

import { Explorer } from '../../../components/common/explorer/folder/explorer';
import { TorrentRouterPresetId } from '../../../models/torrent-router.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { QueryService } from '../../../services/query/query.service';
import { getTrackerDestinationSuggestions, rememberTrackerDestination } from '../../../services/torrent/torrent-router-history';
import { redactTrackerUrl, submitTorrentCapture } from '../../../services/torrent/torrent-router.service';
import { guessDestinationPreset } from '../../../services/torrent/tracker-adapters';
import { syncTorrentRouter } from '../../../store/actions/settings.action';
import { getTorrentRouterSettings } from '../../../store/selectors/settings.selector';
import { i18n } from '../../../utils/webex.utils';
import { torrentRouterDialog$ } from '../service/torrent-router-dialog.service';

const requestLabelMaxLength = 220;
const whitespaceRegex = /\s+/g;
const trailingPartialWordRegex = /\s+\S*$/;

function presetPath(preset?: DestinationPreset): string {
  return preset?.id === TorrentRouterPresetId.manual ? '' : preset?.path ?? '';
}

function summarizeRequestLabel(request?: TorrentCaptureRequest): string {
  const label = (request?.title || request?.filename || request?.url || '').replace(whitespaceRegex, ' ').trim();
  if (label.length <= requestLabelMaxLength) return label;

  const clipped = label.slice(0, requestLabelMaxLength).replace(trailingPartialWordRegex, '').trim();
  return `${clipped || label.slice(0, requestLabelMaxLength).trim()}...`;
}

export const TorrentRouterDialog: FC<{ container?: PortalProps['container'] }> = ({ container }) => {
  const dispatch = useDispatch();
  const settings = useSelector(getTorrentRouterSettings);
  const [request, setRequest] = useState<TorrentCaptureRequest>();
  const [presetId, setPresetId] = useState<TorrentRouterPresetId>(TorrentRouterPresetId.manual);
  const [destination, setDestination] = useState('');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSelection, setBrowserSelection] = useState('');
  const [loading, setLoading] = useState(false);

  const open = !!request;
  const presets = useMemo(() => settings.presets, [settings.presets]);
  const selectedPreset = presets.find(preset => preset.id === presetId);
  const trackerSuggestions = useMemo(
    () => (request ? getTrackerDestinationSuggestions(settings, request.tracker, presetId) : []),
    [presetId, request, settings],
  );
  const selectedTrackerSuggestion = trackerSuggestions.includes(destination) ? destination : '';
  const requestLabel = useMemo(() => summarizeRequestLabel(request), [request]);

  useEffect(() => {
    const abort$ = new Subject<void>();
    torrentRouterDialog$.pipe(takeUntil(abort$)).subscribe(({ request: nextRequest }) => {
      if (!nextRequest) {
        setRequest(undefined);
        return;
      }

      const guessed = guessDestinationPreset(nextRequest, presets);
      const suggestions = getTrackerDestinationSuggestions(settings, nextRequest.tracker, guessed.id);
      setRequest(nextRequest);
      setPresetId(guessed.id);
      setDestination(presetPath(guessed) || suggestions[0] || '');
    });

    return () => {
      abort$.next();
      abort$.complete();
    };
  }, [presets, settings]);

  const onPresetChange = (next: TorrentRouterPresetId) => {
    const preset = presets.find(item => item.id === next);
    setPresetId(next);
    setDestination(presetPath(preset));
  };

  const openBrowser = () => {
    setBrowserSelection(destination);
    setBrowserOpen(true);
  };

  const closeBrowser = () => {
    setBrowserOpen(false);
  };

  const selectBrowserDestination = () => {
    if (browserSelection.trim()) setDestination(browserSelection.trim());
    closeBrowser();
  };

  const onClose = () => {
    if (loading) return;
    setRequest(undefined);
  };

  const onSubmit = async () => {
    if (!request) return;
    if (!QueryService.isLoggedIn) {
      NotificationService.loginRequired();
      return;
    }
    if (!destination.trim()) {
      NotificationService.error({
        title: i18n('error', 'common'),
        message: 'Choose a Synology destination folder.',
      });
      return;
    }

    setLoading(true);
    try {
      const selectedDestination = destination.trim();
      await submitTorrentCapture(request, selectedDestination);
      dispatch(syncTorrentRouter(rememberTrackerDestination(settings, request.tracker, selectedDestination, presetId)));
      NotificationService.info({
        title: 'Torrent sent to Synology',
        message: [`${requestLabel || 'Torrent'} was sent to Synology Download Station.`, `Folder: ${selectedDestination}`].join('\n'),
        contextMessage: request.tracker,
        success: true,
      });
      setRequest(undefined);
    } catch (error) {
      const err = error as Error;
      LoggerService.error('Torrent Router send failed.', {
        tracker: request.tracker,
        source: request.source,
        url: redactTrackerUrl(request.url),
        title: request.title,
        filename: request.filename,
        destination,
        error,
      });
      NotificationService.error({
        title: 'Torrent Router',
        message: err.message || err.name,
        contextMessage: request.tracker,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        container={container}
        fullWidth
        maxWidth="sm"
        onClose={onClose}
        sx={{ zIndex: `${zIndexMax} !important`, fontSize: '16px' }}
        slotProps={{ paper: { sx: { borderRadius: '1em' } } }}
      >
        <DialogTitle>Torrent Router</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <Typography
                variant="subtitle2"
                title={requestLabel}
                sx={{
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 4,
                  overflow: 'hidden',
                }}
              >
                {requestLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {request?.tracker}
              </Typography>
            </Box>
            <TextField
              select
              label="Preset"
              value={presetId}
              fullWidth
              disabled={loading}
              onChange={event => onPresetChange(event.target.value as TorrentRouterPresetId)}
              SelectProps={{ native: true }}
            >
              {presets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </TextField>
            <TextField
              label="Destination"
              value={destination}
              fullWidth
              disabled={loading}
              onChange={event => setDestination(event.target.value)}
              slotProps={{
                htmlInput: { style: { fontSize: '0.875em' } },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Browse Synology folders">
                        <span>
                          <IconButton aria-label="Browse Synology folders" edge="end" disabled={loading} onClick={openBrowser}>
                            <FolderOpenIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {trackerSuggestions.length > 0 && (
              <TextField
                select
                label="Recent for tracker"
                value={selectedTrackerSuggestion}
                fullWidth
                disabled={loading}
                onChange={event => setDestination(event.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">Choose recent path</option>
                {trackerSuggestions.map(path => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </TextField>
            )}
            {selectedPreset?.id !== TorrentRouterPresetId.manual && !selectedPreset?.path && (
              <Typography variant="caption" color="warning.main">
                Set this preset path in Downloads settings or browse to a destination now.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="secondary" disabled={loading} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outlined" color="primary" disabled={loading || !destination.trim()} onClick={onSubmit}>
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={browserOpen}
        container={container}
        fullWidth
        maxWidth="sm"
        onClose={closeBrowser}
        sx={{ zIndex: `${zIndexMax} !important`, fontSize: '16px' }}
        slotProps={{ paper: { sx: { borderRadius: '1em' } } }}
      >
        <DialogTitle>Choose Destination</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ height: 'min(60vh, 30rem)', minHeight: '18rem' }}>
            <Explorer flatten editable startPath={destination} onChange={({ path }) => setBrowserSelection(path ?? '')} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="secondary" onClick={closeBrowser}>
            Cancel
          </Button>
          <Button variant="outlined" color="primary" disabled={!browserSelection.trim()} onClick={selectBrowserDestination}>
            Use Folder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
