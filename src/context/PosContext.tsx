"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { localDb } from "@/lib/dexie";
import { unlockAudioContext } from "@/lib/audio";

export type Language = "en" | "ur";
export type UserRole = "OWNER" | "MANAGER" | "CASHIER" | "STOCK_KEEPER";

export interface ActiveUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

interface PosContextType {
  language: Language;
  toggleLanguage: () => void;
  activeUser: ActiveUser;
  setActiveUser: (user: ActiveUser) => void;
  isOnline: boolean;
  outboxCount: number;
  triggerSync: () => Promise<void>;
  isFbrEnabled: boolean;
  toggleFbr: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DEFAULT_USER: ActiveUser = {
  id: "default-cashier",
  name: "Bilal Ahmad",
  role: "CASHIER",
  email: "cashier@kiryana.pk",
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [activeUser, setActiveUser] = useState<ActiveUser>(DEFAULT_USER);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [isFbrEnabled, setIsFbrEnabled] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialize language and online status
  useEffect(() => {
    // 1. Language from localStorage
    const savedLang = localStorage.getItem("pos_lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "ur")) {
      setLanguage(savedLang);
      document.documentElement.dir = savedLang === "ur" ? "rtl" : "ltr";
      document.documentElement.lang = savedLang;
    }

    // 2. Online/Offline window listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncOutbox();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // 3. First user gesture to unlock audio context
    const handleFirstGesture = () => {
      unlockAudioContext();
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
    window.addEventListener("click", handleFirstGesture);
    window.addEventListener("keydown", handleFirstGesture);

    // 4. Check outbox count
    updateOutboxCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("click", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
  }, []);

  const updateOutboxCount = async () => {
    try {
      const count = await localDb.outbox.where("status").equals("PENDING").count();
      setOutboxCount(count);
    } catch {
      // IndexedDB might not be ready
    }
  };

  const toggleLanguage = () => {
    const next = language === "en" ? "ur" : "en";
    setLanguage(next);
    localStorage.setItem("pos_lang", next);
    document.documentElement.dir = next === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  };

  const toggleFbr = () => {
    setIsFbrEnabled((prev) => !prev);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return next;
    });
  };

  const syncOutbox = async () => {
    try {
      const pending = await localDb.outbox.where("status").equals("PENDING").toArray();
      if (pending.length === 0) return;

      const res = await fetch("/api/sync/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: pending }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.syncedClientTxIds && data.syncedClientTxIds.length > 0) {
          for (const id of data.syncedClientTxIds) {
            await localDb.outbox.update(id, { status: "SYNCED" });
          }
        }
        await updateOutboxCount();
      }
    } catch (err) {
      console.warn("Background outbox sync deferred:", err);
    }
  };

  return (
    <PosContext.Provider
      value={{
        language,
        toggleLanguage,
        activeUser,
        setActiveUser,
        isOnline,
        outboxCount,
        triggerSync: syncOutbox,
        isFbrEnabled,
        toggleFbr,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error("usePos must be used within a PosProvider");
  }
  return context;
}
