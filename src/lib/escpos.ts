/**
 * ESC/POS Command Generator for 80mm and 58mm Thermal Receipt Printers
 * Standard Epson ESC/POS protocol support with drawer kick commands.
 */

export const ESC = 0x1b;
export const GS = 0x1d;
export const FS = 0x1c;

export interface EscPosOptions {
  width?: "80mm" | "58mm";
  characterSet?: string;
  cutPaper?: boolean;
  kickDrawer?: boolean;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private is58mm: boolean;

  constructor(options: EscPosOptions = {}) {
    this.is58mm = options.width === "58mm";
    this.initialize();
  }

  // Clear printer buffer and reset modes
  initialize(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  // Text alignment: 0=Left, 1=Center, 2=Right
  align(alignment: "left" | "center" | "right"): this {
    const val = alignment === "center" ? 1 : alignment === "right" ? 2 : 0;
    this.buffer.push(ESC, 0x61, val);
    return this;
  }

  // Text emphasis (bold)
  bold(enabled: boolean): this {
    this.buffer.push(ESC, 0x45, enabled ? 1 : 0);
    return this;
  }

  // Double height and double width for headers and totals
  size(size: "normal" | "double-height" | "double-width" | "large"): this {
    let val = 0x00;
    if (size === "double-height") val = 0x01;
    if (size === "double-width") val = 0x10;
    if (size === "large") val = 0x11;
    this.buffer.push(GS, 0x21, val);
    return this;
  }

  // Append raw text
  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  // Append text followed by newline
  line(str: string = ""): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  // Print two column row (Left label, Right value)
  twoColumnRow(left: string, right: string): this {
    const totalChars = this.is58mm ? 32 : 48;
    const spaceNeeded = Math.max(1, totalChars - left.length - right.length);
    const row = left + " ".repeat(spaceNeeded) + right;
    this.line(row);
    return this;
  }

  // Print separator divider line
  divider(char: string = "-"): this {
    const width = this.is58mm ? 32 : 48;
    this.line(char.repeat(width));
    return this;
  }

  // Send electrical pulse to trigger connected cash drawer via RJ11 / RJ12
  // Command: ESC p m t1 t2 (m: pin 2 or pin 5; t1: on-time; t2: off-time)
  kickDrawer(): this {
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  // Feed paper and cut (full or partial)
  cut(partial: boolean = false): this {
    this.line();
    this.line();
    this.line();
    this.buffer.push(GS, 0x56, partial ? 0x01 : 0x00);
    return this;
  }

  // Build binary Uint8Array
  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * WebUSB & WebSerial printer trigger helper
 */
export async function sendRawToUsbPrinter(bytes: Uint8Array): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  // 1. Try Web Serial (USB-to-Serial POS thermal printers)
  if ("serial" in navigator) {
    try {
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      await port.close();
      return true;
    } catch {
      // Fall through if user cancelled or unavailable
    }
  }

  return false;
}
