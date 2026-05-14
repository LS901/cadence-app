import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const retiredAuthMessage = "Private workspaces are disabled in this portfolio build. Use the shared demo instead.";

type SignUpRouteBody =
  {
    status: "error";
    code: "disabled" | "invalid_json";
    message?: string;
  };

export async function getSignUpResult(request: Request) {
  try {
    await request.json();
  } catch {
    return {
      status: 400,
      body: {
        status: "error",
        code: "invalid_json",
        message: "Request body must be valid JSON.",
      } satisfies SignUpRouteBody,
    };
  }

  return {
    status: 410,
    body: {
      status: "error",
      code: "disabled",
      message: retiredAuthMessage,
    } satisfies SignUpRouteBody,
  };
}

export async function POST(request: Request) {
  const result = await getSignUpResult(request);

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "cache-control": "no-store",
    },
  });
}