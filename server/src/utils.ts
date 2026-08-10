export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "untitled";
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Approximate distance in miles from a US zip to lat/lng (simple zip centroid lookup) */
const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "10001": [40.7506, -73.9972],
  "10002": [40.7156, -73.9877],
  "10003": [40.7310, -73.9897],
  "90001": [33.9731, -118.2479],
  "90210": [34.0901, -118.4065],
  "60601": [41.8856, -87.6190],
  "60602": [41.8830, -87.6290],
  "77001": [29.7519, -95.3650],
  "77002": [29.7580, -95.3620],
  "33101": [25.7752, -80.1869],
  "85001": [33.4484, -112.0740],
  "94102": [37.7794, -122.4192],
  "98101": [47.6114, -122.3327],
  "02101": [42.3584, -71.0598],
  "20001": [38.9172, -77.0160],
  "90012": [34.0582, -118.2395],
  "10013": [40.7199, -74.0052],
  "30301": [33.7537, -84.3863],
  "19102": [39.9526, -75.1652],
  "80201": [39.7392, -104.9903],
};

export function zipCoords(zip: string): [number, number] | null {
  const key = zip.trim().slice(0, 5);
  return ZIP_CENTROIDS[key] ?? null;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
