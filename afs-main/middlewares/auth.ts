import { prisma } from "../utils/db";
import { ApiHandler } from "../utils/types";
import { NextRequest, NextResponse } from "next/server";

interface Agency {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function withAuth<T extends NextRequest>(
  handler: ApiHandler<T & { agency: Agency }>,
): ApiHandler<T> {
  return async (request: NextRequest & { agency?: Agency }, args) => {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey?.length) {
      return NextResponse.json(
        { error: "No API key found in request" },
        { status: 401 },
      );
    }

    const agency = await prisma.agency.findUnique({
      where: {
        apiKey,
        isActive: true,
      },
    });

    if (!agency) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    request.agency = agency; // Attach agency to request object
    return handler(request as T & { agency: Agency }, args);
  };
}
