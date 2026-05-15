"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { motion } from "framer-motion";
import { Shield, Activity, AlertTriangle, MapPin } from "lucide-react";
import type { Case } from "@/lib/types";

// ── DARK HUMANITARIAN MAP STYLE ─────────────────────────────────────────────
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",              stylers: [{ color: "#0b111b" }] },
  { elementType: "labels.text.stroke",    stylers: [{ color: "#0b111b" }] },
  { elementType: "labels.text.fill",      stylers: [{ color: "#4b5563" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "var(--text-muted)" }] },
  { featureType: "poi",                   elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park",              elementType: "geometry", stylers: [{ color: "#0d1624" }] },
  { featureType: "road",                  elementType: "geometry", stylers: [{ color: "#1a2435" }] },
  { featureType: "road",                  elementType: "geometry.stroke", stylers: [{ color: "#111827" }] },
  { featureType: "road",                  elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { featureType: "road.highway",          elementType: "geometry", stylers: [{ color: "#243044" }] },
  { featureType: "road.highway",          elementType: "geometry.stroke", stylers: [{ color: "#1a2435" }] },
  { featureType: "transit",              elementType: "geometry", stylers: [{ color: "#0d1624" }] },
  { featureType: "water",                 elementType: "geometry", stylers: [{ color: "#060c16" }] },
  { featureType: "water",                 elementType: "labels.text.fill", stylers: [{ color: "#1f2937" }] },
];

const LIBRARIES: ("geometry" | "places")[] = ["geometry"];
const CENTER = { lat: 27.7172, lng: 85.3240 };

const STATIC_RESOURCES = [
  { id: "s1", type: "shelter" as const, label: "Sector 4 Shelter",       lat: 27.7212, lng: 85.3180 },
  { id: "s2", type: "medical" as const, label: "Regional Trauma Center",  lat: 27.7122, lng: 85.3310 },
  { id: "s3", type: "food"    as const, label: "WFP Distribution Point",  lat: 27.7252, lng: 85.3250 },
  { id: "s4", type: "shelter" as const, label: "Basantapur Base Camp",    lat: 27.7052, lng: 85.3100 },
];

const TRIAGE_COLORS: Record<string, string> = {
  RED:    "var(--triage-red)",
  ORANGE: "var(--triage-orange)",
  YELLOW: "var(--triage-yellow)",
  GREEN:  "var(--triage-green)",
};

const RESOURCE_COLORS: Record<string, string> = {
  shelter: "var(--accent)",
  medical: "var(--accent-light)",
  food:    "var(--text-secondary)",
};

// ── SIMULATED FALLBACK MAP ────────────────────────────────────────────────────
function SimulatedMap({ cases }: { cases: Case[] }) {
  const MARKERS = [
    { id: "a1", x: "21%", y: "38%", type: "high"     as const, label: "Active case cluster" },
    { id: "a2", x: "33%", y: "54%", type: "medium"   as const, label: "Supply shortage" },
    { id: "a3", x: "61%", y: "48%", type: "critical" as const, label: "Medical escalation" },
    { id: "a4", x: "75%", y: "34%", type: "low"      as const, label: "Shelter available" },
    { id: "a5", x: "54%", y: "68%", type: "medium"   as const, label: "Water request spike" },
  ];
  const COLORS = {
    critical: "bg-red-400 shadow-red-500/60",
    high:     "bg-orange-300 shadow-orange-500/50",
    medium:   "bg-amber-300 shadow-amber-500/45",
    low:      "bg-cyan-300 shadow-cyan-400/45",
  };

  return (
    <div className="relative h-full w-full bg-bg-primary">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(78,125,255,0.15),transparent_45%),radial-gradient(circle_at_75%_60%,rgba(255,112,125,0.10),transparent_42%)]" />
      <div className="absolute inset-0 terminal-grid opacity-30" />
      {MARKERS.map((marker, idx) => (
        <motion.div
          key={marker.id}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
          style={{ left: marker.x, top: marker.y }}
          className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-default"
        >
          <motion.div
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0.05, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5 + idx * 0.3, ease: "easeInOut" }}
            className={`absolute inset-0 rounded-full w-4 h-4 ${COLORS[marker.type]}`}
          />
          <div className={`relative w-3 h-3 rounded-full shadow-lg ${COLORS[marker.type]}`} />
          <div className="absolute left-4 top-[-8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] px-2 py-1 rounded-md bg-black/80 border border-white/10 text-gray-200 pointer-events-none z-10">
            {marker.label}
          </div>
        </motion.div>
      ))}
      <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md border border-white/[0.08] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
        <Shield className="w-2.5 h-2.5 text-cyan-400" />
        <span className="text-[9px] font-mono text-cyan-300">SIMULATED · NO API KEY</span>
      </div>
      <div className="absolute bottom-3 right-3 text-[9px] text-gray-600 font-mono">
        GRID_REF: 27.71N 85.32E
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
interface CrisisOperationsMapProps {
  cases?: Case[];
}

type SelectedMarker =
  | (Case & { lat: number; lng: number })
  | (typeof STATIC_RESOURCES[number] & { lat: number; lng: number });

export function CrisisOperationsMap({ cases = [] }: CrisisOperationsMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const onUnmount = useCallback(() => setMapReady(false), []);
  const onLoad = useCallback(() => setMapReady(true), []);

  // Deterministic polar-distribution around center for demo cases
  const caseMarkers = useMemo(() =>
    cases.map((c, i) => {
      const angle = (i * 137.508) * (Math.PI / 180); // golden angle
      const r = 0.012 * Math.sqrt(i + 1);
      return { ...c, lat: CENTER.lat + r * Math.cos(angle), lng: CENTER.lng + r * Math.sin(angle) };
    }),
  [cases]);

  const mapOptions: google.maps.MapOptions = useMemo(() => ({
    styles: MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: false,
    scrollwheel: true,
    gestureHandling: "cooperative",
    clickableIcons: false,
  }), []);

  const showGoogleMap = hasApiKey && isLoaded && !loadError;

  return (
    <section className="glass-panel rounded-2xl p-4 md:p-5" aria-label="Crisis operations map">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Crisis Operations Map</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
          />
          <span className="text-[9px] md:text-[10px] text-cyan-300 font-mono tracking-widest">
            {showGoogleMap ? "LIVE GRID · SECTOR ACTIVE" : "SIMULATED · OFFLINE"}
          </span>
        </div>
      </div>

      {/* Map Container — fixed height prevents layout jump */}
      <div className="relative h-56 md:h-80 rounded-xl border border-white/[0.08] overflow-hidden">
        {/* Loading state */}
        {!isLoaded && hasApiKey && !loadError && (
          <div className="absolute inset-0 bg-bg-primary flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-[10px] text-cyan-400/50 font-mono tracking-[0.2em]">INITIALIZING GRID</span>
            </div>
          </div>
        )}

        {/* Simulated fallback (no key or load error) */}
        {(!hasApiKey || loadError) && (
          <SimulatedMap cases={cases} />
        )}

        {/* Real Google Map */}
        {hasApiKey && isLoaded && !loadError && (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={CENTER}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
          >
            {/* Case markers */}
            {caseMarkers.map((marker) => (
              <Marker
                key={marker.case_id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => setSelectedMarker(marker)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: TRIAGE_COLORS[marker.triage_level] ?? "var(--text-muted)",
                  fillOpacity: 0.95,
                  strokeColor: "var(--text-primary)",
                  strokeWeight: 1.5,
                  scale: marker.triage_level === "RED" ? 8 : 6,
                }}
              />
            ))}

            {/* Static resource markers */}
            {STATIC_RESOURCES.map((res) => (
              <Marker
                key={res.id}
                position={{ lat: res.lat, lng: res.lng }}
                onClick={() => setSelectedMarker(res as SelectedMarker)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: RESOURCE_COLORS[res.type] ?? "var(--text-muted)",
                  fillOpacity: 0.85,
                  strokeColor: "rgba(255,255,255,0.6)",
                  strokeWeight: 1,
                  scale: 5,
                }}
              />
            ))}

            {selectedMarker && (
              <InfoWindow
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
                options={{ pixelOffset: new google.maps.Size(0, -8) }}
              >
                <div style={{ padding: "8px 4px", minWidth: 140 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-primary)", marginBottom: 4 }}>
                    {"case_id" in selectedMarker ? `Case ${selectedMarker.case_id}` : selectedMarker.label}
                  </p>
                  {"triage_level" in selectedMarker && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: TRIAGE_COLORS[selectedMarker.triage_level], display: "inline-block" }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{selectedMarker.triage_level} PRIORITY</span>
                    </div>
                  )}
                  {"type" in selectedMarker && (
                    <p style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "capitalize" }}>{selectedMarker.type} facility</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        {/* Always-on operational overlays */}
        {showGoogleMap && mapReady && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/[0.08] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <Shield className="w-2.5 h-2.5 text-cyan-400" />
              <span className="text-[9px] font-mono text-cyan-200">SECTOR ALPHA-4 · GUARDED</span>
            </div>
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md border border-white/[0.08] rounded-lg px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[9px] font-mono text-gray-500">CASES</span>
                <span className="text-[9px] font-mono text-white">{cases.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-0.5">
                <span className="text-[9px] font-mono text-gray-500">RESOURCES</span>
                <span className="text-[9px] font-mono text-white">{STATIC_RESOURCES.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Critical", color: "bg-red-500" },
            { label: "Shelter",  color: "bg-blue-500" },
            { label: "Medical",  color: "bg-pink-500" },
            { label: "Food",     color: "bg-purple-500" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
              <span className="text-[10px] text-gray-600 font-medium">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-[9px] font-mono text-gray-700">27.71N 85.32E</div>
      </div>
    </section>
  );
}
