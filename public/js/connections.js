"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const themeKey = "student-tracker-theme";
  const themeButton = document.getElementById("connectionsThemeToggle");
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  let theme = "light";
  try {
    const saved = localStorage.getItem(themeKey);
    theme = saved === "dark" || saved === "light" ? saved : (systemDark ? "dark" : "light");
  } catch (_) { theme = systemDark ? "dark" : "light"; }
  const applyTheme = (value) => {
    document.body.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    if (themeButton) {
      themeButton.textContent = value === "dark" ? "☀" : "☾";
      themeButton.setAttribute("aria-label", value === "dark" ? "Switch to light mode" : "Switch to dark mode");
      themeButton.title = value === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }
  };
  applyTheme(theme);
  if (themeButton) themeButton.addEventListener("click", () => {
    theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try { localStorage.setItem(themeKey, theme); } catch (_) { /* Storage may be unavailable. */ }
  });

  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");
  const type = requestedType === "followers" ? "followers" : "following";
  const title = document.getElementById("connectionsTitle");
  const description = document.getElementById("connectionsDescription");
  const total = document.getElementById("connectionsTotal");
  const list = document.getElementById("connectionsList");
  const back = document.querySelector(".connections-back");

  title.textContent = type === "followers" ? "Followers" : "Following";
  description.textContent = type === "followers"
    ? "People who follow your profile."
    : "People you follow.";
  document.title = `${title.textContent} | Locked-In — Student Internship & Skill Tracker`;
  back.href = "/index.html#profile";

  const element = (tag, text, className) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };

  try {
    const response = await fetch(`/api/social/${type}`, {
      headers: { Accept: "application/json" }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Unable to load ${type}.`);

    const users = Array.isArray(data.users) ? data.users : [];
    total.textContent = String(Number.isFinite(data.total) ? data.total : users.length);
    list.replaceChildren();
    list.setAttribute("aria-busy", "false");

    if (!users.length) {
      list.append(element("p", type === "followers"
        ? "You don't have any followers yet."
        : "You're not following anyone yet.", "connections-state"));
      return;
    }

    users.forEach((user) => {
      const name = typeof user.name === "string" && user.name.trim()
        ? user.name.trim()
        : "Student";
      const row = element("article", undefined, "connection-user");
      const avatar = element("span", name.charAt(0).toUpperCase(), "connection-avatar");
      avatar.setAttribute("aria-hidden", "true");
      const details = element("div", undefined, "connection-user-details");
      details.append(element("strong", name), element("span", "Locked-In member"));
      row.append(avatar, details);
      list.append(row);
    });
  } catch (error) {
    list.replaceChildren(element("p", error.message || "Unable to load your network. Please try again.", "connections-state connections-error"));
    list.setAttribute("aria-busy", "false");
    total.textContent = "—";
  }
});
