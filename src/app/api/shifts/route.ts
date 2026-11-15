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

    const expectedCashInDrawerPaisa = activeShift.openingFloatPaisa + cashSalesPaisa;

    return NextResponse.json({
      activeShift: {
        ...activeShift,
        cashSalesPaisa,
        cardSalesPaisa,
        mobileSalesPaisa,
        khataSalesPaisa,
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
      const shift = await prisma.shift.create({
        data: {
          cashierId,
          openingFloatPaisa: Number(openingFloatPaisa),
          status: "OPEN",
        },
        include: { cashier: true },
      });
      return NextResponse.json({ shift, success: true });
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
