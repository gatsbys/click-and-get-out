<div align="center">

<img src="icons/128.png" width="88" alt="Click and get out">

# Click and get out

**Point, click and hide whatever is in the way.**
A visual picker for taking the banner, the notice or the column you did not come for off a page — and keeping it off the next time you visit.

<img src="https://img.shields.io/badge/Manifest-V3-1b4d8f?style=flat-square" alt="Manifest V3">
<img src="https://img.shields.io/badge/Chrome-102+-0a58ff?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome 102+">
<img src="https://img.shields.io/badge/production_dependencies-0-171717?style=flat-square" alt="Zero production dependencies">
<img src="https://img.shields.io/badge/network_requests-0-a8201a?style=flat-square" alt="Zero network requests">
<img src="https://img.shields.io/badge/tests-20_passing-16a34a?style=flat-square" alt="20 tests passing">
<img src="https://img.shields.io/badge/license-PolyForm_Strict_1.0.0-57534e?style=flat-square" alt="License: PolyForm Strict 1.0.0">

</div>

---

<table>
<tr>
<td width="50%" align="center"><strong>Before</strong></td>
<td width="50%" align="center"><strong>After</strong></td>
</tr>
<tr>
<td><img src="store/screenshots/en/01-before.png" alt="A newspaper buried under a subscription bar, a cookie wall, a floating video and ads"></td>
<td><img src="store/screenshots/en/03-after.png" alt="The same newspaper, with the article in the clear"></td>
</tr>
</table>

<sup>Both screenshots come from the demo site included in this repo, taken with the real extension. Nothing is retouched.</sup>

---

<!-- The links below are GitHub's auto-generated heading slugs. Careful with heading
     emoji: the ones that carry a variation selector (U+FE0F) — ⚙️ ↩️ 🛠️ 🖱️ and the
     like — leave an invisible character at the front of the slug and silently break
     every link that points at them. Only plain single-code-point emoji are used
     here. If you swap one, click through this list before committing. -->

## 📖 Contents

- [What it is](#-what-it-is)
- [How to use it](#-how-to-use-it)
- [The two modes](#-the-two-modes)
- [Everything is reversible](#-everything-is-reversible)
- [How it works inside](#-how-it-works-inside)
- [Privacy and permissions](#-privacy-and-permissions)
- [Scope and limits](#-scope-and-limits)
- [Install](#-install)
- [Development](#-development)
- [Demo site](#-demo-site)
- [Publishing to the Chrome Web Store](#-publishing-to-the-chrome-web-store)
- [Support the project](#-support-the-project)
- [License](#-license)

## 🎯 What it is

A Chrome extension that hides elements of a web page by pointing at them with the mouse. No build step, no accounts, no external services, and not a single production dependency.

It is not an ad blocker. It intercepts no downloads and keeps no filter lists: it acts on what is already on the page, when you ask it to, on the exact block you choose. That makes it useful precisely where blockers do not reach — one site's nagging notice, the "you might also like" column, the video that follows you down the article.

## 👆 How to use it

<img src="store/screenshots/en/02-picking.png" alt="The picker running, with the header ad framed in blue and the floating toolbar at the top">

> [!NOTE]
> The extension's interface is Spanish only. Control names below are written as they appear on screen, with the English meaning in brackets.

1. Open the page, click the extension icon and choose **Seleccionar elemento** (*Select element*).
2. Point at the block. The blue frame follows the mouse and shows you **exactly** what you would hide, and the toolbar's card names it — *Enlace · Desactiva el bloqueo de anuncios* — with its HTML tag, its size in pixels, whether it floats over the page and how many images, videos and links it holds.
3. Click to **mark** it. The frame locks onto the block, gets a "Marcado" tag and stops following the mouse, so you can adjust it from the toolbar: <kbd>↑</kbd> or **Ampliar** (*Grow*) widens the selection to its container, <kbd>↓</kbd> or **Reducir** (*Shrink*) goes back. Clicking a different block moves the mark; <kbd>Esc</kbd> drops it.
4. Confirm with a second click on the marked block, with **Ocultar** (*Hide*) in the toolbar, or with <kbd>Enter</kbd>. Keep going if you like: the toolbar lists what you remove underneath, and **Deshacer** (*Undo*) takes back the last one.
5. <kbd>Esc</kbd> or **Terminar** (*Done*) to go back to browsing.

<img src="docs/images/toolbar.png" alt="The toolbar with the header ad marked: the card reads Elemento · ADVERTISEMENT AEROBIT Fly to 40 destinations…, then div.wrap.ad-billboard · 1180 × 146 px, and Ocultar is lit">

<sup>The toolbar with a block marked. The first line of the card is the block's kind and text; the second, its tag, size and contents. The amber line, when it shows, means the rule will depend on the page's structure.</sup>

| What you want | With the mouse | With the keyboard |
|---|---|---|
| Mark the block under the pointer | Click | <kbd>Enter</kbd> |
| Grow the selection to its container | **Ampliar** | <kbd>↑</kbd> |
| Shrink it back to the previous one | **Reducir** | <kbd>↓</kbd> |
| Hide the marked block | A second click inside the frame, or **Ocultar** | <kbd>Enter</kbd> |
| Drop the mark and keep pointing | Click another block | <kbd>Esc</kbd> |
| Bring back the last block you hid | **Deshacer** | |
| Leave the picker | **Terminar** | <kbd>Esc</kbd>, with nothing marked |

While the picker is running, clicks do not navigate: you can hide a link or a button without the page going anywhere. And on cards that a single "stretched" link makes clickable end to end, pointing at the photo frames the photo, not the headline.

## 🔀 The two modes

| | **Solo esta visita** (*This visit only*) | **Recordar en esta web** (*Remember on this site*) |
|---|---|---|
| **How long it lasts** | Until you reload the tab | Until you undo it |
| **Permissions** | Nothing beyond the click | Asks for access to that site, right then |
| **Where it lives** | In memory | In your Chrome profile |

Rules are shared across pages of the same **origin** — scheme, host and port. `example.com` and `www.example.com` are different sites and do not share rules.

Because the permission is per site, every new site brings up its own prompt the first time you tick "Recordar". If you would rather not see it again, the **Permitir en todas** (*Allow on all sites*) link grants access everywhere in one go, and the same link turns into **Quitar** (*Remove*) to take it back. It is entirely optional, and the extension never asks for it on its own.

## 🔄 Everything is reversible

<img src="store/screenshots/en/04-menu.png" alt="The extension menu listing eight saved elements, each with a switch and a bin">

The menu lists what you have hidden on the site you have open, each entry with a switch and a bin:

| Control | What it does |
|---|---|
| **Switch** | Turns a rule off without deleting it. The block comes back at once, and on future visits, until you turn it on again |
| **Bin** | Deletes the rule and brings its matches back in every open tab on that origin |
| **Deshacer** (*Undo*) | Reverts the last thing you hid this visit; if that had re-enabled a disabled rule, it disables it again |
| **Restaurar web** (*Reset site*) | Clears every rule for that origin, enabled or not, and drops the tab's temporary changes |

When a site has saved changes, the icon carries a green badge with the number of elements hidden there — or a dot, if the only thing saved is scroll recovery. With nothing active, the icon stays clean.

And if removing a notice leaves the page stuck with no scroll, **Recuperar desplazamiento** (*Restore scrolling*) resets `overflow`, position and height on the root containers. It is a separate option, reversible, and it can be remembered too.

## 🔧 How it works inside

```mermaid
flowchart TB
    subgraph EXT[" 🧩 The extension "]
        POPUP["<b>popup.js</b><br/>the menu"]
        WORKER["<b>background.js</b><br/>service worker<br/><i>the only writer</i>"]
        STORE[("chrome.storage.local<br/>one entry per origin")]
    end

    subgraph TAB[" 🌐 Inside the tab "]
        SELECT["<b>selectors.js</b><br/><i>what do I call this block?</i>"]
        CONTENT["<b>content.js</b><br/>the toolbar and the reconciling"]
        DOM[("the page's DOM")]
    end

    POPUP -->|"toggle · delete · reset"| WORKER
    POPUP -->|"start the picker"| CONTENT
    CONTENT -->|"save what you hide"| WORKER
    WORKER --> STORE
    STORE -.->|"onChanged · re-apply in every tab"| CONTENT
    CONTENT --> SELECT
    SELECT -.->|"CSS selector + is it fragile?"| CONTENT
    CONTENT ==>|"display:none !important"| DOM
    DOM -.->|"MutationObserver · 40 ms"| CONTENT
```

### 1. Naming the block — `selectors.js`

When you point at an element, the engine looks for the shortest stable way to name it, in this order:

1. Its `#id`, if that id is **stable** and unique on the page.
2. A semantic attribute: `data-testid`, `data-test` or `aria-label`.
3. Its tag plus one to four classes, adding them until the combination is unique.
4. A special case: many sites generate class names behind a numeric namespace that **changes on every load** (`_d123456789_pp__modal`). The engine spots that pattern and grabs the semantic suffix, which does survive.
5. If none of the above pins the block down, a structural path of `:nth-of-type` steps anchored to the nearest identifiable ancestor.

"Stable" means under 100 characters and free of runs of five digits or twelve hex characters — the signature of an identifier the site regenerates on its own and that will not exist tomorrow.

Only step 5 returns `fragile: true`, and that is when the toolbar warns you that the rule depends on the page's structure.

### 2. Applying and holding — `content.js`

`reconcile()` works out which elements should be hidden and sets them to `display:none !important`. Before touching anything it **stores the original inline `display`** — value and priority — in a `Map`. When a rule stops applying, it puts exactly that value back: the extension leaves no residue on the page.

A `MutationObserver` over the whole document, with attributes filtered down to `id`, `class`, `style`, `data-testid`, `data-test` and `aria-label`, reschedules that reconciliation with a 40 ms margin. That is what keeps rules alive on sites that repaint themselves, load content as you scroll, or put back the block you just removed.

The picker's toolbar lives in a `<div data-click-and-get-out-ui>` with `all:initial !important` and a **shadow root** of its own, at maximum `z-index`. The page's CSS cannot get in and the extension's cannot get out. Pointer and click events are taken in the capture phase with `preventDefault` and `stopImmediatePropagation`, which is why you can hide a link without navigating to it. Picking is a two-step gesture: the first click only marks the block and freezes the frame, so the pointer can travel to the toolbar; a second click inside the frame, **Ocultar** or <kbd>Enter</kbd> is what actually hides it. The card under the title describes whatever is framed: its kind and text on the first line, and underneath its tag with id and classes, its size, *Flotante* when it is `fixed` or `sticky`, and a count of the images, videos and links inside; hovering the card shows the CSS selector the rule would use.

One more thing the picker corrects: many sites make a whole card clickable with a "stretched link", an `::after` on the headline's `<a>` that covers the card. Pseudo-elements cannot receive events, so pointing at the photo makes the browser report the headline link — whose box does not even contain the pointer. When that happens the picker takes the first real element under the pointer instead, so the photo, the caption or the card itself get framed, not the headline.

### 3. Saving — `background.js`

The service worker is **the only writer**. Every message goes through one chained promise, so two tabs writing at once cannot trample each other's read-modify-write cycle.

It registers the content script **per origin** with `persistAcrossSessions`, so on your next visit it already runs at `document_start`: the block never gets a chance to flash before it disappears. If you withdraw a site's permission from Chrome, `permissions.onRemoved` unregisters the scripts that no longer have access.

It also paints the icon's badge. It only reads `tab.url` on sites that have already granted access, which is exactly where rules can exist — which is why the badge needs no `tabs` permission.

### Data model

One entry per origin, capped at 200 rules per site:

```jsonc
"site:https://example.com": {
  "rules": [
    {
      "id": "8f3e...",              // crypto.randomUUID()
      "selector": "#cookie-wall",   // whatever selectors.js returned
      "label": "We value your privacy…",
      "fragile": false,             // true for a structural path
      "enabled": true,              // the switch in the menu
      "createdAt": 1757808000000
    }
  ],
  "unlockScroll": false
}
```

## 🔒 Privacy and permissions

**There are no network requests. None.** No analytics, no accounts, no telemetry, no remote code. What you save never leaves your Chrome profile and is not synced to any account.

| Permission | What for |
|---|---|
| `activeTab` | Temporary access to the tab, only when you click the icon |
| `scripting` | Injecting the picker and applying your rules |
| `storage` | Keeping the rules locally |
| `http`/`https` *(optional)* | Only for the sites where you choose to remember changes — or for all of them at once via **Permitir en todas** |

A rule holds a CSS selector and a short label taken from the block you picked. **Restaurar web** clears the ones for that origin; the permission is withdrawn from **Details → Site access**; uninstalling wipes all local storage.

Reference: [Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) and [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

## 🚧 Scope and limits

Worth knowing what it does **not** do:

- **It is not an ad blocker.** It hides what is already on the page. It stops no downloads, defeats no ad-block detection, and cannot recover content the site never delivered.
- **Rules can go stale.** If a site redesigns, a rule may stop working or start catching a different block. Switch it off or delete it and pick again.
- **Main document only.** It does not reach inside iframes or Shadow DOM, though you can select their outer container.
- **Out of reach:** native top-layer dialogs, the PDF viewer, the Chrome Web Store and the browser's internal pages.
- Some sites may interfere with the picker or re-block navigation from JavaScript.

## 📦 Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode**, top right.
3. **Load unpacked** → pick this folder, the one with `manifest.json` in it.
4. Pin it from the extensions button (the puzzle piece).

If what you have is a `click-and-get-out.zip` build, unzip it first and load the extracted folder. Keep that folder: Chrome reads the files from there. Nothing needs Node, or any install at all, to *use* the extension.

**Updating:** replace the files in the same folder and hit **Reload** on its card in `chrome://extensions`. Keeping the path keeps the extension's id, and with it your saved rules.

## 💻 Development

Node 22 or newer for the tooling. Zero production dependencies; Playwright only for the tests.

```sh
npm ci
npx playwright install chromium

npm run check   # syntax of the four scripts
npm test        # the full suite
npm run pack    # the three builds in dist/
npm run demo    # the demo site
npm run shots   # the store screenshots
```

`npm run pack` needs the `zip` utility and produces three outputs from the same files:

| Output | What for |
|---|---|
| `dist/click-and-get-out/` | Folder ready for **Load unpacked**. The handiest one to iterate on: load it once, then just **Reload** |
| `dist/click-and-get-out.zip` | For installing by hand, without the repo |
| `dist/click-and-get-out-store.zip` | **The store one**, with `manifest.json` at the archive root |

`npm test` reports 20 passing: a static audit of `manifest.json` — Manifest V3, no mandatory host access, no declared content scripts — plus eighteen scenarios, under one parent test, that drive the real extension in Chromium with a throwaway profile and a local page. They cover container selection, marking with one click and confirming with the next, clicking without navigating, cards covered by a stretched link, `!important` styles, reload, reinsertion, concurrent writes, per-origin isolation, scroll recovery, the menu controls, disabling and deleting rules, and the toolbar's card and list. Also both themes, keyboard control, popup sizing, long lists, errors and narrow windows, leaving screenshots in `test-results/`.

Two things are left for a manual pass, because the native permission dialog cannot be automated: granting and denying a site's permission, and the real `activeTab` activation from Chrome's toolbar.

## 📰 Demo site

```sh
npm run demo   # http://localhost:4173
```

It serves **EL CENIT**, a fictional newspaper deliberately buried in clutter: a subscription bar, a cookie wall, a floating video, a header billboard, a sidebar ad, an app banner, a sponsored grid, a "most read" list and a floating share rail. Nine blocks, so the picker has something to take away. `/en.html` is the same edition in English, **THE ZENITH**.

Neither the paper, nor the brands, nor the people in it exist.

| Parameter | Effect |
|---|---|
| `?modal=1` | Opens the notice that blocks scrolling, to try **Recuperar desplazamiento** |
| `?clean=1` | Hides the clutter without the extension, for a side-by-side comparison |

`npm run shots` loads the real extension over that demo and writes the four 1280×800 images the store asks for into `store/screenshots/es/` and `store/screenshots/en/`, plus the 2× close-up of the toolbar shown above, in `docs/images/`. It doubles as a check: the header billboard has to reach a selection that does not depend on page structure, or the script fails rather than produce a bad screenshot. Each of the eight blocks it hides is reported too, with the selector it resolved to and whether that selector is structural.

## 🚀 Publishing to the Chrome Web Store

This is the maintainer's checklist. Under the [license](#-license), nobody else may publish the extension, on this store or any other.

| File | Contents |
|---|---|
| `store/LISTING.en.md` | Listing copy: title, descriptions, single purpose and a justification for each permission |
| `store/PRIVACY.en.md` | Privacy policy, to publish at a public URL and link from the listing |
| `store/LISTING.md` · `store/PRIVACY.md` | Their Spanish counterparts |
| `store/screenshots/` | The 1280×800 images, per language |

Upload `dist/click-and-get-out-store.zip`, not the other one: the store rejects a ZIP whose `manifest.json` is not at the root.

## ☕ Support the project

If it has saved you some aggravation, you can buy me a coffee:

<a href="https://www.buymeacoffee.com/the.gatsbys" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" height="48"></a>

## 📄 License

**Source-available, not open source.** The code is here to be read, audited and used, under the [PolyForm Strict License 1.0.0](LICENSE):

- **You can** install it and use it, free of charge, for any personal or otherwise noncommercial purpose — and read every line to check that it does what it says.
- **You cannot** distribute it, changed or unchanged — which includes uploading it to the Chrome Web Store or any other store, under this name or another — nor use it commercially, sell it, or make changes or new works based on it.

That is a summary for convenience; the [license text](LICENSE) is what governs. For anything it does not cover, [open an issue](https://github.com/gatsbys/click-and-get-out/issues).

Copyright © 2026 Cristian de Murcia.

---

<div align="center">
<sub>Built on the idea that a web page should show you what you came to read.</sub>
</div>
