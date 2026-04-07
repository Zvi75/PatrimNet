import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { getTenantById, updateTenant, deleteTenant } from "@/lib/notion/tenants";
import { TENANT_TYPES, PAYMENT_SCORES } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(TENANT_TYPES).optional(),
  siret: z.string().max(14).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  guarantorName: z.string().max(100).optional(),
  guarantorContact: z.string().max(200).optional(),
  paymentScore: z.enum(PAYMENT_SCORES).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    const tenant = await getTenantById(id);
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ tenant });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenant = await getTenantById(id);
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);
    await updateTenant(id, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    if (ctx.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenant = await getTenantById(id);
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteTenant(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
