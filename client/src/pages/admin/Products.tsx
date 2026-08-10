import CrudPage from "./CrudPage";

const FIELDS = [
  { key: "name", label: "Product Name", type: "text", placeholder: "Blind Box Display Case" },
  { key: "sku", label: "SKU", type: "text", placeholder: "YEY-DISPLAY-01" },
  { key: "priceCents", label: "Price (USD cents)", type: "number", placeholder: "2499", hint: "2499 = $24.99" },
  { key: "collectionId", label: "Collection (optional)", type: "text", placeholder: "Collection ID number" },
  { key: "description", label: "Description", type: "textarea", placeholder: "What's inside..." },
  { key: "image", label: "Product Image", type: "media" },
  { key: "active", label: "Active", type: "boolean" },
];

const COLUMNS = [
  { key: "name", label: "NAME" },
  { key: "sku", label: "SKU", render: (v: string) => <span className="font-mono text-[11px]">{v}</span> },
  { key: "priceCents", label: "PRICE", render: (v: number) => v != null ? `$${(v / 100).toFixed(2)}` : "—" },
  { key: "active", label: "ACTIVE", render: (v: boolean) => v ? <span className="text-xs font-bold px-2 py-1 rounded-md bg-green-100 text-green-700">ACTIVE</span> : <span className="text-body text-[11px]">—</span> },
];

export default function AdminProducts() {
  return (
    <CrudPage
      entity="products"
      fields={FIELDS}
      labelSingular="Product"
      title="Products"
      columns={COLUMNS}
      toForm={(row: any) => ({ ...row, active: !!row.active, priceCents: row.priceCents ?? "" })}
      toPayload={(form) => ({ ...form, priceCents: form.priceCents ? Number(form.priceCents) : undefined, collectionId: form.collectionId ? Number(form.collectionId) : undefined })}
    />
  );
}
