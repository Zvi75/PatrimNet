import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createAsset, listAssets, countAssets } from "@/lib/notion/assets";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { ASSET_TYPES, ASSET_STATUSES, DPE_RATINGS } from "@/lib/constants";
import { getMaxAssets } from "@/lib/feature-gate";

const schema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(300),
  type: z.enum(ASSET_TYPES),
  legalEntityId: z.string().min(1),
  status: z.enum(ASSET_STATUSES),
  surfaceM2: z.number().positive().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionPrice: z.number().nonnegative().optional(),
  currentMarketValue: z.number().nonnegative().optional(),
  ownershipPercent: z.number().min(0).max(100).optional(),
  dpe: z.enum(DPE_RATINGS).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const ctx = await getApiContext();
    const assets = await listAssets(ctx.workspaceId);
    return NextResponse.json({ assets });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Plan gate: check asset limit
    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    const maxAssets = getMaxAssets(workspace.plan.toUpperCase() as "STARTER" | "PRO" | "ENTERPRISE");
    const current = await countAssets(ctx.workspaceId);
    if (current >= maxAssets) {
      return NextResponse.json(
        { error: `Limite d'actifs atteinte pour votre plan (${maxAssets} max). Passez au plan supérieur.` },
        { status: 403 },
      );
    }

    const body = await req.json();
    const data = schema.parse(body);
    const asset = await createAsset({ ...data, workspaceId: ctx.workspaceId });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/assets]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
