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
  }, [map, units]); // 'selected' foi removido daqui

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
          style={() => ({
            color: "#1f4b5f",
            weight: 1,
            opacity: 0.6,
            fillColor: "#2c6a80",
            fillOpacity: 0.05,
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
            <span className="text-muted-foreground">
            Quadro Fixo: {unit.quadroFixo ? "Sim" : "Não"}
            </span>
            <br />
            Backlog: {formatPct(unit.backlogPct)} · {formatInt(unit.totalChamados)} Chamados Totais
          </Popup>
        </Marker>
      ))}
      <FitBounds units={withCoords} selected={selected} />
    </MapContainer>
  );
}
