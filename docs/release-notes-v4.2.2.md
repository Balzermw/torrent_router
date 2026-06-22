# Synology Torrent Router v4.2.2

Small workflow release for easier Download Station cleanup and faster Torrent Router destination reuse.

## Highlights

- Adds visible bulk cleanup controls above the task list:
  - Clear finished and errored visible tasks.
  - Delete all visible Synology tasks with confirmation.
- Deletes large task backlogs in Synology-safe batches instead of one huge request.
- Adds favorite destination storage for Torrent Router.
- Adds a Favorite destination chooser to the initial Torrent Router send dialog.
- Adds a Save as favorite action directly in the send dialog.
- Shows and removes saved favorite destinations in `Downloads > Torrent Router` settings.

## Notes

This build remains a fork of [`dvcol/synology-download`](https://github.com/dvcol/synology-download), MIT licensed, with attribution preserved. This fork exists because the original torrent-download routing flow was not reliable for this tracker-to-Synology workflow.

Use this extension only for content you are authorized to access. It does not scrape trackers, bypass login/2FA/CAPTCHA, automate content discovery, or provide torrent content.
