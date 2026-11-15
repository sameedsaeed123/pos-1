/**
 * Barcode Toolkit: Checksum Validators, In-Store EAN-13 Generator, & Scale Parser
 * 
 * Standards implemented:
 * - GS1 EAN-13, EAN-8, and UPC-A Check Digit calculation (Modulo 10).
 * - Variable Measure In-Store Scale Barcode Parser (Prefix 20-29).
 * - Format: 20 AAAAA WWWWW C (where AAAAA = SKU, WWWWW = Weight in grams).
 */

/**
 * Calculates EAN-13 check digit for a 12-digit base string using the GS1 Modulo 10 algorithm.
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  if (twelveDigits.length !== 12 || !/^\d+$/.test(twelveDigits)) {
    throw new Error("EAN-13 check digit requires exactly 12 numeric characters");
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    // Even indices (0, 2, 4...) have weight 1; odd indices (1, 3, 5...) have weight 3
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates any 13-digit EAN-13 barcode against its check digit.
 */
export function isValidEan13(barcode: string): boolean {
  if (!barcode || barcode.length !== 13 || !/^\d+$/.test(barcode)) return false;
  const base = barcode.slice(0, 12);
  const expectedCheckDigit = calculateEan13CheckDigit(base);
  const actualCheckDigit = parseInt(barcode[12], 10);
  return expectedCheckDigit === actualCheckDigit;
}

/**
 * Validates an 8-digit EAN-8 barcode.
 */
export function isValidEan8(barcode: string): boolean {
  if (!barcode || barcode.length !== 8 || !/^\d+$/.test(barcode)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(barcode[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  const remainder = sum % 10;
  const expected = remainder === 0 ? 0 : 10 - remainder;
  return expected === parseInt(barcode[7], 10);
}

/**
 * Generates an internal store EAN-13 barcode for unbarcoded loose or repacked goods.
 * Uses the GS1 in-store prefix 20 through 29.
 * Example: SKU 452 -> "20000000452" + check digit -> "200000004523"
 */
export function generateInternalEan13(skuNumber: number | string, prefix: string = "20"): string {
  const cleanSku = String(skuNumber).replace(/\D/g, "");
  // Prefix is 2 digits; remaining SKU padding is 10 digits
  const paddedSku = cleanSku.padStart(10, "0").slice(-10);
  const base = `${prefix}${paddedSku}`;
  const checkDigit = calculateEan13CheckDigit(base);
  return `${base}${checkDigit}`;
}

export interface ScaleBarcodeResult {
  isScaleBarcode: boolean;
  prefix: string;
  itemSku: string;
  weightGrams: number;
  weightKg: number;
  isValidChecksum: boolean;
}

/**
 * Parses electronic scale barcodes used for loose vegetables, meat, and grains.
 * Standard format: PP AAAAA WWWWW C
 * - PP: In-store prefix 20 to 29
 * - AAAAA: 5-digit product item code
 * - WWWWW: 5-digit weight in grams (e.g. 01500 = 1,500g = 1.5kg)
 * - C: EAN-13 check digit
 */
export function parseScaleBarcode(barcode: string): ScaleBarcodeResult | null {
  if (!barcode || barcode.length !== 13 || !/^\d+$/.test(barcode)) {
    return null;
  }

  const prefix = barcode.slice(0, 2);
  const prefixNum = parseInt(prefix, 10);

  // Check if prefix belongs to GS1 in-store range (20-29)
  if (prefixNum < 20 || prefixNum > 29) {
    return null;
  }

  const itemSku = barcode.slice(2, 7);
  const weightGrams = parseInt(barcode.slice(7, 12), 10);
  const weightKg = parseFloat((weightGrams / 1000).toFixed(3));
  const isValidChecksum = isValidEan13(barcode);

  return {
    isScaleBarcode: true,
    prefix,
    itemSku,
    weightGrams,
    weightKg,
    isValidChecksum,
  };
}

/**
 * Scanner timing configuration for USB/Bluetooth barcode scanners.
 */
export const SCANNER_CONFIG = {
  maxInterKeyDelayMs: 35, // Hardware scanners emit keystrokes <35ms apart
  minBarcodeLength: 3,
  maxBarcodeLength: 32,
};
