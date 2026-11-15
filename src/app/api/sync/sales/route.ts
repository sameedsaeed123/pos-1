import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType, FbrStatus, PaymentMethod } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sales } = body;

    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ message: "No sales to sync", syncedCount: 0 });
    }

    const syncedClientTxIds: string[] = [];
    const failedClientTxIds: Array<{ clientTxId: string; error: string }> = [];

    for (const s of sales) {
      try {
        // Idempotency check: if this sale was already synced, skip
        const existing = await prisma.sale.findUnique({
          where: { clientTxId: s.clientTxId },
        });

        if (existing) {
          syncedClientTxIds.push(s.clientTxId);
          continue;
        }

        // Resolve a valid user ID for foreign key constraint
        let validUser = s.cashierId
          ? await prisma.user.findUnique({ where: { id: s.cashierId } })
          : null;
        if (!validUser) {
          validUser =
            (await prisma.user.findFirst({ where: { role: "CASHIER" } })) ||
            (await prisma.user.findFirst());
        }
        if (!validUser) {
          failedClientTxIds.push({
            clientTxId: s.clientTxId,
            error: "No valid staff user found for sync",
          });
          continue;
        }
        const resolvedCashierId: string = validUser.id;

        // Process new offline sale in transaction
        await prisma.$transaction(async (tx) => {
          let resolvedShiftId = s.shiftId;
          const shiftExists = resolvedShiftId
            ? await tx.shift.findUnique({ where: { id: resolvedShiftId } })
            : null;
          if (!shiftExists) {
            const activeShift = await tx.shift.findFirst({
              where: { status: "OPEN" },
              orderBy: { openedAt: "desc" },
            });
            resolvedShiftId = activeShift
              ? activeShift.id
              : (
                  await tx.shift.create({
                    data: {
                      cashierId: resolvedCashierId,
                      openingFloatPaisa: 0,
                      status: "OPEN",
                    },
                  })
                ).id;
          }

          const createdSale = await tx.sale.create({
            data: {
              clientTxId: s.clientTxId,
              receiptNumber: s.receiptNumber,
              shiftId: resolvedShiftId,
              cashierId: resolvedCashierId,
              customerId: s.customerId || null,
              subtotalPaisa: s.subtotalPaisa,
              discountPaisa: s.discountPaisa || 0,
              taxPaisa: s.taxPaisa || 0,
              totalPaisa: s.totalPaisa,
              status: "COMPLETED",
              fbrStatus: s.fbrStatus || FbrStatus.NOT_APPLICABLE,
              createdAt: new Date(s.createdAt),
              items: {
                create: s.items.map((itm: any) => ({
                  productId: itm.productId,
                  unit: itm.unit || "piece",
                  quantity: Number(itm.quantity),
                  unitPricePaisa: Number(itm.unitPricePaisa),
                  discountPaisa: Number(itm.discountPaisa || 0),
                  taxPaisa: Number(itm.taxPaisa || 0),
                  totalPaisa: Number(itm.totalPaisa),
                })),
              },
              payments: {
                create: s.payments.map((p: any) => ({
                  method: p.method as PaymentMethod,
                  amountPaisa: Number(p.amountPaisa),
                  tenderPaisa: p.tenderPaisa ? Number(p.tenderPaisa) : null,
                  changePaisa: p.changePaisa ? Number(p.changePaisa) : null,
                  referenceNumber: p.referenceNumber || null,
                })),
              },
            },
          });

          // Stock deductions
          for (const itm of s.items) {
            await tx.stockLedger.create({
              data: {
                productId: itm.productId,
                quantityDelta: -Number(itm.quantity),
                type: StockMovementType.SALE,
                referenceId: createdSale.id,
                costPaisa: Math.round(Number(itm.unitPricePaisa) * 0.8),
                reason: `Offline Synced Sale ${s.receiptNumber}`,
                createdAt: new Date(s.createdAt),
                createdById: resolvedCashierId,
              },
            });
          }

          // Khata balance adjustment if credit was used
          const khataPayment = s.payments.find((p: any) => p.method === "KHATA_UDHAAR");
          if (khataPayment && s.customerId) {
            const cust = await tx.customer.findUnique({ where: { id: s.customerId } });
            if (cust) {
              const newBal = cust.currentBalancePaisa + Number(khataPayment.amountPaisa);
              await tx.customer.update({
                where: { id: s.customerId },
                data: { currentBalancePaisa: newBal },
              });
              await tx.khataLedger.create({
                data: {
                  customerId: s.customerId,
                  saleId: createdSale.id,
                  amountPaisa: Number(khataPayment.amountPaisa),
                  balanceAfterPaisa: newBal,
                  notes: `Offline credit purchase ${s.receiptNumber}`,
                  createdAt: new Date(s.createdAt),
                  createdById: resolvedCashierId,
                },
              });
            }
          }
        });

        syncedClientTxIds.push(s.clientTxId);
      } catch (err: any) {
        console.error(`Error syncing sale ${s.clientTxId}:`, err);
        failedClientTxIds.push({ clientTxId: s.clientTxId, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedClientTxIds.length,
      syncedClientTxIds,
      failedClientTxIds,
    });
  } catch (error: any) {
    console.error("Outbox sync route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

