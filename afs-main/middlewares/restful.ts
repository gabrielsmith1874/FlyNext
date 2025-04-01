import { ApiHandler, RestfulNextRequest } from "../utils/types";
import { NextRequest, NextResponse } from "next/server";

export function restful<T extends NextRequest>(
  handler: ApiHandler<T & { data: any }>,
): ApiHandler<T> {
  return async (request: T, args) => {
    try {
      const data = await request.json();

      // Attach parsed data to the request object
      return handler(Object.assign(request, { data }), args);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Request body is not a valid JSON string" },
          { status: 400 },
        );
      }

      console.error(error);
      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 },
      );
    }
  };
}