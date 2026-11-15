"use client";

import React, { useState } from "react";
import { PlusCircle, AlertCircle, Save, Clock, X } from "lucide-react";
import { usePos } from "@/context/PosContext";
import { checkPermission } from "@/lib/permissions";
import { rupeesToPaisa } from "@/lib/money";

interface QuickAddProductDialogProps {
  isOpen: boolean;
  barcode: string;
  onClose: () => void;
  onProductAdded: (product: any) => void;
  bufferedScanBarcode?: string | null;
}

const CATEGORIES = [
  "Tea & Beverages",
  "Dairy & Eggs",
  "Spices & Recipe Mix",
  "Oil & Ghee",
  "Grains & Pulses",
  "Bakery & Biscuits",
  "Personal Care",
  "Household & Cleaning",
  "Snacks & Sweets",
  "General",
];

export function QuickAddProductDialog({
  isOpen,
  barcode,
  onClose,
  onProductAdded,
  bufferedScanBarcode,
}: QuickAddProductDialogProps) {
  const { activeUser, language } = usePos();
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [category, setCategory] = useState("General");
  const [salePriceRupees, setSalePriceRupees] = useState("");
  const [unit, setUnit] = useState("piece");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const isUrdu = language === "ur";
  const perm = checkPermission(activeUser.role, "QUICK_ADD_BARCODE");
  const canDirectlyAdd = perm.allowed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !salePriceRupees || Number(salePriceRupees) <= 0) {
      setErrorMsg("Please provide a valid product name and sale price");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (canDirectlyAdd) {
        // Direct save to catalog
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nameEn,
            nameUr: nameUr || nameEn,
            primaryBarcode: barcode,
            category,
            unit,
            salePricePaisa: rupeesToPaisa(salePriceRupees),
            initialStock: 25,
            createdById: activeUser.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          onProductAdded(data.product);
          onClose();
        } else {
          const err = await res.json();
          setErrorMsg(err.error || "Failed to add product");
        }
      } else {
        // Cashier queues for manager approval
        await fetch("/api/products/pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode,
            suggestedName: nameEn,
            suggestedPricePaisa: rupeesToPaisa(salePriceRupees),
            scannedBy: activeUser.name,
          }),
        }).catch(() => {});

        alert(
          isUrdu
            ? "بارکوڈ مینیجر منظوری کے لیے کیو میں بھیج دیا گیا ہے"
            : "Barcode has been submitted to the Manager Approval Queue."
        );
        onClose();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isUrdu ? "نامعلوم بارکوڈ - فوری اضافہ" : "Unknown Barcode - Quick Add"}
              </h3>
              <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {barcode}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if another barcode was scanned while modal open */}
        {bufferedScanBarcode && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Next scan buffered: <strong className="font-mono">{bufferedScanBarcode}</strong>. Finish or cancel this item first.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Name (English) *
            </label>
            <input
              type="text"
              autoFocus
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Shan Korma Masala 50g"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Name (Urdu / اردو نام)
            </label>
            <input
              type="text"
              dir="rtl"
              value={nameUr}
              onChange={(e) => setNameUr(e.target.value)}
              placeholder="مثال: شان قورمہ مصالحہ"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-urdu font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sale Price (Rs) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={salePriceRupees}
                onChange={(e) => setSalePriceRupees(e.target.value)}
                placeholder="150"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm tabular-nums font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
              >
                <option value="piece">Piece (عدد)</option>
                <option value="kg">Kilogram (کلو)</option>
                <option value="gram">Gram (گرام)</option>
                <option value="litre">Litre (لیٹر)</option>
                <option value="pack">Pack (پیکٹ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {errorMsg && <p className="text-xs font-semibold text-red-600">{errorMsg}</p>}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            {canDirectlyAdd ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save & Cart [Enter]</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Clock className="w-4 h-4" />
                <span>Send to Manager Queue</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
