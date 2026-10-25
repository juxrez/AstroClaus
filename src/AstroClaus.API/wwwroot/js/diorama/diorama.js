// The diorama behind every page: when it plays, how it is framed, and when the page content
// sits in front of it (design/DESIGN.md §2). The drawing itself lives in scene.js.
//
// Two attributes on <html> carry the state, and CSS does the fading:
//   data-diorama="plain" | "delivery" | "play" | "greet"   which version of the scene this page shows (set by the server)
//   data-diorama-front                  the scene is in front and the content is faded out
//
// The inline script in _Layout sets data-diorama-front before the first paint (first arrival in the
// tab, or a letter just sent). startDiorama() takes over from it.

import { createScene } from "./scene.js";

const OPENING_MS = 3000;           // rule 5: on first arrival the scene plays alone for 3 s
const DELIVERY_LEAD_S = 3;         // rule 6: the delivery starts about 3 s before Astro dashes off...
const AFTER_DELIVERY_MS = 1500;    // ...and the letter fades in about 1.5 s after he has left the screen
const STILL_PLAIN_S = 10.4;        // rule 9: the frame shown instead of the loop with reduced motion
const MAX_EXTRA_ZOOM = 2;          // how many scale steps framing may add to keep Astro clear of the panel
const CLOCK_KEY = "diorama:clock"; // sessionStorage: wall-clock ms at which scene time was 0 (rule 8)
const CONTROL_EVENT = "diorama:control"; // tells the inline script in _Layout to stand down

const ASTRO_SPRITE = new URL("../../assets/diorama/astro.png", import.meta.url);
const FRONT = "data-diorama-front";

const root = document.documentElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Starts the diorama on this page. Never throws: if anything fails, the content is shown.
 * @returns {{ contentShown: Promise<void>, bringToFront: () => void }}
 *   contentShown resolves the first time the page content is visible.
 *   bringToFront fades the content out so the scene is in front (Send, rule 6).
 */
export function startDiorama() {
  document.dispatchEvent(new Event(CONTROL_EVENT));
  const content = createContent();

  // Back from the letter page restores this page as it was left after Send: content faded out.
  addEventListener("pageshow", (e) => { if (e.persisted) content.show(); });

  start(content).catch((error) => {
    console.error("Diorama failed to start", error);
    content.show();
  });

  return {
    contentShown: content.shown,
    bringToFront: () => { if (!reducedMotion.matches) content.hide(); },
  };
}

async function start(content) {
  const delivering = root.dataset.diorama === "delivery";
  const playing = root.dataset.diorama === "play";
  const greeting = root.dataset.diorama === "greet";
  const canvas = document.getElementById("diorama");
  const panel = document.getElementById("panel");
  const sceneWindow = document.getElementById("scene-window");

  const variant = delivering ? "deliver" : playing ? "play" : greeting ? "greet" : undefined;
  const scene = createScene({ astroImage: await loadImage(ASTRO_SPRITE), variant });
  const startAt = delivering ? scene.delivery.dash - DELIVERY_LEAD_S : undefined;

  // Reframe on any change to the screen's size, including the first layout (a tab opened in the
  // background starts at 0x0, and some size changes never fire a window "resize").
  new ResizeObserver(() => frame(canvas, scene, panel, sceneWindow)).observe(canvas.parentElement);

  const still = { scene: startAt ?? STILL_PLAIN_S, routine: scene.routine?.still };
  const reactions = greeting ? createReactions(scene, canvas) : null;
  play(canvas, scene, createClock(startAt), createRoutineClock(), reactions, still, content);
  requestAnimationFrame(() => paintAroundScene(canvas)); // after play's first frame, queued just before

  if (!root.hasAttribute(FRONT)) {
    content.show();
  } else if (delivering) {
    showContentAfter((scene.delivery.gone - startAt) * 1000 + AFTER_DELIVERY_MS, content);
  } else {
    showContentAfter(OPENING_MS, content);
  }
}

// ---- Content in front of / behind the scene -------------------------------

function createContent() {
  let resolveShown;
  const shown = new Promise((resolve) => (resolveShown = resolve));
  return {
    shown,
    hide: () => root.setAttribute(FRONT, ""),
    show: () => {
      root.removeAttribute(FRONT);
      resolveShown();
    },
  };
}

// Rule 5: any click or key press skips straight to the content. "click" rather than "pointerdown",
// so the press that reveals the content can't also land on a button that has just appeared.
function showContentAfter(ms, content) {
  const show = () => content.show();
  const timer = setTimeout(show, ms);
  addEventListener("click", show);
  addEventListener("keydown", show);
  content.shown.then(() => {
    clearTimeout(timer);
    removeEventListener("click", show);
    removeEventListener("keydown", show);
  });
}

// ---- Playback ---------------------------------------------------------------

// Plays the loop, or holds one still frame while reduced motion is on (rule 9). Hidden tabs get no
// animation frames, so the loop pauses there by itself (rule 10). routine is the routine's own
// clock (the letter page and the landing); scenes without a routine ignore it. reactions (the
// landing only, else null) can take over from the routine, which waits meanwhile.
function play(canvas, scene, clock, routine, reactions, still, content) {
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  let request = 0;

  const loop = (now) => {
    const reaction = reactions?.at(now) ?? null;
    if (reaction) routine.pause(now);
    else routine.resume(now);
    scene.render(ctx, clock(now), routine(now), reaction);
    request = requestAnimationFrame(loop);
  };
  const update = () => {
    cancelAnimationFrame(request);
    if (reducedMotion.matches) {
      scene.render(ctx, still.scene, still.routine);
      content.show();
    } else {
      request = requestAnimationFrame(loop);
    }
  };

  reducedMotion.addEventListener("change", update);
  update();
}

// The routine starts with Astro's hello when the page opens, unlike the scene, which carries on.
// pause/resume hold it while a reaction plays, so it carries on where it was.
function createRoutineClock() {
  let startedAt = performance.now();
  let pausedAt = null;
  const clock = (now) => ((pausedAt ?? now) - startedAt) / 1000;
  clock.pause = (now) => { pausedAt ??= now; };
  clock.resume = (now) => {
    if (pausedAt === null) return;
    startedAt += now - pausedAt;
    pausedAt = null;
  };
  return clock;
}

// ---- Reactions (the landing) --------------------------------------------------

// Astro reacts to you: while the page's main button ([data-astro-reacts]) is hovered or has keyboard
// focus he faces it and bounces, and a click or tap on him gets a hop, a bark and a heart. The button
// itself is never held up. at(now) gives the reaction playing now, or null.
function createReactions(scene, canvas) {
  const button = document.querySelector("[data-astro-reacts]");
  const causes = new Set(); // "pointer" and/or "focus": what keeps the button reaction going
  let buttonAt = null;
  let faceLeft = false;
  let petAt = -Infinity;

  const setCause = (cause, on) => {
    if (on) causes.add(cause);
    else causes.delete(cause);
    if (!causes.size) buttonAt = null;
    else if (buttonAt === null) {
      buttonAt = performance.now();
      faceLeft = centreX(button.getBoundingClientRect()) < centreX(astroBox(scene, canvas));
    }
  };
  if (button) {
    button.addEventListener("pointerenter", () => setCause("pointer", true));
    button.addEventListener("pointerleave", () => setCause("pointer", false));
    button.addEventListener("focus", () => setCause("focus", button.matches(":focus-visible")));
    button.addEventListener("blur", () => setCause("focus", false));
  }

  addEventListener("click", (e) => {
    if (e.target.closest?.("#panel")) return; // the panel covers him there
    const box = astroBox(scene, canvas);
    if (e.clientX >= box.left && e.clientX < box.right && e.clientY >= box.top && e.clientY < box.bottom) petAt = performance.now();
  });

  return {
    at(now) {
      const petAge = (now - petAt) / 1000;
      if (petAge >= 0 && petAge < scene.petLength) return { kind: "pet", age: petAge };
      if (buttonAt !== null) return { kind: "button", age: Math.max(0, now - buttonAt) / 1000, faceLeft };
      return null;
    },
  };
}

// Astro's sprite box on screen, in CSS pixels.
function astroBox(scene, canvas) {
  const rect = canvas.getBoundingClientRect();
  const s = rect.width / scene.W;
  return {
    left: rect.left + scene.astro.x0 * s,
    right: rect.left + scene.astro.x1 * s,
    top: rect.top + scene.astro.y0 * s,
    bottom: rect.top + scene.astro.y1 * s,
  };
}

function centreX(box) {
  return (box.left + box.right) / 2;
}

// Scene time runs on the wall clock and is kept for the tab, so the scene carries on across page
// loads (rule 8). startAt (seconds) restarts it at that point instead, as the delivery does.
function createClock(startAt) {
  let zeroAt = startAt === undefined ? readStoredNumber(CLOCK_KEY) : NaN;
  if (!Number.isFinite(zeroAt)) {
    zeroAt = Date.now() - (startAt ?? 0) * 1000;
    storeNumber(CLOCK_KEY, zeroAt);
  }
  const offsetMs = Date.now() - zeroAt - performance.now();
  return (now) => (now + offsetMs) / 1000;
}

// ---- Framing ----------------------------------------------------------------

// The scene is scaled by a whole number of device pixels per scene pixel, so every pixel stays a
// crisp square, and always covers the screen. It is anchored to the bottom, so any crop comes off
// the sky and the snow, village and Astro stay whole.
// Sideways, on wide screens Astro must stand clear of the content panel (rule 4), zooming in a step
// or two if that is what it takes. Where that isn't possible (phones, where the panel is full
// width) the source's framing applies: centre light crops and follow Astro on tall screens.
// sceneWindow: the letter page's window above the panel on phones (rule 13), or null.
function frame(canvas, scene, panel, sceneWindow) {
  const dpr = devicePixelRatio || 1;
  const vw = canvas.parentElement.clientWidth * dpr;
  const vh = canvas.parentElement.clientHeight * dpr;
  const panelRight = panel.getBoundingClientRect().right * dpr;
  const cover = Math.max(1, Math.ceil(Math.max(vw / scene.W, vh / scene.H) - 1e-6));

  let scale = cover;
  let left = null;
  for (let s = cover; s <= cover + MAX_EXTRA_ZOOM && left === null; s++) {
    scale = s;
    left = leftKeepingAstroClear(scene, s, vw, panelRight);
  }
  if (left === null) {
    scale = cover;
    left = leftFollowingAstro(scene, cover, vw);
  }

  const width = scene.W * scale;
  const height = scene.H * scale;
  Object.assign(canvas.style, {
    width: `${width / dpr}px`,
    height: `${height / dpr}px`,
    left: `${Math.round(left) / dpr}px`,
    top: `${Math.round(vh - height) / dpr}px`,
  });
  placeInWindow(canvas, sceneWindow, vh / dpr);
}

// Rule 13: below the window on phones, the page takes the colour of the scene's bottom edge, so the
// snow carries on behind the panel instead of stopping in a hard line. Elsewhere the scene covers it.
function paintAroundScene(canvas) {
  const row = canvas.getContext("2d").getImageData(0, canvas.height - 1, canvas.width, 1).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < row.length; i += 4) {
    sum[0] += row[i];
    sum[1] += row[i + 1];
    sum[2] += row[i + 2];
  }
  const pixels = row.length / 4;
  canvas.parentElement.style.background = `rgb(${sum.map((total) => Math.round(total / pixels)).join(", ")})`;
}

// Rule 13: how far up the scene moves so its ground sits at the bottom of the window (0 when the
// window is hidden, on wider screens). CSS applies the shift once the content shows, so that moment
// slides the scene up; a reframe places it at once.
function placeInWindow(canvas, sceneWindow, screenHeight) {
  const windowHeight = sceneWindow?.offsetHeight ?? 0;
  canvas.style.transition = "none";
  canvas.style.setProperty("--window-shift", `${windowHeight ? windowHeight - screenHeight : 0}px`);
  canvas.getBoundingClientRect(); // apply the shift before transitions come back
  canvas.style.transition = "";
}

// The left offset that keeps the screen covered and Astro between the panel and the right edge,
// as centred as that allows; null if no offset does.
function leftKeepingAstroClear(scene, s, vw, panelRight) {
  const width = scene.W * s;
  const min = Math.max(vw - width, panelRight - scene.astro.x0 * s);
  const max = Math.min(0, vw - scene.astro.x1 * s);
  return min > max ? null : clamp((vw - width) / 2, min, max);
}

function leftFollowingAstro(scene, s, vw) {
  const width = scene.W * s;
  const centre = (vw - width) / 2;
  const onAstro = vw / 2 - scene.focusX * s;
  const weight = clamp((width / vw - 1.35) / 0.5, 0, 1);
  return clamp(centre + (onAstro - centre) * weight, vw - width, 0);
}

// ---- Helpers ----------------------------------------------------------------

function loadImage(url) {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// sessionStorage can be unavailable (privacy modes); the scene then simply restarts on each page.
function readStoredNumber(key) {
  try { return Number(sessionStorage.getItem(key) ?? NaN); } catch { return NaN; }
}

function storeNumber(key, value) {
  try { sessionStorage.setItem(key, String(value)); } catch { /* not kept for the tab */ }
}
