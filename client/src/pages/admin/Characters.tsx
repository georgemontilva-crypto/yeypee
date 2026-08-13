import { useEffect, useState } from "react";
import CrudPage, { FieldSpec } from "./CrudPage";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";

const RARITY_OPTIONS = [
  { value: "common", label: "Common" },
  { value: "rare", label: "Rare" },
  { value: "secret_rare", label: "Secret Rare" },
];

export default function AdminCharacters() {
  const [fields, setFields] = useState<FieldSpec[]>([]);
  const [noCollections, setNoCollections] = useState(false);
  const [collectionNames, setCollectionNames] = useState<Record<string, string>>({});

  useEffect(() => {
    adminApi.crud("collections").list({ pageSize: "100" }).then((d) => {
      const cols = (d.collections || d.rows || []) as any[];
      setNoCollections(cols.length === 0);
      setCollectionNames(Object.fromEntries(cols.map((c: any) => [String(c.id), c.name])));
      setFields([
        { key: "name", label: "Character Name", type: "text", placeholder: "Bubble Bear" },
        { key: "collectionId", label: "Collection", type: "select", options: (d.collections || d.rows || []).map((c: any) => ({ value: String(c.id), label: c.name })) },
        { key: "rarity", label: "Rarity", type: "select", options: RARITY_OPTIONS },
        { key: "description", label: "Description", type: "textarea", placeholder: "Personality and story..." },
        { key: "favoriteCandy", label: "Favorite Candy", type: "text", placeholder: "Lollipop" },
        { key: "bestFriend", label: "Best Friend", type: "text", placeholder: "Squishy Frog" },
        { key: "birthday", label: "Birthday", type: "text", placeholder: "June 12" },
        { key: "cardBgColor", label: "Card Background Color", type: "text", placeholder: "#FFE3EF" },
        { key: "imageFrontId", label: "Image (Front)", type: "media" },
        { key: "imageSideId", label: "Image (Side)", type: "media" },
        { key: "imageBackId", label: "Image (Back)", type: "media" },
      ]);
    });
  }, []);

  const COLUMNS = [
    { key: "name", label: "NAME" },
    { key: "rarity", label: "RARITY", render: (v: string) => (
      <span className={`text-xs font-bold px-2 py-1 rounded-md ${v === "secret_rare" ? "bg-yellow-100 text-yellow-700" : v === "rare" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{v.replace("_", " ")}</span>
    ) },
    { key: "collectionId", label: "COLLECTION", render: (v: any) => collectionNames[String(v)] || "—" },
    { key: "cardBgColor", label: "CARD COLOR", render: (v: string) => (
      <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border border-borderc inline-block" style={{ background: v }} />{v || "—"}</span>
    ) },
  ];

  const toForm = (row: any) => ({ ...row, collectionId: row.collectionId || row.collection_id || "" });
  const toPayload = (form: Record<string, any>) => ({
    ...form,
    collectionId: form.collectionId ? Number(form.collectionId) : undefined,
  });

  if (fields.length === 0) return <div className="p-10 text-center text-body text-sm">Loading...</div>;
  if (noCollections)
    return (
      <div className="bg-white rounded-xl border border-borderc p-10 text-center">
        <p className="text-sm text-body mb-4">
          Characters belong to a collection, so create a collection first.
        </p>
        <Link to="/admin/collections" className="btn-pill btn-primary text-[10px] px-5 py-3">
          GO TO COLLECTIONS
        </Link>
      </div>
    );

  return (
    <CrudPage
      entity="characters"
      fields={fields}
      labelSingular="Character"
      groupBy={{
        key: (row: any) => String(row.collectionId ?? ""),
        label: (key: string) => collectionNames[key] || "No collection",
      }}
      title="Characters"
      columns={COLUMNS}
      toForm={toForm}
      toPayload={toPayload}
    />
  );
}
