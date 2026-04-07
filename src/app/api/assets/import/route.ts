import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createAsset, countAssets } from "@/lib/notion/assets";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { getMaxAssets } from "@/lib/feature-gate";
import { ASSET_TYPES, ASSET_STATUSES } from "@/lib/constants";
import type { AssetType, AssetStatus } from "@/types";

const rowSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  type: z.enum(ASSET_TYPES).default("Appartement"),
  status: z.enum(ASSET_STATUSES).default("Vacant"),
  legalEntityId: z.string().min(1),
  surfaceM2: z.coerce.number().positive().optional(),
  acquisitionPrice: z.coerce.number().nonnegative().optional(),
  currentMarketValue: z.coerce.number().nonnegative().optional(),
  ownershipPercent: z.coerce.number().min(0).max(100).optional(),
  acquisitionDate: z.string().optional(),
  notes: z.string().optional(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();
    if (ctx.role === "read-only") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const body = await req.json();
    const { rows } = bodySchema.parse(body);

    // Check plan limit
    const maxAssets = getMaxAssets(
      workspace.plan.toUpperCase() as "STARTER" | "PRO" | "ENTERPRISE",
    );
    const current = await countAssets(ctx.workspaceId);
    if (current + rows.length > maxAssets) {
      return NextResponse.json(
        {
          error: `Import impossible : dépasse la limite de ${maxAssets} actifs. Réduisez le fichier ou passez au plan supérieur.`,
        },
        { status: 403 },
      );
    }

    const results: { name: string; status: "created" | "error"; error?: string }[] = [];

    for (const row of rows) {
      try {
        await createAsset({
          name: row.name,
          address: row.address,
          type: row.type as AssetType,
          status: row.status as AssetStatus,
          legalEntityId: row.legalEntityId,
          workspaceId: ctx.workspaceId,
          surfaceM2: row.surfaceM2,
          acquisitionDate: row.acquisitionDate,
          acquisitionPrice: row.acquisitionPrice,
          currentMarketValue: row.currentMarketValue,
          ownershipPercent: row.ownershipPercent,
          notes: row.notes,
        });
        results.push({ name: row.name, status: "created" });
      } catch (err) {
        results.push({
          name: row.name,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({ ok: true, created, errors, results });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/assets/import]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
