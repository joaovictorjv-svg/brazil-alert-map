export type AlertLevel = "ok" | "warn" | "crit";

export interface OsUnit {
  id: string;
  nome: string;
  grupo: string;
  condicao: string;
  quadroFixo: boolean;
  lat: number | null;
  lng: number | null;
  reqParadas: number;
  abertasUnidade: number;
  abertasVolante: number;
  fechadasVolante: number;
  fechadasUnidade: number;
  totalAbertas: number;
  totalFechadas: number;
  totalChamados: number;
  backlogPct: number;
  nivel: AlertLevel;
}

export interface OsSnapshot {
  units: OsUnit[];
  fetchedAt: string;
}

export const LEVEL_LABEL: Record<AlertLevel, string> = {
  ok: "Verde",
  warn: "Amarelo",
  crit: "Vermelho",
};

export const LEVEL_COLOR: Record<AlertLevel, string> = {
  ok: "#16a34a",
  warn: "#eab308",
  crit: "#dc2626",
};

export function levelFromPct(pct: number): AlertLevel {
  if (pct >= 20) return "crit";
  if (pct >= 2) return "warn";
  return "ok";
}

export function formatPct(pct: number): string {
  return `${pct.toFixed(2).replace(".", ",")}%`;
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}
