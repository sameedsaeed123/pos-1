import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cashierId = searchParams.get("cashierId");

    const activeShift = await prisma.shift.findFirst({
      where: {
        ...(cashierId ? { cashierId } : {}),
        status: "OPEN",
      },
      include: {
        cashier: { select: { id: true, name: true, role: true } },
        sales: {
          include: { payments: true },
        },
      },
      orderBy: { openedAt: "desc" },
    });

    if (!activeShift) {
      return NextResponse.json({ activeShift: null });
    }

    // Calculate cash metrics
    let cashSalesPaisa = 0;
    let cardSalesPaisa = 0;
    let mobileSalesPaisa = 0;
    let khataSalesPaisa = 0;

    for (const sale of activeShift.sales) {
      if (sale.status === "COMPLETED") {
        for (const p of sale.payments) {
          if (p.method === "CASH") cashSalesPaisa += p.amountPaisa;
          else if (p.method === "CARD") cardSalesPaisa += p.amountPaisa;
          else if (p.method === "KHATA_UDHAAR") khataSalesPaisa += p.amountPaisa;
          else mobileSalesPaisa += p.amountPaisa;
        }
      }
    }

    // Fetch petty cash transactions for this shift
    const pettyCashLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["PAID_IN", "PAID_OUT"] },
        createdAt: { gte: activeShift.openedAt },
      },
      orderBy: { createdAt: "desc" },
    });

    let paidInPaisa = 0;
    let paidOutPaisa = 0;
    const shiftPettyLogs: any[] = [];

    for (const log of pettyCashLogs) {
      const d = log.details as any;
      if (d?.shiftId === activeShift.id) {
        if (log.action === "PAID_IN") paidInPaisa += Number(d.amountPaisa || 0);
        if (log.action === "PAID_OUT") paidOutPaisa += Number(d.amountPaisa || 0);
        shiftPettyLogs.push({
          id: log.id,
          action: log.action,
          amountPaisa: d.amountPaisa,
          reason: d.reason,
          createdAt: log.createdAt,
        });
      }
    }

    const expectedCashInDrawerPaisa =
      activeShift.openingFloatPaisa + cashSalesPaisa + paidInPaisa - paidOutPaisa;

    return NextResponse.json({
      activeShift: {
        ...activeShift,
        cashSalesPaisa,
        cardSalesPaisa,
        mobileSalesPaisa,
        khataSalesPaisa,
        paidInPaisa,
        paidOutPaisa,
        pettyCashLogs: shiftPettyLogs,
        totalSalesPaisa: cashSalesPaisa + cardSalesPaisa + mobileSalesPaisa + khataSalesPaisa,
        expectedCashInDrawerPaisa,
      },
    });
  } catch (error: any) {
    console.error("Shifts GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "OPEN_SHIFT") {
      const { cashierId, openingFloatPaisa = 0 } = body;
      let validUser = cashierId ? await prisma.user.findUnique({ where: { id: cashierId } }) : null;
      if (!validUser) {
        validUser =
          (await prisma.user.findFirst({ where: { role: "CASHIER" } })) ||
          (await prisma.user.findFirst());
      }
      const resolvedCashierId = validUser?.id;
      if (!resolvedCashierId) {
        return NextResponse.json({ error: "No staff user found in store database" }, { status: 400 });
      }

      const shift = await prisma.shift.create({
        data: {
          cashierId: resolvedCashierId,
          openingFloatPaisa: Number(openingFloatPaisa),
          status: "OPEN",
        },
        include: { cashier: true },
      });
      return NextResponse.json({ shift, success: true });
    }

    if (action === "PETTY_CASH") {
      const { shiftId, type, amountPaisa, reason, cashierId } = body;
      if (!shiftId || !amountPaisa || !reason) {
        return NextResponse.json({ error: "Shift ID, amount, and reason are required" }, { status: 400 });
      }

      let validUser = cashierId ? await prisma.user.findUnique({ where: { id: cashierId } }) : null;
      if (!validUser) {
        validUser = (await prisma.user.findFirst()) || null;
      }
      const resolvedUserId = validUser?.id || "system";

      const log = await prisma.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: type === "PAID_IN" ? "PAID_IN" : "PAID_OUT",
          details: {
            shiftId,
            amountPaisa: Number(amountPaisa),
            reason,
            cashierId: resolvedUserId,
          },
        },
      });

      return NextResponse.json({ success: true, log });
    }

    if (action === "CLOSE_SHIFT") {
      const { shiftId, actualCashPaisa } = body;
      if (!shiftId || actualCashPaisa === undefined) {
        return NextResponse.json({ error: "Shift ID and actual counted cash are required" }, { status: 400 });
      }

      const shift = await prisma.shift.findUniqueOrThrow({
        where: { id: shiftId },
        include: {
          sales: {
            include: { payments: true, items: true },
          },
          cashier: true,
        },
      });

      let cashSalesPaisa = 0;
      let otherSalesPaisa = 0;
      let totalTaxPaisa = 0;
      let totalDiscountPaisa = 0;

      for (const s of shift.sales) {
        if (s.status === "COMPLETED") {
          totalTaxPaisa += s.taxPaisa;
          totalDiscountPaisa += s.discountPaisa;
          for (const p of s.payments) {
            if (p.method === "CASH") cashSalesPaisa += p.amountPaisa;
            else otherSalesPaisa += p.amountPaisa;
          }
        }
      }

      const expectedCashPaisa = shift.openingFloatPaisa + cashSalesPaisa;
      const variancePaisa = Number(actualCashPaisa) - expectedCashPaisa;

      const zReportData = {
        shiftId: shift.id,
        cashierName: shift.cashier.name,
        openedAt: shift.openedAt,
        closedAt: new Date().toISOString(),
        openingFloatPaisa: shift.openingFloatPaisa,
        cashSalesPaisa,
        otherSalesPaisa,
        totalSalesPaisa: cashSalesPaisa + otherSalesPaisa,
        totalTaxPaisa,
        totalDiscountPaisa,
        expectedCashPaisa,
        actualCashPaisa: Number(actualCashPaisa),
        variancePaisa,
        isShortage: variancePaisa < 0,
        isSurplus: variancePaisa > 0,
        totalTransactions: shift.sales.length,
      };

      const closedShift = await prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          expectedCashPaisa,
          actualCashPaisa: Number(actualCashPaisa),
          variancePaisa,
          zReportData,
        },
      });

      return NextResponse.json({ shift: closedShift, zReportData, success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Shifts POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

