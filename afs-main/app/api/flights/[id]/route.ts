import { prisma } from "../../../../utils/db";
import { AsyncApiResponse, Flight } from "../../../../utils/types";
import { flightSelectFields } from "../utils";
import { withAuth } from "../../../../middlewares/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  id: string;
}

async function get(
  request: NextRequest & { params: Params },
): Promise<NextResponse<Flight | { error: string }>> {
  const { id } = request.params;

  if (!id) {
    return NextResponse.json(
      {
        error: "Id is required",
      },
      { status: 400 },
    );
  }

  const flight = await prisma.flight.findUnique({
    where: {
      id,
    },
    select: flightSelectFields,
  });

  // Respond with direct and indirect flights
  return NextResponse.json(flight);
}

export const GET = withAuth(get);