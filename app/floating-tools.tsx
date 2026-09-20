"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { languageNames, type Language } from "@/lib/languages";
import { recordVisit, sendVisitorMessage, visitorId, watchConversation, watchOperatorStatus, type SupportConversation } from "@/lib/live-support";
import { whatsappLink, WHATSAPP_DISPLAY_NUMBER } from "@/lib/whatsapp";
import { useLanguage } from "./language-provider";

export default function FloatingTools() {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [operatorOnline, setOperatorOnline] = useState(false);
  const [email, setEmail] = useState("");
  const [emailPermission, setEmailPermission] = useState(false);
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
  useEffect(()=>{const saved=localStorage.getItem("bluecrest-logistics-support-email");if(saved){setEmail(saved);setEmailPermission(true)}},[]);
  useEffect(()=>{const id=visitorId();void recordVisit(id,pathname,email);const a=watchConversation(id,setConversation),b=watchOperatorStatus(setOperatorOnline);return()=>{a();b()}},[pathname,email]);

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

    setChatInput("");
    setChatBusy(true);

    try {
      await sendVisitorMessage(visitorId(),trimmed,pathname,email);
    } catch (error) {
      console.error("Live chat failed", error);
      setChatInput(trimmed);
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
              <span className={`live-chat-status-dot ${operatorOnline?"online":""}`} aria-hidden="true" />
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

          {!emailPermission ? <div className="support-email-consent" role="dialog" aria-label="Support email permission"><h2>Stay connected with support</h2><p>Use your saved browser email or enter it below so our operators can identify your chat.</p><input type="email" name="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/><button type="button" disabled={!email.includes("@")} onClick={()=>{localStorage.setItem("bluecrest-logistics-support-email",email.trim());setEmailPermission(true)}}>Continue to chat</button></div> : <><div className="live-chat-messages">
            <div className="live-chat-bubble assistant"><p>{operatorOnline?"An operator is online. Send a message and we’ll respond here.":"Our operators are currently away. Leave a message and an operator will respond here as soon as possible."}</p></div>{(conversation?.messages??[]).map(message => (
              <div
                key={message.id}
                className={`live-chat-bubble ${message.sender === "visitor" ? "user" : "assistant"}`}
              >
                <p>{message.text}</p>
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
              placeholder="Write your message..."
            />
            <button
              type="button"
              onClick={() => void handleSendChat()}
              disabled={chatBusy}
              aria-label="Send message"
            >
              {chatBusy ? "..." : "Send"}
            </button>
          </div></>}
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
