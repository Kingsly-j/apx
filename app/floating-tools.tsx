"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { languageNames, type Language } from "@/lib/languages";
import { buildSupportFallback } from "@/lib/live-chat";
import { whatsappLink, WHATSAPP_DISPLAY_NUMBER } from "@/lib/whatsapp";
import { useLanguage } from "./language-provider";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  needsHuman?: boolean;
  contactHref?: string;
};

export default function FloatingTools() {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can answer common questions about tracking, delivery, pricing, and services. If I can’t help, I’ll connect you with our support team.",
    },
  ]);
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setCode(new URLSearchParams(location.search).get("code") || ""),
      0,
    );
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open && !chatOpen) return;

    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setChatOpen(false);
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setChatOpen(false);
        toggle.current?.focus();
      }
    }

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, chatOpen]);

  const defaultWhatsAppLink = useMemo(
    () =>
      whatsappLink(
        code
          ? `Hello, I need help with shipment ${code}.`
          : "Hello, I need help with my shipment.",
      ),
    [code],
  );

  async function handleSendChat() {
    const trimmed = chatInput.trim();
    if (!trimmed || chatBusy) return;

    const nextHistory = chatMessages.slice(-6);
    const userMessage: ChatMessage = { role: "user", content: trimmed };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory,
        }),
      });

      const data = await response.json();
      const fallback = buildSupportFallback(trimmed);

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.answer || fallback.answer,
          needsHuman: Boolean(data?.needsHuman),
          contactHref: data?.adminContactHref || fallback.adminContactHref,
        },
      ]);
    } catch (error) {
      console.error("Live chat failed", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I’m having trouble reaching support right now. Please contact our team directly via WhatsApp or email for help.",
          needsHuman: true,
          contactHref: defaultWhatsAppLink,
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div ref={root} className="floating-tools" translate="no">
      {open && (
        <div
          id="language-options"
          className="language-popover"
          role="group"
          aria-label={t("Language")}
        >
          <div className="language-popover-heading">
            <strong>{t("Language")}</strong>
            <button
              type="button"
              aria-label={t("Close")}
              onClick={() => {
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          {(Object.keys(languageNames) as Language[]).map((value) => (
            <button
              key={value}
              type="button"
              lang={value}
              aria-pressed={language === value}
              onClick={() => {
                setLanguage(value);
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              {languageNames[value]}
              {language === value && (
                <i className="fas fa-check" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}

      {chatOpen && (
        <div className="live-chat-panel" aria-live="polite">
          <div className="live-chat-header">
            <div>
              <span className="live-chat-status-dot" aria-hidden="true" />
              <strong>Bluecrest support</strong>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="live-chat-messages">
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`live-chat-bubble ${message.role}`}
              >
                <p>{message.content}</p>
                {message.needsHuman && message.contactHref ? (
                  <a
                    href={message.contactHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact support
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          <div className="live-chat-input-row">
            <input
              aria-label="Type your question"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendChat();
                }
              }}
              placeholder="Ask a question..."
            />
            <button
              type="button"
              onClick={() => void handleSendChat()}
              disabled={chatBusy}
              aria-label="Send message"
            >
              {chatBusy ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="floating-livechat"
        aria-label="Open livechat"
        aria-expanded={chatOpen}
        onClick={() => setChatOpen((value) => !value)}
      >
        <i className="fas fa-comment-dots" aria-hidden="true" />
      </button>

      <button
        ref={toggle}
        type="button"
        className="floating-language"
        aria-label={t("Change language")}
        aria-expanded={open}
        aria-controls="language-options"
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fas fa-language" aria-hidden="true" />
        <span>{language.toUpperCase()}</span>
      </button>

      <a
        className="floating-whatsapp"
        href={defaultWhatsAppLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("Chat on WhatsApp")}
        title={`${t("Chat on WhatsApp")} ${WHATSAPP_DISPLAY_NUMBER}`}
      >
        <i className="fab fa-whatsapp" aria-hidden="true" />
      </a>
    </div>
  );
}
