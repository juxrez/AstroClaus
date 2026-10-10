// Single script entry point.
//
// Motion: animations hook onto [data-motion="..."] elements already in the markup
// (astro, hero, letter-paper, wish-item, share-modal, delivery). Import Motion here
// and animate those; nothing in the pages needs to change.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// ---- Share modal (view page) ----------------------------------------------
function initShareModal() {
  const modal = $("#share-modal");
  if (!modal) return;

  $$("[data-open-modal='share-modal']").forEach((b) => b.addEventListener("click", () => modal.showModal()));
  $$("[data-close-modal]", modal).forEach((b) => b.addEventListener("click", () => modal.close()));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

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

  if ($("[data-open-share='true']")) modal.showModal();
}

// ---- Create letter form ----------------------------------------------------
function initCreateForm() {
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
  });

  refresh();
}

initShareModal();
initCreateForm();
