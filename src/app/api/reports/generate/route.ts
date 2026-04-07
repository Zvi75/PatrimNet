import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/auth";
import { getWorkspaceById } from "@/lib/notion/workspaces";
import { isRateLimited } from "@/lib/rate-limit";
import {
  buildPortfolioReportData,
  buildAssetReportData,
  buildCashFlowData,
  buildFiscalData,
  buildLoanPlanData,
  buildTenantReportData,
} from "@/lib/reports/data";
import {
  buildPortfolioHTML,
  buildAssetHTML,
  buildCashFlowHTML,
  buildFiscalHTML,
  buildLoanPlanHTML,
  buildTenantReportHTML,
} from "@/lib/reports/pdf";
import {
  buildPortfolioDocx,
  buildAssetDocx,
  buildCashFlowDocx,
  buildFiscalDocx,
  buildLoanPlanDocx,
  buildTenantReportDocx,
} from "@/lib/reports/docx";
import {
  buildPortfolioXlsx,
  buildAssetXlsx,
  buildCashFlowXlsx,
  buildFiscalXlsx,
  buildLoanPlanXlsx,
  buildTenantReportXlsx,
} from "@/lib/reports/xlsx";
import puppeteer from "puppeteer";

const schema = z.object({
  reportType: z.enum([
    "rapport-portefeuille",
    "fiche-actif",
    "flux-mensuel",
    "synthese-fiscale",
    "plan-financement",
    "rapport-locataire",
  ]),
  params: z
    .object({
      assetId: z.string().optional(),
      leaseId: z.string().optional(),
      loanId: z.string().optional(),
      year: z.number().int().min(2000).max(2100).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional()
    .default({}),
});

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getApiContext();

    // 10 report exports per workspace per hour (Puppeteer is CPU-heavy)
    if (isRateLimited(`reports:generate:${ctx.workspaceId}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Limite d'exports atteinte. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const workspace = await getWorkspaceById(ctx.workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const body = await req.json();
    const { reportType, params } = schema.parse(body);
    const wid = ctx.workspaceId;

    let pdfBuffer: Buffer;
    let docxBuffer: Buffer;
    let xlsxBuffer: Buffer;
    let filename: string;

    switch (reportType) {
      case "rapport-portefeuille": {
        const d = await buildPortfolioReportData(wid);
        [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
          htmlToPdf(buildPortfolioHTML(d)),
          buildPortfolioDocx(d),
          buildPortfolioXlsx(d),
        ]);
        filename = "rapport-portefeuille";
        break;
      }

      case "fiche-actif": {
        if (!params.assetId) {
          return NextResponse.json({ error: "assetId requis" }, { status: 400 });
        }
        const d = await buildAssetReportData(wid, params.assetId);
        [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
          htmlToPdf(buildAssetHTML(d)),
          buildAssetDocx(d),
          buildAssetXlsx(d),
        ]);
        filename = `fiche-actif-${d.asset.name.replace(/\s+/g, "-").toLowerCase()}`;
        break;
      }

      case "flux-mensuel": {
        const dateFrom =
          params.dateFrom ??
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
        const dateTo = params.dateTo ?? new Date().toISOString().slice(0, 10);
        const d = await buildCashFlowData(wid, dateFrom, dateTo);
        [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
          htmlToPdf(buildCashFlowHTML(d)),
          buildCashFlowDocx(d),
          buildCashFlowXlsx(d),
        ]);
        filename = `flux-${dateFrom}-${dateTo}`;
        break;
      }

      case "synthese-fiscale": {
        const year = params.year ?? new Date().getFullYear();
        const d = await buildFiscalData(wid, year);
        [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
          htmlToPdf(buildFiscalHTML(d)),
          buildFiscalDocx(d),
          buildFiscalXlsx(d),
        ]);
        filename = `synthese-fiscale-${year}`;
        break;
      }

      case "plan-financement": {
        if (!params.loanId) {
          return NextResponse.json({ error: "loanId requis" }, { status: 400 });
        }
        const d = await buildLoanPlanData(wid, params.loanId);
        [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
          htmlToPdf(buildLoanPlanHTML(d)),
          buildLoanPlanDocx(d),
          buildLoanPlanXlsx(d),
        ]);
        filename = `plan-financement-${d.loan.reference}`;
        break;
      }

      case "rapport-locataire": {
        if (!params.leaseId) {
          return NextResponse.json({ error: "leaseId requis" }, { status: 400 });
        }
        const d = await buildTenantReportData(wid, params.leaseId);
        [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
          htmlToPdf(buildTenantReportHTML(d)),
          buildTenantReportDocx(d),
          buildTenantReportXlsx(d),
        ]);
        filename = `rapport-locataire-${d.lease.reference}`;
        break;
      }

      default:
        return NextResponse.json({ error: "Type de rapport invalide" }, { status: 400 });
    }

    return NextResponse.json({
      pdf: { name: `${filename}.pdf`, base64: pdfBuffer.toString("base64") },
      docx: { name: `${filename}.docx`, base64: docxBuffer.toString("base64") },
      xlsx: { name: `${filename}.xlsx`, base64: xlsxBuffer.toString("base64") },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[reports/generate]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
