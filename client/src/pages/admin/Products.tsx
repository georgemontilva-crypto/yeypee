import { useEffect, useState } from "react";
import CrudPage, { type FieldSpec } from "./CrudPage";
import { adminApi } from "../../lib/api";

const COLUMNS = [
  { key: "name", label: "NAME" },
  { key: "sku", label: "SKU", render: (v: string) => <span className="font-mono text-[11px]">{v}</span> },
  { key: "priceCents", label: "PRICE", render: (v: number) => v != null ? `$${(v / 100).toFixed(2)}` : "—" },
  { key: "status", label: "STATUS", render: (v: string) => (
    <span className={`text-xs font-bold px-2 py-1 rounded-md ${v === "active" ? "bg-green-100 text-green-700" : v === "sold_out" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{(v || "draft").replace("_", " ").toUpperCase()}</span>
  ) },
];

export default function AdminProducts() {
  // The collection list is fetched so the form can offer real names instead of
  // asking the user to type an id.
  const [fields, setFields] = useState<FieldSpec[]>([]);

  useEffect(() => {
    adminApi
      .crud("collections")
      .list({ pageSize: "100" })
      .then((d) => {
        const collections = (d.collections || d.rows || []) as any[];
        setFields(buildFields(collections));
      })
      .catch(() => setFields(buildFields([])));
  }, []);

  if (fields.length === 0) return <div className="p-10 text-center text-body text-sm">Loading...</div>;

  return (
    <CrudPage
      entity="products"
      fields={fields}
      labelSingular="Product"
      title="Products"
      columns={COLUMNS}
      toForm={(row: any) => ({
        ...row,
        showPrice: row.showPrice !== false,
        priceCents: row.priceCents ?? "",
        stock: row.stock ?? 0,
        collectionId: row.collectionId ?? "",
      })}
      toPayload={(form) => ({
        ...form,
        priceCents: form.priceCents === "" ? 0 : Number(form.priceCents),
        stock: form.stock === "" ? 0 : Number(form.stock),
      })}
    />
  );
}

function buildFields(collections: any[]): FieldSpec[] {
  return [
    { key: "name", label: "Product Name", type: "text", placeholder: "Blind Box Display Case" },
    { key: "sku", label: "SKU", type: "text", placeholder: "YEY-DISPLAY-01" },
    { key: "priceCents", label: "Price (USD cents)", type: "number", placeholder: "2499", hint: "2499 = $24.99" },
    {
      key: "showPrice",
      label: "Show the price on the site",
      type: "boolean",
      defaultValue: true,
      hint: "Turn it off to hide this product's price in the shop",
    },
    {
      key: "collectionId",
      label: "Collection (optional)",
      type: "select",
      options: [
        { value: "", label: collections.length ? "— None —" : "No collections yet" },
        ...collections.map((c: any) => ({ value: String(c.id), label: c.name })),
      ],
      hint: "Links the product to a collection page",
    },
    { key: "description", label: "Description", type: "textarea", placeholder: "What's inside..." },
    { key: "imageId", label: "Product Image", type: "media" },
    { key: "type", label: "Type", type: "select", options: [
      { value: "blind_box", label: "Blind Box" },
      { value: "display_case", label: "Display Case" },
      { value: "bundle", label: "Bundle" },
      { value: "accessory", label: "Accessory" },
    ] },
    { key: "stock", label: "Stock", type: "number", placeholder: "0" },
    { key: "status", label: "Status", type: "select", options: [
      { value: "active", label: "Active — visible in the shop" },
      { value: "draft", label: "Draft — hidden from the shop" },
      { value: "sold_out", label: "Sold out" },
      { value: "archived", label: "Archived" },
    ], hint: "Only Active products appear on the public Shop page" },
  ];
}
