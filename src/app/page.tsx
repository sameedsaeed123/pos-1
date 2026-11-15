"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees, PKR_NOTE_DENOMINATIONS, rupeesToPaisa } from "@/lib/money";
import { playScanSuccessBeep, playScanErrorBuzz } from "@/lib/audio";
import { parseScaleBarcode } from "@/lib/barcode";
import { PaymentModal } from "@/components/PaymentModal";
import { ThermalReceipt } from "@/components/ThermalReceipt";
import { QuickAddProductDialog } from "@/components/QuickAddProductDialog";
import { ManagerPinDialog } from "@/components/ManagerPinDialog";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Pause,
  Play,
  UserPlus,
  Tag,
  CreditCard,
  ShoppingBag,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export interface CartItem {
  productId: string;
  nameEn: string;
  nameUr: string;
  sku: string;
  barcode: string;
  unit: string;
  quantity: number;
  unitPricePaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
}

export interface ParkedBill {
  id: string;
  name: string;
  items: CartItem[];
  customer: any | null;
  parkedAt: Date;
}

export default function PosRegisterPage() {
  const { language, activeUser } = usePos();
  const isUrdu = language === "ur";

  // Catalog State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [billDiscountPaisa, setBillDiscountPaisa] = useState<number>(0);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>("");

  // Parked Bills
  const [parkedBills, setParkedBills] = useState<ParkedBill[]>([]);

  // Modals & Sheets
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [bufferedScanBarcode, setBufferedScanBarcode] = useState<string | null>(null);
  const [isManagerPinOpen, setIsManagerPinOpen] = useState(false);
  const [managerPinAction, setManagerPinAction] = useState<(() => void) | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scanBufferRef = useRef<{ buffer: string; lastTime: number }>({ buffer: "", lastTime: 0 });

  // 1. Fetch catalog on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (q?: string, cat?: string) => {
    try {
      setIsLoadingCatalog(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat && cat !== "All") params.set("category", cat);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        if (data.categories && data.categories.length > 0) {
          setCategories(["All", ...data.categories]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch products:", e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // 2. Add product to cart helper
  const addProductToCart = useCallback(
    (product: any, customQuantity: number = 1) => {
      setCartItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.productId === product.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const item = updated[existingIdx];
          const newQty = item.quantity + customQuantity;
          const newTotal = Math.round(newQty * item.unitPricePaisa) - item.discountPaisa;
          updated[existingIdx] = {
            ...item,
            quantity: newQty,
            totalPaisa: Math.max(0, newTotal),
          };
          setActiveRowIndex(existingIdx);
          return updated;
        }

        const initialTotal = Math.round(customQuantity * product.salePricePaisa);
        const newItem: CartItem = {
          productId: product.id,
          nameEn: product.nameEn,
          nameUr: product.nameUr,
          sku: product.sku,
          barcode: product.primaryBarcode,
          unit: product.unit,
          quantity: customQuantity,
          unitPricePaisa: product.salePricePaisa,
          discountPaisa: 0,
          taxPaisa: 0,
          totalPaisa: initialTotal,
        };
        const next = [newItem, ...prev];
        setActiveRowIndex(0);
        return next;
      });

      playScanSuccessBeep();
      setLastScannedBarcode(product.primaryBarcode);
    },
    []
  );

  // 3. Process scanned barcode
  const handleScannedBarcode = useCallback(
    async (barcode: string) => {
      // If unknown barcode sheet is already open, buffer the scan
      if (unknownBarcode) {
        playScanErrorBuzz();
        setBufferedScanBarcode(barcode);
        return;
      }

      // Check scale barcodes (Prefix 20-29)
      const scaleInfo = parseScaleBarcode(barcode);
      if (scaleInfo) {
        // Find product by SKU
        const res = await fetch(`/api/products?q=${scaleInfo.itemSku}`);
        const data = await res.json();
        const matched = data.products?.[0];
        if (matched) {
          addProductToCart(matched, scaleInfo.weightKg);
          return;
        }
      }

      // Check standard barcode
      const res = await fetch(`/api/products?q=${barcode}`);
      const data = await res.json();
      const matched = data.products?.find(
        (p: any) => p.primaryBarcode === barcode || p.sku === barcode
      );

      if (matched) {
        addProductToCart(matched, 1);
      } else {
        playScanErrorBuzz();
        setUnknownBarcode(barcode);
      }
    },
    [unknownBarcode, addProductToCart]
  );

  // 4. Global Barcode Scanner Listener (<35ms inter-keystroke interval)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // SAFE KEYBOARD SHORTCUTS
      if (e.key === "F1") {
        e.preventDefault();
        e.stopPropagation();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();
        setIsDiscountModalOpen(true);
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        e.stopPropagation();
        handleHoldBill();
        return;
      }
      if (e.key === "F6") {
        e.preventDefault();
        e.stopPropagation();
        handleRecallBill();
        return;
      }
      if (e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        if (completedSale) setIsReceiptOpen(true);
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        if (cartItems.length > 0) setIsPaymentOpen(true);
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        e.stopPropagation();
        if (cartItems.length > 0) setIsPaymentOpen(true);
        return;
      }
      if (e.key === "F10") {
        e.preventDefault();
        e.stopPropagation();
        handleVoidCurrentLine();
        return;
      }
      if (e.key === "Escape") {
        setIsPaymentOpen(false);
        setIsDiscountModalOpen(false);
        setUnknownBarcode(null);
        setBufferedScanBarcode(null);
        return;
      }

      // BARCODE SCANNER TIMING DETECTOR
      const now = Date.now();
      const timeDiff = now - scanBufferRef.current.lastTime;
      scanBufferRef.current.lastTime = now;

      // Reset buffer if delay > 60ms (human typing)
      if (timeDiff > 60 && e.key !== "Enter") {
        scanBufferRef.current.buffer = "";
      }

      if (e.key === "Enter") {
        const potentialBarcode = scanBufferRef.current.buffer.trim();
        if (potentialBarcode.length >= 3) {
          handleScannedBarcode(potentialBarcode);
          scanBufferRef.current.buffer = "";
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        scanBufferRef.current.buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems, completedSale, handleScannedBarcode]);

  // Quantity updates
  const updateQuantity = (idx: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const newQty = Math.max(0.1, Number((item.quantity + delta).toFixed(3)));
      const newTotal = Math.round(newQty * item.unitPricePaisa) - item.discountPaisa;
      updated[idx] = {
        ...item,
        quantity: newQty,
        totalPaisa: Math.max(0, newTotal),
      };
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVoidCurrentLine = () => {
    if (cartItems.length === 0) return;
    if (activeUser.role === "CASHIER") {
      // Cashier can void line directly or request manager
      removeItem(activeRowIndex);
    } else {
      removeItem(activeRowIndex);
    }
  };

  const handleHoldBill = () => {
    if (cartItems.length === 0) return;
    const newBill: ParkedBill = {
      id: `parked-${Date.now()}`,
      name: selectedCustomer?.name || `Customer #${parkedBills.length + 1}`,
      items: cartItems,
      customer: selectedCustomer,
      parkedAt: new Date(),
    };
    setParkedBills((prev) => [...prev, newBill]);
    setCartItems([]);
    setSelectedCustomer(null);
    setBillDiscountPaisa(0);
    playScanSuccessBeep();
  };

  const handleRecallBill = (index: number = 0) => {
    if (parkedBills.length === 0) return;
    const bill = parkedBills[index];
    setCartItems(bill.items);
    setSelectedCustomer(bill.customer);
    setParkedBills((prev) => prev.filter((_, i) => i !== index));
    playScanSuccessBeep();
  };

  // Calculations
  const subtotalPaisa = cartItems.reduce((sum, item) => sum + item.totalPaisa, 0);
  const taxPaisa = 0; // Exemption
  const grandTotalPaisa = Math.max(0, subtotalPaisa - billDiscountPaisa + taxPaisa);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Navbar />

      {/* Main Workspace: 65% Left (Register Cart) / 35% Right (Quick Grid & Search) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Cart & Checkout (65%) */}
        <section className="w-full lg:w-[62%] xl:w-[65%] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Parked Bills Bar & Customer Tag */}
          <div className="h-10 px-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {parkedBills.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => handleRecallBill(idx)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 rounded-md font-bold text-[11px] border border-amber-300 dark:border-amber-700 hover:bg-amber-200"
                >
                  <Play className="w-3 h-3 text-amber-700" />
                  <span>Recall: {b.name}</span>
                </button>
              ))}
              {parkedBills.length === 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {isUrdu ? "کوئی ہولڈ شدہ بل نہیں" : "No parked bills (Press F4 to hold)"}
                </span>
              )}
            </div>

            {/* Customer Khata Pill */}
            <div className="flex items-center gap-2">
              {selectedCustomer ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 text-xs font-bold">
                  <span>Khata: {selectedCustomer.name}</span>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="hover:text-red-600 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const phone = prompt("Enter customer mobile number or name for Khata (ادھار):");
                    if (phone) {
                      fetch(`/api/customers?q=${phone}`)
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.customers && d.customers.length > 0) {
                            setSelectedCustomer(d.customers[0]);
                          } else {
                            alert("Customer not found. You can add them under Khata tab.");
                          }
                        });
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isUrdu ? "کھاتہ گاہک منتخب کریں [F3]" : "Select Customer [F3]"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto select-none">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isUrdu ? "کارٹ خالی ہے" : "Active Cart Is Empty"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {isUrdu
                    ? "بارکوڈ اسکین کریں یا تلاش کرنے کے لیے F1 دبائیں"
                    : "Scan any barcode or press F1 to search items from the catalog"}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cartItems.map((item, idx) => (
                    <tr
                      key={`${item.productId}-${idx}`}
                      onClick={() => setActiveRowIndex(idx)}
                      className={`transition-colors ${
                        activeRowIndex === idx
                          ? "bg-emerald-50/70 dark:bg-emerald-950/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      } ${lastScannedBarcode === item.barcode ? "animate-scan-success" : ""}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {isUrdu ? item.nameUr || item.nameEn : item.nameEn}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <bdi dir="ltr">{item.barcode}</bdi>
                          <span>•</span>
                          <span>Unit: {item.unit}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(idx, -1)}
                            className="w-6 h-6 rounded bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center font-bold tabular-nums text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(idx, 1)}
                            className="w-6 h-6 rounded bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatRupees(item.unitPricePaisa, { showPrefix: false })}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                        {formatRupees(item.totalPaisa, { showPrefix: false })}
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart Footer: 52px Grand Total & Action Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 select-none">
            {/* Subtotal & Discount Row */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Items: <strong className="tabular-nums">{cartItems.length}</strong>
                </span>
                {billDiscountPaisa > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    Discount: -{formatRupees(billDiscountPaisa)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsDiscountModalOpen(true)}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{isUrdu ? "بل ڈسکاؤنٹ [F2]" : "Apply Discount [F2]"}</span>
              </button>
            </div>

            {/* Giant Grand Total Legible from 1 Metre */}
            <div className="py-2.5 flex items-baseline justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-300">
                {isUrdu ? "کل قابل ادائیگی رقم:" : "GRAND TOTAL:"}
              </span>
              <div className="text-[52px] leading-none font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatRupees(grandTotalPaisa)}
              </div>
            </div>

            {/* Primary Action Buttons Bar */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Pause className="w-4 h-4 text-amber-600" />
                <span>Hold [F4]</span>
              </button>

              <button
                type="button"
                onClick={handleVoidCurrentLine}
                disabled={cartItems.length === 0}
                className="py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Void [F10]</span>
              </button>

              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => setIsPaymentOpen(true)}
                className="py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-40"
              >
                <span>Exact Cash [F9]</span>
              </button>

              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => setIsPaymentOpen(true)}
                className="py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
              >
                <CreditCard className="w-5 h-5" />
                <span>PAY [F8]</span>
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT PANE: Catalog Search & Quick Tiles (35%) */}
        <section className="hidden lg:flex lg:w-[38%] xl:w-[35%] flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {/* Barcode / Search Box */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchProducts(e.target.value, selectedCategory);
                }}
                placeholder={
                  isUrdu
                    ? "بارکوڈ اسکین کریں یا نام لکھیں... [F1]"
                    : "Scan barcode or search product / SKU... [F1]"
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            {/* Category Filter Badges */}
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.slice(0, 7).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    fetchProducts(searchQuery, cat);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Key Tiles Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoadingCatalog ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {products.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => addProductToCart(prod, 1)}
                    className="h-24 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600 dark:hover:border-emerald-600 flex flex-col justify-between text-left active:scale-98 transition-all shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="truncate max-w-[80px]">{prod.category}</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                          {prod.currentStock} {prod.unit}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 mt-0.5 leading-tight group-hover:text-emerald-700">
                        {isUrdu ? prod.nameUr || prod.nameEn : prod.nameEn}
                      </h5>
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatRupees(prod.salePricePaisa)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Payment Tender Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        totalPaisa={grandTotalPaisa}
        subtotalPaisa={subtotalPaisa}
        discountPaisa={billDiscountPaisa}
        taxPaisa={taxPaisa}
        items={cartItems}
        selectedCustomer={selectedCustomer}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentComplete={(sale) => {
          setIsPaymentOpen(false);
          setCompletedSale(sale);
          setIsReceiptOpen(true);
          setCartItems([]);
          setSelectedCustomer(null);
          setBillDiscountPaisa(0);
        }}
      />

      {/* Thermal Receipt Print Modal */}
      {isReceiptOpen && completedSale && (
        <ThermalReceipt
          sale={completedSale}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}

      {/* Unknown Barcode Quick Add Sheet */}
      {unknownBarcode && (
        <QuickAddProductDialog
          isOpen={true}
          barcode={unknownBarcode}
          bufferedScanBarcode={bufferedScanBarcode}
          onClose={() => {
            const nextScan = bufferedScanBarcode;
            setUnknownBarcode(null);
            setBufferedScanBarcode(null);
            if (nextScan) {
              setTimeout(() => handleScannedBarcode(nextScan), 100);
            }
          }}
          onProductAdded={(newProd) => {
            addProductToCart(newProd, 1);
            const nextScan = bufferedScanBarcode;
            setUnknownBarcode(null);
            setBufferedScanBarcode(null);
            if (nextScan) {
              setTimeout(() => handleScannedBarcode(nextScan), 100);
            }
          }}
        />
      )}

      {/* Bill Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Bill Discount (Rs)
            </h4>
            <input
              type="number"
              min="0"
              autoFocus
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-emerald-600 mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold border rounded-lg text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Number(discountInput) || 0;
                  setBillDiscountPaisa(rupeesToPaisa(val));
                  setIsDiscountModalOpen(false);
                  setDiscountInput("");
                }}
                className="flex-1 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
