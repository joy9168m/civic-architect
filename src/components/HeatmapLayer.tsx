import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

import { calculatePriorityScore } from '../lib/utils';

interface HeatmapLayerProps {
  points: { lat: number; lng: number; priorityScore?: number; severity?: string; upvotes?: number; duplicateVolume?: number; }[];
}

export default function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Filter out invalid coords
    const validPoints = points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    
    // Function to calculate intensity purely based on community interaction
    const calculateIntensity = (upvotes: number = 0, duplicates: number = 0) => {
      // Logarithmic scaling so it doesn't get completely blown out by one viral post
      const interactionScore = (15 * Math.log10(upvotes + 1)) + (20 * Math.log10(duplicates + 1));
      // Base appearance footprint of 0.3. Interactions push it to max 1.0.
      return Math.min(0.3 + (interactionScore / 100), 1.0);
    };

    // Helper to generate an isolated heatlayer
    const createHeatLayer = (pts: HeatmapLayerProps['points'], gradientConfig: Record<number, string>) => {
      const heatPoints = pts.map(p => {
        const intensity = calculateIntensity(p.upvotes, p.duplicateVolume);
        return [p.lat, p.lng, intensity] as L.HeatLatLngTuple;
      });

      return (L as any).heatLayer(heatPoints, {
        radius: 40,
        blur: 30,
        maxZoom: 14,
        max: 1.0,
        gradient: gradientConfig
      });
    };

    // Layer 1: Critical (Generates Red/Crimson blooms)
    const criticalPts = validPoints.filter(p => p.severity === 'Critical');
    const criticalLayer = createHeatLayer(criticalPts, { 0.4: '#ef4444', 1.0: '#991b1b' }).addTo(map);

    // Layer 2: Moderate (Generates Yellow/Orange blooms)
    const moderatePts = validPoints.filter(p => p.severity === 'Moderate');
    const moderateLayer = createHeatLayer(moderatePts, { 0.4: '#fcd34d', 1.0: '#ea580c' }).addTo(map);

    // Layer 3: Low (Generates Blue/Teal blooms)
    const lowPts = validPoints.filter(p => p.severity === 'Low');
    const lowLayer = createHeatLayer(lowPts, { 0.4: '#60a5fa', 1.0: '#1d4ed8' }).addTo(map);

    return () => {
      map.removeLayer(criticalLayer);
      map.removeLayer(moderateLayer);
      map.removeLayer(lowLayer);
    };
  }, [map, points]);

  return null;
}
