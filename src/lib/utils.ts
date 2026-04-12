/** Status badge Tailwind classes */
export function getStatusClasses(status: string): string {
  switch (status) {
    case 'Resolved':
      return 'bg-emerald-100 text-emerald-700';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700';
    case 'Investigating':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

/** Severity badge Tailwind classes */
export function getSeverityClasses(severity: string): string {
  switch (severity) {
    case 'Critical':
      return 'bg-error-container text-on-error-container';
    case 'Moderate':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}

/** Format an ISO date string to a short readable date */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** Format an ISO date string to HH:MM time */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Haversine distance between two lat/lng pairs.
 * Returns distance in metres.
 */
export function getHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reverse-geocode coordinates via Nominatim (free, no key required).
 * Returns a human-readable address string.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Calculate Priority Score dynamically based on Severity, Upvotes, and Duplicate Volume
 */
export function calculatePriorityScore(
  severityStr: string, 
  upvotes: number = 0, 
  duplicateVolume: number = 0
): number {
  const severityMap: Record<string, number> = {
    'Low': 1, 'Moderate': 2, 'Critical': 5
  };
  const baseSeverity = severityMap[severityStr] || 2;
  const score = (baseSeverity * 10) + 
                (15 * Math.log10(upvotes + 1)) + 
                (20 * Math.log10(duplicateVolume + 1));
                
  return parseFloat(score.toFixed(2));
}

/**
 * Forward-geocode address via Nominatim.
 * Returns lat/lng pair.
 */
export async function forwardGeocode(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}
