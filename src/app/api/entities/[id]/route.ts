import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import {
  getLegalEntityById,
  updateLegalEntity,
  deleteLegalEntity,
} from "@/lib/notion/legal-entities";
import { ENTITY_TYPES, TAX_REGIMES } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(ENTITY_TYPES).optional(),
  siren: z.string().max(9).optional(),
  parentEntityId: z.string().nullable().optional(),
  taxRegime: z.enum(TAX_REGIMES).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getApiContext();
    const entity = await getLegalEntityById(id);
    if (!entity || entity.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ entity });
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

    const entity = await getLegalEntityById(id);
    if (!entity || entity.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);
    await updateLegalEntity(id, data);
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

    const entity = await getLegalEntityById(id);
    if (!entity || entity.workspaceId !== ctx.workspaceId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteLegalEntity(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
