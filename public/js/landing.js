document.addEventListener("DOMContentLoaded", function () {
  // Sticky header shadow on scroll
  const nav = document.getElementById("landingNav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  });

  // Scroll progress bar
  const progressBar = document.getElementById("scrollProgress");
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = percent + "%";
  });

  // Mobile menu toggle
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-active");
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.classList.remove("is-active");
    });
  });

  // Back to top button
  const backToTop = document.getElementById("backToTop");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      backToTop.classList.add("is-visible");
    } else {
      backToTop.classList.remove("is-visible");
    }
  });
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // The one deliberate motion moment: hero flame flickers to life on load
  const flame = document.getElementById("heroFlame");
  setTimeout(() => flame.classList.add("is-lit"), 400);

  // Slide-in reveal for sequence items + definition rows. threshold:0.1
  // and a negative bottom rootMargin mean a tile starts sliding while
  // it's still mostly below the fold, so the full motion is visible
  // instead of only its last 20%. The class is added AND removed here
  // (no unobserve), so scrolling a tile back out of view resets it to
  // hidden/offset, ready to slide in again next time it's seen.
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        } else {
          entry.target.classList.remove("in-view");
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
  );
  document
    .querySelectorAll(".sequence-item, .definition-row")
    .forEach((el) => slideObserver.observe(el));
});
