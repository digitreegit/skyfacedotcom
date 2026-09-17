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

  const contactForm = document.getElementById("contactForm");
  if (contactForm) initContactForm(contactForm);

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

  function initContactForm(form) {
    const status = form.querySelector(".contact-status");
    const submit = form.querySelector("[type='submit']");

    const setStatus = (msg, kind) => {
      status.hidden = !msg;
      status.textContent = msg || "";
      status.classList.toggle("is-error", kind === "error");
      status.classList.toggle("is-ok", kind === "ok");
    };

    const tokenValue = () => {
      const field = form.querySelector('[name="cf-turnstile-response"]');
      if (field && field.value) return field.value;
      if (window.turnstile && typeof window.turnstile.getResponse === "function") {
        return window.turnstile.getResponse() || "";
      }
      return "";
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const honey = form.querySelector("[name='company']");
      if (honey && honey.value.trim()) {
        setStatus("Thanks – we’ll get back to you soon.", "ok");
        form.reset();
        return;
      }

      const name = form.querySelector("[name='name']").value.trim();
      const email = form.querySelector("[name='email']").value.trim();
      const message = form.querySelector("[name='message']").value.trim();
      const token = tokenValue();

      if (name.length < 2 || !email || message.length < 10) {
        setStatus("Please fill in your name, email, and a short message.", "error");
        return;
      }
      if (!token) {
        setStatus("Please wait for the spam check, or allow Cloudflare if a blocker is on.", "error");
        return;
      }

      submit.disabled = true;
      setStatus("Sending…");
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message, token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Send failed");
        form.reset();
        if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
        setStatus("Thanks – we’ll get back to you soon.", "ok");
      } catch (err) {
        setStatus(err.message || "Something went wrong. Please try again.", "error");
      } finally {
        submit.disabled = false;
      }
    });
  }
})();
