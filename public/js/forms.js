document.addEventListener("submit", (e) => {
  const form = e.target;

  if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) {
    e.preventDefault();
    return;
  }

  // Photo uploads can take a while, and a second click would create a duplicate
  if (form.dataset.savingLabel) {
    const button = form.querySelector('button[type="submit"]');
    button.dataset.originalLabel = button.textContent;
    button.textContent = form.dataset.savingLabel;
    button.disabled = true;
  }
});

// Browsers can restore the page from cache on Back, with the button still disabled
window.addEventListener("pageshow", () => {
  document.querySelectorAll("button[data-original-label]").forEach((button) => {
    button.textContent = button.dataset.originalLabel;
    button.disabled = false;
  });
});
