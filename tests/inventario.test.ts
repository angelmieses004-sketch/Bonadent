import { describe, expect, it } from "vitest";
import { aplicarMovimiento, estadoStock, porReponer } from "@/lib/reglas/inventario";
import { datosDeEjemplo } from "@/datos/ejemplo";
import type { ArticuloInventario } from "@/tipos";

const art = (id: string, cantidad: number, minimo: number): ArticuloInventario =>
  ({ id, nombre: id, categoria: "Otros", unidad: "unidades", cantidad, minimo, nota: null, activo: true, es_ejemplo: false });

describe("inventario", () => {
  it("clasifica las existencias", () => {
    expect(estadoStock({ cantidad: 0, minimo: 5 })).toBe("agotado");
    expect(estadoStock({ cantidad: 5, minimo: 5 })).toBe("bajo");
    expect(estadoStock({ cantidad: 6, minimo: 5 })).toBe("ok");
    expect(estadoStock({ cantidad: 1, minimo: 0 })).toBe("ok");
  });

  it("suma, resta y fija cantidades exactas", () => {
    expect(aplicarMovimiento(10, 5)).toEqual({ nueva: 15, tipo: "entrada" });
    expect(aplicarMovimiento(10, -3)).toEqual({ nueva: 7, tipo: "salida" });
    expect(aplicarMovimiento(10, 0, 4)).toEqual({ nueva: 4, tipo: "ajuste" });
    expect(aplicarMovimiento(0.5, 0.25).nueva).toBe(0.75);
  });

  it("no deja existencias negativas", () => {
    expect(() => aplicarMovimiento(2, -3)).toThrow(/suficientes/);
    expect(() => aplicarMovimiento(2, 0, -1)).toThrow();
  });

  it("ordena lo que hay que reponer: primero lo agotado", () => {
    const lista = porReponer([art("ok", 50, 10), art("bajo", 4, 5), art("agotado", 0, 3), art("casi", 1, 10)]);
    expect(lista.map((a) => a.id)).toEqual(["agotado", "casi", "bajo"]);
  });

  it("los datos de ejemplo incluyen gomitas y enjuague bucal", () => {
    const nombres = datosDeEjemplo("2026-10-22").articulos.map((a) => a.nombre);
    expect(nombres).toEqual(expect.arrayContaining(["Gomitas elásticas de ortodoncia", "Enjuague bucal"]));
  });
});
