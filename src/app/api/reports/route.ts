import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Today's Sales
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: "COMPLETED",
      },
      include: {
        items: {
          include: { product: true },
        },
        payments: true,
      },
    });

    let todayRevenuePaisa = 0;
    let todayCostPaisa = 0;
    let todayCashPaisa = 0;

    for (const sale of todaySales) {
      todayRevenuePaisa += sale.totalPaisa;
      for (const item of sale.items) {
        todayCostPaisa += Math.round(Number(item.quantity) * item.product.costPaisa);
      }
      for (const p of sale.payments) {
        if (p.method === "CASH") todayCashPaisa += p.amountPaisa;
      }
    }

    const todayProfitPaisa = todayRevenuePaisa - todayCostPaisa;
    const grossMarginPercent = todayRevenuePaisa > 0 ? ((todayProfitPaisa / todayRevenuePaisa) * 100).toFixed(1) : "0.0";

    // 2. Outstanding Customer Udhaar (Khata)
    const customers = await prisma.customer.findMany({
      select: { currentBalancePaisa: true },
    });
    const totalKhataOutstandingPaisa = customers.reduce(
      (sum, c) => sum + Math.max(0, c.currentBalancePaisa),
      0
    );

    // 3. Top 10 Best-Selling Items
    const topItemsRaw = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPaisa: true },
      orderBy: { _sum: { totalPaisa: "desc" } },
      take: 8,
    });

    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topItemsRaw.map((i) => i.productId) } },
      select: { id: true, nameEn: true, nameUr: true, category: true, unit: true },
    });

    const topItems = topItemsRaw.map((item) => {
      const prod = topProductDetails.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        nameEn: prod?.nameEn || "Unknown",
        nameUr: prod?.nameUr || "",
        category: prod?.category || "",
        unit: prod?.unit || "piece",
        quantitySold: Number(item._sum.quantity || 0),
        totalRevenuePaisa: Number(item._sum.totalPaisa || 0),
      };
    });

    // 4. Low Stock Alerts (Stock < Reorder Level)
    const productsWithMovements = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stockMovements: { select: { quantityDelta: true } },
      },
      take: 100,
    });

    const lowStockItems = [];
    for (const p of productsWithMovements) {
      const currentStock = p.stockMovements.reduce((sum, m) => sum + Number(m.quantityDelta), 0);
      if (currentStock <= Number(p.reorderLevel)) {
        lowStockItems.push({
          id: p.id,
          nameEn: p.nameEn,
          nameUr: p.nameUr,
          currentStock,
          reorderLevel: Number(p.reorderLevel),
          unit: p.unit,
        });
      }
    }

    // 5. Active Shift Cash Drawer status
    const activeShift = await prisma.shift.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });

    const cashInDrawerPaisa = (activeShift?.openingFloatPaisa || 0) + todayCashPaisa;

    return NextResponse.json({
      metrics: {
        todayRevenuePaisa,
        todayProfitPaisa,
        grossMarginPercent,
        todayTransactionsCount: todaySales.length,
        cashInDrawerPaisa,
        totalKhataOutstandingPaisa,
      },
      topItems,
      lowStockItems: lowStockItems.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

