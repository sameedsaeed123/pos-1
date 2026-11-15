"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees } from "@/lib/money";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ShoppingBag,
  BookOpen,
  Calendar,
  Printer,
  Download,
} from "lucide-react";

export default function ReportsPage() {
  const { language } = usePos();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isUrdu = language === "ur";

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1 flex flex-col p-4 overflow-y-auto max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-700" />
              <span>{isUrdu ? "مالک ڈیش بورڈ و کاروباری رپورٹس" : "Owner Dashboard & Store Analytics"}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isUrdu
                ? "روزانہ سیلز، مجموعی منافع، ٹاپ آئٹمز اور کھاتہ مارکیٹ کی تفصیل"
                : "Today's revenue, gross profit margin, top items, and outstanding debt"}
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>

        {isLoading || !data ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading business analytics...</div>
        ) : (
          <div className="space-y-4">
            {/* 4 Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Today's Revenue</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                </span>
                <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatRupees(data.metrics.todayRevenuePaisa)}
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 block">
                  {data.metrics.todayTransactionsCount} bills processed today
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Gross Profit</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </span>
                <div className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatRupees(data.metrics.todayProfitPaisa)}
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Gross Margin: <strong className="text-slate-800 dark:text-slate-200">{data.metrics.grossMarginPercent}%</strong>
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Cash in Till Drawer</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </span>
                <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatRupees(data.metrics.cashInDrawerPaisa)}
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Float + cash sales collected
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Outstanding Khata (Udhaar)</span>
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </span>
                <div className="text-2xl font-extrabold tabular-nums text-indigo-700 dark:text-indigo-400 mt-1">
                  {formatRupees(data.metrics.totalKhataOutstandingPaisa)}
                </div>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold mt-1 block">
                  Active customer credit ledger
                </span>
              </div>
            </div>

            {/* Split: Top Selling Items (Left 60%) / Low Stock Alerts (Right 40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Top Selling Products */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span>Top Revenue Generating Products</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-center">Qty Sold</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.topItems?.map((itm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{itm.nameEn}</div>
                            <div className="text-[10px] font-urdu text-slate-500">{itm.nameUr}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{itm.category}</td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                            {itm.quantitySold} {itm.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatRupees(itm.totalRevenuePaisa)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock Reorder List */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Low Stock Reorder Alerts</span>
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.lowStockItems?.map((item: any) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.nameEn}</div>
                        <div className="text-[10px] text-slate-400">Reorder at: {item.reorderLevel} {item.unit}</div>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold tabular-nums text-xs">
                        {item.currentStock} {item.unit} left
                      </div>
                    </div>
                  ))}
                  {(!data.lowStockItems || data.lowStockItems.length === 0) && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      All products have healthy stock levels
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
