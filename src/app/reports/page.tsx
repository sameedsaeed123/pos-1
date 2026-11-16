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
  Printer,
  Download,
  Clock,
  CreditCard,
  Smartphone,
  Banknote,
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

  const handleExportCsv = () => {
    if (!data) return;

    let csv = "Product,Category,Quantity Sold,Revenue (PKR)\n";
    for (const item of data.topItems || []) {
      csv += `"${item.nameEn}","${item.category}",${item.quantitySold},${Math.round(
        item.totalRevenuePaisa / 100
      )}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kiryana-sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxHourlyRevenue = Math.max(
    1,
    ...(data?.hourlyDistribution?.map((h: any) => h.revenuePaisa) || [1])
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              <span>{isUrdu ? "مالک ڈیش بورڈ و کاروباری رپورٹس" : "Owner Dashboard & Store Analytics"}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isUrdu
                ? "روزانہ سیلز، مجموعی منافع، ٹاپ آئٹمز اور رش کے اوقات کی تفصیل"
                : "Today's revenue, gross profit margin, hourly rush heatmap, and top commodities"}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading business analytics...</div>
        ) : (
          <div className="space-y-4">
            {/* 4 Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Today's Revenue</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                </span>
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatRupees(data.metrics.todayRevenuePaisa)}
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 block">
                  {data.metrics.todayTransactionsCount} bills finalized today
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Gross Profit</span>
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                </span>
                <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatRupees(data.metrics.todayProfitPaisa)}
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  Gross Margin: <strong className="text-slate-800 dark:text-slate-200">{data.metrics.grossMarginPercent}%</strong>
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Cash in Till Drawer</span>
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                </span>
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                  {formatRupees(data.metrics.cashInDrawerPaisa)}
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  Float + cash sales collected
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Outstanding Khata (Udhaar)</span>
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                </span>
                <div className="text-xl font-bold tabular-nums text-indigo-700 dark:text-indigo-400 mt-1">
                  {formatRupees(data.metrics.totalKhataOutstandingPaisa)}
                </div>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold mt-0.5 block">
                  Active customer market credit
                </span>
              </div>
            </div>

            {/* Hourly Sales Rush Heatmap */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Today's Hourly Sales Heatmap (Peak Rush Hours)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500">
                  Store Hours: 08:00 AM — 11:00 PM
                </span>
              </div>

              <div className="grid grid-cols-8 md:grid-cols-16 gap-1 pt-4 items-end h-28">
                {data.hourlyDistribution?.map((h: any) => {
                  const heightPercent = Math.max(8, Math.round((h.revenuePaisa / maxHourlyRevenue) * 100));
                  const isPeak = heightPercent > 70;
                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1 group">
                      <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {h.count} bills
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-xs transition-all ${
                          isPeak
                            ? "bg-emerald-700 dark:bg-emerald-600"
                            : h.revenuePaisa > 0
                            ? "bg-emerald-200 dark:bg-emerald-900"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      />
                      <div className="text-[9px] font-mono text-slate-500">
                        {h.hour}:00
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split: Top Selling Items (Left 60%) / Low Stock Alerts (Right 40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Top Selling Products */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span>Top Revenue Generating Commodities</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-center">Qty Sold</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.topItems?.map((itm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{itm.nameEn}</div>
                            <div className="text-[10px] text-slate-500">{itm.nameUr}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{itm.category}</td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                            {itm.quantitySold} {itm.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatRupees(itm.totalRevenuePaisa)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock Reorder List */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Low Stock Reorder Alerts</span>
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.lowStockItems?.map((item: any) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{item.nameEn}</div>
                        <div className="text-[10px] text-slate-400">Reorder at: {item.reorderLevel} {item.unit}</div>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold tabular-nums text-xs">
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
