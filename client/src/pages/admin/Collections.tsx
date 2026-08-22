import CrudPage, { type FieldSpec } from "./CrudPage";

const FIELDS: FieldSpec[] = [
  { key: "name", label: "Collection Name", type: "text", placeholder: "Candy Carnival", hint: "Slug is generated automatically" },
  { key: "tagline", label: "Tagline", type: "text", placeholder: "The sweetest world to explore" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Full description of this world..." },
  { key: "seriesLabel", label: "Series Label", type: "text", placeholder: "Series 1" },
  { key: "releaseYear", label: "Release Year", type: "text", placeholder: "2024" },
  {
    key: "statCountValue",
    label: "Stats — first figure",
    type: "text",
    placeholder: "leave empty to count characters",
    hint: "Big number on the left of the stats bar. Empty = counted automatically",
  },
  { key: "statCountLabel", label: "Stats — first caption", type: "text", placeholder: "CHARACTERS + 1 SECRET RARE" },
  { key: "statSeriesLabel", label: "Stats — middle caption", type: "text", placeholder: "leave empty to use the collection name" },
  { key: "statYearLabel", label: "Stats — right caption", type: "text", placeholder: "RELEASED" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Live" },
    { value: "coming_soon", label: "Coming Soon" },
    { value: "archived", label: "Archived" },
  ] },
  { key: "heroImageId", label: "Hero Image", type: "media", hint: "Collection page banner + the round shortcut on the homepage (keep the character centred)" },
  { key: "cardImageId", label: "Card Image", type: "media", hint: "Wide banner in the /collections list, around 2400 x 480 px" },
  {
    key: "heroVideoId",
    label: "Hero Video (optional)",
    type: "media",
    mediaType: "video",
    hint: "Plays over the banner after the delay below. Leave empty for a still banner.",
  },
  {
    key: "heroVideoDelayMs",
    label: "Seconds before the video starts",
    type: "number",
    placeholder: "2",
    hint: "0 starts immediately",
  },
  { key: "featured", label: "Featured (homepage hero)", type: "boolean" },
];

const COLUMNS = [
  { key: "name", label: "NAME" },
  { key: "status", label: "STATUS", render: (v: string) => (
    <span className={`text-xs font-bold px-2 py-1 rounded-md ${v === "active" ? "bg-green-100 text-green-700" : v === "archived" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700"}`}>{v === "coming_soon" ? "COMING SOON" : v === "archived" ? "ARCHIVED" : "LIVE"}</span>
  ) },
  { key: "seriesLabel", label: "SERIES" },
  { key: "featured", label: "FEATURED", render: (v: boolean) => v ? <span className="badge-pink">YES</span> : <span className="text-body text-[11px]">—</span> },
];

export default function AdminCollections() {
  return (
    <CrudPage
      toForm={(row: any) => ({
        ...row,
        featured: !!row.featured,
        heroVideoDelayMs: row.heroVideoDelayMs != null ? row.heroVideoDelayMs / 1000 : 2,
      })}
      toPayload={(form) => ({
        ...form,
        heroVideoDelayMs: Math.round(Number(form.heroVideoDelayMs || 0) * 1000),
      })}
      entity="collections"
      fields={FIELDS}
      labelSingular="Collection"
      title="Collections"
      columns={COLUMNS}
    />
  );
}
