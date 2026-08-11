import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClientOnly } from "@tanstack/react-router";
import { AlertTriangle, Building2, Layers, RefreshCw, Search, Ticket } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LEVEL_COLOR,
  LEVEL_LABEL,
  formatInt,
  formatPct,
  type AlertLevel,
  type OsUnit,
} from "@/lib/os-data";
import { getOsSnapshot } from "@/lib/os-data.functions";
import { cn } from "@/lib/utils";

const UnitsMap = lazy(() => import("@/components/UnitsMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Ordens de Serviço | Manutenção da Rede" },
      {
        name: "description",
        content:
          "Dashboard executivo de ordens de serviço da manutenção: mapa interativo, backlog por unidade e alertas de criticidade em tempo quase real.",
      },
      { property: "og:title", content: "Painel de Ordens de Serviço | Manutenção da Rede" },
      {
        property: "og:description",
        content:
          "Dashboard executivo de ordens de serviço da manutenção: mapa interativo, backlog por unidade e alertas de criticidade em tempo quase real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const LEVELS: AlertLevel[] = ["ok", "warn", "crit"];

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Carregando mapa...
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
  tone?: "crit";
  tooltip?: string;
}) {
  const cardContent = (
    <div className="rounded-md border border-border bg-card px-4 py-3 cursor-default">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-2xl font-semibold tabular-nums",
          tone === "crit" ? "text-crit" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );

  if (!tooltip) return cardContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LevelDot({ level, className }: { level: AlertLevel; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: LEVEL_COLOR[level] }}
    />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function DashboardPage() {
  const fetchSnapshot = useServerFn(getOsSnapshot);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["os-snapshot"],
    queryFn: () => fetchSnapshot(),
    refetchInterval: 10 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 10 * 60 * 1000,
  });

  const [statesGeoJson, setStatesGeoJson] = useState<unknown>(null);
  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>([]);
  const [niveisSelecionados, setNiveisSelecionados] = useState<AlertLevel[]>([]);
  const [quadro, setQuadro] = useState<"todos" | "sim" | "nao">("todos");
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<OsUnit | null>(null);

  const toggleGrupo = (g: string) => {
  setGruposSelecionados((prev) =>
    prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
  );
};

const toggleNivel = (lv: AlertLevel) => {
  setNiveisSelecionados((prev) =>
    prev.includes(lv) ? prev.filter((item) => item !== lv) : [...prev, lv]
  );
};

  useEffect(() => {
    let cancelled = false;
    fetch("/brazil-states.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setStatesGeoJson(json);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const units = useMemo(() => data?.units ?? [], [data]);

  const grupos = useMemo(
    () => Array.from(new Set(units.map((u) => u.grupo))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [units],
  );

  const filtered = useMemo(() => {
  const term = busca.trim().toLowerCase();
  return units
    .filter((u) => (gruposSelecionados.length === 0 ? true : gruposSelecionados.includes(u.grupo)))
    .filter((u) => (niveisSelecionados.length === 0 ? true : niveisSelecionados.includes(u.nivel)))
    .filter((u) => (quadro === "todos" ? true : quadro === "sim" ? u.quadroFixo : !u.quadroFixo))
    .filter((u) => (term ? u.nome.toLowerCase().includes(term) : true))
    .sort((a, b) => b.backlogPct - a.backlogPct);
}, [units, gruposSelecionados, niveisSelecionados, quadro, busca]);

  const stats = useMemo(() => {
    const totalChamados = filtered.reduce((acc, u) => acc + u.totalChamados, 0);
    const totalAbertas = filtered.reduce((acc, u) => acc + u.totalAbertas, 0);
    const criticas = filtered.filter((u) => u.nivel === "crit").length;
    return { unidades: filtered.length, totalChamados, totalAbertas, criticas };
  }, [filtered]);

  const atualizadoEm = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "—";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
              Painel de Ordens de Serviço — Manutenção
            </h1>
            <p className="text-xs text-primary-foreground/70">
              Última atualização: {atualizadoEm}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="w-full md:w-auto"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
            {isFetching ? "Atualizando..." : "Atualizar dados"}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-4">
        {error ? (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Unidades" value={formatInt(stats.unidades)} icon={Building2} />
          <StatCard
            label="OS's Encontradas"
            value={formatInt(stats.totalChamados)}
            icon={Ticket}
          />
          <StatCard label="Backlog" value={formatInt(stats.totalAbertas)} icon={Layers} />
          <StatCard
            label="Alerta vermelho"
            value={formatInt(stats.criticas)}
            icon={AlertTriangle}
            tone="crit"
            tooltip="Unidades em alerta vermelho possuem um backlog acima de 20%."
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar unidade"
                className="pl-8"
              />
            </div>

            {/* Filtro de Grupos */}
<div className="flex flex-wrap gap-1.5">
  <button
    onClick={() => setGruposSelecionados([])}
    className={cn(
      "rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
      gruposSelecionados.length === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted"
    )}
  >
    Todos os grupos
  </button>
  {grupos.map((g) => {
    const ativo = gruposSelecionados.includes(g);
    return (
      <button
        key={g}
        onClick={() => toggleGrupo(g)}
        className={cn(
          "rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
          ativo ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
      >
        {g}
      </button>
    );
  })}
</div>

{/* Filtro de Criticidades */}
<div className="flex flex-wrap gap-1.5">
  <button
    onClick={() => setNiveisSelecionados([])}
    className={cn(
      "rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
      niveisSelecionados.length === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted"
    )}
  >
    Todas as criticidades
  </button>
  {LEVELS.map((lv) => {
    const ativo = niveisSelecionados.includes(lv);
    return (
      <button
        key={lv}
        onClick={() => toggleNivel(lv)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
          ativo ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
      >
        <LevelDot level={lv} />
        {LEVEL_LABEL[lv]}
      </button>
    );
  })}
</div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["todos", "Todos os quadros"],
                  ["sim", "Com quadro fixo"],
                  ["nao", "Sem quadro fixo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setQuadro(value)}
                  className={cn(
                    "rounded-full border border-border px-2.5 py-1 text-xs transition-colors",
                    quadro === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            
            <div className="max-h-[calc(100vh-24rem)] min-h-64 overflow-y-auto rounded-md border border-border">
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {isFetching ? "Carregando unidades..." : "Nenhuma unidade encontrada."}
                </p>
              ) : (
                <ul>
                  {filtered.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => setSelected(u)}
                        className={cn(
                          "flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-0 hover:bg-muted",
                          selected?.id === u.id && "bg-muted",
                        )}
                      >
                        <LevelDot level={u.nivel} className="mt-1.5" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{u.nome}</span>
                          <span className="block text-xs text-muted-foreground">
                            {u.grupo} · {formatInt(u.totalChamados)} chamados
                          </span>
                        </span>
                        <span className="text-xs font-semibold tabular-nums">
                          {formatPct(u.backlogPct)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <main className="h-[70vh] min-h-[420px] overflow-hidden rounded-md border border-border bg-card">
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <UnitsMap
                  units={filtered}
                  selected={selected}
                  onSelect={setSelected}
                  statesGeoJson={statesGeoJson}
                />
              </Suspense>
            </ClientOnly>
          </main>
        </div>
      </div>

      {/* <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-left text-base leading-snug">
                  {selected.nome}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selected.grupo}</Badge>
                {selected.condicao ? <Badge variant="outline">{selected.condicao}</Badge> : null}
                <span
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: LEVEL_COLOR[selected.nivel] }}
                >
                  {LEVEL_LABEL[selected.nivel]} · {formatPct(selected.backlogPct)}
                </span>
              </div>
              <div className="mt-2">
                <DetailRow label="Total de chamados" value={formatInt(selected.totalChamados)} />
                <DetailRow label="Abertas — unidade" value={formatInt(selected.abertasUnidade)} />
                <DetailRow label="Abertas — volante" value={formatInt(selected.abertasVolante)} />
                <DetailRow label="Total abertas" value={formatInt(selected.totalAbertas)} />
                <DetailRow label="Fechadas — unidade" value={formatInt(selected.fechadasUnidade)} />
                <DetailRow label="Fechadas — volante" value={formatInt(selected.fechadasVolante)} />
                <DetailRow label="Total fechadas" value={formatInt(selected.totalFechadas)} />
                <DetailRow label="Requisições paradas" value={formatInt(selected.reqParadas)} />
                <DetailRow label="Backlog ativo" value={formatPct(selected.backlogPct)} />
              </div>
              <p className="text-xs text-muted-foreground">Dados de {atualizadoEm}</p>
            </>
          ) : null}
        </DialogContent>
      </Dialog> */}

      {selected && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in-0"
          onClick={() => setSelected(null)}
        />
      )}
    </div>
  );
}
