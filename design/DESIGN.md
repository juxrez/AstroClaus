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
1. On every page and every screen size (phones included), the diorama fills the screen behind the panel. Landing and the letter page on phones move it into a window at the top (rule 13).
2. The plain version plays on every page except Landing, Create and the letter page. Right after sending, the letter page shows the delivery version (rule 7).
   - **Landing** shows the **greet** version. Astro is a puppy happy to see you, and he never leaves his spot. He spots you and hops for joy with two barks (0–3 s), then loops every 14 s: panting, a curious "huh?", a play bow with barks, a spin after his tail, a sit. While **Write my letter** is hovered or has keyboard focus he faces it and bounces; a click or tap on him gets a hop, a bark and a heart. The routine carries on where it was afterwards. The button never waits for him.
   - **Create** shows the **wait** version ("Astro will wait right here"). He sits and watches. Typing makes him look up, at most every 4 s. After 20 s with no typing or adding, he yawns, lies down and sleeps (z's) until the next key press wakes him. Adding a wish or a picture gets the happy hop; on Send he catches the letter (rule 6).
   - Both show him sitting as the still frame with reduced motion. Astro is posed by moving pieces of his sprite; nothing on him is ever see-through.
   - A letter opened by a reader (a reload, or anyone with the link) shows the **play** version: Astro barks hello (0–4 s), sits while snow settles on him (4–8 s), shakes it off (8–12 s), snaps at falling flakes (12–15 s), sniffs his way off to the right, walks back in and turns to face us. The routine starts with the bark when the page opens and loops every 26 s on its own clock; the sky keeps its 24 s loop. With reduced motion, the still frame shows him sitting.
3. The diorama keeps its **own fixed night colours**. It never reads colours from the site's design system, so a palette change can never break it. (The source file reads page colours such as `--surface` and `--ink`; that must be removed, because the design system uses the same names.)
4. The panel **may cover the cabin and the lamppost, never Astro.** The whole village is seen during the opening and the delivery (rules 5–7), when the content is out of the way.

### The moments
5. **First arrival in a browser tab:** the diorama plays full screen with no content for **3 seconds**, then the content fades in on top. Any click or key press skips straight to the content. Every later page in that tab shows its content right away.
6. **Send:** on Create, clicking **Send to Santa** at once changes the button to "Sending…" and stops it from sending again, and the letter starts uploading in the background. Then, in about 2 s:
   - the panel fades away (0.3 s) and only the letter stays: a sheet of letter paper with the child's own "Dear Santa…" words settles where the panel was;
   - it folds in three like a real letter, bottom third up, then top third down (0.3 s each);
   - it becomes the scene's pixel-art envelope as its red seal pops on (0.25 s);
   - it flies in an arc to Astro (0.8 s), shrinking to exactly the size of the envelope the scene draws in his mouth, so the hand-over can't be seen. He gets up, watches it come, opens his mouth just before it arrives, catches it with a squash and bounces with it.

   Only after the catch does the **sending card** fade in where the letter was (left half, centred; the whole width on narrow screens): an envelope icon and "Astro is taking your letter to the North Pole…" with three dots blinking in turn, on a solid `surface-raised` card. The letter page opens once both the upload and the catch are done.

   **If the letter can't be sent** (no connection, no answer within 60 s, a server error, or anything the server refuses), the page never leaves Create and nothing is lost. The card goes, Astro puts the letter down in the snow and sits to wait again, the form comes back exactly as it was, and a modal says "Astro couldn't get through. We're having trouble delivering your letter. It's safe here, so please try again later." with one **Close** button; to try again, the child presses **Send to Santa**, which is ready again. The server's own messages are never shown. With reduced motion it is the same modal, with nothing to bring back.

   The page change **crossfades** (a cross-document view transition; browsers without it cut), the card keeps its place through it, and the sky carries on unbroken (rule 8): only Astro's delivery starts with the letter page, just before his hop. About **3 s** later he dashes off with the letter; about **1.5 s** after he leaves the screen the card fades out, then the letter and the `DELIVERED` badge rise in, 0.2 s later. Every other page change stays a plain cut. A click or key press skips to the letter, as in rule 5. With reduced motion nothing folds, flies or fades and there is no sending card: the form is sent the plain way, the "Sending…" button is the only sign, and the letter page shows the letter at once (rule 9).
7. **On the "just sent" letter page** the delivery version keeps looping for as long as the visitor stays. A reload or a later visit to the same link shows the plain version.

### Behaviour
8. Moving between pages, the diorama **carries on** from where it was in that browser tab; it does not restart on each page.
9. With `prefers-reduced-motion: reduce`: no opening, no fades, no loop. The content shows right away over a still frame.
10. The diorama pauses while the browser tab is hidden.
11. If the script fails to load, the content still shows. Content is hidden only once the script is running and in control.
12. The loop runs forever; there is no pause button by design.

### Phones
13. **On Landing and the letter page on narrow screens, the top 40% of the screen is a window onto the scene.** The panel starts below it and scrolls up over it. The scene keeps its full-screen size but is moved up so its ground sits at the bottom of the window, so Astro stands in the window, close up. Below the window the page takes the colour of the scene's bottom edge (read from the scene itself, rule 3), so the snow carries on behind the panel instead of stopping in a hard line. While the scene is in front (rules 5–7) it fills the screen as usual; when the content appears, the scene slides up into the window (about 0.7 s, none with reduced motion). Other pages are unchanged.

## 3. The panel

- Background `--surface-raised` at 60% (`rgba(34, 43, 58, 0.6)`; the lowest that keeps `--ink-muted` text at 4.5:1 over the brightest snow), `backdrop-filter: blur(8px)`, 1px border `--line`, radius 28px (`--radius-xl`), shadow `--shadow-lg`.
- Padding 40px top, 48px sides.
- Elements *inside* the panel that carry text keep **solid** backgrounds (step cards, inputs, letter paper, wish cards, info note) so text stays readable over the moving scene.
- Check the panel's own muted text (`--ink-muted`) against the brightest diorama frames; if contrast drops below 4.5:1, raise the blur before raising the opacity.

## 4. Screens

### Landing
- Header: the `ASTROCLAUS` wordmark (pixel font, `logo` style).
- Main block, **left-aligned**, centred vertically so the headline lands near the upper thirds line: overline `TO: THE NORTH POLE`, hero headline, one paragraph ("Tell him what you wish for, and Astro will carry your letter north. No account needed."), then side by side the one primary (`lantern`) button **Write my letter** (pencil icon) → Create and an `ice` link **See an example letter** → the example letter (see View letter).
- Three step cards in a row, stacked on narrow screens. Each has a solid `surface-raised` background, an icon in a `lantern-soft` circle, a bold title and one caption: **1 · Write it** "Your wishes, in your own words." · **2 · Send it** "Astro carries it to the North Pole." · **3 · Share it** "One link for family and friends."
- Footer caption: "Letters are kept for N days." (N from `RetentionDays`), before the Terms link.
- **The content appears piece by piece** when it shows (after the opening on first arrival, at once otherwise): the overline, headline, paragraph, actions and each card rise 16px and fade in, 50ms apart (400ms, strong ease-out). With reduced motion they only fade.

### Create letter
- Panel = fixed **header** (**Back** link → Landing, on the left of the wordmark) / **scrolling middle** / fixed **action bar**. No site footer on this page: the terms link is in the action bar. On narrow screens the page scrolls instead and the action bar sticks to the bottom of the screen. No window onto the scene here on phones (§2, rule 13): the form needs the room.
- Middle, in order: title "Write your letter" + subtitle "Take your time. Astro will wait right here.", **Your nickname** (the terms ask for nicknames, not full names), **Your message**, **Your wishes**.
- **Your message is written on the letter paper:** a `--paper` card with "Dear Santa," printed at the top (Fredoka), the textarea in the handwriting font on ruled lines (the same as the letter page), the character counter in `paper-muted`, and "With love, *nickname*" under it, filled in live as the nickname is typed. The child sees the letter take shape as they write.
- **Wishes:** a numbered list of cards. Each card: label `Wish N`, text field, remove-wish icon button (×, hidden while there is only one wish), an optional link field ("Link (optional): https://…"), then its images.
  - **Pictures are shrunk in the browser as they are picked**, since phone photos are several MB: at most 1600 px on the longest side, saved as JPEG (transparent parts turn white), which also drops hidden details such as where a photo was taken. If one is still over the limit, a lower quality and then smaller sizes are tried; only then is it refused ("*name* is too big. Try a different picture."). Send waits for any picture still being shrunk. Where the browser can't redraw a picture, the original is checked against the limit as before.
  - Up to **2 images per wish**. Thumbnails 96×96 with a remove button on the top-right corner (visible circle 28px, hit area 44px).
  - While a wish has fewer than 2 images, show a dashed 96×96 **Add image** tile after the thumbnails; hide it at 2.
  - Caption beside the tiles: `N of 2 images`; on an empty wish also the allowed file types and max size.
  - Helper text above the list steers kids toward pictures of the thing they want (not of themselves): "Add a picture of what you're wishing for, up to 2 per wish."
  - Counter `N of MAX wishes` at the top right of the section; **Add a wish** button under the list, hidden at the maximum.
- Action bar (top border `--line`): info note (`ice` on `ice-soft`) "Once it's sent, your letter can't be changed. Give it one last read.", the one `lantern` button **Send to Santa** (`on-lantern` label, `--glow`), and under it "By sending, you agree to the terms." (the terms popup). Clicking Send shows "Sending…" on the button, fades the content out, brings the diorama to the front and shows the sending card (§2, rule 6). Going back to this page from the letter page brings the form back as it was, with Send ready again.
- **Motion:** a new wish card rises 8px and fades in (200ms, strong ease-out) and its field gets focus; a removed wish card or picture fades out with `scale(0.98)` (150ms) before it goes; a new thumbnail fades in from `scale(0.95)` (150ms). With reduced motion, no movement.
- The picture fields stay two plain file inputs per wish (`Image1`, `Image2`), so the page still works without its script: then both **Add image** tiles show and there are no thumbnails.

### View letter
(The wireframe `screens/3-view-letter.html` still shows the wishes as a list of cards; the polaroid gallery below wins.)
- Header: wordmark, linking to Landing.
- Status row, for everyone who opens the letter: `DELIVERED` pixel badge (`aurora` on `aurora-soft`, check icon) + caption `Sent DATE · Kept until DATE`.
- Right after sending, the whole panel stays hidden until Astro has run off with the letter, then fades in (§2, rules 6–7).
- **Letter paper** (`--paper` with `--on-paper` text, `--paper-muted` for the address lines, radius 20px) fills the remaining height and **scrolls inside itself** (on narrow screens the page scrolls instead): `TO: THE NORTH POLE` / `FROM: name` with a round **postmark** beside them (`NORTH POLE` and the sent date, `paper-muted` ink, slightly tilted, decoration only), "Dear Santa,", the message, **My wishes**, then "With love, name".
  - The message and the "With love, name" line are in the handwriting font (§5) and sit on ruled lines (`--paper-line`, one per line of text). "Dear Santa," stays Fredoka; wish names stay Nunito so the list is easy to read.
  - Clicking a picture opens it in a popup that shows only the picture, as large as fits (never cropped or stretched; on narrow screens at most two thirds of the screen's height), centred. A strip under it, exactly as wide as the picture, shows the wish's name, `N of M` when the letter has more than one picture, and **Find it here** if the wish has a link. **← →** or a swipe across the picture go through all the letter's pictures in order (wrapping around), changing at once with no motion. No buttons: Escape or a click outside closes it. One popup is filled with whichever picture was clicked. Ctrl/Cmd-click, or no page script, opens the picture in a new tab.
  - **The wishes are a gallery of polaroids** taped to the paper, two to a row (one on narrow screens). Each is a white polaroid frame tilted a little, held on by a strip of tape (the tilt and tape colour — cranberry, aurora, ice, lantern — repeat every four). Inside: the wish's first picture, square, then the number badge (`lantern-ink` on `lantern-soft`) and the wish text in bold Nunito.
  - A wish with **two pictures** is a small stack: the second polaroid peeks out from behind, turned a little further, and the front picture has a `2` pictures chip. Clicking the part that peeks out opens the second picture.
  - A wish with **no pictures** is a **sticky note** (lantern-tinted paper, top-right corner folded over) with the number and the wish text, still in Nunito (§5).
  - Pointed at with a mouse, a polaroid straightens and lifts 3px, and a stack fans out (220ms, strong ease-out). Pictures shrink to `scale(0.97)` while pressed.
  - A wish with a link shows a **Find it here ↗** pill at the bottom of its polaroid or note (`paper-muted` text and `--paper-line` edge, `on-paper` on hover, at least 44px tall), opening in a new tab. Only `http(s)` links are ever accepted or shown.
- **The letter appears once** each time the page opens: the paper rises 16px and fades in (400ms, strong ease-out), then the polaroids drop onto it 60ms apart, each settling from a slight extra turn into its tilt (300ms, strong ease-out). Right after sending, it starts when the panel fades in after Astro's run. With reduced motion it only fades, and nothing straightens or fans out on hover.
- **The example letter** (`/letter/example`, linked from Landing) is built into the app and never stored, so it never expires. It is shown like a real letter that a reader opened, except: its sent date is today, it has no "Kept until" date and no share section. Its pictures are files in `wwwroot/letter/example/images/` (placeholders for now: replace the files to change them).
- **Share your letter**, on every screen size (no share popup): heading, one line of help, read-only link field + a secondary (outline) **Copy link** button, then **Share on WhatsApp** and, where the browser can share, **More ways to share**. Below the paper, except right after sending on narrow screens, where it sits above the letter so the sender sees it first.
- Footer: `ice` link **Write your own letter** → Create. No `lantern` button on this screen.

## 5. Rules that apply everywhere
- **Terms is a popup, not a page.** Every terms link opens it where you are (so a half-written letter is never lost); there is no `/terms` address. Desktop: centred, sized to its text. Narrow screens: two thirds of the screen's height, centred. The title and **Close** stay put and the text scrolls between them. Escape or a click outside also closes it.
- **One `lantern` (primary) action per screen**, at most.
- **Buttons** shrink to `scale(0.97)` while pressed (160ms, strong ease-out). The `lantern` button's glow brightens on hover, for mouse pointers only.
- **The handwriting font** (`--font-hand`, Patrick Hand) is only for the child's own words on the letter: the message and the sign-off. It is the design system's fourth font.
- Touch targets ≥ 44px. Real `<button>`, `<a href>`, `<label for>` + inputs; icon-only buttons get `aria-label`.
- Focus ring = `--focus-ring`.
- UI icons: 24px line icons, 1.75 stroke, round caps, `currentColor`.
- **Motion:** see §2 (loop, opening, fades, reduced motion).
- Narrow screens (below ~820px): the halves collapse to one column and the panel goes full width. The diorama stays full-screen behind the panel, the same as on desktop, except on Landing and the letter page (§2, rule 13). Desktop is the target; this only has to not break.

## 6. Limits (constitution rule 6)

All numbers in page text must come from `Features/Letters/LetterLimits.cs`, never be typed into the markup. Current values:

| Wireframe placeholder | Source |
|---|---|
| Name length | `FromMax` (30) |
| Message `0 / [MAX] characters` | `MessageMax` (150) |
| Wish text length | `WishNameMax` (60) |
| Wish link length | `WishLinkMax` (500) |
| `N of [MAX] wishes` | `MaxWishes` (10) |
| `up to [MAX SIZE]` | `MaxImageMb` (1 MB) |
| `[FILE TYPES]` | the kinds `ImageKind.Detect` accepts: JPG, PNG, WebP |
| `2 images per wish` | `MaxImagesPerWish` (2; the form has exactly that many picture fields per wish) |
| `kept for 90 days` / `Kept until` date | `RetentionDays` (90; must match the storage lifecycle rule in `/infra`) |

`MessageMax` is 150 characters, so the message textarea can be shorter than the wireframe's 184px if it looks empty.

## 7. Open points for the spec
- The design system has no secondary button yet. The site uses a simple outline (`.btn-secondary`: transparent, `ink` text, 2px `border-strong` edge); add it to the design system if it stays.
- The design system has no motion curves yet. The site defines `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) and `--ease-in-out` (`cubic-bezier(0.77, 0, 0.175, 1)`) in `site.css`; move them to the design system if they stay.
