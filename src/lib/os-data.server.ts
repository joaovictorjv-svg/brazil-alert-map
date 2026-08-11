import { levelFromPct, type OsSnapshot, type OsUnit } from "./os-data";

// Arquivos de dados locais em src/data/.
// O programa aceita CSV (padrão) ou XLSX. Se ambos existirem, o CSV tem prioridade.
// Para atualizar os dados mensalmente, basta substituir src/data/os-base.csv
// (ou src/data/os-base.xlsx) e republicar o app.
async function loadSourceRows(): Promise<string[][]> {
  try {
    const csv = await import("../data/os-base.csv?raw");
    return parseCsv(csv.default as string);
  } catch {
    try {
      const xlsxUrl = await import("../data/os-base.xlsx?url");
      const response = await fetch(xlsxUrl.default as string);
      if (!response.ok) {
        throw new Error(`Não foi possível ler o arquivo XLSX (HTTP ${response.status}).`);
      }
      const buffer = await response.arrayBuffer();
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(new Uint8Array(buffer), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error("O arquivo XLSX não possui nenhuma aba.");
      }
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error("Não foi possível ler a aba da planilha XLSX.");
      }
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | null | undefined)[][];
      return rows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
    } catch {
      throw new Error(
        "Nenhum arquivo de dados encontrado. Adicione src/data/os-base.csv ou src/data/os-base.xlsx.",
      );
    }
  }
}

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
  const rows = await loadSourceRows();
  if (rows.length < 2) {
    throw new Error("O arquivo de dados não contém linhas. Verifique src/data/os-base.csv/.xlsx.");
  }

  const header = rows[0]!.map((h) => h.trim().toUpperCase());
  const idx = (name: string) => header.indexOf(name);
  const col = {
    unidade: idx("UNIDADE"),
    grupo: idx("GRUPO"),
    quadroFixo: idx("QUADRO_FIXO"),
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
      quadroFixo: (row[col.quadroFixo] ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase() === "SIM",
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
