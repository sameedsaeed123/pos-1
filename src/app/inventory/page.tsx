"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees, rupeesToPaisa } from "@/lib/money";
import {
  Package,
  Plus,
  Search,
  Upload,
  AlertTriangle,
  ArrowUpDown,
  History,
  CheckCircle,
} from "lucide-react";

export default function InventoryPage() {
  const { language, activeUser } = usePos();
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCost, setNewProductCost] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("General");
  const [newProductUnit, setNewProductUnit] = useState("piece");
  const [newProductInitialStock, setNewProductInitialStock] = useState("20");

  const isUrdu = language === "ur";

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedCategory !== "All") params.set("category", selectedCategory);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.categories) {
          setCategories(["All", ...data.categories]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductBarcode || !newProductPrice) return;

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn: newProductName,
          primaryBarcode: newProductBarcode,
          salePricePaisa: rupeesToPaisa(newProductPrice),
          costPaisa: newProductCost ? rupeesToPaisa(newProductCost) : Math.round(rupeesToPaisa(newProductPrice) * 0.8),
          category: newProductCategory,
          unit: newProductUnit,
          initialStock: Number(newProductInitialStock) || 0,
          createdById: activeUser.id,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewProductName("");
        setNewProductBarcode("");
        setNewProductPrice("");
        setNewProductCost("");
        loadProducts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1 flex flex-col p-4 overflow-hidden max-w-7xl w-full mx-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-700" />
              <span>{isUrdu ? "اسٹاک و پراڈکٹ انوینٹری" : "Inventory & Stock Hub"}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isUrdu
                ? "تمام آئٹمز کی قیمتیں، بارکوڈ اور اسٹاک کا ریکارڈ"
                : "Real-time stock ledger, pricing, and fast catalog entry"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("CSV Importer: Upload CSV with columns: name, barcode, price, cost, category")}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs hover:bg-slate-50"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isUrdu ? "نیا پروڈکٹ شامل کریں" : "Add New Product"}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs mb-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, Urdu name, SKU, or barcode..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading catalog items...</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-3">SKU & Barcode</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-right">Sale Price</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const isLow = p.currentStock <= p.reorderLevel;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {p.nameEn}
                        </div>
                        <div className="text-[11px] font-urdu text-slate-500">{p.nameUr}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{p.sku}</div>
                        <bdi dir="ltr" className="text-slate-400 text-[10px]">
                          {p.primaryBarcode}
                        </bdi>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-[11px] text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-500">
                        {formatRupees(p.costPaisa)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {formatRupees(p.salePricePaisa)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                            isLow
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>
                            {p.currentStock} {p.unit}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Add New Product to Catalog
            </h3>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. National Chilli Garlic Sauce 300g"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Barcode (Scan or Enter) *
                </label>
                <input
                  type="text"
                  required
                  value={newProductBarcode}
                  onChange={(e) => setNewProductBarcode(e.target.value)}
                  placeholder="8964000..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sale Price (Rs) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    placeholder="250"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price (Rs)
                  </label>
                  <input
                    type="number"
                    value={newProductCost}
                    onChange={(e) => setNewProductCost(e.target.value)}
                    placeholder="210"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
                  >
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    value={newProductInitialStock}
                    onChange={(e) => setNewProductInitialStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold border rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
