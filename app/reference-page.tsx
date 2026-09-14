"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

let alpineStarted = false;

export default function ReferencePage({ html }: { html: string }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let disposed = false;
    const timers: ReturnType<typeof setInterval>[] = [];
    let cleanup = () => {};
    import("alpinejs").then(({ default: Alpine }) => {
      if (disposed) return;
      if (!alpineStarted) {
        Alpine.start();
        alpineStarted = true;
      }
      Alpine.initTree(root);
      root.querySelectorAll<HTMLElement>("[data-carousel]").forEach((element) => {
        const state = Alpine.$data(element) as { currentSlide: number; slides: number; currentImage: number; images: number; currentReview: number; reviews: number; paused: boolean; hovering: boolean; focused: boolean };
        const slides = element.dataset.carousel === "slides";
        const reviews = element.dataset.carousel === "reviews";
        timers.push(setInterval(() => {
          if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          if (reviews) {
            if (!state.paused && !state.hovering && !state.focused) state.currentReview = (state.currentReview + 1) % state.reviews;
          } else if (slides) state.currentSlide = (state.currentSlide + 1) % state.slides;
          else state.currentImage = (state.currentImage + 1) % state.images;
        }, reviews ? 2000 : slides ? 5000 : 4000));
      });
      cleanup = () => Alpine.destroyTree(root);
    });
    return () => { disposed = true; timers.forEach(clearInterval); cleanup(); };
  }, [html]);
  return <div ref={container} onSubmitCapture={(event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (form.dataset.formKind === "tracking") {
      const code = String(new FormData(form).get("trackingnumber") || "").trim();
      if (code) router.push(`/track?code=${encodeURIComponent(code)}`);
      return;
    }
    const feedback = form.querySelector<HTMLElement>(".form-feedback");
    if (!feedback) return;
    feedback.hidden = false;
    feedback.textContent = form.dataset.formKind === "tracking"
      ? "Live shipment tracking is not connected yet. Please contact support@bluecrestlogistics.com for shipment updates."
      : "Your message has not been sent. Contact delivery is not connected yet. Please email support@bluecrestlogistics.com directly.";
    feedback.focus();
  }} dangerouslySetInnerHTML={{ __html: html }} />;
}
