"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees, rupeesToPaisa } from "@/lib/money";
import { EscPosBuilder, sendRawToUsbPrinter } from "@/lib/escpos";
import { playScanSuccessBeep, playScanErrorBuzz } from "@/lib/audio";
import {
  Clock,
  Banknote,
  Lock,
  Printer,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Coffee,
  Truck,
  PlusCircle,
  X,
  CreditCard,
} from "lucide-react";

export default function ShiftsPage() {
  const { language, activeUser } = usePos();
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Open Shift State
  const [openingFloatRupees, setOpeningFloatRupees] = useState("5000");

  // Blind Close Shift State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [countedCashRupees, setCountedCashRupees] = useState("");
  const [zReportData, setZReportData] = useState<any | null>(null);

  // Petty Cash Modal State
  const [isPettyModalOpen, setIsPettyModalOpen] = useState(false);
  const [pettyType, setPettyType] = useState<"PAID_OUT" | "PAID_IN">("PAID_OUT");
  const [pettyAmountRupees, setPettyAmountRupees] = useState("");
  const [pettyReason, setPettyReason] = useState("Tea / Refreshment (چائے)");
  const [isPettySubmitting, setIsPettySubmitting] = useState(false);

  const isUrdu = language === "ur";

  useEffect(() => {
    loadActiveShift();
  }, [activeUser]);

  const loadActiveShift = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/shifts?cashierId=${activeUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.activeShift);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OPEN_SHIFT",
          cashierId: activeUser.id,
          openingFloatPaisa: rupeesToPaisa(openingFloatRupees),
        }),
      });

      if (res.ok) {
        loadActiveShift();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordPettyCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !pettyAmountRupees || Number(pettyAmountRupees) <= 0) return;

    setIsPettySubmitting(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PETTY_CASH",
          shiftId: activeShift.id,
          type: pettyType,
          amountPaisa: rupeesToPaisa(pettyAmountRupees),
          reason: pettyReason,
          cashierId: activeUser.id,
        }),
      });

      if (res.ok) {
        playScanSuccessBeep();
        setIsPettyModalOpen(false);
        setPettyAmountRupees("");
        loadActiveShift();
      } else {
        playScanErrorBuzz();
      }
    } catch {
      playScanErrorBuzz();
    } finally {
      setIsPettySubmitting(false);
    }
  };

  const handleKickDrawer = async () => {
    playScanSuccessBeep();
    const builder = new EscPosBuilder();
    builder.kickDrawer();
    const bytes = builder.toBytes();
    const sent = await sendRawToUsbPrinter(bytes);
    if (!sent) {
      alert("Drawer Kick command triggered! (If connected via USB-POS printer, drawer pops open)");
    }
  };

  const handleBlindCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !countedCashRupees) return;

    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE_SHIFT",
          shiftId: activeShift.id,
          actualCashPaisa: rupeesToPaisa(countedCashRupees),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setZReportData(data.zReportData);
        setIsCloseModalOpen(false);
        setActiveShift(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              <span>{isUrdu ? "کاؤنٹر شفٹ و کیش ڈراور" : "Cash Drawer & Shift Management"}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isUrdu
                ? "کاؤنٹر اوپننگ فلوٹ، متفرق اخراجات اور روزانہ کا حساب کتاب"
                : "Till float management, blind cash close, petty cash expenses, and Z-Reports"}
            </p>
          </div>

          {activeShift && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleKickDrawer}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Pop Drawer [F11]</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPettyModalOpen(true)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                <span>Paid In / Paid Out</span>
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading shift status...</div>
        ) : activeShift ? (
          <div className="space-y-4">
            {/* Active Shift Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Active Till Session
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                        OPEN
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cashier: <strong>{activeShift.cashier?.name}</strong> • Opened at:{" "}
                      {new Date(activeShift.openedAt).toLocaleTimeString("en-PK")}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Blind Close Shift (بند کریں)</span>
                </button>
              </div>

              {/* Till Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Opening Float
                  </span>
                  <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {formatRupees(activeShift.openingFloatPaisa)}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Cash Sales
                  </span>
                  <div className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {formatRupees(activeShift.cashSalesPaisa || 0)}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Petty Cash Out
                  </span>
                  <div className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400 mt-0.5">
                    -{formatRupees(activeShift.paidOutPaisa || 0)}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Digital & Khata
                  </span>
                  <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {formatRupees(
                      (activeShift.cardSalesPaisa || 0) +
                        (activeShift.mobileSalesPaisa || 0) +
                        (activeShift.khataSalesPaisa || 0)
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Expected in Drawer
                  </span>
                  <div className="text-lg font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 mt-0.5">
                    {formatRupees(activeShift.expectedCashInDrawerPaisa || activeShift.openingFloatPaisa)}
                  </div>
                </div>
              </div>

              {/* Petty Cash Recent Logs */}
              {activeShift.pettyCashLogs && activeShift.pettyCashLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Shift Petty Cash Logs:
                  </h4>
                  <div className="space-y-1.5">
                    {activeShift.pettyCashLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          {log.action === "PAID_OUT" ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {log.reason}
                          </span>
                        </div>
                        <div className="font-bold tabular-nums">
                          {log.action === "PAID_OUT" ? "-" : "+"}
                          {formatRupees(log.amountPaisa)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Open New Shift Form */
          <div className="max-w-md mx-auto my-8 bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-center text-slate-900 dark:text-white">
              {isUrdu ? "نئی کاؤنٹر شفٹ کھولیں" : "Open New Register Shift"}
            </h3>
            <p className="text-xs text-center text-slate-500 mt-1 mb-5">
              Enter cash drawer opening float to start sales for <strong>{activeUser.name}</strong>
            </p>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Opening Cash Float in Drawer (Rs) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={openingFloatRupees}
                  onChange={(e) => setOpeningFloatRupees(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Typically Rs 5,000 in small change notes (Rs 10, 20, 50, 100)
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-xs"
              >
                Start Shift & Open Till
              </button>
            </form>
          </div>
        )}

        {/* Paid-In / Paid-Out Modal */}
        {isPettyModalOpen && activeShift && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Record Paid-In / Paid-Out
                </h3>
                <button onClick={() => setIsPettyModalOpen(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPettyCash} className="space-y-3.5 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPettyType("PAID_OUT")}
                    className={`py-2 text-xs font-bold rounded border ${
                      pettyType === "PAID_OUT"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Paid Out (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPettyType("PAID_IN")}
                    className={`py-2 text-xs font-bold rounded border ${
                      pettyType === "PAID_IN"
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Paid In (Add Cash)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount (Rs) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    autoFocus
                    value={pettyAmountRupees}
                    onChange={(e) => setPettyAmountRupees(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold tabular-nums outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Category *
                  </label>
                  <select
                    value={pettyReason}
                    onChange={(e) => setPettyReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="Tea / Refreshment (چائے خرچہ)">Tea / Refreshment (چائے خرچہ)</option>
                    <option value="Transport / Delivery (کرایہ رکشہ)">Transport / Delivery (کرایہ رکشہ)</option>
                    <option value="Cleaning / Supplies (صفائی خرچہ)">Cleaning / Supplies (صفائی خرچہ)</option>
                    <option value="Cash Drop to Safe (سیف میں جمع)">Cash Drop to Safe (سیف میں جمع)</option>
                    <option value="Owner Float Addition (فلوٹ اضافہ)">Owner Float Addition (فلوٹ اضافہ)</option>
                    <option value="Other Store Expense (دیگر اخراجات)">Other Store Expense (دیگر)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPettyModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold border rounded-md text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPettySubmitting || !pettyAmountRupees}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-md disabled:opacity-50"
                  >
                    {isPettySubmitting ? "Saving..." : "Record Transaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Blind Close Modal */}
        {isCloseModalOpen && activeShift && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Blind Cash Count (شفٹ کلوز)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Count all physical notes in the drawer and enter the total without checking the system figure.
              </p>

              <form onSubmit={handleBlindCloseShift} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Counted Physical Cash (Rs) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    autoFocus
                    value={countedCashRupees}
                    onChange={(e) => setCountedCashRupees(e.target.value)}
                    placeholder="e.g. 18450"
                    className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:border-red-600"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold border rounded-md text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-xs"
                  >
                    Confirm & Print Z-Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Z-Report Thermal Preview Modal */}
        {zReportData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-xs w-full p-4 shadow-xl flex flex-col text-black font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h3 className="font-bold text-xs uppercase">Z-REPORT (DAILY FISCAL CLOSE)</h3>
                <p className="text-[10px]">Bismillah General Store</p>
                <p className="text-[9px]">Shift: {zReportData.shiftId.slice(-8)}</p>
                <p className="text-[9px]">Cashier: {zReportData.cashierName}</p>
                <p className="text-[9px]">Closed: {new Date(zReportData.closedAt).toLocaleString("en-PK")}</p>
              </div>

              <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>{formatRupees(zReportData.openingFloatPaisa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>{formatRupees(zReportData.cashSalesPaisa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Digital / Khata:</span>
                  <span>{formatRupees(zReportData.otherSalesPaisa)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-black">
                  <span>TOTAL SALES:</span>
                  <span>{formatRupees(zReportData.totalSalesPaisa)}</span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>Expected Cash:</span>
                  <span>{formatRupees(zReportData.expectedCashPaisa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Counted Cash:</span>
                  <span>{formatRupees(zReportData.actualCashPaisa)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1">
                  <span>VARIANCE:</span>
                  <span className={zReportData.variancePaisa < 0 ? "text-red-600" : ""}>
                    {zReportData.variancePaisa === 0
                      ? "EXACT (0)"
                      : `${zReportData.variancePaisa < 0 ? "SHORT " : "OVER "}${formatRupees(
                          Math.abs(zReportData.variancePaisa)
                        )}`}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-1.5 bg-emerald-700 text-white rounded text-xs font-bold"
                >
                  Print
                </button>
                <button
                  onClick={() => setZReportData(null)}
                  className="flex-1 py-1.5 border rounded text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
