import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createLease, listLeases } from "@/lib/notion/leases";
import { LEASE_TYPES, LEASE_STATUSES, INDEXATION_INDEXES } from "@/lib/constants";

const schema = z.object({
  reference: z.string().min(1).max(100),
  assetId: z.string().min(1),
  tenantId: z.string().min(1),
  type: z.enum(LEASE_TYPES),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  baseRent: z.number().nonnegative(),
  charges: z.number().nonnegative().optional(),
  tvaApplicable: z.boolean().optional(),
  indexationIndex: z.enum(INDEXATION_INDEXES).optional(),
  nextRevisionDate: z.string().optional(),
  status: z.enum(LEASE_STATUSES).optional(),
});

export async function GET() {
  try {
    const ctx = await getApiContext();
    const leases = await listLeases(ctx.workspaceId);
    return NextResponse.json({ leases });
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
    const lease = await createLease({ ...data, workspaceId: ctx.workspaceId });
    return NextResponse.json({ lease }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/leases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
