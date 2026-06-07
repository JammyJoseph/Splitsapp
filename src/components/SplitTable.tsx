import { ROLE_LABELS } from "@/lib/constants";
import { formatPct } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { Collaborator } from "@/lib/types";

export function SplitTable({
  collaborators,
  showStatus,
  highlightEmail,
}: {
  collaborators: Collaborator[];
  showStatus?: boolean;
  highlightEmail?: string;
}) {
  const total = collaborators.reduce(
    (s, c) => s + Number(c.publishing_percentage),
    0,
  );
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Collaborator</th>
            <th className="px-4 py-2.5 font-medium">Role</th>
            {showStatus && <th className="px-4 py-2.5 font-medium">Status</th>}
            <th className="px-4 py-2.5 text-right font-medium">Split</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {collaborators.map((c) => {
            const me =
              highlightEmail &&
              c.email.toLowerCase() === highlightEmail.toLowerCase();
            return (
              <tr key={c.id} className={me ? "bg-amber-500/10" : ""}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-50">
                    {c.name}
                    {me && <span className="ml-2 text-xs text-amber-300">(you)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {ROLE_LABELS[c.role] ?? c.role}
                </td>
                {showStatus && (
                  <td className="px-4 py-3">
                    <Badge
                      status={c.signature_status === "signed" ? "signed" : c.signature_status === "change_requested" ? "changes_requested" : "pending"}
                      label={
                        c.signature_status === "signed"
                          ? "Signed"
                          : c.signature_status === "change_requested"
                            ? "Change requested"
                            : "Pending"
                      }
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-right font-semibold text-zinc-50">
                  {formatPct(c.publishing_percentage)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-white/[0.03]">
          <tr>
            <td
              className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500"
              colSpan={showStatus ? 3 : 2}
            >
              Total publishing
            </td>
            <td
              className={`px-4 py-2.5 text-right font-bold ${
                Math.abs(total - 100) < 0.01 ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {formatPct(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
