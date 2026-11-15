"use client";

import React, { useState, useEffect } from "react";
import { formatRupees } from "@/lib/money";
import { ShoppingCart, QrCode, Sparkles } from "lucide-react";

export default function CustomerDisplayPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [totalPaisa, setTotalPaisa] = useState<number>(0);
  const [discountPaisa, setDiscountPaisa] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("Welcome to Bismillah General Store!");

  useEffect(() => {
    // Listen for BroadcastChannel events from cashier terminal
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("pos_customer_display");
      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === "CART_UPDATE") {
          setCartItems(payload.items || []);
          setTotalPaisa(payload.totalPaisa || 0);
          setDiscountPaisa(payload.discountPaisa || 0);
          setStatusMessage("Items being scanned...");
        } else if (type === "SALE_COMPLETE") {
          setStatusMessage("Thank you for shopping with us! تشریف لانے کا شکریہ");
          setTimeout(() => {
            setCartItems([]);
            setTotalPaisa(0);
            setDiscountPaisa(0);
            setStatusMessage("Welcome to Bismillah General Store!");
          }, 6000);
        }
      };

      return () => channel.close();
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col p-8 select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-wide uppercase text-white">
            BISMILLAH GENERAL STORE & MINI-MART
          </h1>
          <p className="text-sm font-urdu text-emerald-400 font-bold mt-1">
            بسم اللہ جنرل اسٹور اینڈ منی مارٹ
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-slate-300">Customer Display</span>
        </div>
      </header>

      {/* Main Split: Items List (Left 65%) / Big Total & QR (Right 35%) */}
      <div className="flex-1 flex gap-8 my-6 overflow-hidden">
        {/* Scanned Items Table */}
        <div className="flex-1 bg-slate-800/60 rounded-2xl p-5 border border-slate-800 flex flex-col overflow-hidden">
          <div className="flex justify-between text-xs uppercase tracking-wider text-slate-400 font-bold pb-3 border-b border-slate-700">
            <span className="w-1/2">Item</span>
            <span className="w-1/4 text-center">Quantity</span>
            <span className="w-1/4 text-right">Price</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-700/60 my-2">
            {cartItems.map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center text-sm">
                <div className="w-1/2">
                  <div className="font-bold text-white text-base">{item.nameEn}</div>
                  <div className="text-xs text-slate-400 font-urdu">{item.nameUr}</div>
                </div>
                <div className="w-1/4 text-center font-bold text-emerald-400 tabular-nums text-base">
                  {item.quantity} {item.unit}
                </div>
                <div className="w-1/4 text-right font-extrabold text-white tabular-nums text-base">
                  {formatRupees(item.totalPaisa)}
                </div>
              </div>
            ))}
            {cartItems.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Next customer items will appear here
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Grand Total & Status */}
        <div className="w-96 flex flex-col justify-between bg-slate-800/40 rounded-2xl p-6 border border-slate-800">
          <div>
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 mb-4">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Amount Due
              </span>
              <div className="text-5xl font-extrabold tabular-nums text-emerald-400">
                {formatRupees(totalPaisa)}
              </div>
              {discountPaisa > 0 && (
                <div className="text-xs text-emerald-300 font-bold mt-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>You saved {formatRupees(discountPaisa)} on this bill!</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
              <QrCode className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-200">Raast / JazzCash / Easypaisa</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant mobile payments accepted</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center text-xs font-medium text-slate-400">
            {statusMessage}
          </div>
        </div>
      </div>
    </div>
  );
}

