import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    llm: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  });
}
