import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim();

    const whereClause: any = { isActive: true };

    if (category && category !== "All") {
      whereClause.category = category;
    }

    if (query) {
      whereClause.OR = [
        { primaryBarcode: { equals: query } },
        { sku: { contains: query, mode: "insensitive" } },
        { nameEn: { contains: query, mode: "insensitive" } },
        { nameUr: { contains: query } },
        { brand: { contains: query, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        stockMovements: {
          select: { quantityDelta: true },
        },
      },
      orderBy: { nameEn: "asc" },
      take: query ? 50 : 150,
    });

    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    const formatted = products.map((p) => {
      const currentStock = p.stockMovements.reduce(
        (sum, m) => sum + Number(m.quantityDelta),
        0
      );
      return {
        id: p.id,
        nameEn: p.nameEn,
        nameUr: p.nameUr,
        sku: p.sku,
        primaryBarcode: p.primaryBarcode,
        category: p.category,
        brand: p.brand,
        unit: p.unit,
        costPaisa: p.costPaisa,
        salePricePaisa: p.salePricePaisa,
        mrpPaisa: p.mrpPaisa,
        reorderLevel: Number(p.reorderLevel),
        currentStock,
        isActive: p.isActive,
      };
    });

    return NextResponse.json({
      products: formatted,
      categories: categories.map((c) => c.category),
    });
  } catch (error: any) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nameEn,
      nameUr,
      sku,
      primaryBarcode,
      category,
      brand,
      unit = "piece",
      costPaisa,
      salePricePaisa,
      initialStock = 0,
      createdById,
    } = body;

    if (!nameEn || !primaryBarcode || !salePricePaisa) {
      return NextResponse.json(
        { error: "Name, barcode and sale price are required" },
        { status: 400 }
      );
    }

    const generatedSku = sku || `SKU-${Date.now().toString().slice(-6)}`;

    // Create product and initial stock movement atomically
    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          nameEn,
          nameUr: nameUr || nameEn,
          sku: generatedSku,
          primaryBarcode,
          category: category || "General",
          brand: brand || null,
          unit,
          costPaisa: Number(costPaisa) || Math.round(Number(salePricePaisa) * 0.8),
          salePricePaisa: Number(salePricePaisa),
          mrpPaisa: Math.round(Number(salePricePaisa) * 1.05),
        },
      });

      if (Number(initialStock) > 0) {
        await tx.stockLedger.create({
          data: {
            productId: prod.id,
            quantityDelta: Number(initialStock),
            type: StockMovementType.PURCHASE_RECEIPT,
            costPaisa: prod.costPaisa,
            reason: "Initial quick-add inventory stock",
            createdById: createdById || "system",
          },
        });
      }

      // If this barcode was pending manager approval, mark it approved
      await tx.pendingBarcode.updateMany({
        where: { barcode: primaryBarcode },
        data: { status: "APPROVED" },
      });

      return prod;
    });

    return NextResponse.json({ product, success: true });
  } catch (error: any) {
    console.error("Product POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

