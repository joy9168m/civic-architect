import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { Link } from 'react-router-dom';
import MarkerClusterGroup from 'react-leaflet-cluster';
import HeatmapLayer from './HeatmapLayer';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface Issue {
  id: string;
  title: string;
  lat: number;
  lng: number;
  lng: number;
  status: string;
  category: string;
  priorityScore?: number;
}

interface IssueMapProps {
  issues: Issue[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (issue: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
  mode?: 'cluster' | 'heat';
  cinematic?: boolean;
}

// Custom marker icon based on status
const getMarkerIcon = (status: string) => {
  const color = 
    status === 'Resolved' ? '#10b981' : 
    status === 'In Progress' ? '#f59e0b' : 
    status === 'Investigating' ? '#3b82f6' : '#6b7280';

  return divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

function MapEvents({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function LocationFinder() {
  const map = useMap();
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.flyTo([position.coords.latitude, position.coords.longitude], 14, {
            duration: 1.5,
          });
        },
        (error) => {
          console.error("Error obtaining location via GPS:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [map]);
  return null;
}

function CinematicPan() {
  const map = useMap();
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    
    const animate = (time: number) => {
      const delta = time - lastTime;
      if (delta > 40) { // ~25fps pan rate for extreme smoothness
        map.panBy([1, 0.5], { animate: false });
        lastTime = time;
      }
      animationFrame = requestAnimationFrame(animate);
    }
    
    animationFrame = requestAnimationFrame(animate);
    
    // Stop panning if user starts interacting
    const stopPan = () => cancelAnimationFrame(animationFrame);
    map.on('dragstart', stopPan);
    map.on('zoomstart', stopPan);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      map.off('dragstart', stopPan);
      map.off('zoomstart', stopPan);
    };
  }, [map]);
  return null;
}

export default function IssueMap({ issues, center = [37.7749, -122.4194], zoom = 13, className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner", onMarkerClick, onMapClick, mode = 'cluster', cinematic = false }: IssueMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} scrollWheelZoom={true} dragging={true} maxZoom={18}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!cinematic && <LocationFinder />}
      {cinematic && <CinematicPan />}
      <MapEvents onMapClick={onMapClick} />
      
      {mode === 'cluster' ? (
        <MarkerClusterGroup chunkedLoading>
          {issues.map((issue) => (
            issue.lat && issue.lng && (
              <Marker 
                key={issue.id} 
                position={[issue.lat, issue.lng]} 
                icon={getMarkerIcon(issue.status)}
                eventHandlers={{
                  click: () => onMarkerClick?.(issue)
                }}
              >
                <Popup closeButton={false} minWidth={220} className="custom-popup">
                  <div className="p-2">
                    <h4 className="font-headline font-black text-primary text-base mb-1 leading-tight">{issue.title}</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 
                        issue.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-secondary-container text-primary'
                      }`}>
                        {issue.status}
                      </span>
                      <span className="text-[9px] text-outline font-black uppercase tracking-tighter">{issue.category}</span>
                    </div>
                    <Link 
                      to={`/issue/${issue.id}`} 
                      className="w-full bg-primary text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-lg shadow-primary/20"
                    >
                      View Full Details
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MarkerClusterGroup>
      ) : (
        <HeatmapLayer points={issues} />
      )}
    </MapContainer>
  );
}
