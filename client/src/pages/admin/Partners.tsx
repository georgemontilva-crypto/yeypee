import CrudPage, { type FieldSpec } from "./CrudPage";

const FIELDS: FieldSpec[] = [
  { key: "name", label: "Partner Name", type: "text", placeholder: "Toy Galaxy" },
  { key: "type", label: "Type", type: "select", options: [
    { value: "online", label: "Online only" },
    { value: "in_store", label: "Physical stores only" },
    { value: "both", label: "Online + physical" },
  ] },
  { key: "logoImageId", label: "Logo", type: "media" },
  { key: "onlineUrl", label: "Online Shop URL", type: "text", placeholder: "https://..." },
  { key: "active", label: "Active", type: "boolean" },
];

const COLUMNS = [
  { key: "name", label: "NAME" },
  { key: "type", label: "TYPE", render: (v: string) => <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600 uppercase">{v}</span> },
  { key: "onlineUrl", label: "ONLINE URL", render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer" className="text-xs text-candy-pink underline truncate inline-block max-w-48">{v}</a> : "—" },
  { key: "active", label: "ACTIVE", render: (v: boolean) => v ? <span className="text-xs font-bold px-2 py-1 rounded-md bg-green-100 text-green-700">ACTIVE</span> : <span className="text-body text-[11px]">—</span> },
];

export default function AdminPartners() {
  return (
    <CrudPage
      entity="retail-partners"
      fields={FIELDS}
      labelSingular="Partner"
      title="Retail Partners"
      columns={COLUMNS}
      toForm={(row: any) => ({ ...row, active: !!row.active })}
    />
  );
}
