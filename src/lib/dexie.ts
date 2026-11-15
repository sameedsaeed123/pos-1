import Dexie, { Table } from "dexie";

export interface LocalProduct {
  id: string;
  nameEn: string;
  nameUr: string;
  sku: string;
  primaryBarcode: string;
  category: string;
  brand?: string | null;
  unit: string;
  salePricePaisa: number;
  costPaisa: number;
  taxRatePercent: number;
  reorderLevel: number;
  currentStock: number;
  isActive: boolean;
}

export interface LocalCustomer {
  id: string;
  name: string;
  phone: string;
  currentBalancePaisa: number;
  creditLimitPaisa: number;
}

export interface LocalParkedBill {
  id: string;
  billNumber: number;
  customerName?: string;
  customerId?: string;
  items: Array<{
    productId: string;
    nameEn: string;
    nameUr: string;
    barcode: string;
    unit: string;
    quantity: number;
    unitPricePaisa: number;
    discountPaisa: number;
    totalPaisa: number;
  }>;
  totalPaisa: number;
  parkedAt: string;
}

export interface OutboxSale {
  clientTxId: string;
  receiptNumber: string;
  shiftId: string;
  cashierId: string;
  customerId?: string | null;
  subtotalPaisa: number;
  discountPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  items: Array<{
    productId: string;
    unit: string;
    quantity: number;
    unitPricePaisa: number;
    discountPaisa: number;
    taxPaisa: number;
    totalPaisa: number;
  }>;
  payments: Array<{
    method: string;
    amountPaisa: number;
    tenderPaisa?: number;
    changePaisa?: number;
    referenceNumber?: string;
  }>;
  fbrStatus: "NOT_APPLICABLE" | "PENDING" | "SUCCESS" | "FAILED";
  status: "PENDING" | "SYNCED" | "FAILED";
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export class KiryanaPOSDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  customers!: Table<LocalCustomer, string>;
  parkedBills!: Table<LocalParkedBill, string>;
  outbox!: Table<OutboxSale, string>;

  constructor() {
    super("KiryanaPOSDB");
    this.version(1).stores({
      products: "id, primaryBarcode, sku, category, nameEn, nameUr",
      customers: "id, phone, name",
      parkedBills: "id, billNumber, parkedAt",
      outbox: "clientTxId, status, createdAt",
    });
  }
}

export const localDb = new KiryanaPOSDatabase();

