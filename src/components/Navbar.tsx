"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { usePos } from "@/context/PosContext";
import {
  ShoppingCart,
  Package,
  BookOpen,
  Clock,
  BarChart3,
  Globe,
  Wifi,
  WifiOff,
  ShieldCheck,
  Keyboard,
  UserCheck,
  Moon,
  Sun,
} from "lucide-react";
import { ManagerPinDialog } from "./ManagerPinDialog";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    language,
    toggleLanguage,
    activeUser,
    setActiveUser,
    isOnline,
    outboxCount,
    triggerSync,
    isFbrEnabled,
    toggleFbr,
    isDarkMode,
    toggleDarkMode,
  } = usePos();

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);

  const isUrdu = language === "ur";

  const navItems = [
    { href: "/", labelEn: "Register [F1]", labelUr: "کاؤنٹر رجسٹر", icon: ShoppingCart },
    { href: "/inventory", labelEn: "Inventory", labelUr: "اسٹاک و مال", icon: Package },
    { href: "/khata", labelEn: "Khata (Udhaar)", labelUr: "کھاتہ و ادھار", icon: BookOpen },
    { href: "/shifts", labelEn: "Shifts & Cash", labelUr: "شفٹ و کیش ڈراور", icon: Clock },
    { href: "/reports", labelEn: "Reports", labelUr: "رپورٹس و منافع", icon: BarChart3 },
  ];

  return (
    <>
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between select-none shrink-0 z-30">
        {/* Brand & Nav Links */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              B
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                {isUrdu ? "بسم اللہ جنرل اسٹور" : "Bismillah Kiryana POS"}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                {isUrdu ? "ریٹیل کاؤنٹر ٹرمینل" : "Retail Terminal"}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isUrdu ? item.labelUr : item.labelEn}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Status Indicators & Action Pills */}
        <div className="flex items-center gap-2.5">
          {/* FBR Compliance Badge */}
          <button
            onClick={toggleFbr}
            title={isFbrEnabled ? "FBR Tier-1 Enabled (Click to toggle)" : "FBR Disabled"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isFbrEnabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300"
                : "bg-slate-100 border-slate-300 text-slate-500"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isFbrEnabled ? "FBR Active" : "FBR Off"}</span>
          </button>

          {/* Offline / Online Sync Indicator */}
          <button
            onClick={triggerSync}
            title={isOnline ? "Online. Click to verify sync" : "Offline mode active. Sales buffered locally"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isOnline
                ? outboxCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            {isOnline ? (
              outboxCount > 0 ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Syncing ({outboxCount})</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Online</span>
                </>
              )
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-600" />
                <span>Offline ({outboxCount})</span>
              </>
            )}
          </button>

          {/* Cheatsheet Key Guide */}
          <button
            onClick={() => setIsCheatsheetOpen(true)}
            title="Keyboard Shortcuts Cheatsheet [?]"
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            title="Toggle Dark Mode"
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title="Switch Language / زبان تبدیل کریں"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{isUrdu ? "English" : "اردو"}</span>
          </button>

          {/* Active Cashier Pill */}
          <button
            onClick={() => setIsPinDialogOpen(true)}
            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{activeUser.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 px-1 py-0.5 rounded">
              {activeUser.role}
            </span>
          </button>
        </div>
      </header>

      {/* Cashier / Manager Switcher Dialog */}
      <ManagerPinDialog
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onSuccess={(user) => {
          setActiveUser(user);
          setIsPinDialogOpen(false);
        }}
        title="Switch Cashier / Manager Login"
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {isCheatsheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-600" />
                <span>{isUrdu ? "کی بورڈ شارٹ کٹس" : "Keyboard Shortcuts Cheatsheet"}</span>
              </h3>
              <button
                onClick={() => setIsCheatsheetOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "پروڈکٹ تلاش کریں" : "Focus Product Search"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F1 / /</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "ادائیگی ونڈو کھولیں" : "Tender Payment (Pay)"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border text-emerald-700">F2</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "کھاتہ گاہک منتخب کریں" : "Customer Khata Search"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F3</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "بل ڈسکاؤنٹ شامل کریں" : "Add Bill Discount"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F4</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "ہولڈ شدہ بل واپس لائیں" : "Recall Parked Bills"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F6</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "آخری رسید پرنٹ کریں" : "Reprint Last Receipt"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F7</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "بل ہولڈ کریں" : "Hold Active Bill"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F8</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "نیا پروڈکٹ شامل کریں" : "Quick Add Product"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">F9</kbd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "لائن آئٹم منسوخ کریں" : "Void Active Line Item"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border text-red-600">F10</kbd>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600 dark:text-slate-400">{isUrdu ? "منسوخ / بند کریں" : "Dismiss / Clear"}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold rounded border">ESC</kbd>
              </div>
            </div>

            <button
              onClick={() => setIsCheatsheetOpen(false)}
              className="mt-6 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs"
            >
              {isUrdu ? "سمجھ آ گئی" : "Got It"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

