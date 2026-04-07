import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { createLegalEntity, listLegalEntities } from "@/lib/notion/legal-entities";
import { ENTITY_TYPES, TAX_REGIMES } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ENTITY_TYPES),
  siren: z.string().max(9).optional(),
  parentEntityId: z.string().optional(),
  taxRegime: z.enum(TAX_REGIMES).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const ctx = await getApiContext();
    const entities = await listLegalEntities(ctx.workspaceId);
    return NextResponse.json({ entities });
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

    const entity = await createLegalEntity({ ...data, workspaceId: ctx.workspaceId });
    return NextResponse.json({ entity }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.flatten() }, { status: 400 });
    console.error("[POST /api/entities]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
