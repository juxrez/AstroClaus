// The words the page script writes, in the page's language. _Layout lists them, keyed by their
// English, in #script-words; a word missing there shows in English. {0}, {1}... are filled in order.
let words = null;

export function say(english, ...values) {
  if (!words) {
    try {
      words = JSON.parse(document.getElementById("script-words")?.textContent || "{}");
    } catch {
      words = {};
    }
  }
  return (words[english] ?? english).replace(/\{(\d+)\}/g, (_, i) => values[i]);
}
