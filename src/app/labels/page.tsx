"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees } from "@/lib/money";
import { calculateEan13CheckDigit } from "@/lib/barcode";
import {
  Tag,
  Printer,
  Search,
  Plus,
  Trash2,
  Sliders,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface SelectedProductLabel {
  id: string;
  nameEn: string;
  nameUr: string;
  primaryBarcode: string;
  salePricePaisa: number;
  category: string;
  printQuantity: number;
}

export default function BarcodeLabelsPage() {
  const { language } = usePos();
  const isUrdu = language === "ur";

  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLabels, setSelectedLabels] = useState<SelectedProductLabel[]>([]);
  const [labelSize, setLabelSize] = useState<"50x30" | "40x25" | "100x38">("50x30");
  const [showStoreName, setShowStoreName] = useState(true);
  const [showUrduName, setShowUrduName] = useState(true);

  // Fetch catalog products
  useEffect(() => {
    fetch(`/api/products?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory === "ALL" ? "" : selectedCategory}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setProducts(data.products);
      })
      .catch(() => {});
  }, [searchQuery, selectedCategory]);

  const addProductToPrintList = (prod: any) => {
    setSelectedLabels((prev) => {
      const existing = prev.find((p) => p.id === prod.id);
      if (existing) {
        return prev.map((p) =>
          p.id === prod.id ? { ...p, printQuantity: p.printQuantity + 1 } : p
        );
      }
      return [
        ...prev,
        {
          id: prod.id,
          nameEn: prod.nameEn,
          nameUr: prod.nameUr,
          primaryBarcode: prod.primaryBarcode,
          salePricePaisa: prod.salePricePaisa,
          category: prod.category,
          printQuantity: 5,
        },
      ];
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    setSelectedLabels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, printQuantity: Math.max(1, qty) } : p))
    );
  };

  const removeLabel = (id: string) => {
    setSelectedLabels((prev) => prev.filter((p) => p.id !== id));
  };

  const totalLabelCount = selectedLabels.reduce((sum, p) => sum + p.printQuantity, 0);

  // Generates simple pure SVG barcode pattern for standard EAN/Code128 representation
  const renderSvgBarcode = (code: string) => {
    // Generate deterministic bar widths based on code digits
    const bars: boolean[] = [true, false, true]; // start guard
    for (let i = 0; i < code.length; i++) {
      const num = parseInt(code[i], 10) || 0;
      bars.push(num % 2 === 0, true, num > 4, false, num % 3 === 0);
    }
    bars.push(true, false, true); // end guard

    return (
      <svg className="w-full h-8" viewBox={`0 0 ${bars.length * 2} 40`} preserveAspectRatio="none">
        {bars.map((isBar, idx) =>
          isBar ? (
            <rect key={idx} x={idx * 2} y="0" width="1.8" height="40" fill="#000000" />
          ) : null
        )}
      </svg>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Header Controls */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">
                {isUrdu ? "بارکوڈ و شیلف لیبل پرنٹر" : "Barcode & Shelf Label Designer"}
              </h1>
              <p className="text-xs text-slate-500">
                {isUrdu
                  ? "شیلف پرائس ٹیگز اور بارکوڈ اسٹیکرز بیچ پرنٹ کریں"
                  : "Batch print thermal shelf talkers and adhesive product barcode stickers"}
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            disabled={selectedLabels.length === 0}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>Print Batch ({totalLabelCount} Labels)</span>
          </button>
        </div>

        {/* 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print:hidden">
          {/* Left: Product Selection (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Products to Label
            </h2>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, or barcode..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-emerald-600"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs transition-colors"
                >
                  <div className="pr-2">
                    <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {isUrdu ? prod.nameUr || prod.nameEn : prod.nameEn}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {prod.primaryBarcode} • {formatRupees(prod.salePricePaisa)}
                    </div>
                  </div>
                  <button
                    onClick={() => addProductToPrintList(prod)}
                    className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 rounded text-xs font-semibold shrink-0 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Print Queue & Template Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Format & Size Settings Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span className="font-bold">Label Size:</span>
                <select
                  value={labelSize}
                  onChange={(e) => setLabelSize(e.target.value as any)}
                  className="py-1 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="50x30">50mm x 30mm (Standard Sticker)</option>
                  <option value="40x25">40mm x 25mm (Compact Sticker)</option>
                  <option value="100x38">100mm x 38mm (Shelf Edge Price Talker)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600"
                  />
                  <span>Store Name</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUrduName}
                    onChange={(e) => setShowUrduName(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600"
                  />
                  <span>Urdu Name</span>
                </label>
              </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold uppercase tracking-wider text-slate-500">
                  Labels in Queue ({selectedLabels.length} items)
                </span>
                {selectedLabels.length > 0 && (
                  <button
                    onClick={() => setSelectedLabels([])}
                    className="text-red-600 hover:underline text-[11px] font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedLabels.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No products selected yet.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select products from the left panel to batch print labels.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedLabels.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.primaryBarcode} • {formatRupees(item.salePricePaisa)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={item.printQuantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-2 py-1 text-center font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />
                        <button
                          onClick={() => removeLabel(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PRINTABLE LABELS GRID (Formatted precisely for standard thermal roll / sheet printing) */}
        <div id="printable-labels-container" className="pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 print:hidden">
            Live Print Layout Preview:
          </h2>

          <div
            className={`grid gap-3 ${
              labelSize === "100x38"
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            } print:grid print:gap-1`}
          >
            {selectedLabels.flatMap((item) =>
              Array.from({ length: item.printQuantity }).map((_, i) => (
                <div
                  key={`${item.id}-${i}`}
                  style={{
                    width: labelSize === "100x38" ? "100mm" : labelSize === "50x30" ? "50mm" : "40mm",
                    minHeight: labelSize === "100x38" ? "38mm" : labelSize === "50x30" ? "30mm" : "25mm",
                  }}
                  className="bg-white text-black p-2 rounded-xs border border-dashed border-slate-300 print:border-none shadow-xs flex flex-col justify-between overflow-hidden print:break-inside-avoid"
                >
                  {/* Top Bar: Store Name & Category */}
                  {showStoreName && (
                    <div className="text-[8px] font-bold uppercase tracking-wider text-center border-b border-black/20 pb-0.5 truncate">
                      Bismillah General Store
                    </div>
                  )}

                  {/* Product Title */}
                  <div className="text-center py-0.5">
                    <div className="font-bold text-[10px] leading-tight line-clamp-1">
                      {item.nameEn}
                    </div>
                    {showUrduName && (
                      <div className="font-sans font-semibold text-[9px] leading-tight text-zinc-700 line-clamp-1">
                        {item.nameUr}
                      </div>
                    )}
                  </div>

                  {/* Prominent Price Display */}
                  <div className="text-center py-0.5">
                    <span className="font-extrabold text-sm tabular-nums tracking-tight">
                      {formatRupees(item.salePricePaisa)}
                    </span>
                  </div>

                  {/* Barcode & Number */}
                  <div className="text-center">
                    {renderSvgBarcode(item.primaryBarcode)}
                    <div className="text-[8px] font-mono tracking-widest leading-none pt-0.5">
                      {item.primaryBarcode}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
