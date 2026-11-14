document.addEventListener("submit", (e) => {
  const form = e.target;

  if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) {
    e.preventDefault();
    return;
  }

  // Every form shows it's working until the next page arrives. Disabling the
  // button also stops a second click, which would create a duplicate.
  const button = e.submitter || form.querySelector('button[type="submit"]');
  if (!button) return;

  button.classList.add("is-loading");
  button.setAttribute("aria-busy", "true");
  // Photo uploads can take a while, so those forms also say what's happening
  if (form.dataset.savingLabel) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = form.dataset.savingLabel;
  }
  button.disabled = true;
});

// Browsers can restore the page from cache on Back, with the button still disabled
window.addEventListener("pageshow", () => {
  document.querySelectorAll("button.is-loading").forEach((button) => {
    if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
    }
    button.classList.remove("is-loading");
    button.removeAttribute("aria-busy");
    button.disabled = false;
  });
});

// Photos are made smaller here, before they're sent. The server only keeps
// them at this size anyway, and some hosts refuse uploads over a few megabytes,
// which a single phone photo can exceed. If anything fails the original is sent.
const MAX_PHOTO_EDGE = 1200;
let shrinking = 0;

async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 300 * 1024) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  // JPEG has no transparency, so see-through areas become white, not black
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) {
    return file;
  }
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

document.addEventListener("change", async (e) => {
  const input = e.target;
  if (
    !input.matches('input[type="file"]') ||
    input.files.length === 0 ||
    !window.createImageBitmap ||
    !window.DataTransfer
  ) {
    return;
  }

  // The form waits, so it can't be sent with the large originals still in it
  const button = input.form && input.form.querySelector('button[type="submit"]');
  shrinking += 1;
  if (button) {
    button.disabled = true;
    button.classList.add("is-loading");
  }

  try {
    const photos = await Promise.all(
      [...input.files].map((file) => shrinkPhoto(file).catch(() => file)),
    );
    const transfer = new DataTransfer();
    photos.forEach((photo) => transfer.items.add(photo));
    input.files = transfer.files;
  } catch (err) {
    // The originals stay in place
  } finally {
    shrinking -= 1;
    if (button && shrinking === 0) {
      button.disabled = false;
      button.classList.remove("is-loading");
    }
  }
});
