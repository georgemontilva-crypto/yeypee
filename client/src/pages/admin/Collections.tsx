import CrudPage, { type FieldSpec } from "./CrudPage";

const FIELDS: FieldSpec[] = [
  { key: "name", label: "Collection Name", type: "text", placeholder: "Candy Carnival", hint: "Slug is generated automatically" },
  { key: "tagline", label: "Tagline", type: "text", placeholder: "The sweetest world to explore" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Full description of this world..." },
  { key: "seriesLabel", label: "Series Label", type: "text", placeholder: "Series 1" },
  { key: "releaseYear", label: "Release Year", type: "text", placeholder: "2024" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Live" },
    { value: "coming_soon", label: "Coming Soon" },
    { value: "archived", label: "Archived" },
  ] },
  { key: "accentColor", label: "Accent Color", type: "text", placeholder: "#FF5FA2" },
  { key: "heroImageId", label: "Hero Image", type: "media" },
  { key: "cardImageId", label: "Card Image", type: "media" },
  { key: "featured", label: "Featured (homepage hero)", type: "boolean" },
];

const COLUMNS = [
  { key: "name", label: "NAME" },
  { key: "status", label: "STATUS", render: (v: string) => (
    <span className={`text-xs font-bold px-2 py-1 rounded-md ${v === "active" ? "bg-green-100 text-green-700" : v === "archived" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700"}`}>{v === "coming_soon" ? "COMING SOON" : v === "archived" ? "ARCHIVED" : "LIVE"}</span>
  ) },
  { key: "accentColor", label: "COLOR", render: (v: string) => (
    <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border border-borderc inline-block" style={{ background: v }} />{v || "—"}</span>
  ) },
  { key: "seriesLabel", label: "SERIES" },
  { key: "featured", label: "FEATURED", render: (v: boolean) => v ? <span className="badge-pink">YES</span> : <span className="text-body text-[11px]">—</span> },
];

export default function AdminCollections() {
  return (
    <CrudPage
      entity="collections"
      fields={FIELDS}
      labelSingular="Collection"
      title="Collections"
      columns={COLUMNS}
      toForm={(row: any) => ({ ...row, featured: !!row.featured })}
    />
  );
}
