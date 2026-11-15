"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { usePos } from "@/context/PosContext";
import { formatRupees, rupeesToPaisa } from "@/lib/money";
import {
  BookOpen,
  UserPlus,
  Search,
  MessageCircle,
  PlusCircle,
  History,
  CheckCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

export default function KhataPage() {
  const { language, activeUser } = usePos();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustLimit, setNewCustLimit] = useState("20000");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [repayAmountRupees, setRepayAmountRupees] = useState("");
  const [repayNotes, setRepayNotes] = useState("");

  const isUrdu = language === "ur";

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        if (data.customers?.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(data.customers[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/customers?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerDetail(data.customer);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName,
          phone: newCustPhone,
          address: newCustAddress,
          creditLimitPaisa: rupeesToPaisa(newCustLimit),
        }),
      });

      if (res.ok) {
        setIsAddCustomerOpen(false);
        setNewCustName("");
        setNewCustPhone("");
        setNewCustAddress("");
        loadCustomers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !repayAmountRupees || Number(repayAmountRupees) <= 0) return;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          customerId: selectedCustomerId,
          amountPaisa: rupeesToPaisa(repayAmountRupees),
          notes: repayNotes || "Cash installment received at counter",
          createdById: activeUser.id,
        }),
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        setRepayAmountRupees("");
        setRepayNotes("");
        loadCustomers();
        loadCustomerDetails(selectedCustomerId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getWhatsAppReminderUrl = (customer: any) => {
    if (!customer) return "";
    const cleanPhone = customer.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone;
    const balanceRupees = Math.round(customer.currentBalancePaisa / 100).toLocaleString();

    const text = isUrdu
      ? `محترم ${customer.name} صاحب! بسم اللہ جنرل اسٹور پر آپ کا بقایا ادھار کھاتہ Rs ${balanceRupees} ہے۔ برائے مہربانی تشریف لا کر رقم ادا فرمائیں۔ شکریہ!`
      : `Dear ${customer.name}, your outstanding grocery khata balance at Bismillah General Store is Rs ${balanceRupees}. Please visit the store to settle your balance. Thank you!`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  const totalOutstandingAll = customers.reduce(
    (sum, c) => sum + Math.max(0, c.currentBalancePaisa),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1 flex flex-col p-4 overflow-hidden max-w-7xl w-full mx-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-700" />
              <span>{isUrdu ? "کھاتہ و کسٹمر ادھار لیجر" : "Customer Khata (Udhaar Ledger)"}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isUrdu
                ? "گاہکوں کا ماہانہ ادھار، ادائیگیوں کی رسید اور واٹس ایپ بیانات"
                : "Manage customer credit, record payments, and send WhatsApp statements"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-900 dark:text-indigo-300">
              Total Market Udhaar: <strong className="text-sm tabular-nums">{formatRupees(totalOutstandingAll)}</strong>
            </div>

            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isUrdu ? "نیا کھاتہ کھولیں" : "Add Customer Khata"}</span>
            </button>
          </div>
        </div>

        {/* Master-Detail Split View */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Customer List (Left 35%) */}
          <div className="w-full md:w-[35%] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer name or phone..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading accounts...</div>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  const hasDebt = c.currentBalancePaisa > 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`w-full p-3 text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-700"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {c.phone}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-xs font-extrabold tabular-nums ${
                            hasDebt ? "text-indigo-700 dark:text-indigo-400" : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {hasDebt ? formatRupees(c.currentBalancePaisa) : "Clear"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Limit: {formatRupees(c.creditLimitPaisa, { showPrefix: false })}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Customer Ledger Statement (Right 65%) */}
          <div className="hidden md:flex flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex-col overflow-hidden">
            {selectedCustomerDetail ? (
              <>
                {/* Customer Account Summary Header */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedCustomerDetail.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-medium">
                        {selectedCustomerDetail.phone}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Address: {selectedCustomerDetail.address || "Main Bazar Area"} • Khata Opened:{" "}
                      {new Date(selectedCustomerDetail.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={getWhatsAppReminderUrl(selectedCustomerDetail)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Bill</span>
                    </a>

                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>

                {/* KPI Highlights for this customer */}
                <div className="grid grid-cols-3 p-4 gap-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Current Unpaid Balance
                    </span>
                    <div className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200 tabular-nums mt-0.5">
                      {formatRupees(selectedCustomerDetail.currentBalancePaisa)}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Approved Credit Limit
                    </span>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                      {formatRupees(selectedCustomerDetail.creditLimitPaisa)}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Available Credit Remaining
                    </span>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                      {formatRupees(
                        Math.max(
                          0,
                          selectedCustomerDetail.creditLimitPaisa - selectedCustomerDetail.currentBalancePaisa
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="flex-1 overflow-y-auto p-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>Chronological Khata Statement (کھاتہ تفصیل)</span>
                  </h4>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Transaction Description</th>
                        <th className="py-2.5 px-3 text-right">Debit (Sale)</th>
                        <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedCustomerDetail.khataLedger?.map((entry: any) => {
                        const isDebit = entry.amountPaisa > 0;
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                              {new Date(entry.createdAt).toLocaleString("en-PK")}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {entry.notes || (isDebit ? "Grocery purchase on credit" : "Cash payment")}
                              </div>
                              {entry.saleId && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Ref: {entry.saleId.slice(-8)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-indigo-700 dark:text-indigo-400">
                              {isDebit ? formatRupees(entry.amountPaisa) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                              {!isDebit ? formatRupees(-entry.amountPaisa) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                              {formatRupees(entry.balanceAfterPaisa)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Select a customer from the left to view ledger history
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Record Repayment Modal */}
      {isPaymentModalOpen && selectedCustomerDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Record Debt Repayment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Receiving cash from <strong>{selectedCustomerDetail.name}</strong>
            </p>

            <form onSubmit={handleRecordRepayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount Received (Rs) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  autoFocus
                  value={repayAmountRupees}
                  onChange={(e) => setRepayAmountRupees(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold tabular-nums text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Receipt Reference
                </label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="e.g. Cash handed to Haji Aslam"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold border rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Open New Khata Account
            </h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Malik Usman"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (for WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address / House Number
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="House 14, Street 2"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Limit (Rs)
                </label>
                <input
                  type="number"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(e.target.value)}
                  placeholder="20000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold tabular-nums outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="flex-1 py-2 text-xs font-bold border rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Khata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

