// Small motion helpers shared by every page. The pages work the same without them.

// A photo's place shows a loading circle, then the photo fades in
document.querySelectorAll("img").forEach((img) => {
  if (img.complete) return;
  img.classList.add("img-fade", "img-loading");
  const reveal = () => img.classList.remove("img-loading");
  img.addEventListener("load", reveal, { once: true });
  img.addEventListener("error", reveal, { once: true });
});

// Candle flames, and the headstone's opening, only run while they can be seen
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
      });
    },
    { threshold: 0.3 },
  );
  document
    .querySelectorAll(".marker, .candle-icon, .sample-candle-icon")
    .forEach((el) => observer.observe(el));
}
