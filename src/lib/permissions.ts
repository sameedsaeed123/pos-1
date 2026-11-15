import bcrypt from "bcryptjs";

export type Role = "OWNER" | "MANAGER" | "CASHIER" | "STOCK_KEEPER";

export type Action =
  | "PROCESS_SALE"
  | "APPLY_DISCOUNT"
  | "PRICE_OVERRIDE"
  | "VOID_LINE"
  | "VOID_BILL"
  | "ISSUE_REFUND"
  | "OPEN_CASH_DRAWER"
  | "VIEW_COST_AND_PROFIT"
  | "MANAGE_STOCK"
  | "QUICK_ADD_BARCODE"
  | "MANAGE_CUSTOMERS"
  | "RECORD_KHATA_PAYMENT"
  | "CLOSE_SHIFT"
  | "CONFIG_STORE"
  | "VIEW_REPORTS";

export interface PermissionCheckResult {
  allowed: boolean;
  requiresManagerOverride: boolean;
  reason?: string;
}

/**
 * Evaluates whether a role can perform an action directly, or requires a manager override PIN.
 */
export function checkPermission(
  role: Role,
  action: Action,
  discountPercent?: number
): PermissionCheckResult {
  switch (action) {
    case "PROCESS_SALE":
    case "VOID_LINE":
    case "OPEN_CASH_DRAWER":
    case "RECORD_KHATA_PAYMENT":
      if (role === "STOCK_KEEPER") {
        return { allowed: false, requiresManagerOverride: true, reason: "Cashier role required" };
      }
      return { allowed: true, requiresManagerOverride: false };

    case "APPLY_DISCOUNT": {
      const percent = discountPercent || 0;
      if (role === "OWNER") return { allowed: true, requiresManagerOverride: false };
      if (role === "MANAGER") {
        if (percent <= 25) return { allowed: true, requiresManagerOverride: false };
        return { allowed: false, requiresManagerOverride: true, reason: "Manager discount capped at 25%" };
      }
      if (role === "CASHIER") {
        if (percent <= 5) return { allowed: true, requiresManagerOverride: false };
        return { allowed: false, requiresManagerOverride: true, reason: "Cashier discount capped at 5%" };
      }
      return { allowed: false, requiresManagerOverride: true, reason: "Role cannot apply discounts" };
    }

    case "PRICE_OVERRIDE":
    case "VOID_BILL":
    case "ISSUE_REFUND":
      if (role === "OWNER" || role === "MANAGER") {
        return { allowed: true, requiresManagerOverride: false };
      }
      return { allowed: false, requiresManagerOverride: true, reason: "Manager authorization required" };

    case "VIEW_COST_AND_PROFIT":
    case "VIEW_REPORTS":
      if (role === "OWNER" || role === "MANAGER") {
        return { allowed: true, requiresManagerOverride: false };
      }
      return { allowed: false, requiresManagerOverride: false, reason: "Confidential financial data" };

    case "MANAGE_STOCK":
      if (role === "OWNER" || role === "MANAGER" || role === "STOCK_KEEPER") {
        return { allowed: true, requiresManagerOverride: false };
      }
      return { allowed: false, requiresManagerOverride: true, reason: "Stock management role required" };

    case "QUICK_ADD_BARCODE":
      if (role === "OWNER" || role === "MANAGER" || role === "STOCK_KEEPER") {
        return { allowed: true, requiresManagerOverride: false };
      }
      return {
        allowed: false,
        requiresManagerOverride: true,
        reason: "Cashiers must queue new items for manager approval unless overridden",
      };

    case "MANAGE_CUSTOMERS":
      if (role === "OWNER" || role === "MANAGER") {
        return { allowed: true, requiresManagerOverride: false };
      }
      return { allowed: false, requiresManagerOverride: false, reason: "Only managers can modify credit limits" };

    case "CLOSE_SHIFT":
      return { allowed: true, requiresManagerOverride: false };

    case "CONFIG_STORE":
      if (role === "OWNER") {
        return { allowed: true, requiresManagerOverride: false };
      }
      return { allowed: false, requiresManagerOverride: false, reason: "Store owner authorization required" };

    default:
      return { allowed: false, requiresManagerOverride: true };
  }
}

/**
 * Validates a 4-6 digit manager override PIN against active managers and owners.
 */
export async function verifyManagerOverridePin(
  pin: string,
  managerList: Array<{ id: string; name: string; pinHash: string; role: Role }>
): Promise<{ verified: boolean; approvedBy?: { id: string; name: string; role: Role } }> {
  for (const manager of managerList) {
    if (manager.role !== "OWNER" && manager.role !== "MANAGER") continue;
    const isMatch = await bcrypt.compare(pin, manager.pinHash);
    if (isMatch) {
      return {
        verified: true,
        approvedBy: { id: manager.id, name: manager.name, role: manager.role },
      };
    }
  }
  return { verified: false };
}
