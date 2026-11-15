"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { formatRupees } from "@/lib/money";
import { Printer, Share2, X, Check } from "lucide-react";

interface ThermalReceiptProps {
  sale: any;
  store?: any;
  paperWidth?: "80mm" | "58mm";
  onClose: () => void;
}

export function ThermalReceipt({
  sale,
  store,
  paperWidth = "80mm",
  onClose,
}: ThermalReceiptProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedWidth, setSelectedWidth] = useState<"80mm" | "58mm">(paperWidth);
  const [isCopied, setIsCopied] = useState(false);

  const defaultStore = {
    nameEn: "Bismillah General Store",
    nameUr: "بسم اللہ جنرل اسٹور",
    phone: "+92 300 8472910",
    address: "Ghazi Road, DHA Phase 1, Lahore",
    fbrPosId: "100101",
  };

  const storeInfo = store || defaultStore;
  const items = Array.isArray(sale?.items) ? sale.items : [];
  const payments = Array.isArray(sale?.payments) ? sale.payments : [];

  const totalPaisa = Number(sale?.totalPaisa || 0);
  const subtotalPaisa = Number(sale?.subtotalPaisa || totalPaisa);
  const discountPaisa = Number(sale?.discountPaisa || 0);
  const taxPaisa = Number(sale?.taxPaisa || 0);
  const receiptNumber = sale?.receiptNumber || `REC-${Date.now().toString().slice(-8)}`;
  const dateFormatted = sale?.createdAt
    ? new Date(sale.createdAt).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  useEffect(() => {
    if (qrCanvasRef.current && sale) {
      const qrData =
        sale.fbrQrCode ||
        `FBR:${storeInfo.fbrPosId}:${sale.fbrInvoiceNumber || receiptNumber}:${totalPaisa}`;
      QRCode.toCanvas(qrCanvasRef.current, qrData, {
        width: selectedWidth === "58mm" ? 110 : 130,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).catch((err) => {
        console.warn("QR generation notice:", err);
      });
    }
  }, [sale, storeInfo, selectedWidth, receiptNumber, totalPaisa]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error("Print invocation error:", err);
    }
  };

  const handleWhatsAppShare = () => {
    const phone = sale?.customer?.phone ? sale.customer.phone.replace(/\D/g, "") : "";
    const itemsText = items
      .map(
        (i: any) =>
          `• ${i.product?.nameEn || i.nameEn || "Item"} x ${i.quantity} = Rs ${Math.round(
            (i.totalPaisa || 0) / 100
          ).toLocaleString()}`
      )
      .join("\n");

    const message = `*${storeInfo.nameEn}*
Receipt: ${receiptNumber}
Date: ${dateFormatted}
-------------------------
${itemsText || "No items"}
-------------------------
*Total: Rs ${Math.round(totalPaisa / 100).toLocaleString()}*
Payment: ${payments.map((p: any) => p.method).join(", ") || "Cash"}
${sale?.fbrInvoiceNumber ? `FBR Invoice: ${sale.fbrInvoiceNumber}` : ""}

Thank you for shopping with us!`;

    const encoded = encodeURIComponent(message);
    const url = phone ? `https://wa.me/92${phone.slice(-10)}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  if (!sale) return null;

  const is58mm = selectedWidth === "58mm";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-4 shadow-xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Receipt Ready</h3>
              <p className="text-[10px] text-slate-500 font-mono">{receiptNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 80mm vs 58mm Width Toggle */}
            <div className="flex border border-slate-200 rounded p-0.5 bg-slate-50 text-[10px] font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setSelectedWidth("80mm")}
                className={`px-1.5 py-0.5 rounded ${
                  selectedWidth === "80mm" ? "bg-white shadow-xs font-bold text-slate-900" : ""
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setSelectedWidth("58mm")}
                className={`px-1.5 py-0.5 rounded ${
                  selectedWidth === "58mm" ? "bg-white shadow-xs font-bold text-slate-900" : ""
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={handleWhatsAppShare}
              title="Share via WhatsApp"
              className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="overflow-y-auto my-3 flex-1 p-2 bg-slate-100 rounded flex justify-center">
          <div
            id="thermal-receipt-area"
            style={{ width: is58mm ? "58mm" : "80mm" }}
            className="bg-white p-3 shadow-xs border border-slate-200 text-black text-xs font-mono select-text"
          >
            {/* Header */}
            <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black">
              <h2 className="font-bold text-sm tracking-tight">{storeInfo.nameEn}</h2>
              <p className="text-[11px] font-sans font-semibold">{storeInfo.nameUr}</p>
              <p className="text-[10px] text-zinc-600">{storeInfo.address}</p>
              <p className="text-[10px] text-zinc-600">Phone: {storeInfo.phone}</p>
            </div>

            {/* Metadata */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{sale?.cashier?.name || "Cashier"}</span>
              </div>
              {sale?.customer && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{sale.customer.name}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Price</span>
              </div>

              <div className="divide-y divide-zinc-100 py-1">
                {items.length === 0 ? (
                  <div className="py-1 text-center text-zinc-400">Standard Grocery Sale</div>
                ) : (
                  items.map((item: any, idx: number) => (
                    <div key={idx} className="py-1 text-[11px]">
                      <div className="font-medium truncate">
                        {item.product?.nameEn || item.nameEn || item.name || "Grocery Item"}
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>{item.product?.nameUr || item.nameUr || ""}</span>
                        <span>
                          {item.quantity} x{" "}
                          {formatRupees(item.unitPricePaisa || 0, { showPrefix: false })} ={" "}
                          <strong>{formatRupees(item.totalPaisa || 0, { showPrefix: false })}</strong>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="py-2 space-y-1 text-xs">
              <div className="flex justify-between text-[11px]">
                <span>Subtotal:</span>
                <span>{formatRupees(subtotalPaisa)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between text-[11px] text-zinc-700">
                  <span>Discount:</span>
                  <span>-{formatRupees(discountPaisa)}</span>
                </div>
              )}
              {taxPaisa > 0 && (
                <div className="flex justify-between text-[11px] text-zinc-700">
                  <span>GST Tax:</span>
                  <span>+{formatRupees(taxPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatRupees(totalPaisa)}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="py-1.5 border-t border-dashed border-black text-[10px] space-y-0.5">
              {payments.length === 0 ? (
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>{formatRupees(totalPaisa)} (Cash)</span>
                </div>
              ) : (
                payments.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>Tendered ({p.method}):</span>
                    <span>{formatRupees(p.tenderPaisa || p.amountPaisa)}</span>
                  </div>
                ))
              )}
              {payments[0]?.changePaisa > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Change Returned:</span>
                  <span>{formatRupees(payments[0].changePaisa)}</span>
                </div>
              )}
            </div>

            {/* FBR Fiscal QR Section */}
            {sale?.fbrInvoiceNumber && (
              <div className="py-2.5 border-t border-dashed border-black text-center space-y-1">
                <p className="text-[10px] font-bold tracking-wider">FBR FISCAL INVOICE</p>
                <div className="flex justify-center py-1">
                  <canvas ref={qrCanvasRef} className="mx-auto" />
                </div>
                <p className="text-[9px] font-mono font-bold break-all">
                  {sale.fbrInvoiceNumber}
                </p>
                <p className="text-[8px] text-zinc-500">Verify via FBR Tax Asaan App</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 text-center text-[10px] border-t border-dashed border-black">
              <p className="font-semibold">Thank You For Your Visit</p>
              <p className="font-sans">تشریف لانے کا شکریہ</p>
              <p className="text-[9px] text-zinc-500 mt-1">Exchange with receipt within 3 days</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt [Enter]</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
