# Privacy policy — Click and get out

**Last updated:** 14 September 2026

Spanish version: [`PRIVACY.md`](PRIVACY.md).

## Summary

Click and get out collects nothing, transmits nothing and sells nothing. The
extension makes no network requests. There are no servers, no accounts, no
analytics and no tracking identifiers.

## What is stored

When you hide a block and tick "Remember on this site", the extension stores the
following against that site's origin (scheme, host and port):

- The **CSS selector** identifying the block you chose.
- A **short label** (100 characters at most) taken from the text or the
  `aria-label` of that block, so you can recognise the rule in the list.
- Whether the rule is **enabled or switched off**.
- Whether you turned on **restore scrolling** for that site.
- The date you created the rule.

If you do not tick "Remember on this site", nothing is stored: the change lives
in memory and disappears when you reload the tab.

## Where it is stored

Only in the extension's local storage inside your Chrome profile
(`chrome.storage.local`), on your own device. This data:

- Is **not** sent to any server.
- Is **not** synced to your Google account or across devices.
- Is **not** shared with third parties.
- Is **not** used for advertising, profiling, or anything other than hiding
  again the blocks you chose.

## Permissions and why they are requested

- `activeTab`: temporary access to the active tab, only at the moment you click
  the extension icon.
- `scripting`: to inject the element picker and apply your rules.
- `storage`: to save your rules locally.
- Optional site permissions (`http://*/*`, `https://*/*`): **not** requested at
  install time. They are requested for one site at a time when you tick
  "Remember on this site", or once for all sites if you deliberately use the
  "Allow on all sites" link, which the extension never triggers on its own. The
  scope of the access does not change what the extension does: there are still
  no network requests and no data leaves your browser.

## Your control over the data

- The **switch** turns a rule off without deleting it.
- The **bin** deletes a single rule.
- **Reset site** clears every saved rule for that site.
- You can withdraw a site's permission from `chrome://extensions` → **Details**
  → **Site access**. Once withdrawn, the extension stops registering its script
  on that site.
- **Uninstalling the extension** removes all of its local storage.

## Remote code

The extension does not download or execute remote code. All code is distributed
inside the package published on the Chrome Web Store.

## Changes to this policy

If data handling ever changes, this page will be updated and the date in the
header will reflect the revision.

## Contact

<!-- Replace with the contact address you want to publish. -->
Contact email: TO BE FILLED IN
