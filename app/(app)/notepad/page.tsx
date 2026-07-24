import { createClient } from "@/lib/supabase/server";
import NotepadApp from "@/components/notepad/NotepadApp";
import type { NotepadEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotepadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entries }, { data: freeform }] = await Promise.all([
    user
      ? supabase
          .from("notepad_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as NotepadEntry[] }),
    user
      ? supabase.from("notepad_freeform").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mb-1">Notepad</h1>
      <p className="text-sm text-manifest-navy-400 mb-6">
        Personal scratchpad — only visible to you, not shared with the rest of the team.
      </p>

      <NotepadApp
        initialEntries={(entries as NotepadEntry[]) ?? []}
        initialFreeform={freeform?.content ?? ""}
      />
    </div>
  );
}
