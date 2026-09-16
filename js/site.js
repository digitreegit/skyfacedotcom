(function () {
  document.documentElement.classList.add("js");

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  const onScroll = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    const close = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });

    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.body.classList.contains("lightbox-open")) close();
    });
  }

  const lightboxGallery = document.querySelector("[data-lightbox]");
  if (lightboxGallery) {
    const items = [...lightboxGallery.querySelectorAll("[data-lightbox-item] img")];
    const root = document.createElement("div");
    root.className = "lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Screenshot");
    root.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <button type="button" class="lightbox-prev" aria-label="Previous">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <img alt="" />
      <button type="button" class="lightbox-next" aria-label="Next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    `;
    document.body.appendChild(root);

    const img = root.querySelector("img");
    const closeBtn = root.querySelector(".lightbox-close");
    const prevBtn = root.querySelector(".lightbox-prev");
    const nextBtn = root.querySelector(".lightbox-next");
    let index = 0;
    let lastFocus = null;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const source = items[index];
      img.src = source.currentSrc || source.src;
      img.alt = source.alt || "";
    };

    const open = (i) => {
      lastFocus = document.activeElement;
      show(i);
      root.classList.add("is-open");
      document.body.classList.add("lightbox-open");
      closeBtn.focus();
    };

    const close = () => {
      root.classList.remove("is-open");
      document.body.classList.remove("lightbox-open");
      img.removeAttribute("src");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    };

    lightboxGallery.querySelectorAll("[data-lightbox-item]").forEach((button, i) => {
      button.addEventListener("click", () => open(i));
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));
    root.addEventListener("click", (event) => {
      if (event.target === root) close();
    });

    document.addEventListener("keydown", (event) => {
      if (!root.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);
    });

    let touchX = null;
    root.addEventListener("touchstart", (event) => {
      touchX = event.changedTouches[0].clientX;
    }, { passive: true });
    root.addEventListener("touchend", (event) => {
      if (touchX == null) return;
      const dx = event.changedTouches[0].clientX - touchX;
      touchX = null;
      if (dx > 40) show(index - 1);
      if (dx < -40) show(index + 1);
    }, { passive: true });
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => io.observe(el));
})();
