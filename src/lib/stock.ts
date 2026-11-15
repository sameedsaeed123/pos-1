import { Decimal } from "@prisma/client/runtime/library";

/**
 * Stock Ledger Domain Engine
 * 
 * Strict Retail Invariant: Product inventory is NEVER stored as a blindly editable number.
 * Available stock is always the mathematical sum of immutable historical stock movements.
 * Every sale, return, purchase receipt, damage write-off, and physical count audit
 * writes an audited delta row into the StockLedger table within an atomic database transaction.
 */

export interface StockMovementInput {
  productId: string;
  batchId?: string | null;
  quantityDelta: number | Decimal;
  type:
    | "SALE"
    | "SALE_RETURN"
    | "PURCHASE_RECEIPT"
    | "SUPPLIER_RETURN"
    | "DAMAGE_EXPIRED"
    | "THEFT_LOSS"
    | "INTERNAL_USE"
    | "PHYSICAL_COUNT_ADJUSTMENT";
  referenceId?: string | null;
  costPaisa: number;
  reason?: string | null;
  createdById: string;
}

/**
 * Validates whether adequate stock is available before a sale or transfer.
 * Returns true if available stock >= requestedQuantity, or false if it would cause negative stock.
 */
export function validateStockSufficiency(
  currentStock: number,
  requestedQuantity: number,
  allowNegativeStock: boolean = false
): { isSufficient: boolean; deficit: number } {
  if (allowNegativeStock) {
    return { isSufficient: true, deficit: 0 };
  }

  const deficit = requestedQuantity - currentStock;
  return {
    isSufficient: deficit <= 0,
    deficit: Math.max(0, deficit),
  };
}

/**
 * Calculates updated stock variance after a physical store audit.
 * Variance = Actual Physical Count - System Ledger Count.
 */
export function calculateAuditVariance(
  systemStock: number,
  physicalCount: number
): { varianceDelta: number; isShortage: boolean; isSurplus: boolean } {
  const varianceDelta = physicalCount - systemStock;
  return {
    varianceDelta,
    isShortage: varianceDelta < 0,
    isSurplus: varianceDelta > 0,
  };
}

/**
 * Calculates weighted average cost (WAC) when receiving new inventory.
 * New WAC = (Existing Stock * Existing Cost + New Qty * New Cost) / (Existing Stock + New Qty)
 */
export function calculateWeightedAverageCost(
  existingStock: number,
  existingCostPaisa: number,
  newQuantity: number,
  newCostPaisa: number
): number {
  const totalQuantity = existingStock + newQuantity;
  if (totalQuantity <= 0) return newCostPaisa;

  const totalValuePaisa = existingStock * existingCostPaisa + newQuantity * newCostPaisa;
  return Math.round(totalValuePaisa / totalQuantity);
}
