"use client";

import React, { useState, useEffect } from "react";
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

// Fallback users with exact database IDs from Neon PostgreSQL
const FALLBACK_USERS: Array<ActiveUser & { pin: string }> = [
  { id: "cmwhrmk290001hxduj3uw2xt2", name: "Haji Muhammad Aslam", role: "OWNER", email: "owner@kiryana.pk", pin: "1234" },
  { id: "cmwhrmkhn0002hxdudxklzk1g", name: "Tariq Mehmood", role: "MANAGER", email: "manager@kiryana.pk", pin: "5678" },
  { id: "cmwhrmkns0003hxdutajq144t", name: "Bilal Ahmad", role: "CASHIER", email: "cashier@kiryana.pk", pin: "9999" },
  { id: "cmwhrmktx0004hxdush6nfi4u", name: "Rashid Ali", role: "STOCK_KEEPER", email: "stock@kiryana.pk", pin: "0000" },
];

export function ManagerPinDialog({
  isOpen,
  onClose,
  onSuccess,
  title = "Staff Authorization PIN",
  requiredRole,
}: ManagerPinDialogProps) {
  const [pin, setPin] = useState<string>("");
  const [isShaking, setIsShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [users, setUsers] = useState<Array<ActiveUser & { pin: string }>>(FALLBACK_USERS);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

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
    const matched = users.find((u) => u.pin === enteredPin);

    if (matched) {
      if (requiredRole && matched.role !== "OWNER" && matched.role !== requiredRole) {
        playScanErrorBuzz();
        setIsShaking(true);
        setErrorMsg(`Requires ${requiredRole} or Owner`);
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 350);
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
      setErrorMsg("Invalid PIN code");
      setTimeout(() => {
        setIsShaking(false);
        setPin("");
      }, 350);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white dark:bg-slate-900 rounded-lg max-w-xs w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 transition-transform ${
          isShaking ? "animate-scan-error" : ""
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Masked Indicator Dots */}
        <div className="flex justify-center gap-2.5 my-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full border transition-colors ${
                pin.length > idx
                  ? "bg-emerald-700 border-emerald-700"
                  : "border-slate-300 dark:border-slate-700 bg-transparent"
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-center text-xs font-semibold text-red-600 mb-2.5">{errorMsg}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-11 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-base font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-11 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-base font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-11 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 text-center">
          Demo PINs: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">1234</span> (Owner),{" "}
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">5678</span> (Manager),{" "}
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">9999</span> (Cashier)
        </div>
      </div>
    </div>
  );
}
