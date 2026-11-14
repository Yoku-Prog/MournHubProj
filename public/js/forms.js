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
