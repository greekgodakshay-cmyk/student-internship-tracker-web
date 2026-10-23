(() => {
  const themeButton = document.querySelector("#themeToggle");
  const themeKey = "student-tracker-theme";
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(themeKey); } catch { /* Storage may be unavailable. */ }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
    if (themeButton) {
      const dark = theme === "dark";
      themeButton.innerHTML = dark
        ? '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
        : '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/></svg>';
      themeButton.setAttribute("aria-pressed", String(dark));
      themeButton.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      themeButton.title = dark ? "Switch to light mode" : "Switch to dark mode";
    }
  };
  applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : (prefersDark ? "dark" : "light"));
  if (themeButton) themeButton.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(themeKey, next); } catch { /* Storage may be unavailable. */ }
  });

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    const revealSelector = ".hero-copy, .hero-art, .feature-card, .step-card, .about-content, .about-mark, .section-heading, .learning-team-photo";
    const observed = new WeakSet();
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.04, rootMargin: "0px 0px -25px 0px" });
    const scan = (root) => {
      const items = [];
      if (root instanceof Element && root.matches(revealSelector)) items.push(root);
      if (root.querySelectorAll) items.push(...root.querySelectorAll(revealSelector));
      items.forEach((item) => {
        if (observed.has(item) || item.hidden || item.getClientRects().length === 0) return;
        observed.add(item); item.classList.add("reveal-on-scroll"); observer.observe(item);
      });
    };
    scan(document);
    const mutationObserver = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => { if (node instanceof Element) scan(node); })));
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }
  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
