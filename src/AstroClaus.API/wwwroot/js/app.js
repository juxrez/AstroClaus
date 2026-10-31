// Single script entry point.
//
// Motion: the letter's entrance is CSS (site.css). Other animations can hook onto
// [data-motion="..."] elements already in the markup (hero). Astro moves only in the
// diorama (js/diorama).

import { startDiorama } from "./diorama/diorama.js";
import { shrinkPicture } from "./shrink-picture.js";

const SEND_TIMEOUT_MS = 60000; // a letter not sent by then counts as failed (DESIGN.md §2, rule 6)

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// ---- Just sent (view page) --------------------------------------------------
// The "just sent" moment plays once. Drop ?sent from the address so a reload, or a link copied from
// the address bar, shows the letter page the way everyone else sees it (DESIGN.md §2, rule 7).
function forgetJustSent() {
  const url = new URL(location.href);
  if (!url.searchParams.has("sent")) return;
  url.searchParams.delete("sent");
  history.replaceState(history.state, "", url);
}

// ---- Modals (terms, picture) -------------------------------------------------
// A button with data-open-modal="<id>" opens <dialog class="modal" id="<id>">. Its
// [data-close-modal] buttons, Escape (built in) or a click on the backdrop close it.
function initModals() {
  $$("[data-open-modal]").forEach((button) =>
    button.addEventListener("click", () => document.getElementById(button.dataset.openModal).showModal()));

  $$("dialog.modal").forEach((modal) => {
    $$("[data-close-modal]", modal).forEach((button) => button.addEventListener("click", () => modal.close()));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  });
}

// ---- Support modal (Ko-fi) --------------------------------------------------
// A [data-support] link opens Ko-fi's form in the support modal instead of a new tab. The form loads on
// the first open, so Ko-fi isn't contacted for visitors who never ask for it.
function initSupportModal() {
  const modal = $("#support-modal");
  if (!modal) return;
  const form = $("iframe", modal);

  $$("[data-support]").forEach((link) => link.addEventListener("click", (e) => {
    e.preventDefault();
    if (!form.src) form.src = form.dataset.src;
    modal.showModal();
  }));
}

// ---- Picture modal (view page) ----------------------------------------------
// One modal for every picture on the letter. Clicking a picture fills it with that picture,
// its wish's name and the wish's link; ← → or a swipe go through the letter's other pictures,
// in order. Ctrl/Cmd/Shift-click still opens the picture in a new tab, and without this
// script every click does.
function initPictureModal() {
  const modal = $("#picture-modal");
  if (!modal) return;

  const title = $("[data-picture-title]", modal);
  const image = $("[data-picture-image]", modal);
  const count = $("[data-picture-count]", modal);
  const findIt = $("[data-picture-link]", modal);
  const pictures = $$("[data-picture]");
  let at = 0;
  let latest = 0; // a picture that finishes loading after a newer one was asked for is ignored

  // The next picture shows at once, with no motion: it is stepped to by key.
  const show = async (i) => {
    at = (i + pictures.length) % pictures.length;
    const picture = pictures[at];
    const load = ++latest;

    const wish = picture.closest("[data-letter-wish]");
    const wishLink = $("[data-wish-link]", wish);
    title.textContent = $("[data-wish-name]", wish).textContent;
    count.textContent = pictures.length > 1 ? `${at + 1} of ${pictures.length}` : "";
    findIt.hidden = !wishLink;
    if (wishLink) findIt.href = wishLink.href;

    // The modal is sized from the picture's shape, so know it before showing it. The letter
    // already loaded this same file, so this is quick.
    image.src = picture.href;
    image.alt = $("img", picture).alt;
    await image.decode().catch(() => {});
    if (load === latest) image.style.setProperty("--picture-ratio", image.naturalWidth / image.naturalHeight || 1);
  };

  pictures.forEach((picture, i) =>
    picture.addEventListener("click", async (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      await show(i);
      modal.showModal();
    }));

  addEventListener("keydown", (e) => {
    const step = modal.open && { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    show(at + step);
  });

  // A swipe across the picture: a quick flick is enough, it needn't travel far
  let swipe = null;
  image.addEventListener("pointerdown", (e) => (swipe = { x: e.clientX, time: e.timeStamp }));
  image.addEventListener("pointercancel", () => (swipe = null));
  image.addEventListener("pointerup", (e) => {
    if (!swipe) return;
    const distance = e.clientX - swipe.x;
    const velocity = Math.abs(distance) / (e.timeStamp - swipe.time || 1);
    swipe = null;
    if (Math.abs(distance) > 48 || (Math.abs(distance) > 12 && velocity > 0.11)) show(at + (distance < 0 ? 1 : -1));
  });
}

// ---- Share section (view page) --------------------------------------------
function initShare() {
  const copy = $("#copy-link");
  if (!copy) return;

  copy.addEventListener("click", async () => {
    const link = $("#share-link").value;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      $("#share-link").select();
      document.execCommand("copy");
    }
    const label = $("[data-label]", copy);
    label.textContent = "Link copied";
    setTimeout(() => (label.textContent = "Copy link"), 2000);
  });

  const nativeShare = $("#native-share");
  if (navigator.share) {
    nativeShare.hidden = false;
    nativeShare.addEventListener("click", () =>
      navigator.share({ title: "A letter to Santa", url: $("#share-link").value }).catch(() => {}));
  }
}

// ---- Create letter form ----------------------------------------------------
// onSend({ from, message }): called as the letter is sent; the letter flies to Astro, and the
// returned promise resolves once he has caught it.
// onAdd: called when a wish or a picture is added, so Astro can hop for joy.
// onFail: called when the letter couldn't be sent; it comes back, and the promise resolves as the
// form comes back in.
function initCreateForm({ onSend, onAdd, onFail }) {
  const form = $("#letter-form");
  if (!form) return;

  const maxWishes = Number(form.dataset.maxWishes);
  const maxImages = Number(form.dataset.maxImages);
  const maxImageBytes = Number(form.dataset.maxImageBytes);
  const list = $("#wishes");
  const template = $("#wish-template");
  const addButton = $("#add-wish");
  const wishCount = $("#wish-count");
  const imageError = $("#image-error");

  // Message counter
  const message = $("#message");
  const count = $("#message-count");
  const updateCount = () => (count.textContent = message.value.length);
  message.addEventListener("input", updateCount);
  updateCount();

  // The sign-off on the paper fills in with the nickname as it is typed
  const from = $("#from");
  from.addEventListener("input", () => ($("#sign-name").textContent = from.value.trim()));

  // Wishes: numbered in order; the only wish can't be removed; Add a wish hides at the maximum.
  // A wish fading out is already left out.
  const rows = () => $$("[data-wish]:not([data-leaving])", list);
  const refresh = () => {
    rows().forEach((row, i) => {
      const remove = $("[data-remove-wish]", row);
      $("[data-wish-label]", row).textContent = `Wish ${i + 1}`;
      remove.setAttribute("aria-label", `Remove wish ${i + 1}`);
      remove.hidden = rows().length === 1;
    });
    wishCount.textContent = rows().length;
    addButton.hidden = rows().length >= maxWishes;
  };

  addButton.addEventListener("click", () => {
    if (rows().length >= maxWishes) return;
    list.append(template.content.cloneNode(true));
    const row = rows().at(-1);
    row.classList.add("is-new");
    showPictures(row);
    refresh();
    $("input[type=text]", row).focus();
    onAdd();
  });

  list.addEventListener("click", async (e) => {
    const removeWish = e.target.closest("[data-remove-wish]");
    if (removeWish && rows().length > 1) {
      const row = removeWish.closest("[data-wish]");
      row.dataset.leaving = "";
      $$("[name]", row).forEach((field) => (field.disabled = true)); // not sent if Send is pressed while it fades
      refresh();
      addButton.focus();
      await fadeOut(row);
      row.remove();
    }

    const removePicture = e.target.closest("[data-remove-picture]");
    if (removePicture) {
      const slot = removePicture.closest("[data-picture-slot]");
      const input = $("[data-image]", slot);
      await fadeOut($("[data-thumb]", slot));
      input.value = "";
      setThumbnail(slot, null);
      showPictures(slot.closest("[data-wish]"));
      input.focus();
    }
  });

  // Pictures: each picture field has a slot that shows its thumbnail once a picture is picked.
  // Only the first empty slot shows its Add image tile.
  const showPictures = (row) => {
    let tileShown = false;
    let picked = 0;
    for (const slot of $$("[data-picture-slot]", row)) {
      const filled = $("[data-image]", slot).files.length > 0;
      $("[data-thumb]", slot).hidden = !filled;
      $(".add-image", slot).hidden = filled || tileShown;
      if (filled) picked++;
      else tileShown = true;
    }
    $("[data-images-count]", row).textContent = `${picked} of ${maxImages} images`;
    $("[data-images-hint]", row).hidden = picked > 0;
  };

  const setThumbnail = (slot, file) => {
    const image = $("[data-thumb] img", slot);
    if (image.src) URL.revokeObjectURL(image.src);
    image.removeAttribute("src");
    if (file) image.src = URL.createObjectURL(file);
    $("[data-remove-picture]", slot).setAttribute("aria-label", file ? `Remove picture ${file.name}` : "Remove picture");
  };

  // A picked picture is shrunk first (shrink-picture.js), and refused only if it is still over the
  // limit. Send waits for any still being shrunk.
  const shrinking = new Set();
  const pick = async (input) => {
    const picked = input.files[0];
    let file = picked && await shrinkPicture(picked, maxImageBytes);
    if (input.files[0] !== picked) return; // another picture was picked meanwhile; that one counts
    if (file !== picked && !setFile(input, file)) file = picked;

    if (file && file.size > maxImageBytes) {
      input.value = "";
      imageError.textContent = `${picked.name} is too big. Try a different picture.`;
      imageError.hidden = false;
      file = null;
    }
    setThumbnail(input.closest("[data-picture-slot]"), file);
    showPictures(input.closest("[data-wish]"));
    if (file) onAdd();
  };
  list.addEventListener("change", async (e) => {
    const input = e.target.closest("[data-image]");
    if (!input) return;
    imageError.hidden = true;
    const job = pick(input);
    shrinking.add(job);
    await job;
    shrinking.delete(job);
  });

  rows().forEach(showPictures);

  // Field errors: shown on load when the server drew the page with them (sent without this script),
  // and after a background send it refused. Editing a field clears its error.
  const errors = createFieldErrors(form);
  errors.showRendered();
  form.addEventListener("input", (e) => errors.clear(e.target));
  form.addEventListener("change", (e) => errors.clear(e.target));

  // Sending: the button says so at once, and the letter can't be sent twice (a double click, or
  // Enter in a field while it saves). data-sending on <html> also hurries the panel's fade (site.css).
  const send = $("#send");
  const sendLabel = $("[data-label]", send);
  const sendText = sendLabel.textContent;
  const setSending = (sending) => {
    form.toggleAttribute("data-sending", sending);
    document.documentElement.toggleAttribute("data-sending", sending);
    if (sending) send.setAttribute("aria-disabled", "true");
    else send.removeAttribute("aria-disabled");
    sendLabel.textContent = sending ? "Sending…" : sendText;
  };

  // The server checks the text first, so the letter only folds and flies to Astro if it will be
  // accepted; otherwise the fields show what's wrong and nothing moves. Then the letter uploads in
  // the background while it flies (no flight with reduced motion), and the letter page opens once
  // both are done. If it can't be sent, nothing is lost: the letter comes back and a modal says so,
  // without the server's details (DESIGN.md §2, rule 6). The server reads wishes as a gap-free
  // list, so they are numbered just before sending.
  const failed = $("#send-failed");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.hasAttribute("data-sending")) return;
    setSending(true);
    errors.clearAll();
    await Promise.all(shrinking);
    rows().forEach((row, i) => {
      $$("[name]", row).forEach((el) => (el.name = el.name.replace(/Wishes\[[^\]]*\]/, `Wishes[${i}]`)));
    });

    const check = await checkText(form);
    if (!check?.ok) {
      setSending(false);
      if (check?.errors) errors.show(check.errors);
      else failed.showModal();
      return;
    }

    const flying = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const caught = flying ? onSend({ from: from.value.trim(), message: message.value.trim() }) : null;
    const [result] = await Promise.all([upload(form), caught]);
    if (result?.letterPage) {
      location.assign(result.letterPage);
      return;
    }
    await onFail();
    setSending(false);
    if (result?.errors) errors.show(result.errors);
    else failed.showModal();
  });

  // Back from the letter page, the browser shows this page as it was left: ready to send again
  addEventListener("pageshow", (e) => { if (e.persisted) setSending(false); });

  refresh();
}

// Asks the server to check the letter's text without saving it (Create.cshtml.cs, OnPostCheck). The
// pictures stay behind: they are checked when the letter is sent. Resolves with { ok: true },
// { errors } (field name -> messages), or null if the server couldn't be reached.
async function checkText(form) {
  const body = new FormData(form);
  for (const [name, value] of [...body]) if (value instanceof File) body.delete(name);
  const url = new URL(form.action);
  url.searchParams.set("handler", "Check");
  try {
    const response = await fetch(url, { method: "POST", body, signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
    if (response.ok) return { ok: true };
    if (response.status === 400 && response.headers.get("content-type")?.includes("json")) {
      const { errors } = await response.json();
      if (errors) return { errors };
    }
    console.error(`The letter couldn't be checked: the server answered ${response.status}`);
  } catch (error) {
    console.error("The letter couldn't be checked", error);
  }
  return null;
}

// Sends the letter. Resolves with { letterPage } once sent, { errors } (field name -> messages) if
// the server refused something in the letter, or null if it wasn't sent for any other reason: no
// answer within SEND_TIMEOUT_MS, no connection, or a server error.
async function upload(form) {
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "text/html, application/json" }, // refusals come back as JSON (Create.cshtml.cs)
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
    });
    if (response.ok && response.redirected && new URL(response.url).pathname.startsWith("/letter/")) return { letterPage: response.url };
    if (response.status === 400 && response.headers.get("content-type")?.includes("json")) {
      const { errors } = await response.json();
      if (errors) return { errors };
    }
    console.error(`The letter wasn't sent: the server answered ${response.status} at ${new URL(response.url).pathname}`);
  } catch (error) {
    console.error("The letter wasn't sent", error);
  }
  return null;
}

// Errors the server found in the letter (Create.cshtml.cs), shown on their fields: the field turns
// red, shakes once and shows its message under it (site.css). Fields are found by name, and so are
// their messages (data-valmsg-for), which the server also draws when it shows the page itself.
// Errors that belong to no field are listed at the top of the form.
function createFieldErrors(form) {
  const INVALID = "input-validation-error";
  const summary = $("[data-form-errors]", form);
  const fieldNamed = (name) => {
    const field = name && form.elements.namedItem(name);
    return field instanceof Element ? field : null;
  };
  const target = (field) => field.closest("[data-error-target]") ?? field;
  const noteFor = (field) => $$("[data-valmsg-for]", form).find((note) => note.dataset.valmsgFor === field.name);

  const mark = (field, message) => {
    let note = noteFor(field);
    if (!note) {
      note = document.createElement("span");
      note.dataset.valmsgFor = field.name;
      target(field).after(note);
    }
    note.id ||= `error-${field.name}`;
    note.className = "field-error field-validation-error";
    note.textContent = message;
    field.classList.add(INVALID);
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", note.id);
    shake(target(field));
  };

  const clear = (field) => {
    if (!field?.classList?.contains(INVALID)) return;
    field.classList.remove(INVALID);
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    const note = noteFor(field);
    if (note) { note.className = "field-error field-validation-valid"; note.textContent = ""; }
  };

  const showSummary = (messages) => {
    if (!summary) return;
    const list = summary.querySelector("ul") ?? summary.appendChild(document.createElement("ul"));
    list.replaceChildren(...messages.map((text) => Object.assign(document.createElement("li"), { textContent: text })));
    summary.classList.toggle("validation-summary-errors", messages.length > 0);
    summary.classList.toggle("validation-summary-valid", messages.length === 0);
  };

  // The first problem is brought into view and focused, so it can be fixed straight away
  const reveal = (element, focusable) => {
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    focusable?.focus({ preventScroll: true });
  };

  return {
    clear,
    clearAll() {
      $$("." + INVALID, form).forEach(clear);
      showSummary([]);
    },
    show(errors) {
      const general = [];
      let first = null;
      for (const [name, messages] of Object.entries(errors)) {
        const field = fieldNamed(name);
        if (field) { mark(field, messages[0]); first ??= field; }
        else general.push(...messages);
      }
      showSummary(general);
      if (first) reveal(target(first), first);
      else if (general.length) reveal(summary);
    },
    showRendered() {
      const rendered = $$(".field-validation-error[data-valmsg-for]", form)
        .map((note) => [fieldNamed(note.dataset.valmsgFor), note.textContent.trim()])
        .filter(([field, message]) => field && message);
      rendered.forEach(([field, message]) => mark(field, message));
      if (rendered.length) reveal(target(rendered[0][0]), rendered[0][0]);
    }
  };
}

// Shakes an element once, side to side (site.css); with reduced motion, it doesn't move.
function shake(element) {
  element.classList.remove("shake");
  void element.offsetWidth; // restart the animation if it is still running
  element.classList.add("shake");
  element.addEventListener("animationend", () => element.classList.remove("shake"), { once: true });
}

// Only the page change after Send crossfades (site.css); every other page change stays a plain cut.
function keepPageChangesPlain() {
  addEventListener("pageswap", (e) => {
    if (e.viewTransition && !document.documentElement.hasAttribute("data-letter-caught")) e.viewTransition.skipTransition();
  });
}

// Puts a file in a file field in place of the one picked. False where the browser doesn't allow it.
function setFile(input, file) {
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    return true;
  } catch {
    return false;
  }
}

// Removed wish cards and pictures fade out before they go (DESIGN.md §4); with reduced motion, at once.
function fadeOut(element) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  return element.animate(
    [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.98)" }],
    { duration: 150, easing: "ease-out" }).finished;
}

const diorama = startDiorama();
forgetJustSent();
initModals();
initSupportModal();
initPictureModal();
initShare();
initCreateForm({ onSend: diorama.sendLetter, onAdd: diorama.cheer, onFail: diorama.returnLetter });
keepPageChangesPlain();
