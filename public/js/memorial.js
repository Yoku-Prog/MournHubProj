const slug = document.body.dataset.slug;

// Matches the server's formatDate, so a new message looks like the ones around it
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Candle
const candleBtn = document.getElementById("candleBtn");
const candleCountEl = document.getElementById("candleCount");
const candlePluralEl = document.getElementById("candlePlural");
const candleLabelEl = document.getElementById("candleLabel");
const glowOverlay = document.getElementById("candleGlowOverlay");
const storageKey = "mournhub-lit-" + slug;

// Storage can throw in private browsing, and that shouldn't stop the candle working
function hasLitCandle() {
  try {
    return Boolean(localStorage.getItem(storageKey));
  } catch (err) {
    return false;
  }
}

function rememberLitCandle() {
  try {
    localStorage.setItem(storageKey, "true");
  } catch (err) {
    // Nothing to do: the candle is still counted
  }
}

if (hasLitCandle()) {
  candleBtn.classList.add("is-lit");
  candleLabelEl.textContent = "Candle lit";
  candleBtn.disabled = true;
}

candleBtn.addEventListener("click", async () => {
  if (hasLitCandle()) return;

  candleBtn.disabled = true;
  candleBtn.classList.add("is-loading");
  try {
    const res = await fetch(`/memorial/${slug}/light-candle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();

    if (res.ok) {
      candleCountEl.textContent = data.candleCount;
      candlePluralEl.textContent = data.candleCount === 1 ? "" : "s";
      candleCountEl.classList.add("tick");
      candleBtn.classList.add("is-lit", "just-lit");
      candleLabelEl.textContent = "Candle lit";
      candleLabelEl.classList.add("tick");
      rememberLitCandle();

      glowOverlay.classList.add("is-active");
      setTimeout(() => {
        glowOverlay.classList.remove("is-active");
      }, 1000);
    } else {
      candleBtn.disabled = false;
    }
  } catch (err) {
    candleBtn.disabled = false;
  } finally {
    candleBtn.classList.remove("is-loading");
  }
});

// Guestbook
const guestbookForm = document.getElementById("guestbookForm");
const guestbookList = document.getElementById("guestbookList");
const guestbookError = document.getElementById("guestbookError");
const guestbookSubmit = document.getElementById("guestbookSubmit");

// A new message opens a space for itself, so the ones below move instead of jumping
function openEntry(entryEl) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    entryEl.classList.add("fade-in");
    return;
  }
  const { paddingTop, paddingBottom } = getComputedStyle(entryEl);
  entryEl.style.overflow = "hidden";
  entryEl.animate(
    [
      { height: "0px", paddingTop: "0px", paddingBottom: "0px", opacity: 0 },
      { height: `${entryEl.offsetHeight}px`, paddingTop, paddingBottom, opacity: 1 },
    ],
    { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  ).onfinish = () => {
    entryEl.style.overflow = "";
  };
}

guestbookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  guestbookError.hidden = true;

  const name = document.getElementById("guestName").value.trim();
  const message = document.getElementById("guestMessage").value.trim();

  if (!name || !message) return;

  guestbookSubmit.disabled = true;
  guestbookSubmit.classList.add("is-loading");
  try {
    const res = await fetch(`/memorial/${slug}/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message }),
    });
    const data = await res.json();

    if (res.ok) {
      const entryEl = document.createElement("div");
      entryEl.className = "guestbook-entry";
      entryEl.innerHTML = `
        <p class="guestbook-entry-message"></p>
        <p class="guestbook-entry-meta"></p>
      `;
      entryEl.querySelector(".guestbook-entry-message").textContent =
        data.entry.message;
      entryEl.querySelector(".guestbook-entry-meta").textContent =
        `${data.entry.name}, ${formatDate(data.entry.createdAt)}`;
      guestbookList.prepend(entryEl);
      openEntry(entryEl);
      guestbookForm.reset();
    } else {
      guestbookError.textContent = data.error || "Something went wrong.";
      guestbookError.hidden = false;
    }
  } catch (err) {
    guestbookError.textContent = "Something went wrong. Please try again.";
    guestbookError.hidden = false;
  } finally {
    guestbookSubmit.disabled = false;
    guestbookSubmit.classList.remove("is-loading");
  }
});
