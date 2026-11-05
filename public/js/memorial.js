const slug = document.body.dataset.slug;

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
  try {
    const res = await fetch(`/memorial/${slug}/light-candle`, {
      method: "POST",
    });
    const data = await res.json();

    if (res.ok) {
      candleCountEl.textContent = data.candleCount;
      candlePluralEl.textContent = data.candleCount === 1 ? "" : "s";
      candleBtn.classList.add("is-lit");
      candleLabelEl.textContent = "Candle lit";
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
  }
});

// Guestbook
const guestbookForm = document.getElementById("guestbookForm");
const guestbookList = document.getElementById("guestbookList");
const guestbookError = document.getElementById("guestbookError");
const guestbookSubmit = document.getElementById("guestbookSubmit");

guestbookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  guestbookError.style.display = "none";

  const name = document.getElementById("guestName").value.trim();
  const message = document.getElementById("guestMessage").value.trim();

  if (!name || !message) return;

  guestbookSubmit.disabled = true;
  try {
    const res = await fetch(`/memorial/${slug}/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message }),
    });
    const data = await res.json();

    if (res.ok) {
      const entryEl = document.createElement("div");
      entryEl.className = "guestbook-entry fade-in";
      entryEl.innerHTML = `
        <p class="guestbook-entry-message"></p>
        <p class="guestbook-entry-meta"></p>
      `;
      entryEl.querySelector(".guestbook-entry-message").textContent =
        data.entry.message;
      entryEl.querySelector(".guestbook-entry-meta").textContent =
        `— ${data.entry.name}, ${new Date(data.entry.createdAt).toDateString()}`;
      guestbookList.prepend(entryEl);
      guestbookForm.reset();
    } else {
      guestbookError.textContent = data.error || "Something went wrong.";
      guestbookError.style.display = "block";
    }
  } catch (err) {
    guestbookError.textContent = "Something went wrong. Please try again.";
    guestbookError.style.display = "block";
  } finally {
    guestbookSubmit.disabled = false;
  }
});
