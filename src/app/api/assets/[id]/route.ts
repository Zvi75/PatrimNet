import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { getAssetById, updateAsset, deleteAsset } from "@/lib/notion/assets";
import { listLeasesByAsset } from "@/lib/notion/leases";
import { listLoansByAsset } from "@/lib/notion/loans";
import { listDocumentsByAsset } from "@/lib/notion/documents";
import { ASSET_TYPES, ASSET_STATUSES, DPE_RATINGS } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(300).optional(),
  type: z.enum(ASSET_TYPES).optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  legalEntityId: z.string().optional(),
  surfaceM2: z.number().positive().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionPrice: z.number().nonnegative().optional(),
  currentMarketValue: z.number().nonnegative().optional(),
  ownershipPercent: z.number().min(0).max(100).optional(),
  dpe: z.enum(DPE_RATINGS).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    const asset = await getAssetById(id);
    if (!asset || asset.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [leases, loans, documents] = await Promise.all([
      listLeasesByAsset(id),
      listLoansByAsset(id),
      listDocumentsByAsset(id),
    ]);

    return NextResponse.json({ asset, leases, loans, documents });
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

    const asset = await getAssetById(id);
    if (!asset || asset.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);
    await updateAsset(id, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    if (ctx.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const asset = await getAssetById(id);
    if (!asset || asset.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteAsset(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
