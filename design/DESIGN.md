# Astro Santa — screen design handoff

Desktop redesign of the three letter screens. The wireframes in `screens/` are the source of truth for layout; this file is the source of truth for the rules behind them.

| Screen | Wireframe | Razor page |
|---|---|---|
| Landing | `screens/1-landing.html` | `Features/Landing/Index.cshtml` |
| Create letter | `screens/2-create-letter.html` | `Features/Letters/Create/Create.cshtml` |
| View letter | `screens/3-view-letter.html` | `Features/Letters/View/View.cshtml` |

The wireframe files come from a design tool: ignore `support.js`, `<x-dc>`, `<helmet>`, the `{{…}}` holes and the `<script type="text/x-dc">` block. Read them for structure, copy, sizes and colours. The `{{panelBg}}` / `{{panelBlur}}` values are given below.

Styling uses the **Astro Santa design system** (https://claude.ai/artifact/CYCmvmmH8qRT2HLFGatTgL): read its brand book first. Use the `var(--…)` tokens, never the raw hex.

- **Night theme only.** The design system also has a light theme (Snow Day); the site does not use it. The old light palette in `wwwroot/css/tokens.css` is dropped and replaced by the Night values.
- The design system styles the content only, never the diorama (see §2, rule 3).
- Colour roles used below: `lantern` = the one primary action, `aurora` = delivered/success, `ice` = links and info, `cranberry` = errors, `paper` = the letter only.

## 1. The stage: two halves

- The screen is split into **two equal halves**. (The wireframes in `screens/` still show the earlier three-column split; the halves win.) Thirds lines across the height still guide vertical placement.
- **The left half is content.** **The right half is always empty** on every screen: no buttons, labels, badges, toasts or overlays ever go there. The one exception is a popup (share, terms, picture): popups are centred on the whole screen.
- **The diorama is full-screen** and sits behind everything (`position: fixed; inset: 0`, lowest layer). Astro, the main character, is *part of the diorama* and stands in the right half. The UI never draws Astro. See §2 for how it behaves.
  - The wireframe shows the diorama as a hatched area with a corner-to-corner X — that is only its placeholder.
- Content sits on one **panel** filling the left half, inset `--space-6` (24px) from the top, bottom and left edges and 24px short of the middle line.
- The page itself never scrolls on desktop: the stage is the viewport height (designed at 1440×900). Long content scrolls **inside** the panel (see each screen). The right half never moves.

## 2. The diorama

A looping pixel-art night scene, drawn live by a script (not a video). Source: `assets/astro-diorama-delivery.html`, which holds both versions of the scene: **plain** (Astro stands in the snow) and **delivery** (Astro holds a letter, dashes off past the tree and comes back). `assets/astro-diorama.html` is the plain version alone and is superseded.

Built in `wwwroot/js/diorama/`: `scene.js` draws the scene (the source's drawing code, with its own fixed palette), `diorama.js` decides when it plays, how it is framed and when the content is in front. The inline script in `_Layout` decides before the first paint whether the scene starts in front.

### Where it shows
1. On every page and every screen size (phones included), the diorama fills the screen behind the panel.
2. The plain version plays on every page, except the "just sent" letter page (rule 7).
3. The diorama keeps its **own fixed night colours**. It never reads colours from the site's design system, so a palette change can never break it. (The source file reads page colours such as `--surface` and `--ink`; that must be removed, because the design system uses the same names.)
4. The panel **may cover the cabin and the lamppost, never Astro.** The whole village is seen during the opening and the delivery (rules 5–7), when the content is out of the way.

### The moments
5. **First arrival in a browser tab:** the diorama plays full screen with no content for **3 seconds**, then the content fades in on top. Any click or key press skips straight to the content. Every later page in that tab shows its content right away.
6. **Send:** on Create, clicking **Send to Santa** fades the content out (about 0.5 s) while the letter saves, so the diorama comes to the front. The letter page then opens with the diorama still in front, starting just before Astro's hop. About **3 s** later Astro dashes off with the letter; about **1.5 s** after he leaves the screen, the letter and the `DELIVERED` badge fade in. His run takes about 2 s, so the letter shows about 6.5 s after the letter page opens. A click or key press skips to the letter, as in rule 5.
7. **On the "just sent" letter page** the delivery version keeps looping for as long as the visitor stays. A reload or a later visit to the same link shows the plain version.

### Behaviour
8. Moving between pages, the diorama **carries on** from where it was in that browser tab; it does not restart on each page.
9. With `prefers-reduced-motion: reduce`: no opening, no fades, no loop. The content shows right away over a still frame.
10. The diorama pauses while the browser tab is hidden.
11. If the script fails to load, the content still shows. Content is hidden only once the script is running and in control.
12. The loop runs forever; there is no pause button by design.

## 3. The panel

- Background `--surface-raised` at 60% (`rgba(34, 43, 58, 0.6)`; the lowest that keeps `--ink-muted` text at 4.5:1 over the brightest snow), `backdrop-filter: blur(8px)`, 1px border `--line`, radius 28px (`--radius-xl`), shadow `--shadow-lg`.
- Padding 40px top, 48px sides.
- Elements *inside* the panel that carry text keep **solid** backgrounds (step cards, inputs, letter paper, wish cards, info note) so text stays readable over the moving scene.
- Check the panel's own muted text (`--ink-muted`) against the brightest diorama frames; if contrast drops below 4.5:1, raise the blur before raising the opacity.

## 4. Screens

### Landing
- Header: the `ASTROCLAUS` wordmark (pixel font, `logo` style).
- Main block centred vertically, so the headline lands near the upper thirds line: overline `TO: THE NORTH POLE`, hero headline, one paragraph, then the one primary (`lantern`) button **Write my letter** → Create, plus an `ice` link **See an example letter**.
- Three step cards in a row: Write it · Send it · Share it.
- Footer caption: letters are kept for N days (see Limits).

### Create letter
- Panel = fixed **header** (Back link + wordmark) / **scrolling middle** / fixed **action bar**.
- Middle, in order: title + subtitle, **Your name**, **Your message** (lined textarea, character counter), **Your wishes**.
- **Wishes:** a numbered list of cards. Each card: label `Wish N`, text field, remove-wish icon button, an optional link field ("Link (optional): https://…"), then its images.
  - Up to **2 images per wish**. Thumbnails 96×96 with a remove button on the top-right corner (visible circle 28px, hit area 44px).
  - While a wish has fewer than 2 images, show a dashed 96×96 **Add image** tile after the thumbnails; hide it at 2.
  - Caption beside the tiles: `N of 2 images`; on an empty wish also the allowed file types and max size.
  - Helper text above the list steers kids toward pictures of the thing they want (not of themselves): "Add a picture of what you're wishing for, up to 2 per wish."
  - Counter `N of MAX wishes` at the top right of the section; **Add a wish** button under the list, hidden at the maximum.
- Action bar (top border `--line`): info note (`ice` on `ice-soft`) "Once it's sent, your letter can't be changed…" and the one `lantern` button **Send to Santa** (`on-lantern` label, `--glow`). Clicking it fades the content out and brings the diorama to the front (§2, rule 6).

### View letter
- Header: wordmark, linking to Landing.
- Status row: `DELIVERED` pixel badge (`aurora` on `aurora-soft`, check icon) + caption `Sent DATE · Kept until DATE`.
- Right after sending, the whole panel stays hidden until Astro has run off with the letter, then fades in (§2, rules 6–7).
- **Letter paper** (`--paper` with `--on-paper` text, `--paper-muted` for the address lines, radius 20px) fills the remaining height and **scrolls inside itself**: `TO: THE NORTH POLE` / `FROM: name`, "Dear Santa,", the message, **My wishes**, then "Love, name".
  - Clicking a picture opens it in a popup that shows only the picture, as large as fits (never cropped or stretched; on narrow screens at most two thirds of the screen's height), centred. A strip under it, exactly as wide as the picture, shows the wish's name and **Find it here** if the wish has a link. No buttons: Escape or a click outside closes it. One popup is filled with whichever picture was clicked. Ctrl/Cmd-click, or no page script, opens the picture in a new tab.
  - A wish with a link shows **Find it here** under its text (`paper-muted`, `on-paper` on hover), opening in a new tab. Only `http(s)` links are ever accepted or shown.
  - Each wish: number badge (`lantern-ink` on `lantern-soft`), wish text in bold body-lg, its images at 140×140, read-only. A wish with no images is a single line.
- **Share your letter:** heading, one line of help, read-only link field + a secondary (outline) **Copy link** button. This replaces the share modal on desktop unless there's a reason to keep it.
- Footer: `ice` link **Write your own letter** → Create. No `lantern` button on this screen.

## 5. Rules that apply everywhere
- **Terms is a popup, not a page.** Every terms link opens it where you are (so a half-written letter is never lost); there is no `/terms` address. Desktop: centred, sized to its text. Narrow screens: two thirds of the screen's height, centred. The title and **Close** stay put and the text scrolls between them. Escape or a click outside also closes it.
- **One `lantern` (primary) action per screen**, at most.
- Touch targets ≥ 44px. Real `<button>`, `<a href>`, `<label for>` + inputs; icon-only buttons get `aria-label`.
- Focus ring = `--focus-ring`.
- UI icons: 24px line icons, 1.75 stroke, round caps, `currentColor`.
- **Motion:** see §2 (loop, opening, fades, reduced motion).
- Narrow screens (below ~820px): the halves collapse to one column and the panel goes full width. The diorama stays full-screen behind the panel, the same as on desktop. Desktop is the target; this only has to not break.

## 6. Limits (constitution rule 6)

All numbers in page text must come from `Features/Letters/LetterLimits.cs`, never be typed into the markup. Current values:

| Wireframe placeholder | Source |
|---|---|
| Name length | `FromMax` (30) |
| Message `0 / [MAX] characters` | `MessageMax` (150) |
| Wish text length | `WishNameMax` (60) |
| Wish link length | `WishLinkMax` (500) |
| `N of [MAX] wishes` | `MaxWishes` (10) |
| `up to [MAX SIZE]` | `MaxImageKb` (500 KB) |
| `[FILE TYPES]` | the kinds `ImageKind.Detect` accepts: JPG, PNG, WebP |
| `2 images per wish` | **missing** — add e.g. `MaxImagesPerWish = 2` |
| `kept for 90 days` / `Kept until` date | **missing** — add the retention period as a limit |

`MessageMax` is 150 characters, so the message textarea can be shorter than the wireframe's 184px if it looks empty.

## 7. Open points for the spec
- The design system has no secondary button yet. The site uses a simple outline (`.btn-secondary`: transparent, `ink` text, 2px `border-strong` edge); add it to the design system if it stays.
- Should the share modal (`_ShareModal`) stay for mobile, or be replaced everywhere by the inline share section?
