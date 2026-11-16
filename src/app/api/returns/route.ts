import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const receiptNumber = searchParams.get("receipt");

    if (!receiptNumber) {
      return NextResponse.json({ error: "Receipt number is required" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { receiptNumber },
      include: {
        customer: true,
        cashier: { select: { id: true, name: true } },
        payments: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                nameEn: true,
                nameUr: true,
                unit: true,
                primaryBarcode: true,
                salePricePaisa: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Original receipt not found" }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error: any) {
    console.error("Returns GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      saleId,
      receiptNumber,
      cashierId,
      items, // Array of { productId, quantity, unitPricePaisa, restock, reason }
      refundMethod = "CASH", // CASH, KHATA_BALANCE
      notes,
    } = body;

    if (!saleId || !items || items.length === 0) {
      return NextResponse.json({ error: "Sale ID and items to return are required" }, { status: 400 });
    }

    // Resolve valid staff member
    let validUser = cashierId ? await prisma.user.findUnique({ where: { id: cashierId } }) : null;
    if (!validUser) {
      validUser = (await prisma.user.findFirst({ where: { role: "CASHIER" } })) || (await prisma.user.findFirst());
    }
    const resolvedCashierId = validUser?.id;
    if (!resolvedCashierId) {
      return NextResponse.json({ error: "No active staff user found" }, { status: 400 });
    }

    const originalSale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { customer: true },
    });

    if (!originalSale) {
      return NextResponse.json({ error: "Original sale not found" }, { status: 404 });
    }

    // Compute total refund amount in paisa
    const totalRefundPaisa = items.reduce(
      (sum: number, itm: any) => sum + Math.round(Number(itm.quantity) * Number(itm.unitPricePaisa)),
      0
    );

    const returnReceiptNumber = `RET-${Date.now().toString().slice(-8)}`;

    // Execute atomic return transaction
    const returnResult = await prisma.$transaction(
      async (tx) => {
        // 1. Record stock ledger movements
        const stockEntries = items.map((itm: any) => ({
          productId: itm.productId,
          quantityDelta: itm.restock ? Number(itm.quantity) : 0, // positive delta restocks shelf
          type: itm.restock ? StockMovementType.SALE_RETURN : StockMovementType.DAMAGE_EXPIRED,
          referenceId: returnReceiptNumber,
          costPaisa: Math.round(Number(itm.unitPricePaisa) * 0.8),
          reason: `Customer return on ${receiptNumber}: ${itm.reason || "Customer refund"}`,
          createdById: resolvedCashierId,
        }));

        await tx.stockLedger.createMany({ data: stockEntries });

        // 2. Adjust Customer Khata debt if refunded as credit
        if (refundMethod === "KHATA_BALANCE" && originalSale.customerId) {
          const customer = await tx.customer.findUniqueOrThrow({ where: { id: originalSale.customerId } });
          const newBalance = Math.max(0, customer.currentBalancePaisa - totalRefundPaisa);

          await tx.customer.update({
            where: { id: originalSale.customerId },
            data: { currentBalancePaisa: newBalance },
          });

          await tx.khataLedger.create({
            data: {
              customerId: originalSale.customerId,
              saleId: originalSale.id,
              amountPaisa: -totalRefundPaisa,
              balanceAfterPaisa: newBalance,
              notes: `Refund credit against return receipt ${returnReceiptNumber}`,
              createdById: resolvedCashierId,
            },
          });
        }

        // 3. Mark original sale status
        await tx.sale.update({
          where: { id: saleId },
          data: { status: "REFUNDED" },
        });

        // 4. Log audit event
        await tx.auditLog.create({
          data: {
            userId: resolvedCashierId,
            action: "SALE_REFUND",
            details: {
              originalReceipt: receiptNumber,
              returnReceipt: returnReceiptNumber,
              totalRefundPaisa,
              refundMethod,
              itemsCount: items.length,
              notes,
            },
          },
        });

        return {
          returnReceiptNumber,
          totalRefundPaisa,
          itemsCount: items.length,
          refundMethod,
          createdAt: new Date().toISOString(),
        };
      },
      { timeout: 30000, maxWait: 15000 }
    );

    return NextResponse.json({ success: true, returnRecord: returnResult });
  } catch (error: any) {
    console.error("Returns POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
