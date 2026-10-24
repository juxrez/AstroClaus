// Single script entry point.
//
// Motion: the letter's entrance is CSS (site.css). Other animations can hook onto
// [data-motion="..."] elements already in the markup (hero). Astro moves only in the
// diorama (js/diorama).

import { startDiorama } from "./diorama/diorama.js";

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

// ---- Picture modal (view page) ----------------------------------------------
// One modal for every picture on the letter. Clicking a picture fills it with that picture,
// its wish's name and the wish's link. Ctrl/Cmd/Shift-click still opens the picture in a new
// tab, and without this script every click does.
function initPictureModal() {
  const modal = $("#picture-modal");
  if (!modal) return;

  const title = $("[data-picture-title]", modal);
  const image = $("[data-picture-image]", modal);
  const findIt = $("[data-picture-link]", modal);

  $$("[data-picture]").forEach((picture) =>
    picture.addEventListener("click", async (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();

      const wish = picture.closest("[data-letter-wish]");
      const wishLink = $("[data-wish-link]", wish);
      title.textContent = $("[data-wish-name]", wish).textContent;
      findIt.hidden = !wishLink;
      if (wishLink) findIt.href = wishLink.href;

      // The modal is sized from the picture's shape, so know it before opening. The thumbnail
      // already loaded this same file, so this is quick.
      image.src = picture.href;
      image.alt = $("img", picture).alt;
      await image.decode().catch(() => {});
      image.style.setProperty("--picture-ratio", image.naturalWidth / image.naturalHeight || 1);

      modal.showModal();
    }));
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
// onSend: called as the letter is sent, so the diorama comes to the front while it saves.
function initCreateForm(onSend) {
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

  // Refuse anything over the limit before it is uploaded
  list.addEventListener("change", (e) => {
    const input = e.target.closest("[data-image]");
    if (!input) return;
    let file = input.files[0];
    imageError.hidden = true;

    if (file && file.size > maxImageBytes) {
      input.value = "";
      imageError.textContent = `${file.name} is over ${maxImageBytes / 1024} KB. Try a screenshot instead.`;
      imageError.hidden = false;
      file = null;
    }
    setThumbnail(input.closest("[data-picture-slot]"), file);
    showPictures(input.closest("[data-wish]"));
  });

  rows().forEach(showPictures);

  // Sending: the button says so at once, and the letter can't be sent twice (a double click, or
  // Enter in a field while it saves). data-sending on <html> also shows the sending card (site.css).
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

  // The server reads wishes as a gap-free list, so number them just before sending
  form.addEventListener("submit", (e) => {
    if (form.hasAttribute("data-sending")) {
      e.preventDefault();
      return;
    }
    setSending(true);
    rows().forEach((row, i) => {
      $$("[name]", row).forEach((el) => (el.name = el.name.replace(/Wishes\[[^\]]*\]/, `Wishes[${i}]`)));
    });
    onSend();
  });

  // Back from the letter page, the browser shows this page as it was left: ready to send again
  addEventListener("pageshow", (e) => { if (e.persisted) setSending(false); });

  refresh();
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
initPictureModal();
initShare();
initCreateForm(diorama.bringToFront);
