import { describe, it, expect } from "vitest";
import {
  rupeesToPaisa,
  paisaToWholeRupees,
  formatRupees,
  calculateTax,
  calculateDiscount,
  calculateChange,
} from "../money";
import {
  calculateEan13CheckDigit,
  isValidEan13,
  isValidEan8,
  generateInternalEan13,
  parseScaleBarcode,
} from "../barcode";
import {
  validateStockSufficiency,
  calculateAuditVariance,
  calculateWeightedAverageCost,
} from "../stock";
import { checkPermission } from "../permissions";

describe("Money Domain - Integer Paisa & Whole Rupee Math", () => {
  it("converts rupees to integer paisa without float precision loss", () => {
    expect(rupeesToPaisa(1250)).toBe(125000);
    expect(rupeesToPaisa("1,250.50")).toBe(125050);
    expect(rupeesToPaisa(0.1 + 0.2)).toBe(30); // 30 paisa, solves 0.30000000000000004
  });

  it("converts paisa to whole rupees using round-half-up", () => {
    expect(paisaToWholeRupees(125049)).toBe(1250);
    expect(paisaToWholeRupees(125050)).toBe(1251);
    expect(paisaToWholeRupees(125099)).toBe(1251);
  });

  it("formats currency with normal comma grouping and drops .00 at till", () => {
    expect(formatRupees(124500000)).toBe("Rs 1,245,000");
    expect(formatRupees(124500000, { locale: "ur" })).toBe("1,245,000 روپے");
    expect(formatRupees(124500000, { showPrefix: false })).toBe("1,245,000");
  });

  it("calculates tax-inclusive and tax-exclusive pricing", () => {
    // 18% GST inclusive on Rs 118 (11,800 paisa) -> Net Rs 100, Tax Rs 18
    const inc = calculateTax(11800, 18, true);
    expect(inc.netAmountPaisa).toBe(10000);
    expect(inc.taxPaisa).toBe(1800);

    // 18% GST exclusive on Rs 100 (10,000 paisa) -> Tax Rs 18, Gross Rs 118
    const exc = calculateTax(10000, 18, false);
    expect(exc.taxPaisa).toBe(1800);
    expect(exc.grossAmountPaisa).toBe(11800);
  });

  it("computes discount by percentage and fixed amount", () => {
    expect(calculateDiscount(10000, 10, "percent")).toBe(1000); // 10% of Rs 100 = Rs 10
    expect(calculateDiscount(10000, 25, "fixed_rupees")).toBe(2500); // Rs 25 off
  });

  it("calculates cash change and underpaid status", () => {
    // Bill Rs 850 (85,000 paisa), Tender Rs 1000 (100,000 paisa) -> Change Rs 150 (15,000 paisa)
    const exact = calculateChange(85000, 100000);
    expect(exact.changePaisa).toBe(15000);
    expect(exact.isUnderpaid).toBe(false);

    // Underpaid
    const under = calculateChange(85000, 50000);
    expect(under.isUnderpaid).toBe(true);
    expect(under.balanceRemainingPaisa).toBe(35000);
  });
});

describe("Barcode Toolkit - Checksums and Scale Parser", () => {
  it("calculates GS1 EAN-13 check digit correctly", () => {
    // Tapal Danedar prefix sample: 896400010001 -> check digit 7
    expect(calculateEan13CheckDigit("896400010001")).toBe(1);
    expect(isValidEan13("8964000100011")).toBe(true);
    expect(isValidEan13("8964000100018")).toBe(false); // Wrong check digit
  });

  it("validates 8-digit EAN-8 barcodes", () => {
    expect(isValidEan8("96385074")).toBe(true);
  });

  it("generates in-store EAN-13 barcodes with prefix 20", () => {
    const code = generateInternalEan13(452);
    expect(code.startsWith("20")).toBe(true);
    expect(code.length).toBe(13);
    expect(isValidEan13(code)).toBe(true);
  });

  it("parses GS1 electronic scale barcodes (Prefix 20-29)", () => {
    // Barcode: Prefix 20, Item SKU 00125, Weight 1,500g (1.5kg) -> 2000125015007
    const checkDigit = calculateEan13CheckDigit("200012501500");
    const barcode = `200012501500${checkDigit}`;

    const parsed = parseScaleBarcode(barcode);
    expect(parsed).not.toBeNull();
    expect(parsed?.isScaleBarcode).toBe(true);
    expect(parsed?.itemSku).toBe("00125");
    expect(parsed?.weightGrams).toBe(1500);
    expect(parsed?.weightKg).toBe(1.5);
  });
});

describe("Stock Ledger & Permissions Domain", () => {
  it("verifies stock sufficiency and deficit", () => {
    expect(validateStockSufficiency(10, 5).isSufficient).toBe(true);
    expect(validateStockSufficiency(10, 15).isSufficient).toBe(false);
    expect(validateStockSufficiency(10, 15).deficit).toBe(5);
  });

  it("computes physical audit variance", () => {
    expect(calculateAuditVariance(50, 48).varianceDelta).toBe(-2); // Shortage
    expect(calculateAuditVariance(50, 48).isShortage).toBe(true);
    expect(calculateAuditVariance(50, 52).isSurplus).toBe(true);
  });

  it("enforces role-based permissions and discount caps", () => {
    // Cashier allowed up to 5% discount, 10% requires manager override
    expect(checkPermission("CASHIER", "APPLY_DISCOUNT", 5).allowed).toBe(true);
    expect(checkPermission("CASHIER", "APPLY_DISCOUNT", 10).allowed).toBe(false);
    expect(checkPermission("CASHIER", "APPLY_DISCOUNT", 10).requiresManagerOverride).toBe(true);

    // Price override requires manager override for Cashier
    expect(checkPermission("CASHIER", "PRICE_OVERRIDE").allowed).toBe(false);
    expect(checkPermission("MANAGER", "PRICE_OVERRIDE").allowed).toBe(true);
    expect(checkPermission("OWNER", "PRICE_OVERRIDE").allowed).toBe(true);
  });
});
