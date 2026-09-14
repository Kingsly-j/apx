"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminAccess() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let buffer = "";

    function openAdmin() {
      buffer = "";
      if (window.location.pathname.replace(/\/$/, "") === "/admin") {
        window.dispatchEvent(new Event("admin-access"));
      } else {
        router.push("/admin?admin=1");
      }
    }

    function checkUrl() {
      const url = new URL(window.location.href);
      if (url.searchParams.get("admin") === "1" || url.hash.toLowerCase() === "#admin") openAdmin();
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select, [role='textbox']") || target.isContentEditable)) {
        buffer = "";
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        buffer = "";
        return;
      }
      if (event.key === "Backspace" || event.key === "Escape") buffer = "";
      if (event.key.length !== 1) return;
      buffer = `${buffer}${event.key.toLowerCase()}`.slice(-5);
      if (buffer === "admin") openAdmin();
    }

    checkUrl();
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("hashchange", checkUrl);
    window.addEventListener("popstate", checkUrl);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("hashchange", checkUrl);
      window.removeEventListener("popstate", checkUrl);
    };
  }, [pathname, router]);

  return null;
}
