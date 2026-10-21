
(() => {
  "use strict";

  const toggle = document.getElementById("ai-chat-toggle");
  const panel = document.getElementById("ai-chat-panel");

  // This script can safely exist on pages without the chat widget.
  if (!toggle || !panel) return;

  const closeButton = document.getElementById("ai-chat-close");
  const messages = document.getElementById("ai-chat-messages");
  const form = document.getElementById("ai-chat-form");
  const input = document.getElementById("ai-chat-input");
  const sendButton = document.getElementById("ai-chat-send");
  const status = document.getElementById("ai-chat-status");
  const faq = document.getElementById("ai-chat-faq");

  function setChatOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));

    if (open) {
      input.focus();
    }
  }

  toggle.addEventListener("click", () => {
    setChatOpen(panel.hidden);
  });

  closeButton.addEventListener("click", () => {
    setChatOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setChatOpen(false);
      toggle.focus();
    }
  });

  if (faq) {
    faq.addEventListener("click", (event) => {
      const button = event.target.closest("[data-faq-question]");
      if (!button || sendButton.disabled) return;
      input.value = button.getAttribute("data-faq-question") || "";
      faq.hidden = true;
      form.requestSubmit();
    });
  }

  function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className =
      "ai-chat-message " +
      (sender === "user" ? "ai-chat-user" : "ai-chat-bot");

    // Use textContent so replies are displayed as text, not executable HTML.
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;

    return message;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = input.value.trim();

    if (!message || sendButton.disabled) return;

    addMessage(message, "user");
    input.value = "";
    sendButton.disabled = true;
    input.disabled = true;
    status.textContent = "Thinking...";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "The assistant could not respond. Please try again."
        );
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("I couldn't get a reply. Please try again.");
      }

      addMessage(data.reply, "bot");
      status.textContent = "";
    } catch (error) {
      addMessage(
        error.message ||
          "Sorry, the assistant is temporarily unavailable.",
        "bot"
      );
      status.textContent = "You can try sending another message.";
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  });
})();
