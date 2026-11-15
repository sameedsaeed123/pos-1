"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees, rupeesToPaisa } from "@/lib/money";
import {
  Clock,
  Banknote,
  Lock,
  Printer,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1 flex flex-col p-4 overflow-y-auto max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-emerald-700" />
              <span>{isUrdu ? "شفٹ و کیش ڈراور مینجمنٹ" : "Shifts & Cash Drawer Management"}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isUrdu
                ? "کاؤنٹر کیش کا توازن، بلائنڈ کیش کلوز اور Z-Report پرنٹ"
                : "Till float management, blind cash close, and fiscal Z-Report printing"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading shift status...</div>
        ) : activeShift ? (
          <div className="space-y-4">
            {/* Active Shift Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Active Till Session
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
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
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Blind Close Shift (بند کریں)</span>
                </button>
              </div>

              {/* Till Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Opening Float
                  </span>
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                    {formatRupees(activeShift.openingFloatPaisa)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Cash Sales Collected
                  </span>
                  <div className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatRupees(activeShift.cashSalesPaisa || 0)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Digital / Khata Sales
                  </span>
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                    {formatRupees((activeShift.cardSalesPaisa || 0) + (activeShift.mobileSalesPaisa || 0) + (activeShift.khataSalesPaisa || 0))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Expected Cash in Drawer
                  </span>
                  <div className="text-xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 mt-1">
                    {formatRupees(activeShift.expectedCashInDrawerPaisa || activeShift.openingFloatPaisa)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Open New Shift Form */
          <div className="max-w-md mx-auto my-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900 dark:text-white">
              {isUrdu ? "نئی کاؤنٹر شفٹ کھولیں" : "Open New Register Shift"}
            </h3>
            <p className="text-xs text-center text-slate-500 mt-1 mb-5">
              Enter cash drawer opening float to start sales for <strong>{activeUser.name}</strong>
            </p>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Typically Rs 5,000 in small change notes (Rs 10, 20, 50, 100)
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Start Shift & Open Till
              </button>
            </form>
          </div>
        )}

        {/* Blind Close Modal */}
        {isCloseModalOpen && activeShift && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Blind Cash Count (شفٹ کلوز)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Count all physical notes in the drawer and enter the total without checking the system figure.
              </p>

              <form onSubmit={handleBlindCloseShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="flex-1 py-2.5 text-xs font-bold border rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    Confirm & Print Z-Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Z-Report Print Modal */}
        {zReportData && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl flex flex-col text-black font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h3 className="font-extrabold text-sm uppercase">Z-REPORT (DAILY FISCAL CLOSE)</h3>
                <p className="text-[10px]">BISMILLAH GENERAL STORE</p>
                <p className="text-[9px]">Shift ID: {zReportData.shiftId.slice(-8)}</p>
                <p className="text-[9px]">Cashier: {zReportData.cashierName}</p>
                <p className="text-[9px]">Closed: {new Date(zReportData.closedAt).toLocaleString("en-PK")}</p>
              </div>

              <div className="py-3 space-y-1 text-[11px] border-b border-dashed border-black">
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
              <div className="py-3 space-y-1 text-[11px] border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>Expected Cash:</span>
                  <span>{formatRupees(zReportData.expectedCashPaisa)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Counted Cash:</span>
                  <span>{formatRupees(zReportData.actualCashPaisa)}</span>
                </div>
                <div className="flex justify-between font-extrabold pt-1">
                  <span>VARIANCE:</span>
                  <span className={zReportData.variancePaisa < 0 ? "text-red-600" : ""}>
                    {zReportData.variancePaisa === 0
                      ? "EXACT (0)"
                      : `${zReportData.variancePaisa < 0 ? "SHORT " : "OVER "}${formatRupees(Math.abs(zReportData.variancePaisa))}`}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  Print
                </button>
                <button
                  onClick={() => setZReportData(null)}
                  className="flex-1 py-2 border rounded-lg text-xs font-bold"
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
