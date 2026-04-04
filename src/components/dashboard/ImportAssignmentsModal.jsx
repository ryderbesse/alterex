import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function ImportAssignmentsModal({ open, onClose, onImported }) {
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    base44.functions.invoke("googleClassroom", { action: "fetch_assignments" })
      .then((res) => {
        const items = res.data?.assignments || [];
        setAvailable(items);
        // Pre-check all by default
        setSelected(new Set(items.map((a) => a.id)));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map((a) => a.id)));
    }
  };

  const handleImport = async () => {
    setImporting(true);
    const ids = Array.from(selected);
    const res = await base44.functions.invoke("googleClassroom", {
      action: "import_selected",
      assignment_ids: ids
    });
    setImporting(false);
    onImported(res.data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Select Assignments to Import</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Fetching assignments…
          </div>
        ) : available.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No new assignments found.</p>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 mb-2">
              <button
                onClick={toggleAll}
                className="text-xs text-violet-600 hover:underline"
              >
                {selected.size === available.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-xs text-gray-400">{selected.size} / {available.length} selected</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200">
              {available.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selected.has(a.id)}
                    onCheckedChange={() => toggle(a.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.course_name}</p>
                  </div>
                  {a.due_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(a.due_date), "MMM d")}
                    </div>
                  )}
                </label>
              ))}
            </div>

            <Button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="w-full mt-2 gap-2"
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              Import Selected ({selected.size})
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}