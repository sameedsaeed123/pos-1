import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { role: "asc" },
    });

    const usersWithPins = users.map((u) => ({
      ...u,
      pin:
        u.role === "OWNER"
          ? "1234"
          : u.role === "MANAGER"
          ? "5678"
          : u.role === "CASHIER"
          ? "9999"
          : "0000",
    }));

    return NextResponse.json({ users: usersWithPins });
  } catch (error: any) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
