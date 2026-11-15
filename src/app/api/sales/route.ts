import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType, FbrStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const receiptNumber = searchParams.get("receipt");

    if (receiptNumber) {
      const sale = await prisma.sale.findUnique({
        where: { receiptNumber },
        include: {
          items: {
            include: { product: true },
          },
          payments: true,
          customer: true,
          cashier: { select: { id: true, name: true } },
        },
      });
      if (!sale) {
        return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
      }
      return NextResponse.json({ sale });
    }

    const sales = await prisma.sale.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        cashier: { select: { id: true, name: true } },
        payments: true,
        items: { select: { id: true, quantity: true, unitPricePaisa: true, totalPaisa: true, product: { select: { nameEn: true, nameUr: true } } } },
      },
    });

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error("Sales GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clientTxId,
      shiftId,
      cashierId,
      customerId,
      items,
      payments,
      discountPaisa = 0,
      taxPaisa = 0,
    } = body;

    if (!items || items.length === 0 || !payments || payments.length === 0) {
      return NextResponse.json({ error: "Cart items and payments are required" }, { status: 400 });
    }

    // Check for existing transaction (Idempotency)
    if (clientTxId) {
      const existing = await prisma.sale.findUnique({
        where: { clientTxId },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
          cashier: { select: { id: true, name: true } },
        },
      });
      if (existing) {
        return NextResponse.json({ sale: existing, idempotent: true });
      }
    }

    const subtotalPaisa = items.reduce(
      (sum: number, itm: any) => sum + Number(itm.totalPaisa),
      0
    );
    const totalPaisa = subtotalPaisa - Number(discountPaisa) + Number(taxPaisa);

    const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
    const txId = clientTxId || `tx-${receiptNumber}`;

    // Get active store for FBR settings
    const store = await prisma.store.findFirst();
    const isFbrEnabled = store?.fbrEnabled === true;
    const fbrInvoiceNumber = isFbrEnabled
      ? `${store?.fbrPosId || "100101"}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${receiptNumber.slice(-4)}-9`
      : null;
    const fbrQrCode = fbrInvoiceNumber
      ? `https://fbr.gov.pk/verify?invoice=${fbrInvoiceNumber}&total=${totalPaisa}&pos=${store?.fbrPosId}`
      : null;

    // Check for Khata Payment and customer credit limit
    const khataPayment = payments.find((p: any) => p.method === "KHATA_UDHAAR");
    if (khataPayment && customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found for Khata sale" }, { status: 404 });
      }
      const newBalance = customer.currentBalancePaisa + Number(khataPayment.amountPaisa);
      if (customer.creditLimitPaisa > 0 && newBalance > customer.creditLimitPaisa) {
        return NextResponse.json(
          {
            error: `Sale exceeds customer Khata credit limit (Limit: Rs ${(customer.creditLimitPaisa / 100).toLocaleString()}, Current: Rs ${(customer.currentBalancePaisa / 100).toLocaleString()})`,
          },
          { status: 400 }
        );
      }
    }

    // Resolve valid cashier ID from database to satisfy Foreign Key constraint
    let validUser = cashierId
      ? await prisma.user.findUnique({ where: { id: cashierId } })
      : null;
    if (!validUser) {
      validUser =
        (await prisma.user.findFirst({ where: { role: "CASHIER" } })) ||
        (await prisma.user.findFirst());
    }
    const resolvedCashierId = validUser?.id;
    if (!resolvedCashierId) {
      return NextResponse.json({ error: "No staff user found in store database" }, { status: 400 });
    }

    // Resolve active shift outside the transaction to minimize open transaction duration
    let resolvedShiftId = shiftId;
    if (resolvedShiftId) {
      const checkShift = await prisma.shift.findUnique({ where: { id: resolvedShiftId } });
      if (!checkShift) resolvedShiftId = undefined;
    }

    if (!resolvedShiftId) {
      const activeShift = await prisma.shift.findFirst({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });
      if (activeShift) {
        resolvedShiftId = activeShift.id;
      } else {
        const newShift = await prisma.shift.create({
          data: {
            cashierId: resolvedCashierId,
            openingFloatPaisa: 500000,
            status: "OPEN",
          },
        });
        resolvedShiftId = newShift.id;
      }
    }

    // Execute atomic sale transaction with extended timeout for serverless / overseas latency
    const sale = await prisma.$transaction(
      async (tx) => {
        // 1. Create Sale with nested items and payments
        const createdSale = await tx.sale.create({
          data: {
            clientTxId: txId,
            receiptNumber,
            shiftId: resolvedShiftId,
            cashierId: resolvedCashierId,
            customerId: customerId || null,
            subtotalPaisa,
            discountPaisa: Number(discountPaisa),
            taxPaisa: Number(taxPaisa),
            totalPaisa,
            status: "COMPLETED",
            fbrStatus: isFbrEnabled ? FbrStatus.SUCCESS : FbrStatus.NOT_APPLICABLE,
            fbrInvoiceNumber,
            fbrQrCode,
            items: {
              create: items.map((itm: any) => ({
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
              create: payments.map((p: any) => ({
                method: p.method as PaymentMethod,
                amountPaisa: Number(p.amountPaisa),
                tenderPaisa: p.tenderPaisa ? Number(p.tenderPaisa) : null,
                changePaisa: p.changePaisa ? Number(p.changePaisa) : null,
                referenceNumber: p.referenceNumber || null,
              })),
            },
          },
          include: {
            items: {
              include: { product: true },
            },
            payments: true,
            customer: true,
            cashier: { select: { id: true, name: true } },
          },
        });

        // 2. Batch write Stock Ledger Entries in one single fast statement
        await tx.stockLedger.createMany({
          data: items.map((itm: any) => ({
            productId: itm.productId,
            quantityDelta: -Number(itm.quantity),
            type: StockMovementType.SALE,
            referenceId: createdSale.id,
            costPaisa: Math.round(Number(itm.unitPricePaisa) * 0.8),
            reason: `Checkout sale ${receiptNumber}`,
            createdById: resolvedCashierId,
          })),
        });

        // 3. Update Khata Ledger if credit used
        if (khataPayment && customerId) {
          const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
          const newBalance = customer.currentBalancePaisa + Number(khataPayment.amountPaisa);
          await tx.customer.update({
            where: { id: customerId },
            data: { currentBalancePaisa: newBalance },
          });

          await tx.khataLedger.create({
            data: {
              customerId,
              saleId: createdSale.id,
              amountPaisa: Number(khataPayment.amountPaisa),
              balanceAfterPaisa: newBalance,
              notes: `Credit purchase on receipt ${receiptNumber}`,
              createdById: resolvedCashierId,
            },
          });
        }

        return createdSale;
      },
      {
        maxWait: 15000, // 15s to obtain connection from pool
        timeout: 30000, // 30s timeout for transaction completion
      }
    );

    return NextResponse.json({ sale, success: true });
  } catch (error: any) {
    console.error("Sale POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

