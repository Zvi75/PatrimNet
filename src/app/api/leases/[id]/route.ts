import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { getLeaseById, updateLease, deleteLease } from "@/lib/notion/leases";
import { LEASE_TYPES, LEASE_STATUSES, INDEXATION_INDEXES } from "@/lib/constants";

const schema = z.object({
  reference: z.string().min(1).max(100).optional(),
  assetId: z.string().optional(),
  tenantId: z.string().optional(),
  type: z.enum(LEASE_TYPES).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  baseRent: z.number().nonnegative().optional(),
  charges: z.number().nonnegative().optional(),
  tvaApplicable: z.boolean().optional(),
  indexationIndex: z.enum(INDEXATION_INDEXES).optional(),
  nextRevisionDate: z.string().optional(),
  status: z.enum(LEASE_STATUSES).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getApiContext();
    const lease = await getLeaseById(params.id);
    if (!lease || lease.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ lease });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const lease = await getLeaseById(params.id);
    if (!lease || lease.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);
    await updateLease(params.id, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await getApiContext();
    if (ctx.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const lease = await getLeaseById(params.id);
    if (!lease || lease.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteLease(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
