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
      const ns = "http://www.w3.org/2000/svg";
      const icon = document.createElementNS(ns, "svg");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("width", "19");
      icon.setAttribute("height", "19");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.8");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("stroke-linejoin", "round");
      if (dark) {
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", "12"); circle.setAttribute("cy", "12"); circle.setAttribute("r", "4");
        const rays = document.createElementNS(ns, "path");
        rays.setAttribute("d", "M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42");
        icon.append(circle, rays);
      } else {
        const moon = document.createElementNS(ns, "path");
        moon.setAttribute("d", "M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z");
        icon.append(moon);
      }
      themeButton.replaceChildren(icon);
      themeButton.setAttribute("aria-pressed", String(dark));
      themeButton.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      themeButton.title = dark ? "Switch to light mode" : "Switch to dark mode";
    }
  };
  applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : (prefersDark ? "dark" : "light"));
  const systemThemeQuery = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  if (systemThemeQuery) {
    systemThemeQuery.addEventListener?.("change", (event) => {
      let explicitTheme = null;
      try { explicitTheme = localStorage.getItem(themeKey); } catch { /* Storage may be unavailable. */ }
      if (explicitTheme !== "dark" && explicitTheme !== "light") applyTheme(event.matches ? "dark" : "light");
    });
  }
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
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } else {
        entry.target.classList.remove("is-visible");
      }
    }), { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });
    const scan = (root) => {
      const items = [];
      if (root instanceof Element && root.matches(revealSelector)) items.push(root);
      if (root.querySelectorAll) items.push(...root.querySelectorAll(revealSelector));
      items.forEach((item) => {
        if (observed.has(item) || item.hidden || item.closest("[hidden]")) return;
        observed.add(item); item.classList.add("reveal-on-scroll"); observer.observe(item);
      });
    };
    scan(document);
    const mutationObserver = new MutationObserver((records) => records.forEach((record) => {
      if (record.type === "attributes" && record.target instanceof Element) scan(record.target);
      record.addedNodes.forEach((node) => { if (node instanceof Element) scan(node); });
    }));
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
  }

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  if (toggle && nav) {
    const closeNav = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeNav();
      });
    });
    document.addEventListener("click", (event) => {
      if (nav.classList.contains("is-open") && !nav.contains(event.target) && !toggle.contains(event.target)) {
        closeNav();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        toggle.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760 && nav.classList.contains("is-open")) {
        closeNav();
      }
    });
  }

  // Feature cards are keyboard-accessible navigation surfaces. Existing hover and reveal effects remain untouched.
  document.querySelectorAll(".feature-navigable[data-feature]").forEach((card) => {
    const openFeature = () => { window.location.href = `/feature.html?topic=${encodeURIComponent(card.dataset.feature)}`; };
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      openFeature();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openFeature(); }
    });
  });

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
