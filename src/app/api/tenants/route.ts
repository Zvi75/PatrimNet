import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createTenant, listTenants } from "@/lib/notion/tenants";
import { TENANT_TYPES, PAYMENT_SCORES } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(TENANT_TYPES),
  siret: z.string().max(14).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  guarantorName: z.string().max(100).optional(),
  guarantorContact: z.string().max(200).optional(),
  paymentScore: z.enum(PAYMENT_SCORES).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const ctx = await getApiContext();
    const tenants = await listTenants(ctx.workspaceId);
    return NextResponse.json({ tenants });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data = schema.parse(body);
    const tenant = await createTenant({ ...data, workspaceId: ctx.workspaceId });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/tenants]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
