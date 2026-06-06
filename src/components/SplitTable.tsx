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
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-4 py-2.5 font-medium">Collaborator</th>
            <th className="px-4 py-2.5 font-medium">Role</th>
            {showStatus && <th className="px-4 py-2.5 font-medium">Status</th>}
            <th className="px-4 py-2.5 text-right font-medium">Split</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {collaborators.map((c) => {
            const me =
              highlightEmail &&
              c.email.toLowerCase() === highlightEmail.toLowerCase();
            return (
              <tr key={c.id} className={me ? "bg-amber-50/50" : ""}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">
                    {c.name}
                    {me && <span className="ml-2 text-xs text-amber-600">(you)</span>}
                  </p>
                  <p className="text-xs text-zinc-400">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">
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
                <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                  {formatPct(c.publishing_percentage)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-zinc-50">
          <tr>
            <td
              className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-400"
              colSpan={showStatus ? 3 : 2}
            >
              Total publishing
            </td>
            <td
              className={`px-4 py-2.5 text-right font-bold ${
                Math.abs(total - 100) < 0.01 ? "text-emerald-600" : "text-amber-600"
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
