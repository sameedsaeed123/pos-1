"use client";

import React, { useState } from "react";
import { Lock, Delete, X } from "lucide-react";
import { playScanErrorBuzz, playScanSuccessBeep } from "@/lib/audio";
import { ActiveUser } from "@/context/PosContext";

interface ManagerPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: ActiveUser) => void;
  title?: string;
  requiredRole?: "MANAGER" | "OWNER";
}

// Preset verified test accounts matching seeded database
const SEED_USERS: Array<ActiveUser & { pin: string }> = [
  { id: "owner-1", name: "Haji Muhammad Aslam", role: "OWNER", email: "owner@kiryana.pk", pin: "1234" },
  { id: "mgr-1", name: "Tariq Mehmood", role: "MANAGER", email: "manager@kiryana.pk", pin: "5678" },
  { id: "csh-1", name: "Bilal Ahmad", role: "CASHIER", email: "cashier@kiryana.pk", pin: "9999" },
];

export function ManagerPinDialog({
  isOpen,
  onClose,
  onSuccess,
  title = "Manager Authorization PIN Required",
  requiredRole,
}: ManagerPinDialogProps) {
  const [pin, setPin] = useState<string>("");
  const [isShaking, setIsShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleDigit = (d: string) => {
    if (pin.length < 4) {
      const nextPin = pin + d;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin("");
    setErrorMsg("");
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const verifyPin = (enteredPin: string) => {
    const matched = SEED_USERS.find((u) => u.pin === enteredPin);

    if (matched) {
      if (requiredRole && matched.role !== "OWNER" && matched.role !== requiredRole) {
        playScanErrorBuzz();
        setIsShaking(true);
        setErrorMsg(`Role ${requiredRole} or Owner required`);
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 400);
        return;
      }

      playScanSuccessBeep();
      onSuccess({
        id: matched.id,
        name: matched.name,
        role: matched.role,
        email: matched.email,
      });
      handleClear();
    } else {
      playScanErrorBuzz();
      setIsShaking(true);
      setErrorMsg("Invalid PIN code. Try 1234 or 5678");
      setTimeout(() => {
        setIsShaking(false);
        setPin("");
      }, 400);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-transform ${
          isShaking ? "animate-scan-error" : ""
        }`}
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Masked Bullet Circles */}
        <div className="flex justify-center gap-3 my-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? "bg-emerald-700 border-emerald-700 scale-110"
                  : "border-slate-300 dark:border-slate-700 bg-transparent"
              }`}
            />
          ))}
        </div>

        {errorMsg && <p className="text-center text-xs font-semibold text-red-600 mb-3">{errorMsg}</p>}

        {/* Touch Number Pad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-lg font-bold text-slate-800 dark:text-slate-100 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-lg font-bold text-slate-800 dark:text-slate-100"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 text-center">
          Demo PINs: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">1234</span> (Owner),{" "}
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">5678</span> (Manager),{" "}
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">9999</span> (Cashier)
        </div>
      </div>
    </div>
  );
}
