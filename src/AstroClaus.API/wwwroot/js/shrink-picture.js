// Pictures are shrunk in the browser as they are picked (DESIGN.md §4, Create): phone photos are
// several MB, far over the limit. Every picture is redrawn at most 1600 px on its longest side and
// saved as a JPEG, which also drops hidden details such as where a photo was taken. Transparent parts
// turn white. While it is still over the limit it tries a lower quality, then smaller sizes.

const TRIES = [
  { side: 1600, quality: 0.85 },
  { side: 1600, quality: 0.72 },
  { side: 1200, quality: 0.72 },
  { side: 1000, quality: 0.6 },
];

/**
 * @param {File} file the picture as picked
 * @param {number} maxBytes the size it has to fit in
 * @returns {Promise<File>} the shrunk picture (it may still be over maxBytes when even the smallest
 *   try is), or the original if this browser can't read or redraw it
 */
export async function shrinkPicture(file, maxBytes) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    let shrunk = null;
    for (const { side, quality } of TRIES) {
      shrunk = await redraw(image, side, quality);
      if (!shrunk || shrunk.size <= maxBytes) break;
    }
    if (!shrunk) return file;
    const name = file.name.replace(/\.[^.]*$/, "") + ".jpg";
    return new File([shrunk], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The picture at most `side` px on its longest side, on white, as a JPEG; null if the browser can't
function redraw(image, side, quality) {
  const scale = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}
