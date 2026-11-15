/**
 * Money Domain: Integer Paisa Arithmetic & Pakistani Rupee Formatting
 * 
 * In accordance with retail banking standards, all financial values in the database
 * are stored strictly as integer paisa (1 PKR = 100 paisa) to eliminate IEEE 754 floating
 * point inaccuracies across item tax, discounts, and split payment splits.
 * 
 * At the retail till and on printed receipts:
 * - Whole rupees are displayed (paisa is dropped at checkout).
 * - Standard thousands grouping is used (Rs 1,245,000).
 * - Western digits (0-9) are strictly used even in Urdu display mode.
 * - Standard round-half-up math is applied: Math.round(paisa / 100).
 */

export const PKR_NOTE_DENOMINATIONS = [10, 20, 50, 75, 100, 500, 1000, 5000] as const;

/**
 * Converts a rupee amount (number or string) to integer paisa.
 */
export function rupeesToPaisa(rupees: number | string): number {
  const numeric = typeof rupees === "string" ? parseFloat(rupees.replace(/,/g, "")) : rupees;
  if (isNaN(numeric) || !isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

/**
 * Converts integer paisa to whole rupees using round-half-up.
 */
export function paisaToWholeRupees(paisa: number): number {
  if (!paisa || isNaN(paisa)) return 0;
  return Math.round(paisa / 100);
}

/**
 * Formats integer paisa into a formatted currency string for Pakistani retail.
 * Example: 124500000 paisa -> "Rs 1,245,000" in English, "1,245,000 روپے" in Urdu.
 */
export function formatRupees(
  paisa: number,
  options?: {
    locale?: "en" | "ur";
    showPrefix?: boolean;
    showPaisa?: boolean;
  }
): string {
  const locale = options?.locale || "en";
  const showPrefix = options?.showPrefix !== false;
  const showPaisa = options?.showPaisa === true;

  if (showPaisa) {
    const rawRupees = (paisa / 100).toFixed(2);
    const [whole, decimal] = rawRupees.split(".");
    const formattedWhole = Number(whole).toLocaleString("en-US");
    const numStr = `${formattedWhole}.${decimal}`;
    if (!showPrefix) return numStr;
    return locale === "ur" ? `${numStr} روپے` : `Rs ${numStr}`;
  }

  const wholeRupees = paisaToWholeRupees(paisa);
  const formattedWhole = wholeRupees.toLocaleString("en-US");

  if (!showPrefix) return formattedWhole;
  return locale === "ur" ? `${formattedWhole} روپے` : `Rs ${formattedWhole}`;
}

/**
 * Calculates tax on an item or bill.
 * Handles both tax-inclusive (GST already inside the shelf price) and tax-exclusive pricing.
 */
export function calculateTax(
  amountPaisa: number,
  taxRatePercent: number,
  isTaxInclusive: boolean = true
): { netAmountPaisa: number; taxPaisa: number; grossAmountPaisa: number } {
  if (taxRatePercent <= 0 || amountPaisa <= 0) {
    return { netAmountPaisa: amountPaisa, taxPaisa: 0, grossAmountPaisa: amountPaisa };
  }

  if (isTaxInclusive) {
    // Tax = Total - (Total / (1 + Rate / 100))
    const netAmountPaisa = Math.round((amountPaisa * 100) / (100 + taxRatePercent));
    const taxPaisa = amountPaisa - netAmountPaisa;
    return { netAmountPaisa, taxPaisa, grossAmountPaisa: amountPaisa };
  } else {
    // Tax = Subtotal * (Rate / 100)
    const taxPaisa = Math.round((amountPaisa * taxRatePercent) / 100);
    const grossAmountPaisa = amountPaisa + taxPaisa;
    return { netAmountPaisa: amountPaisa, taxPaisa, grossAmountPaisa };
  }
}

/**
 * Calculates discount amount in paisa given an original amount and discount type.
 */
export function calculateDiscount(
  amountPaisa: number,
  discountValue: number,
  type: "percent" | "fixed_rupees"
): number {
  if (amountPaisa <= 0 || discountValue <= 0) return 0;

  if (type === "percent") {
    const cappedPercent = Math.min(100, Math.max(0, discountValue));
    return Math.round((amountPaisa * cappedPercent) / 100);
  } else {
    const fixedPaisa = rupeesToPaisa(discountValue);
    return Math.min(amountPaisa, fixedPaisa);
  }
}

/**
 * Computes change due for cash payments.
 */
export function calculateChange(
  totalPaisa: number,
  tenderPaisa: number
): { changePaisa: number; isUnderpaid: boolean; balanceRemainingPaisa: number } {
  if (tenderPaisa >= totalPaisa) {
    return {
      changePaisa: tenderPaisa - totalPaisa,
      isUnderpaid: false,
      balanceRemainingPaisa: 0,
    };
  }
  return {
    changePaisa: 0,
    isUnderpaid: true,
    balanceRemainingPaisa: totalPaisa - tenderPaisa,
  };
}

