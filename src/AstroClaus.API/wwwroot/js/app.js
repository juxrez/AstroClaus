// Single script entry point.
//
// Motion: animations hook onto [data-motion="..."] elements already in the markup
// (hero, letter-paper, wish-item, share-modal). Import Motion here and animate those;
// nothing in the pages needs to change. Astro moves only in the diorama (js/diorama).

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

// ---- Modals (share, terms, picture) ------------------------------------------
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

// ---- Share modal (view page) ----------------------------------------------
// contentShown: the modal opens on a just-sent letter only once the delivery has played.
function initShareModal(contentShown) {
  const modal = $("#share-modal");
  if (!modal) return;

  const copy = $("#copy-link");
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

  if ($("[data-open-share='true']")) contentShown.then(() => modal.showModal());
}

// ---- Create letter form ----------------------------------------------------
// onSend: called as the letter is sent, so the diorama comes to the front while it saves.
function initCreateForm(onSend) {
  const form = $("#letter-form");
  if (!form) return;

  const maxWishes = Number(form.dataset.maxWishes);
  const maxImageBytes = Number(form.dataset.maxImageBytes);
  const list = $("#wishes");
  const template = $("#wish-template");
  const addButton = $("#add-wish");
  const imageError = $("#image-error");

  // Message counter
  const message = $("#message");
  const count = $("#message-count");
  const updateCount = () => (count.textContent = message.value.length);
  message.addEventListener("input", updateCount);
  updateCount();

  // Wishes
  const rows = () => $$("[data-wish]", list);
  const refresh = () => {
    addButton.disabled = rows().length >= maxWishes;
    $$("[data-remove-wish]", list).forEach((b) => (b.hidden = rows().length === 1));
  };

  addButton.addEventListener("click", () => {
    if (rows().length >= maxWishes) return;
    list.append(template.content.cloneNode(true));
    refresh();
    rows().at(-1).querySelector("input[type=text]").focus();
  });

  list.addEventListener("click", (e) => {
    const remove = e.target.closest("[data-remove-wish]");
    if (remove && rows().length > 1) {
      remove.closest("[data-wish]").remove();
      refresh();
    }
  });

  // Pictures: refuse anything over the limit before it is uploaded
  list.addEventListener("change", (e) => {
    const input = e.target.closest("[data-image]");
    if (!input) return;
    const file = input.files[0];
    const label = input.closest("label");
    imageError.hidden = true;

    if (file && file.size > maxImageBytes) {
      input.value = "";
      imageError.textContent = `${file.name} is over ${maxImageBytes / 1024} KB. Try a screenshot instead.`;
      imageError.hidden = false;
      label.classList.remove("is-filled");
      label.firstChild.textContent = "Add picture";
      return;
    }
    label.classList.toggle("is-filled", Boolean(file));
    label.firstChild.textContent = file ? "Picture added" : "Add picture";
  });

  // The server reads wishes as a gap-free list, so number them just before sending
  form.addEventListener("submit", () => {
    rows().forEach((row, i) => {
      $$("[name]", row).forEach((el) => (el.name = el.name.replace(/Wishes\[[^\]]*\]/, `Wishes[${i}]`)));
    });
    onSend();
  });

  refresh();
}

const diorama = startDiorama();
forgetJustSent();
initModals();
initPictureModal();
initShareModal(diorama.contentShown);
initCreateForm(diorama.bringToFront);
