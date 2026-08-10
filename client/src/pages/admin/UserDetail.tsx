import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../lib/api";

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminApi
      .user(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const patch = async (body: any) => {
    try {
      await adminApi.patchUser(id!, body);
      const d = await adminApi.user(id!);
      setData(d);
    } catch (e: any) {
      alert(e?.data?.error || "Update failed");
    }
  };

  return (
    <div>
      <Link to="/admin/users" className="btn-label text-body hover:text-ink mb-5 inline-block">‹ BACK TO USERS</Link>
      {loading ? (
        <div className="p-10 text-center text-body text-sm">Loading...</div>
      ) : !data?.user ? (
        <div className="p-10 text-center text-body text-sm">User not found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-borderc p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold">{data.user.displayName || "Unnamed user"}</h2>
              <p className="text-body text-sm mt-1">{data.user.email}</p>
            </div>
            <div className="flex gap-2">
              <select
                value={data.user.role}
                onChange={(e) => patch({ role: e.target.value })}
                className={`rounded-md text-xs font-bold px-3 py-2 ${data.user.role === "admin" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-gray-100 text-gray-600"}`}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                onClick={() => patch({ emailVerified: !data.user.emailVerified })}
                className={`text-xs font-bold px-3 py-2 rounded-md ${data.user.emailVerified ? "bg-green-100 text-green-700" : "bg-pink-100 text-pink-700"}`}
              >
                {data.user.emailVerified ? "VERIFIED" : "MARK VERIFIED"}
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="rounded-smcard bg-bg-soft p-5">
              <div className="kicker text-body mb-2">STATUS</div>
              <div className="font-bold">{data.user.active ? "Active" : "Suspended"}</div>
            </div>
            <div className="rounded-smcard bg-bg-soft p-5">
              <div className="kicker text-body mb-2">JOINED</div>
              <div className="font-bold">{data.user.createdAt}</div>
            </div>
            <div className="rounded-smcard bg-bg-soft p-5">
              <div className="kicker text-body mb-2">LAST LOGIN</div>
              <div className="font-bold">{data.user.lastLoginAt || "Never"}</div>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="font-extrabold uppercase text-sm mb-4">Collection progress</h3>
            {data.progress?.length ? (
              <ul className="space-y-2 text-sm">
                {data.progress.map((p: any) => (
                  <li key={p.characterId} className="flex items-center justify-between border border-borderc rounded-lg px-4 py-2">
                    <span className="font-medium">{p.characterName}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${p.collected ? "bg-green-100 text-green-700" : "bg-pink-100 text-pink-700"}`}>
                      {p.collected ? "COLLECTED" : "NOT COLLECTED"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-sm">No collection progress recorded for this user.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
