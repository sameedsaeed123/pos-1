"use client";

import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { formatRupees } from "@/lib/money";
import { Printer, Share2, X } from "lucide-react";

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

  const defaultStore = {
    nameEn: "BISMILLAH GENERAL STORE",
    nameUr: "بسم اللہ جنرل اسٹور",
    phone: "+92 300 8472910",
    address: "Ghazi Road, DHA Phase 1, Lahore",
    fbrPosId: "100101",
  };

  const storeInfo = store || defaultStore;

  useEffect(() => {
    if (qrCanvasRef.current && sale) {
      const qrData =
        sale.fbrQrCode ||
        `FBR:${storeInfo.fbrPosId}:${sale.fbrInvoiceNumber || sale.receiptNumber}:${sale.totalPaisa}`;
      QRCode.toCanvas(qrCanvasRef.current, qrData, {
        width: 140,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      }).catch(console.error);
    }
  }, [sale, storeInfo]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = sale.customer?.phone ? sale.customer.phone.replace(/\D/g, "") : "";
    const itemsText = sale.items
      .map(
        (i: any) =>
          `• ${i.product?.nameEn || "Item"} x ${i.quantity} = Rs ${Math.round(i.totalPaisa / 100).toLocaleString()}`
      )
      .join("\n");

    const message = `*${storeInfo.nameEn}*
Receipt: ${sale.receiptNumber}
Date: ${new Date(sale.createdAt).toLocaleDateString()}
-------------------------
${itemsText}
-------------------------
*Total: Rs ${Math.round(sale.totalPaisa / 100).toLocaleString()}*
Payment: ${sale.payments?.map((p: any) => p.method).join(", ") || "Cash"}
${sale.fbrInvoiceNumber ? `FBR Invoice: ${sale.fbrInvoiceNumber}` : ""}

Thank you for shopping with us!`;

    const encoded = encodeURIComponent(message);
    const url = phone ? `https://wa.me/92${phone.slice(-10)}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  if (!sale) return null;

  const is58mm = paperWidth === "58mm";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">Receipt Ready</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleWhatsAppShare}
              title="Send via WhatsApp"
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="overflow-y-auto my-3 flex-1 p-2 bg-slate-50 rounded-xl flex justify-center">
          <div
            id="thermal-receipt-area"
            style={{ width: is58mm ? "58mm" : "80mm" }}
            className="bg-white p-3 shadow-sm border border-slate-200 text-black text-xs font-mono select-text"
          >
            {/* Header */}
            <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black">
              <h2 className="font-extrabold text-sm uppercase">{storeInfo.nameEn}</h2>
              <p className="text-[11px] font-sans font-bold">{storeInfo.nameUr}</p>
              <p className="text-[10px]">{storeInfo.address}</p>
              <p className="text-[10px]">Phone: {storeInfo.phone}</p>
            </div>

            {/* Metadata */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(sale.createdAt).toLocaleString("en-PK")}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{sale.cashier?.name || "Cashier"}</span>
              </div>
              {sale.customer && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{sale.customer.name}</span>
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

              <div className="divide-y divide-slate-100 py-1">
                {sale.items.map((item: any, idx: number) => (
                  <div key={idx} className="py-1 text-[11px]">
                    <div className="font-semibold truncate">
                      {item.product?.nameEn || item.nameEn || "Grocery Item"}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-700">
                      <span>{item.product?.nameUr || ""}</span>
                      <span>
                        {item.quantity} x {formatRupees(item.unitPricePaisa, { showPrefix: false })} ={" "}
                        <strong>{formatRupees(item.totalPaisa, { showPrefix: false })}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2 space-y-1 text-xs">
              <div className="flex justify-between text-[11px]">
                <span>Subtotal:</span>
                <span>{formatRupees(sale.subtotalPaisa)}</span>
              </div>
              {sale.discountPaisa > 0 && (
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Discount:</span>
                  <span>-{formatRupees(sale.discountPaisa)}</span>
                </div>
              )}
              {sale.taxPaisa > 0 && (
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>GST Tax:</span>
                  <span>+{formatRupees(sale.taxPaisa)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatRupees(sale.totalPaisa)}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="py-1.5 border-t border-dashed border-black text-[10px] space-y-0.5">
              {sale.payments?.map((p: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>Tendered ({p.method}):</span>
                  <span>{formatRupees(p.tenderPaisa || p.amountPaisa)}</span>
                </div>
              ))}
              {sale.payments?.[0]?.changePaisa > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Change Returned:</span>
                  <span>{formatRupees(sale.payments[0].changePaisa)}</span>
                </div>
              )}
            </div>

            {/* FBR Fiscal QR Section */}
            {sale.fbrInvoiceNumber && (
              <div className="py-2.5 border-t border-dashed border-black text-center space-y-1">
                <p className="text-[10px] font-bold tracking-wider">FBR POS FISCAL INVOICE</p>
                <div className="flex justify-center py-1">
                  <canvas ref={qrCanvasRef} className="mx-auto" />
                </div>
                <p className="text-[9px] font-mono font-bold break-all">
                  {sale.fbrInvoiceNumber}
                </p>
                <p className="text-[8px] text-slate-600">Verify via FBR Tax Asaan App</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 text-center text-[10px] border-t border-dashed border-black">
              <p className="font-bold">Thank You For Your Visit!</p>
              <p className="font-sans">تشریف لانے کا شکریہ</p>
              <p className="text-[9px] text-slate-500 mt-1">Exchange with receipt within 3 days</p>
            </div>
          </div>
        </div>

        {/* Print Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt [Enter]</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
