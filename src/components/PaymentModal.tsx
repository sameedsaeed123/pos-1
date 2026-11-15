"use client";

import React, { useState, useEffect } from "react";
import { usePos } from "@/context/PosContext";
import { formatRupees, PKR_NOTE_DENOMINATIONS, rupeesToPaisa } from "@/lib/money";
import { playSaleCompleteChime, playScanErrorBuzz } from "@/lib/audio";
import {
  Banknote,
  CreditCard,
  Smartphone,
  BookOpen,
  QrCode,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  totalPaisa: number;
  subtotalPaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  items: any[];
  selectedCustomer: any | null;
  onClose: () => void;
  onPaymentComplete: (completedSale: any) => void;
}

export function PaymentModal({
  isOpen,
  totalPaisa,
  subtotalPaisa,
  discountPaisa,
  taxPaisa,
  items,
  selectedCustomer,
  onClose,
  onPaymentComplete,
}: PaymentModalProps) {
  const { activeUser, language, isFbrEnabled } = usePos();
  const [selectedMethod, setSelectedMethod] = useState<
    "CASH" | "CARD" | "JAZZCASH" | "EASYPAISA" | "RAAST_QR" | "KHATA_UDHAAR"
  >("CASH");
  const [tenderRupees, setTenderRupees] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalWholeRupees = Math.round(totalPaisa / 100);

  useEffect(() => {
    if (isOpen) {
      setTenderRupees(String(totalWholeRupees));
      setErrorMsg("");
    }
  }, [isOpen, totalWholeRupees]);

  if (!isOpen) return null;

  const isUrdu = language === "ur";
  const tenderPaisa = rupeesToPaisa(tenderRupees || 0);
  const changePaisa = Math.max(0, tenderPaisa - totalPaisa);
  const isUnderpaid = selectedMethod === "CASH" && tenderPaisa < totalPaisa;

  const handleQuickTenderNote = (noteValue: number) => {
    setTenderRupees(String(noteValue));
  };

  const handleExactTender = () => {
    setTenderRupees(String(totalWholeRupees));
  };

  const handleCompleteSale = async () => {
    if (selectedMethod === "CASH" && tenderPaisa < totalPaisa) {
      playScanErrorBuzz();
      setErrorMsg("Tendered cash is less than the total bill amount");
      return;
    }

    if (selectedMethod === "KHATA_UDHAAR" && !selectedCustomer) {
      playScanErrorBuzz();
      setErrorMsg("Please select a registered customer to bill on Khata (Udhaar)");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      clientTxId: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      cashierId: activeUser.id,
      customerId: selectedCustomer?.id || null,
      subtotalPaisa,
      discountPaisa,
      taxPaisa,
      totalPaisa,
      items: items.map((itm) => ({
        productId: itm.productId,
        nameEn: itm.nameEn,
        nameUr: itm.nameUr,
        unit: itm.unit,
        quantity: itm.quantity,
        unitPricePaisa: itm.unitPricePaisa,
        discountPaisa: itm.discountPaisa || 0,
        taxPaisa: itm.taxPaisa || 0,
        totalPaisa: itm.totalPaisa,
      })),
      payments: [
        {
          method: selectedMethod,
          amountPaisa: totalPaisa,
          tenderPaisa: selectedMethod === "CASH" ? tenderPaisa : totalPaisa,
          changePaisa: selectedMethod === "CASH" ? changePaisa : 0,
          referenceNumber: transactionRef || undefined,
        },
      ],
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        playSaleCompleteChime();
        const saleData = {
          ...data.sale,
          items:
            data.sale?.items && data.sale.items.length > 0
              ? data.sale.items
              : payload.items,
          payments:
            data.sale?.payments && data.sale.payments.length > 0
              ? data.sale.payments
              : payload.payments,
        };
        onPaymentComplete(saleData);
      } else {
        const err = await res.json();
        playScanErrorBuzz();
        setErrorMsg(err.error || "Failed to finalize sale");
      }
    } catch {
      // Offline fallback: save locally to outbox in Dexie
      try {
        const { localDb } = await import("@/lib/dexie");
        const receiptNo = `REC-${Date.now().toString().slice(-8)}`;
        const offlineSale = {
          clientTxId: payload.clientTxId,
          receiptNumber: receiptNo,
          shiftId: "active-shift",
          cashierId: activeUser.id,
          customerId: selectedCustomer?.id || null,
          subtotalPaisa,
          discountPaisa,
          taxPaisa,
          totalPaisa,
          items: payload.items,
          payments: payload.payments,
          fbrStatus: isFbrEnabled ? ("PENDING" as const) : ("NOT_APPLICABLE" as const),
          status: "PENDING" as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        };
        await localDb.outbox.add(offlineSale);
        playSaleCompleteChime();
        onPaymentComplete(offlineSale);
      } catch {
        setErrorMsg("Failed to store offline transaction");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-xl w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isUrdu ? "ادائیگی وصول کریں" : "Tender Payment"}
            </h3>
            <p className="text-xs text-slate-500">
              {isUrdu ? "طریقہ انتخاب کریں اور رسید جاری کریں" : "Select payment method and complete bill"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Due Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md p-3.5 my-3.5 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Total Payable:
          </span>
          <span className="text-3xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatRupees(totalPaisa)}
          </span>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          {[
            { id: "CASH", label: "Cash (نقد)", icon: Banknote },
            { id: "JAZZCASH", label: "JazzCash", icon: Smartphone },
            { id: "EASYPAISA", label: "Easypaisa", icon: Smartphone },
            { id: "RAAST_QR", label: "Raast QR", icon: QrCode },
            { id: "CARD", label: "Card", icon: CreditCard },
            { id: "KHATA_UDHAAR", label: "Khata (ادھار)", icon: BookOpen },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethod(m.id as any)}
                className={`py-2.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 border transition-colors ${
                  isSelected
                    ? "bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cash Tender Details & Note Buttons */}
        {selectedMethod === "CASH" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount Tendered by Customer (Rs)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                autoFocus
                value={tenderRupees}
                onChange={(e) => setTenderRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold tabular-nums text-slate-900 dark:text-white focus:border-emerald-600 outline-none"
              />
            </div>

            {/* PKR Denominations Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Banknotes:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {PKR_NOTE_DENOMINATIONS.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => handleQuickTenderNote(note)}
                    className="py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    Rs {note}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleExactTender}
                  className="py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-bold col-span-2 border border-slate-300 dark:border-slate-600"
                >
                  Exact (Rs {totalWholeRupees})
                </button>
              </div>
            </div>

            {/* Change Display */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-between border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Change to Return:
              </span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  isUnderpaid ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {isUnderpaid ? "Underpaid" : formatRupees(changePaisa)}
              </span>
            </div>
          </div>
        )}

        {/* Khata Udhaar Customer Check */}
        {selectedMethod === "KHATA_UDHAAR" && (
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-md space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
              <BookOpen className="w-4 h-4 text-indigo-700" />
              <span>Customer Khata Credit Sale</span>
            </div>
            {selectedCustomer ? (
              <div className="text-xs text-indigo-800 dark:text-indigo-300 space-y-0.5">
                <p>
                  Customer: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.phone})
                </p>
                <p>
                  Current Debt Balance: <strong>{formatRupees(selectedCustomer.currentBalancePaisa)}</strong>
                </p>
                <p>
                  Credit Limit: <strong>{formatRupees(selectedCustomer.creditLimitPaisa)}</strong>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please select a customer before billing on Khata.</span>
              </div>
            )}
          </div>
        )}

        {/* Digital Reference Input */}
        {(selectedMethod === "JAZZCASH" ||
          selectedMethod === "EASYPAISA" ||
          selectedMethod === "RAAST_QR" ||
          selectedMethod === "CARD") && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Transaction ID / Approval Code (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. TID-98247192"
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-600"
            />
          </div>
        )}

        {errorMsg && (
          <p className="mt-2.5 text-xs font-medium text-red-600">{errorMsg}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Back to Cart
          </button>
          <button
            type="button"
            disabled={isSubmitting || (selectedMethod === "CASH" && isUnderpaid)}
            onClick={handleCompleteSale}
            className="flex-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            <span>Complete Sale & Print [Enter]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
