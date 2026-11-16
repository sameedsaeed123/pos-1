"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees } from "@/lib/money";
import { playScanSuccessBeep, playScanErrorBuzz } from "@/lib/audio";
import {
  RotateCcw,
  Search,
  CheckCircle,
  AlertTriangle,
  Printer,
  ArrowLeft,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { ManagerPinDialog } from "@/components/ManagerPinDialog";

interface ReturnItemState {
  productId: string;
  nameEn: string;
  nameUr: string;
  unit: string;
  originalQty: number;
  returnQty: number;
  unitPricePaisa: number;
  restock: boolean;
  reason: string;
  selected: boolean;
}

export default function ReturnsPage() {
  const { language, activeUser } = usePos();
  const isUrdu = language === "ur";

  const [receiptQuery, setReceiptQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [foundSale, setFoundSale] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [refundMethod, setRefundMethod] = useState<"CASH" | "KHATA_BALANCE">("CASH");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processedReturn, setProcessedReturn] = useState<any | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);

  const handleSearchReceipt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!receiptQuery.trim()) return;

    setIsLoading(true);
    setErrorMsg("");
    setFoundSale(null);
    setProcessedReturn(null);

    try {
      const res = await fetch(`/api/returns?receipt=${encodeURIComponent(receiptQuery.trim())}`);
      const data = await res.json();

      if (res.ok && data.sale) {
        playScanSuccessBeep();
        setFoundSale(data.sale);
        setReturnItems(
          data.sale.items.map((i: any) => ({
            productId: i.productId,
            nameEn: i.product?.nameEn || "Item",
            nameUr: i.product?.nameUr || "",
            unit: i.unit || "piece",
            originalQty: Number(i.quantity),
            returnQty: Number(i.quantity),
            unitPricePaisa: i.unitPricePaisa,
            restock: true,
            reason: "Customer Changed Mind",
            selected: true,
          }))
        );
      } else {
        playScanErrorBuzz();
        setErrorMsg(data.error || "Receipt not found");
      }
    } catch {
      playScanErrorBuzz();
      setErrorMsg("Network error connecting to store server");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateItemReturnQty = (index: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              returnQty: Math.max(0.1, Math.min(item.originalQty, qty)),
            }
          : item
      )
    );
  };

  const updateItemField = (index: number, field: "restock" | "reason", value: any) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const selectedItems = returnItems.filter((i) => i.selected && i.returnQty > 0);
  const totalRefundPaisa = selectedItems.reduce(
    (sum, i) => sum + Math.round(i.returnQty * i.unitPricePaisa),
    0
  );

  const handleInitiateRefund = () => {
    if (selectedItems.length === 0) {
      setErrorMsg("Please select at least one item to return");
      return;
    }

    // Manager approval required if refund exceeds Rs 1,000 or user is cashier
    if (totalRefundPaisa > 100000 && activeUser.role === "CASHIER") {
      setIsPinOpen(true);
      return;
    }

    executeRefund();
  };

  const executeRefund = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: foundSale.id,
          receiptNumber: foundSale.receiptNumber,
          cashierId: activeUser.id,
          items: selectedItems.map((i) => ({
            productId: i.productId,
            quantity: i.returnQty,
            unitPricePaisa: i.unitPricePaisa,
            restock: i.restock,
            reason: i.reason,
          })),
          refundMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playScanSuccessBeep();
        setProcessedReturn(data.returnRecord);
      } else {
        playScanErrorBuzz();
        setErrorMsg(data.error || "Failed to process return");
      }
    } catch {
      playScanErrorBuzz();
      setErrorMsg("Server error processing return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Breadcrumb / Title Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">
                {isUrdu ? "واپسی و تبادلہ (ریٹرن)" : "Returns & Exchanges"}
              </h1>
              <p className="text-xs text-slate-500">
                {isUrdu
                  ? "اصل رسید کے مطابق اشیاء کی واپسی اور رقم کی ادائیگی"
                  : "Process customer returns against original receipt with inventory restock"}
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Lookup Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
          <form onSubmit={handleSearchReceipt} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                value={receiptQuery}
                onChange={(e) => setReceiptQuery(e.target.value)}
                placeholder={
                  isUrdu
                    ? "رسید نمبر اسکین یا درج کریں... (مثال: REC-12345678)"
                    : "Scan receipt barcode or type receipt number... (e.g. REC-48177379)"
                }
                className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !receiptQuery.trim()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isLoading ? "Searching..." : isUrdu ? "رسید تلاش کریں" : "Find Receipt"}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Processed Return Receipt Banner */}
        {processedReturn && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold">
                Return Processed Successfully (Voucher: {processedReturn.returnReceiptNumber})
              </h3>
            </div>
            <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <p>
                Total Refund:{" "}
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {formatRupees(processedReturn.totalRefundPaisa)}
                </strong>{" "}
                via {processedReturn.refundMethod}
              </p>
              <p>Items Returned: {processedReturn.itemsCount}</p>
            </div>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Return Voucher</span>
              </button>
              <button
                onClick={() => {
                  setProcessedReturn(null);
                  setFoundSale(null);
                  setReceiptQuery("");
                }}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Start Another Return
              </button>
            </div>
          </div>
        )}

        {/* Found Sale & Return Items Selection */}
        {foundSale && !processedReturn && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-xs">
            {/* Original Sale Header Details */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 gap-2">
              <div>
                Receipt: <strong className="font-mono text-slate-900 dark:text-white">{foundSale.receiptNumber}</strong>
              </div>
              <div>
                Date: <span>{new Date(foundSale.createdAt).toLocaleString("en-PK")}</span>
              </div>
              <div>
                Cashier: <span>{foundSale.cashier?.name || "Cashier"}</span>
              </div>
              {foundSale.customer && (
                <div>
                  Customer: <strong className="text-indigo-700 dark:text-indigo-400">{foundSale.customer.name}</strong>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Items to Return:
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3 w-8"></th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Purchased</th>
                      <th className="py-2 px-3 text-center w-28">Return Qty</th>
                      <th className="py-2 px-3">Condition & Reason</th>
                      <th className="py-2 px-3 text-right">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {returnItems.map((item, idx) => (
                      <tr
                        key={item.productId}
                        className={item.selected ? "bg-slate-50/70 dark:bg-slate-800/40" : "opacity-60"}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelection(idx)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {isUrdu ? item.nameUr || item.nameEn : item.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Unit: {item.unit} • {formatRupees(item.unitPricePaisa)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums font-medium">
                          {item.originalQty}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0.1"
                            max={item.originalQty}
                            step="any"
                            disabled={!item.selected}
                            value={item.returnQty}
                            onChange={(e) => updateItemReturnQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center font-bold tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input
                                type="radio"
                                name={`restock-${idx}`}
                                checked={item.restock}
                                onChange={() => updateItemField(idx, "restock", true)}
                              />
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                Restock to Shelf
                              </span>
                            </label>
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                              <input
                                type="radio"
                                name={`restock-${idx}`}
                                checked={!item.restock}
                                onChange={() => updateItemField(idx, "restock", false)}
                              />
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                Damaged / Discard
                              </span>
                            </label>
                          </div>
                          <select
                            disabled={!item.selected}
                            value={item.reason}
                            onChange={(e) => updateItemField(idx, "reason", e.target.value)}
                            className="w-full text-[11px] py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <option value="Customer Changed Mind">Customer Changed Mind</option>
                            <option value="Wrong Item Bought">Wrong Item Bought</option>
                            <option value="Defective / Leaking">Defective / Leaking Pack</option>
                            <option value="Expired / Spoiled">Expired / Spoiled</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatRupees(Math.round(item.returnQty * item.unitPricePaisa))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund Options & Total */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Refund Method:
                </span>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="CASH"
                    checked={refundMethod === "CASH"}
                    onChange={() => setRefundMethod("CASH")}
                  />
                  <span>Cash Out of Drawer</span>
                </label>
                {foundSale.customer && (
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium text-indigo-700 dark:text-indigo-400">
                    <input
                      type="radio"
                      name="refundMethod"
                      value="KHATA_BALANCE"
                      checked={refundMethod === "KHATA_BALANCE"}
                      onChange={() => setRefundMethod("KHATA_BALANCE")}
                    />
                    <span>Credit to Customer Khata Balance</span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Refund:</div>
                  <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatRupees(totalRefundPaisa)}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || selectedItems.length === 0}
                  onClick={handleInitiateRefund}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-xs disabled:opacity-40"
                >
                  {isSubmitting ? "Processing..." : "Authorize & Issue Refund"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manager Authorization PIN Dialog */}
      <ManagerPinDialog
        isOpen={isPinOpen}
        requiredRole="MANAGER"
        title="Manager Approval Required for Refund"
        onClose={() => setIsPinOpen(false)}
        onSuccess={() => {
          setIsPinOpen(false);
          executeRefund();
        }}
      />
    </div>
  );
}
