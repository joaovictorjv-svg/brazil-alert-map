import { levelFromPct, type OsSnapshot, type OsUnit } from "./os-data";
import csvText from "@/data/os-base.csv?raw";


function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseCoords(raw: string | undefined): { lat: number | null; lng: number | null } {
  if (!raw) return { lat: null, lng: null };
  const parts = raw.split(/[,;]/).map((p) => Number(p.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]!) || !Number.isFinite(parts[1]!)) {
    return { lat: null, lng: null };
  }
  return { lat: parts[0]!, lng: parts[1]! };
}

export async function fetchOsSnapshot(): Promise<OsSnapshot> {
  const response = await fetch(CSV_URL, { headers: { "cache-control": "no-cache" } });
  if (!response.ok) {
    throw new Error(
      `Não foi possível ler a planilha (HTTP ${response.status}). Verifique a publicação do arquivo.`,
    );
  }
  const rows = parseCsv(await response.text());
  if (rows.length < 2) {
    throw new Error("A planilha não retornou dados.");
  }

  const header = rows[0]!.map((h) => h.trim().toUpperCase());
  const idx = (name: string) => header.indexOf(name);
  const col = {
    unidade: idx("UNIDADE"),
    grupo: idx("GRUPO"),
    coords: idx("COORDENADAS"),
    reqParadas: idx("REQ_PARADAS"),
    abertasUnidade: idx("ABERTAS_UNIDADES"),
    abertasVolante: idx("ABERTAS_VOLANTE"),
    fechadasVolante: idx("FECHADAS_VOLANTE"),
    fechadasUnidade: idx("FECHADAS_UNIDADE"),
    totalAbertas: idx("TOTAL_ABERTAS"),
    totalFechadas: idx("TOTAL_FECHADAS"),
    totalChamados: idx("TOTAL_CHAMADOS"),
    backlog: idx("BACKLOG_ATIVO"),
    condicao: idx("CONDIÇÃO"),
  };

  const units: OsUnit[] = [];
  rows.slice(1).forEach((row, i) => {
    const nome = (row[col.unidade] ?? "").trim();
    if (!nome) return;
    const totalChamados = toNumber(row[col.totalChamados]);
    const totalAbertas = toNumber(row[col.totalAbertas]);
    const rawBacklog = col.backlog >= 0 ? (row[col.backlog] ?? "").trim() : "";
    const backlogPct = rawBacklog
      ? toNumber(rawBacklog)
      : totalChamados > 0
        ? (totalAbertas / totalChamados) * 100
        : 0;
    const { lat, lng } = parseCoords(row[col.coords]);

    units.push({
      id: `${i}-${nome}`,
      nome,
      grupo: (row[col.grupo] ?? "").trim() || "Sem grupo",
      condicao: (row[col.condicao] ?? "").trim(),
      lat,
      lng,
      reqParadas: toNumber(row[col.reqParadas]),
      abertasUnidade: toNumber(row[col.abertasUnidade]),
      abertasVolante: toNumber(row[col.abertasVolante]),
      fechadasVolante: toNumber(row[col.fechadasVolante]),
      fechadasUnidade: toNumber(row[col.fechadasUnidade]),
      totalAbertas,
      totalFechadas: toNumber(row[col.totalFechadas]),
      totalChamados,
      backlogPct,
      nivel: levelFromPct(backlogPct),
    });
  });

  return { units, fetchedAt: new Date().toISOString() };
}
