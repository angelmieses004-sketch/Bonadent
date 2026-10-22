import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { obtenerUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { isoDia, nombreMes } from "@/lib/fechas";

/** Exporta los movimientos de caja del mes a Excel. */
export async function GET(req: NextRequest) {
  const u = await obtenerUsuario();
  if (!u || u.rol === "odontologo") return new NextResponse("Sin permiso", { status: 403 });

  const mes = /^\d{4}-\d{2}$/.test(req.nextUrl.searchParams.get("mes") ?? "") ? req.nextUrl.searchParams.get("mes")! : isoDia().slice(0, 7);
  const tipo = req.nextUrl.searchParams.get("tipo");
  const d = await leer();
  const pac = new Map(d.pacientes.map((p) => [p.id, p.nombre]));
  const movs = d.movimientos
    .filter((m) => m.fecha.startsWith(mes) && (tipo === "ingreso" || tipo === "egreso" ? m.tipo === tipo : true))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const libro = new ExcelJS.Workbook();
  libro.creator = "Bonadent";
  const hoja = libro.addWorksheet(`Caja ${mes}`, { views: [{ state: "frozen", ySplit: 3 }] });
  hoja.mergeCells("A1:G1");
  hoja.getCell("A1").value = `${d.clinica.nombre} · Caja de ${nombreMes(`${mes}-15`)}`;
  hoja.getCell("A1").font = { bold: true, size: 14 };
  hoja.addRow([]);
  const cab = hoja.addRow(["Fecha", "Tipo", "Concepto", "Categoría", "Método", "Paciente", "Monto (RD$)"]);
  cab.font = { bold: true, color: { argb: "FF1C1C1E" } };
  cab.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4F75A" } }; });
  hoja.columns = [{ width: 12 }, { width: 10 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 24 }, { width: 16 }];

  for (const m of movs) {
    const fila = hoja.addRow([new Date(`${m.fecha}T12:00:00`), m.tipo === "ingreso" ? "Ingreso" : "Egreso", m.concepto, m.categoria, m.metodo, m.paciente_id ? pac.get(m.paciente_id) ?? "" : "", m.tipo === "ingreso" ? m.monto : -m.monto]);
    fila.getCell(1).numFmt = "dd/mm/yyyy";
    fila.getCell(7).numFmt = '#,##0.00;[Red]-#,##0.00';
  }
  hoja.addRow([]);
  const ing = movs.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egr = movs.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
  for (const [t, v] of [["Ingresos", ing], ["Egresos", -egr], ["Balance", ing - egr]] as const) {
    const r = hoja.addRow(["", "", "", "", "", t, v]);
    r.font = { bold: true };
    r.getCell(7).numFmt = '#,##0.00;[Red]-#,##0.00';
  }

  const datos = await libro.xlsx.writeBuffer();
  return new NextResponse(datos as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="caja-${mes}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
