// src/services/control.ts
import { fetchFromFastAPI } from "@/lib/bff";

export async function getControlData(userId: number, idCultivo: number) {
  const res = await fetchFromFastAPI(`/control/data?idCultivo=${idCultivo}`);
  if (!res.ok) {
    throw new Error("Error al obtener datos de control desde FastAPI");
  }
  return res.json();
}