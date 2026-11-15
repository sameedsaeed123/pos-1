import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const customerId = searchParams.get("id");

    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          khataLedger: {
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          sales: {
            take: 20,
            orderBy: { createdAt: "desc" },
            include: { items: { include: { product: true } } },
          },
        },
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json({ customer });
    }

    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      take: 100,
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "RECORD_PAYMENT") {
      const { customerId, amountPaisa, notes, createdById } = body;
      if (!customerId || !amountPaisa || Number(amountPaisa) <= 0) {
        return NextResponse.json({ error: "Valid customer and payment amount are required" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
        const newBalance = Math.max(0, customer.currentBalancePaisa - Number(amountPaisa));

        await tx.customer.update({
          where: { id: customerId },
          data: { currentBalancePaisa: newBalance },
        });

        const entry = await tx.khataLedger.create({
          data: {
            customerId,
            amountPaisa: -Number(amountPaisa), // Negative = debt payment
            balanceAfterPaisa: newBalance,
            notes: notes || "Khata debt cash repayment received",
            createdById: createdById || "system",
          },
        });

        return { customer, newBalance, entry };
      });

      return NextResponse.json({ success: true, ...result });
    }

    // Default: Create Customer
    const { name, phone, address, creditLimitPaisa = 1000000 } = body;
    if (!name || !phone) {
      return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address: address || null,
        creditLimitPaisa: Number(creditLimitPaisa),
      },
    });

    return NextResponse.json({ customer, success: true });
  } catch (error: any) {
    console.error("Customers POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
