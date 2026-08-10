import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const pageSize = 25;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const d = await adminApi.users({ page: String(p), pageSize: String(pageSize), search, role });
      setUsers(d.users);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil((d.total ?? d.users.length) / pageSize)));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [search, role]);

  const patch = async (id: string, body: any) => {
    try {
      await adminApi.patchUser(id, body);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || "Update failed");
    }
  };

  const deleteUser = async (u: any) => {
    if (!window.confirm(`Delete user "${u.email}" and all their collection data?`)) return;
    try {
      await adminApi.deleteUser(u.id);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="rounded-lg border border-borderc bg-white px-4 py-2.5 text-sm outline-none focus:border-ink w-56"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-borderc bg-white px-3 py-2.5 text-sm">
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderc overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-body text-sm">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-body text-sm">No users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderc text-left">
                {["USER", "EMAIL", "ROLE", "VERIFIED", "JOINED"].map((h) => (
                  <th key={h} className="kicker text-body py-3 px-4 font-bold whitespace-nowrap">{h}</th>
                ))}
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-borderc last:border-0 hover:bg-bg-soft/50">
                  <td className="py-3 px-4 font-bold">{u.displayName || "—"}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => patch(u.id, { role: e.target.value })}
                      className={`rounded-md text-xs font-bold px-2 py-1 ${u.role === "admin" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => patch(u.id, { emailVerified: !u.emailVerified })}
                      className={`text-xs font-bold px-2 py-1 rounded-md ${u.emailVerified ? "bg-green-100 text-green-700" : "bg-pink-100 text-pink-700"}`}
                    >
                      {u.emailVerified ? "VERIFIED" : "UNVERIFIED"}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-body whitespace-nowrap">{u.createdAt?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Link to={`/admin/users/${u.id}`} className="text-xs font-bold text-body hover:text-ink underline mr-3">DETAILS</Link>
                    <button onClick={() => deleteUser(u)} className="text-xs font-bold text-candy-pink">DELETE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="btn-pill btn-secondary text-[10px] px-5 py-3">‹ PREV</button>
          <span className="self-center text-sm text-body">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="btn-pill btn-secondary text-[10px] px-5 py-3">NEXT ›</button>
        </div>
      )}
    </div>
  );
}
