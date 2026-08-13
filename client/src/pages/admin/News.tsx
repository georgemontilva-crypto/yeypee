import CrudPage, { type FieldSpec } from "./CrudPage";

const FIELDS: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", placeholder: "Meet the new Tiny Friends" },
  { key: "excerpt", label: "Excerpt", type: "text", placeholder: "One-line summary for the homepage..." },
  { key: "body", label: "Body", type: "textarea", placeholder: "Full announcement..." },
  { key: "thumbnailImageId", label: "Thumbnail", type: "media" },
  { key: "badgeLabel", label: "Badge Label (optional)", type: "text", placeholder: "NEW!" },
  { key: "published", label: "Published", type: "boolean", defaultValue: true, hint: "Only published posts appear in \"What's coming next?\" on the homepage" },
];

const COLUMNS = [
  { key: "title", label: "TITLE" },
  { key: "badgeLabel", label: "BADGE", render: (v: string) => v ? <span className="badge-pink">{v}</span> : <span className="text-body text-[11px]">—</span> },
  { key: "published", label: "PUBLISHED", render: (v: boolean) => v ? <span className="text-xs font-bold px-2 py-1 rounded-md bg-green-100 text-green-700">YES</span> : <span className="text-body text-[11px]">DRAFT</span> },
];

export default function AdminNews() {
  return (
    <CrudPage
      entity="news"
      fields={FIELDS}
      labelSingular="News"
      emptyText={'Nothing here yet. Anything you publish appears in the "What\'s coming next?" section of the homepage.'}
      title={'News — "What\'s coming next?"'}
      columns={COLUMNS}
      toForm={(row: any) => ({ ...row, published: !!row.published })}
    />
  );
}
