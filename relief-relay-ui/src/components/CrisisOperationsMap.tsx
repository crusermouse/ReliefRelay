"use client";

import { useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Shield, Activity, Home, Heart, AlertTriangle } from "lucide-react";
import type { Case } from "@/lib/types";

// Custom Dark Mode Map Style
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b111b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b111b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca3af" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4b5563" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#0d1624" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#1f2937" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#111827" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#374151" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#06090f" }]
  }
];

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["geometry"];

const CENTER = { lat: 27.7172, lng: 85.3240 }; // Center on Kathmandu for demo

// Static assets for the map to make it feel rich
const STATIC_RESOURCES = [
  { id: "s1", type: "shelter", label: "Sector 4 Shelter", lat: 27.7212, lng: 85.3180 },
  { id: "s2", type: "medical", label: "Regional Trauma Center", lat: 27.7122, lng: 85.3310 },
  { id: "s3", type: "food", label: "WFP Distribution Point", lat: 27.7252, lng: 85.3250 },
  { id: "s4", type: "shelter", label: "Basantapur Base", lat: 27.7052, lng: 85.3100 },
];

const COLORS = {
  RED: "#ef4444",
  ORANGE: "#f97316",
  YELLOW: "#f59e0b",
  GREEN: "#10b981",
  SHELTER: "#3b82f6",
  MEDICAL: "#ec4899",
  FOOD: "#8b5cf6",
};

interface CrisisOperationsMapProps {
  cases?: Case[];
}

export function CrisisOperationsMap({ cases = [] }: CrisisOperationsMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Map case severity to coordinates (simulated for demo since real cases don't have lat/lng yet)
  const caseMarkers = useMemo(() => {
    return cases.map((c, i) => {
      // Create a deterministic but scattered location around the center
      const angle = (i * 137.5) * (Math.PI / 180);
      const r = 0.015 * Math.sqrt(i + 1);
      return {
        ...c,
        lat: CENTER.lat + r * Math.cos(angle),
        lng: CENTER.lng + r * Math.sin(angle),
      };
    });
  }, [cases]);

  const mapContainerStyle = {
    width: "100%",
    height: "100%",
  };

  const mapOptions: google.maps.MapOptions = {
    styles: MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: false,
    scrollwheel: true,
    gestureHandling: "cooperative",
  };

  if (loadError) {
    return (
      <section className="glass-panel rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Crisis Operations Map</h3>
          <span className="text-[10px] text-rose-400 font-mono">MAPS DEGRADED</span>
        </div>
        <div className="relative h-56 md:h-72 rounded-xl border border-rose-500/20 overflow-hidden bg-rose-500/5 flex flex-col items-center justify-center text-center p-6">
          <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
          <p className="text-sm text-rose-200 font-medium">Google Maps API key invalid or missing</p>
          <p className="text-[11px] text-rose-400/70 mt-1 max-w-xs">
            Operational continuity maintained via offline reasoning systems. 
            Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4 md:p-5 relative overflow-hidden group">
      {/* Cinematic Overlays */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Crisis Operations Map</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400" 
          />
          <span className="text-[10px] md:text-xs text-cyan-300 font-mono tracking-widest">LIVE DATA · SECTOR ACTIVE</span>
        </div>
      </div>

      <div className="relative h-56 md:h-80 rounded-xl border border-white/10 overflow-hidden">
        {!isLoaded ? (
          <div className="absolute inset-0 bg-[#06090f] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-[10px] text-cyan-400/60 font-mono tracking-[0.2em]">INITIALIZING GRID...</span>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={CENTER}
            zoom={14}
            onLoad={setMap}
            onUnmount={onUnmount}
            options={mapOptions}
          >
            {/* Case Markers */}
            {caseMarkers.map((marker) => (
              <Marker
                key={marker.case_id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => setSelectedMarker(marker)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: COLORS[marker.triage_level],
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 1,
                  scale: 6,
                }}
              />
            ))}

            {/* Static Resources */}
            {STATIC_RESOURCES.map((res) => (
              <Marker
                key={res.id}
                position={{ lat: res.lat, lng: res.lng }}
                onClick={() => setSelectedMarker(res)}
                icon={{
                  path: res.type === "shelter" ? "M12 3L4 9V21H20V9L12 3Z" : "M12 21L10.5 19.55C5.4 14.92 2 11.85 2 8.5C2 5.74 4.24 3.5 7 3.5C8.55 3.5 10.04 4.22 11 5.36C11.96 4.22 13.45 3.5 15 3.5C17.76 3.5 20 5.74 20 8.5C20 11.85 16.6 14.92 11.5 19.55L12 21Z",
                  fillColor: res.type === "shelter" ? COLORS.SHELTER : res.type === "medical" ? COLORS.MEDICAL : COLORS.FOOD,
                  fillOpacity: 0.8,
                  strokeColor: "#ffffff",
                  strokeWeight: 1,
                  scale: res.type === "shelter" ? 1 : 0.8,
                  anchor: new google.maps.Point(12, 12),
                }}
              />
            ))}

            {selectedMarker && (
              <InfoWindow
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-2 min-w-[140px] text-gray-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                    {selectedMarker.case_id ? `Case ${selectedMarker.case_id}` : selectedMarker.label}
                  </h4>
                  {selectedMarker.triage_level && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[selectedMarker.triage_level as keyof typeof COLORS] }} />
                      <span className="text-[10px] font-bold">{selectedMarker.triage_level} PRIORITY</span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-600 italic">
                    {selectedMarker.intake_data?.presenting_issues?.[0] || "Active Operational Point"}
                  </p>
                </div>
              </InfoWindow>
            ))}
          </GoogleMap>
        )}

        {/* Operational Overlay Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-mono text-cyan-200">SECTOR ALPHA-4 · GUARDED</span>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex flex-col gap-1">
            <div className="flex items-center justify-between gap-6">
              <span className="text-[9px] font-mono text-gray-400">TOTAL CASES</span>
              <span className="text-[9px] font-mono text-white">{cases.length}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-[9px] font-mono text-gray-400">RESOURCES</span>
              <span className="text-[9px] font-mono text-white">{STATIC_RESOURCES.length}</span>
            </div>
          </div>

          {/* Compass / Telemetry simulated sweep */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-cyan-400/5 rounded-full hidden md:block"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-cyan-400/10 via-transparent to-transparent opacity-20" />
          </motion.div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Shelter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Medical</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-gray-600">
          GRID_REF: 27.71N 85.32E
        </div>
      </div>
    </section>
  );
}
