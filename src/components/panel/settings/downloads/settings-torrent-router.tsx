import type { DestinationPreset, TorrentRouterSettings } from '../../../../models/torrent-router.model';
import type { StoreState } from '../../../../store/store';

import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { defaultTorrentRouterSettings, TorrentRouterPresetId } from '../../../../models/torrent-router.model';
import { removeDestinationFavorite } from '../../../../services/torrent/torrent-router-history';
import { syncTorrentRouter } from '../../../../store/actions/settings.action';
import { getTorrentRouterSettings } from '../../../../store/selectors/settings.selector';
import { ButtonWithConfirm } from '../../../common/button/button-with-confirm';
import { Explorer } from '../../../common/explorer/folder/explorer';

const hostsDelimiterRegex = /[\n,]/;

function hostsToText(hosts: string[]): string {
  return hosts.join('\n');
}

function textToHosts(value: string): string[] {
  return value
    .split(hostsDelimiterRegex)
    .map(host => host.trim())
    .filter(Boolean);
}

function normalizeSettings(settings: TorrentRouterSettings): TorrentRouterSettings {
  return {
    ...defaultTorrentRouterSettings,
    ...settings,
    hosts: settings.hosts?.length ? settings.hosts : defaultTorrentRouterSettings.hosts,
    destinationHistory: settings.destinationHistory ?? defaultTorrentRouterSettings.destinationHistory,
    favorites: settings.favorites ?? defaultTorrentRouterSettings.favorites,
    presets: defaultTorrentRouterSettings.presets.map((preset) => {
      const existing = settings.presets?.find(item => item.id === preset.id);
      return { ...preset, ...existing };
    }),
  };
}

export function SettingsTorrentRouter() {
  const dispatch = useDispatch();
  const state = useSelector<StoreState, TorrentRouterSettings>(getTorrentRouterSettings);
  const [form, setForm] = useState<TorrentRouterSettings>(() => normalizeSettings(state));
  const [browsePreset, setBrowsePreset] = useState<DestinationPreset>();
  const [browsePath, setBrowsePath] = useState('');

  const isDirty = JSON.stringify(normalizeSettings(state)) !== JSON.stringify(form);

  const updatePresetPath = (preset: DestinationPreset, path: string) => {
    setForm(current => ({
      ...current,
      presets: current.presets.map(item => (item.id === preset.id ? { ...item, path } : item)),
    }));
  };

  const save = () => {
    const next = normalizeSettings(form);
    dispatch(syncTorrentRouter(next));
    setForm(next);
  };

  const restore = () => {
    dispatch(syncTorrentRouter(defaultTorrentRouterSettings));
    setForm(defaultTorrentRouterSettings);
  };

  const openPresetBrowser = (preset: DestinationPreset) => {
    if (preset.id === TorrentRouterPresetId.manual) return;
    setBrowsePreset(preset);
    setBrowsePath(preset.path);
  };

  const closePresetBrowser = () => {
    setBrowsePreset(undefined);
    setBrowsePath('');
  };

  const savePresetBrowser = () => {
    if (browsePreset && browsePath.trim()) updatePresetPath(browsePreset, browsePath.trim());
    closePresetBrowser();
  };

  const removeFavorite = (id: string) => {
    setForm(current => removeDestinationFavorite(current, id));
  };

  return (
    <>
      <Card raised={true}>
        <CardHeader
          title="Torrent Router"
          slotProps={{ title: { variant: 'h6', color: 'text.primary', sx: { textTransform: 'capitalize' } } }}
          action={<Switch checked={form.enabled} onChange={event => setForm(current => ({ ...current, enabled: event.target.checked }))} />}
          sx={{ p: '1rem 1rem 0' }}
        />
        <CardContent>
          <Collapse in={form.enabled} unmountOnExit>
            <Stack spacing={2}>
              <TextField
                label="Tracker hosts"
                value={hostsToText(form.hosts)}
                multiline
                minRows={3}
                onChange={event => setForm(current => ({ ...current, hosts: textToHosts(event.target.value) }))}
                slotProps={{ htmlInput: { style: { fontSize: '0.875em' } } }}
              />
              <Grid container spacing={2}>
                {form.presets.map(preset => (
                  <Grid key={preset.id} size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={preset.label}
                      value={preset.path}
                      disabled={preset.id === TorrentRouterPresetId.manual}
                      fullWidth
                      onChange={event => updatePresetPath(preset, event.target.value)}
                      slotProps={{
                        htmlInput: { style: { fontSize: '0.875em' } },
                        input: {
                          endAdornment: preset.id !== TorrentRouterPresetId.manual && (
                            <InputAdornment position="end">
                              <Tooltip title={`Browse ${preset.label}`}>
                                <IconButton aria-label={`Browse ${preset.label}`} edge="end" onClick={() => openPresetBrowser(preset)}>
                                  <FolderOpenIcon />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StarIcon fontSize="small" color="warning" />
                  <Typography variant="subtitle2">Favorite destinations</Typography>
                </Stack>
                {form.favorites?.length
                  ? form.favorites.map(favorite => (
                      <TextField
                        key={favorite.id}
                        label={favorite.label}
                        value={favorite.path}
                        fullWidth
                        helperText={favorite.presetId ? `Preset: ${favorite.presetId}` : undefined}
                        slotProps={{
                          htmlInput: { readOnly: true, style: { fontSize: '0.875em' } },
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={`Remove ${favorite.label}`}>
                                  <IconButton aria-label={`Remove ${favorite.label}`} edge="end" onClick={() => removeFavorite(favorite.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    ))
                  : (
                      <Typography variant="caption" color="text.secondary">
                        Save favorites from the Torrent Router prompt.
                      </Typography>
                    )}
              </Stack>
            </Stack>
          </Collapse>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', padding: '0 1.5rem 1.5rem' }}>
          <Stack direction="row" spacing={2}>
            <ButtonWithConfirm
              buttonLabel="Restore"
              buttonProps={{ variant: 'outlined', color: 'secondary', sx: { flex: '0 1 8rem' }, startIcon: <SettingsBackupRestoreIcon /> }}
              onDialogConfirm={restore}
            />
            <Button variant="outlined" color={isDirty ? 'primary' : 'info'} sx={{ width: '5rem' }} disabled={!isDirty} onClick={save} startIcon={<SaveIcon />}>
              Save
            </Button>
          </Stack>
        </CardActions>
      </Card>
      <Dialog open={!!browsePreset} fullWidth maxWidth="md" onClose={closePresetBrowser}>
        <DialogTitle>{browsePreset ? `Choose ${browsePreset.label} Destination` : 'Choose Destination'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ height: 'min(60vh, 32rem)', minHeight: '20rem' }}>
            <Explorer flatten editable startPath={browsePreset?.path} onChange={({ path }) => setBrowsePath(path ?? '')} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={closePresetBrowser}>
            Cancel
          </Button>
          <Button variant="outlined" color="primary" disabled={!browsePath.trim()} onClick={savePresetBrowser}>
            Use Folder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
