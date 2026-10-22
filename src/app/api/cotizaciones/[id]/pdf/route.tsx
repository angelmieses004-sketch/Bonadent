import { NextResponse, type NextRequest } from "next/server";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { obtenerUsuario } from "@/lib/sesion";
import { leer } from "@/datos/repo";
import { RD } from "@/lib/dinero";
import { fechaLarga, mayuscula } from "@/lib/fechas";
import { numeroCot } from "@/lib/mensajes";
import type { Clinica, Cotizacion, Paciente } from "@/tipos";

const C = { tinta: "#1c1c1e", gris: "#6e6e73", linea: "#e6e6e1", lima: "#d4f75a", azul: "#4b5cf0" };
const s = StyleSheet.create({
  pagina: { padding: 44, fontSize: 10, color: C.tinta, fontFamily: "Helvetica" },
  fila: { flexDirection: "row", alignItems: "center" },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.lima, alignItems: "center", justifyContent: "center", marginRight: 12 },
  logoTxt: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  gris: { color: C.gris },
  caja: { backgroundColor: "#f4f4f0", borderRadius: 10, padding: 12, marginTop: 18 },
  th: { fontSize: 8, color: C.gris, textTransform: "uppercase", paddingBottom: 6 },
  td: { paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.linea },
  total: { backgroundColor: C.tinta, color: "#fff", borderRadius: 12, padding: 14, marginTop: 14, width: 220, alignSelf: "flex-end" },
});

function Documento({ q, p, cl }: { q: Cotizacion; p?: Paciente; cl: Clinica }) {
  const subtotal = q.items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  return (
    <Document title={`${numeroCot(q.numero)} · ${cl.nombre}`} author={cl.nombre} creator="Bonadent">
      <Page size="LETTER" style={s.pagina}>
        <View style={[s.fila, { justifyContent: "space-between" }]}>
          <View style={s.fila}>
            {/* Logo provisional: inicial de la clínica. Se reemplaza por el logo subido en Ajustes. */}
            <View style={s.logo}><Text style={s.logoTxt}>{cl.nombre.replace(/^Cl[ií]nica\s+(Dental\s+)?/i, "").charAt(0) || "B"}</Text></View>
            <View>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{cl.nombre}</Text>
              <Text style={s.gris}>{[cl.direccion, cl.telefono].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.h1}>{numeroCot(q.numero)}</Text>
            <Text style={s.gris}>{mayuscula(fechaLarga(q.fecha))}</Text>
          </View>
        </View>

        <View style={s.caja}>
          <Text style={s.gris}>Paciente</Text>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{p?.nombre ?? ""}</Text>
          {p?.telefono ? <Text style={s.gris}>{p.telefono}</Text> : null}
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={s.fila}>
            <Text style={[s.th, { flex: 1 }]}>Servicio</Text>
            <Text style={[s.th, { width: 40, textAlign: "right" }]}>Cant.</Text>
            <Text style={[s.th, { width: 90, textAlign: "right" }]}>Precio</Text>
            <Text style={[s.th, { width: 90, textAlign: "right" }]}>Importe</Text>
          </View>
          {q.items.map((i, k) => (
            <View key={k} style={[s.fila, s.td]}>
              <Text style={{ flex: 1 }}>{i.nombre}</Text>
              <Text style={{ width: 40, textAlign: "right" }}>{i.cantidad}</Text>
              <Text style={{ width: 90, textAlign: "right", color: C.gris }}>{RD(i.precio)}</Text>
              <Text style={{ width: 90, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{RD(i.precio * i.cantidad)}</Text>
            </View>
          ))}
        </View>

        <View style={s.total}>
          <View style={[s.fila, { justifyContent: "space-between" }]}><Text style={{ color: "#bbb" }}>Subtotal</Text><Text>{RD(subtotal)}</Text></View>
          {q.descuento_pct > 0 && <View style={[s.fila, { justifyContent: "space-between", marginTop: 3 }]}><Text style={{ color: "#bbb" }}>Descuento {q.descuento_pct}%</Text><Text>-{RD(subtotal - q.total)}</Text></View>}
          <View style={[s.fila, { justifyContent: "space-between", marginTop: 8 }]}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>TOTAL</Text>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: C.lima }}>{RD(q.total)}</Text>
          </View>
        </View>

        {q.notas ? <Text style={{ marginTop: 18, color: C.gris }}>Nota: {q.notas}</Text> : null}
        <Text style={{ position: "absolute", bottom: 36, left: 44, right: 44, fontSize: 8, color: C.gris, textAlign: "center" }}>
          Cotización válida por 30 días. Precios en pesos dominicanos (RD$).
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(_: NextRequest, ctx: RouteContext<"/api/cotizaciones/[id]/pdf">) {
  const u = await obtenerUsuario();
  if (!u) return new NextResponse("Inicia sesión", { status: 401 });
  const { id } = await ctx.params;
  const d = await leer();
  const q = d.cotizaciones.find((x) => x.id === id);
  if (!q) return new NextResponse("No encontrada", { status: 404 });
  const p = d.pacientes.find((x) => x.id === q.paciente_id);
  const pdf = await renderToBuffer(<Documento q={q} p={p} cl={d.clinica} />);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${numeroCot(q.numero)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
