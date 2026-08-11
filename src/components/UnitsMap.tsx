import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { LEVEL_COLOR, formatInt, formatPct, type OsUnit } from "@/lib/os-data";

function pinIcon(color: string, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${active ? 20 : 14}px;height:${active ? 20 : 14}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}55,0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [active ? 20 : 14, active ? 20 : 14],
    iconAnchor: [active ? 10 : 7, active ? 10 : 7],
  });
}

function FitBounds({ units, selected }: { units: OsUnit[]; selected: OsUnit | null }) {
  const map = useMap();

  useEffect(() => {
    if (selected && selected.lat != null && selected.lng != null) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [map, selected]);

  useEffect(() => {
    const points = units
      .filter((u) => u.lat != null && u.lng != null)
      .map((u) => [u.lat as number, u.lng as number] as [number, number]);
    if (points.length === 0) return;

    map.fitBounds(L.latLngBounds(points).pad(0.25), { animate: false });
  }, [map, units]);

  return null;
}

export interface UnitsMapProps {
  units: OsUnit[];
  selected: OsUnit | null;
  onSelect: (unit: OsUnit) => void;
  statesGeoJson: unknown;
}

export default function UnitsMap({ units, selected, onSelect, statesGeoJson }: UnitsMapProps) {
  const withCoords = useMemo(
    () => units.filter((u) => u.lat != null && u.lng != null),
    [units],
  );

  return (
    <div className="relative h-full w-full">
      {/* Legenda de Criticidade Flutuante */}
      <div className="absolute bottom-4 right-4 z-[1000] rounded-md border border-border bg-white/95 p-3 shadow-lg backdrop-blur-sm pointer-events-auto max-w-[260px]">
        <h4 className="mb-2 text-xs font-semibold text-zinc-900">Legenda de Criticidade</h4>
        <div className="flex flex-col gap-2 text-xs text-zinc-700">
          <div className="flex items-center gap-2">
            <span
              style={{
                display: "block",
                width: "14px",
                height: "14px",
                borderRadius: "9999px",
                background: LEVEL_COLOR.ok,
                border: "2px solid #fff",
                boxShadow: "0 0 0 2px #16a34a55, 0 1px 4px rgba(0,0,0,.4)",
                flexShrink: 0,
              }}
            />
            <span><strong>Verde:</strong> Backlog menor que 2%</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              style={{
                display: "block",
                width: "14px",
                height: "14px",
                borderRadius: "9999px",
                background: LEVEL_COLOR.warn,
                border: "2px solid #fff",
                boxShadow: "0 0 0 2px #eab30855, 0 1px 4px rgba(0,0,0,.4)",
                flexShrink: 0,
              }}
            />
            <span><strong>Amarelo:</strong> Backlog de 2% a 20%</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              style={{
                display: "block",
                width: "14px",
                height: "14px",
                borderRadius: "9999px",
                background: LEVEL_COLOR.crit,
                border: "2px solid #fff",
                boxShadow: "0 0 0 2px #dc262655, 0 1px 4px rgba(0,0,0,.4)",
                flexShrink: 0,
              }}
            />
            <span><strong>Vermelho:</strong> Backlog a partir de 20%</span>
          </div>
        </div>
      </div>

      {/* Container do Mapa */}
      <MapContainer
        center={[-14.5, -51]}
        zoom={4}
        scrollWheelZoom
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {statesGeoJson ? (
          <GeoJSON
            data={statesGeoJson as never}
            filter={(feature) => {
              const p = feature.properties || {};
              const uf = (p.sigla || p.UF || p.id || p.name || p.nome || "").toString().toUpperCase();
              return (
                uf.includes("SP") ||
                uf.includes("RJ") ||
                uf.includes("SÃO PAULO") ||
                uf.includes("RIO DE JANEIRO")
              );
            }}
            style={() => ({
              color: "#1f4b5f",
              weight: 2,
              opacity: 0.8,
              fillColor: "#2c6a80",
              fillOpacity: 0.12,
            })}
          />
        ) : null}
        {withCoords.map((unit) => (
          <Marker
            key={unit.id}
            position={[unit.lat as number, unit.lng as number]}
            icon={pinIcon(LEVEL_COLOR[unit.nivel], selected?.id === unit.id)}
            eventHandlers={{ click: () => onSelect(unit) }}
          >
            <Popup>
              <strong>{unit.nome}</strong>
              <br />
              {unit.grupo}
              <br />
              Quadro Fixo: {unit.quadroFixo ? "Sim" : "Não"}
              <br />
              Backlog: {formatPct(unit.backlogPct)} · {formatInt(unit.totalChamados)} Chamados Totais
            </Popup>
          </Marker>
        ))}
        <FitBounds units={withCoords} selected={selected} />
      </MapContainer>
    </div>
  );
}
