// The sample memorial's candle. It's only a demonstration, so nothing is saved.
const sampleCandle = document.getElementById("sampleCandle");
const sampleCandleLabel = document.getElementById("sampleCandleLabel");
const sampleCandleCount = document.getElementById("sampleCandleCount");
const glowOverlay = document.getElementById("candleGlowOverlay");

// Reveals are set up here, not in the markup, so the page is complete without this script
if (
  "IntersectionObserver" in window &&
  matchMedia("(prefers-reduced-motion: no-preference)").matches
) {
  document.documentElement.classList.add("motion-ready");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  document
    .querySelectorAll(".programme, .sample, .families, .close, .memorial-sample")
    .forEach((el) => revealObserver.observe(el));
}

sampleCandle.addEventListener("click", () => {
  sampleCandle.classList.add("is-lit", "just-lit");
  sampleCandle.disabled = true;
  sampleCandleLabel.textContent = "Candle lit";
  sampleCandleLabel.classList.add("tick");
  sampleCandleCount.textContent = Number(sampleCandleCount.textContent) + 1;
  sampleCandleCount.classList.add("tick");

  glowOverlay.classList.add("is-active");
  setTimeout(() => {
    glowOverlay.classList.remove("is-active");
  }, 1000);
});
