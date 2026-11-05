// Send on Create (design/DESIGN.md §2, rule 6): the letter folds into an envelope and flies to Astro.
// A letter opened for the first time (rule 7a) goes the other way: see flyLetterOut.
//
// In order: a sheet of letter paper with the child's own words settles where the panel was, folds in
// three like a real letter, becomes the scene's pixel-art envelope as its seal pops on, then flies in
// an arc to Astro's mouth, shrinking to exactly the size of the envelope the scene draws there, so
// the hand-over to the scene can't be seen. Built on the page, above everything, and gone once he
// has caught it.

import { say } from "../words.js";

const SETTLE_MS = 300;
const FOLD_MS = 300;   // each of the two folds
const SEAL_MS = 250;
const FLY_MS = 800;
const SHEET = { w: 200, h: 420 };   // folded in three it is 200x140: the envelope's 10x7 at 20 px a pixel
const ENVELOPE_PX = 20;
const OUT_FLY_MS = 650;  // the way out: from his mouth to the page...
const OUT_SEAL_MS = 170; // ...the seal pops...
const OUT_RISE_MS = 300; // ...the paper rises out...
const OUT_FADE_MS = 300; // ...and goes as the real letter comes in

/** From Send to the catch, in ms. */
export const CATCH_MS = SETTLE_MS + 2 * FOLD_MS + SEAL_MS + FLY_MS;

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

/**
 * Starts the flight at once.
 * @param letter  { from, message }: the child's own words, for the sheet
 * @param from    the box the sheet settles in (the visible part of the panel), in CSS pixels
 * @param to      { left, top, pixel }: where the envelope sits in Astro's mouth, and a scene pixel's size
 * @param art     { plain, sealed }: the envelope as 10x7 canvases, without and with its seal
 * @returns {Promise<void>} resolves as it reaches his mouth, about CATCH_MS from now; the scene should
 *   draw his envelope from its next frame. This one stays for that frame, then goes.
 */
export function flyLetter(letter, from, to, art) {
  const stage = el("div", "letter-flight");
  stage.setAttribute("aria-hidden", "true");

  // The sheet is drawn at full size, centred in the box and scaled down around its centre to fit short screens
  const fit = Math.min(1, (from.height - 48) / SHEET.h, (from.width - 48) / SHEET.w);
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;

  const sheet = el("div", "flight-sheet");
  Object.assign(sheet.style, { left: `${cx - SHEET.w / 2}px`, top: `${cy - SHEET.h / 2}px`, transform: `scale(${fit})` });
  const flaps = ["top", "middle", "bottom"].map((name, third) => flap(name, third, letter));
  sheet.append(...flaps);

  // The envelope starts exactly over the folded letter: the sheet's middle third
  const envelope = el("div", "flight-envelope");
  const seal = pixels(sealOnly(art.plain, art.sealed));
  seal.classList.add("flight-seal");
  envelope.append(pixels(art.plain), seal);

  stage.append(sheet, envelope);
  document.body.append(stage);

  let at = 0;
  const play = (element, keyframes, duration, easing = "linear") =>
    element.animate(keyframes, { duration, easing, delay: at, fill: "both" });

  play(sheet, [{ opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1 }], SETTLE_MS, EASE_OUT);
  at += SETTLE_MS;
  play(flaps[2], [{ transform: "perspective(900px) rotateX(0deg)" }, { transform: "perspective(900px) rotateX(180deg)" }], FOLD_MS, EASE_IN_OUT);
  at += FOLD_MS;
  play(flaps[0], [{ transform: "perspective(900px) rotateX(0deg)" }, { transform: "perspective(900px) rotateX(-180deg)" }], FOLD_MS, EASE_IN_OUT);
  at += FOLD_MS;

  // The folded letter becomes the envelope in place, and the seal pops on
  play(sheet, [{ opacity: 1 }, { opacity: 0 }], 120);
  play(envelope, [{ opacity: 0 }, { opacity: 1 }], 120);
  play(seal, [{ scale: 0 }, { scale: 1.3, offset: 0.6 }, { scale: 1 }], SEAL_MS, EASE_OUT);
  at += SEAL_MS;

  // The flight: an arc from the folded letter to his mouth, shrinking as it goes, a little tilt on the way
  const start = { x: cx - (SHEET.w / 2) * fit, y: cy - (SHEET.h / 2) * fit + (SHEET.h / 3) * fit, k: fit };
  const end = { x: to.left, y: to.top, k: to.pixel / ENVELOPE_PX };
  const peak = Math.min(start.y, end.y) - 120;
  const frames = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = start.x + (end.x - start.x) * t;
    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * peak + t * t * end.y;
    const k = start.k + (end.k - start.k) * t;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${k}) rotate(${-12 * Math.sin(Math.PI * t)}deg)` });
  }
  const flight = play(envelope, frames, FLY_MS, EASE_IN_OUT);

  return flight.finished.then(() => {
    // Gone on the second frame from now: by then the scene has drawn the envelope in his mouth
    requestAnimationFrame(() => requestAnimationFrame(() => stage.remove()));
  });
}

/**
 * The other way: Astro throws the envelope to the page. It flies in an arc from his mouth, growing,
 * the seal pops, and the paper rises out of it. Starts at once.
 * @param letter  { from, message }: the child's own words, for the sheet
 * @param from    { left, top, pixel }: where the envelope is in his mouth, and a scene pixel's size
 * @param to      the box the sheet ends up centred in, in CSS pixels
 * @param art     { plain, sealed }: the envelope as 10x7 canvases, facing right (he faces left: they are mirrored)
 * @returns {{ opened: Promise<void>, fade: () => void }} opened resolves with the paper out;
 *   fade() then lets the sheet go as the real letter comes in
 */
export function flyLetterOut(letter, from, to, art) {
  const stage = el("div", "letter-flight");
  stage.setAttribute("aria-hidden", "true");

  const fit = Math.min(1, (to.height - 48) / SHEET.h, (to.width - 48) / SHEET.w);
  const cx = to.left + to.width / 2;
  const cy = to.top + to.height / 2;

  const sheet = el("div", "flight-sheet");
  Object.assign(sheet.style, { left: `${cx - SHEET.w / 2}px`, top: `${cy - SHEET.h / 2}px`, transform: `scale(${fit})` });
  sheet.append(...["top", "middle", "bottom"].map((name, third) => flap(name, third, letter)));

  const plain = mirrored(art.plain);
  const envelope = el("div", "flight-envelope");
  const seal = pixels(sealOnly(plain, mirrored(art.sealed)));
  seal.classList.add("flight-seal");
  envelope.append(pixels(plain), seal);

  stage.append(sheet, envelope);
  document.body.append(stage);

  let at = 0;
  const play = (element, keyframes, duration, easing = "linear") =>
    element.animate(keyframes, { duration, easing, delay: at, fill: "both" });

  const start = { x: from.left, y: from.top, k: from.pixel / ENVELOPE_PX };
  const end = { x: cx - (SHEET.w / 2) * fit, y: cy - (SHEET.h / 2) * fit + (SHEET.h / 3) * fit, k: fit };
  const peak = Math.min(start.y, end.y) - 110;
  const frames = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = start.x + (end.x - start.x) * t;
    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * peak + t * t * end.y;
    const k = start.k + (end.k - start.k) * t;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${k}) rotate(${10 * Math.sin(Math.PI * t)}deg)` });
  }
  play(sheet, [{ opacity: 0 }, { opacity: 0 }], OUT_FLY_MS + OUT_SEAL_MS);
  play(envelope, frames, OUT_FLY_MS, EASE_IN_OUT);
  at += OUT_FLY_MS;

  play(seal, [{ scale: 1, opacity: 1 }, { scale: 1.35, opacity: 1, offset: 0.5 }, { scale: 1.6, opacity: 0 }], OUT_SEAL_MS, EASE_OUT);
  at += OUT_SEAL_MS;

  // The paper rises out as the envelope goes
  envelope.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, delay: at, fill: "forwards" });
  const rising = play(sheet, [
    { opacity: 0, clipPath: "inset(33.3% 0 33.3% 0)" },
    { opacity: 1, clipPath: "inset(26% 0 26% 0)", offset: 0.25 },
    { opacity: 1, clipPath: "inset(0 0 0 0)" },
  ], OUT_RISE_MS, EASE_OUT);

  return {
    opened: rising.finished.then(() => {}),
    fade() {
      sheet.animate([{ scale: 1 }, { scale: 1.12 }], { duration: OUT_FADE_MS, easing: EASE_OUT, fill: "both" });
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OUT_FADE_MS, easing: "ease", fill: "both" })
        .finished.then(() => stage.remove());
    },
  };
}

function mirrored(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  context.translate(source.width, 0);
  context.scale(-1, 1);
  context.drawImage(source, 0, 0);
  return canvas;
}

// One third of the sheet: its slice of the letter on the front, plain paper on the back
function flap(name, third, letter) {
  const part = el("div", `flight-flap flight-flap-${name}`);
  const front = el("div", "flight-face");
  const content = sheetContent(letter);
  content.style.top = `${-third * (SHEET.h / 3)}px`;
  front.append(content);
  part.append(front, el("div", "flight-face flight-face-back"));
  return part;
}

function sheetContent({ from, message }) {
  const content = el("div", "flight-content");
  const dear = el("p", "flight-dear");
  dear.textContent = say("Dear Santa,");
  const words = el("p", "flight-words");
  words.textContent = message;
  const love = el("p", "flight-love");
  love.textContent = from ? say("With love, {0}", from) : say("With love");
  content.append(dear, words, love);
  return content;
}

// A copy of a small canvas, shown with crisp square pixels
function pixels(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d").drawImage(source, 0, 0);
  canvas.className = "flight-pixels";
  return canvas;
}

// Only the pixels the seal adds
function sealOnly(plain, sealed) {
  const { width: w, height: h } = plain;
  const a = plain.getContext("2d").getImageData(0, 0, w, h).data;
  const b = sealed.getContext("2d").getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const context = out.getContext("2d");
  const image = context.createImageData(w, h);
  for (let i = 0; i < b.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) image.data.set(b.subarray(i, i + 4), i);
  }
  context.putImageData(image, 0, 0);
  return out;
}

function el(tag, className) {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
