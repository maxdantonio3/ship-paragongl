import { format } from "date-fns";
import type { Activity, CompanyStatusHistory } from "@/lib/types";

interface TimelineEvent {
  date: string;
  kind: "created" | "activity" | "status";
  label: string;
  detail?: string;
  color: string;
}

const ACTIVITY_COLORS: Record<string, string> = {
  Email: "#3B82F6",
  Call: "#10B981",
  "In-Person Visit": "#E0862E",
  Quoted: "#8B5CF6",
  "Work Received": "#22C55E",
  Other: "#9CA9BB",
};

export default function CompanyTimeline({
  dateAdded,
  activities,
  statusHistory,
}: {
  dateAdded: string | null;
  activities: Activity[];
  statusHistory: CompanyStatusHistory[];
}) {
  const events: TimelineEvent[] = [];

  if (dateAdded) {
    events.push({ date: dateAdded, kind: "created", label: "First contact — added to CRM", color: "#152238" });
  }

  activities.forEach((a) => {
    events.push({
      date: a.activity_date,
      kind: "activity",
      label: a.activity_type,
      detail: a.notes ?? undefined,
      color: ACTIVITY_COLORS[a.activity_type] ?? "#9CA9BB",
    });
  });

  statusHistory.forEach((h) => {
    events.push({
      date: h.changed_at,
      kind: "status",
      label: `Status changed${h.from_status ? ` from ${h.from_status}` : ""} to ${h.to_status}`,
      color: h.to_status === "Customer" ? "#22C55E" : "#5B7290",
    });
  });

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (events.length === 0) {
    return <p className="text-sm text-manifest-navy-400">Nothing logged yet.</p>;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-manifest-line" />
      <div className="space-y-5">
        {events.map((e, i) => (
          <div key={i} className="relative">
            <span
              className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ backgroundColor: e.color }}
            />
            <div className="text-xs font-mono text-manifest-navy-400">
              {format(new Date(e.date), "MMM d, yyyy · h:mm a")}
            </div>
            <div className="text-sm font-medium text-manifest-navy-800">{e.label}</div>
            {e.detail && <p className="text-sm text-manifest-navy-500 mt-0.5">{e.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
