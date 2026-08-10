import { useEffect, useState } from "react";
import CrudPage, { FieldSpec } from "./CrudPage";
import { adminApi } from "../../lib/api";

const RARITY_OPTIONS = [
  { value: "common", label: "Common" },
  { value: "rare", label: "Rare" },
  { value: "secret_rare", label: "Secret Rare" },
];

export default function AdminCharacters() {
  const [fields, setFields] = useState<FieldSpec[]>([]);

  useEffect(() => {
    adminApi.crud("collections").list({ pageSize: "100" }).then((d) => {
      setFields([
        { key: "name", label: "Character Name", type: "text", placeholder: "Bubble Bear" },
        { key: "collectionId", label: "Collection", type: "select", options: (d.rows || []).map((c: any) => ({ value: String(c.id), label: c.name })) },
        { key: "rarity", label: "Rarity", type: "select", options: RARITY_OPTIONS },
        { key: "description", label: "Description", type: "textarea", placeholder: "Personality and story..." },
        { key: "favoriteCandy", label: "Favorite Candy", type: "text", placeholder: "Lollipop" },
        { key: "bestFriend", label: "Best Friend", type: "text", placeholder: "Squishy Frog" },
        { key: "birthday", label: "Birthday", type: "text", placeholder: "June 12" },
        { key: "cardBgColor", label: "Card Background Color", type: "text", placeholder: "#FFE3EF" },
        { key: "imageFront", label: "Image (Front)", type: "media" },
        { key: "imageSide", label: "Image (Side)", type: "media" },
        { key: "imageBack", label: "Image (Back)", type: "media" },
      ]);
    });
  }, []);

  const COLUMNS = [
    { key: "name", label: "NAME" },
    { key: "rarity", label: "RARITY", render: (v: string) => (
      <span className={`text-xs font-bold px-2 py-1 rounded-md ${v === "secret_rare" ? "bg-yellow-100 text-yellow-700" : v === "rare" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{v.replace("_", " ")}</span>
    ) },
    { key: "collectionName", label: "COLLECTION" },
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

  return (
    <CrudPage
      entity="characters"
      fields={fields}
      labelSingular="Character"
      title="Characters"
      columns={COLUMNS}
      toForm={toForm}
      toPayload={toPayload}
    />
  );
}
