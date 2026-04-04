import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, GraduationCap, RefreshCw, Download, Calendar, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import ImportAssignmentsModal from "@/components/dashboard/ImportAssignmentsModal";

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [hasImportedBefore, setHasImportedBefore] = useState(false);

  // Check connection on load
  useEffect(() => {
    base44.functions.invoke("googleClassroom", { action: "check_connection" })
      .then((res) => setIsConnected(res.data?.connected === true))
      .catch(() => setIsConnected(false));
  }, []);

  // Fetch imported assignments
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["dashboard_synced_assignments"],
    queryFn: () => base44.entities.SyncedAssignment.filter({ archived: false }, "-due_date"),
  });

  // Detect if any assignments have been imported before
  useEffect(() => {
    if (assignments.length > 0) setHasImportedBefore(true);
  }, [assignments]);

  const handleConnect = async () => {
    setConnecting(true);
    const res = await base44.functions.invoke("googleClassroom", { action: "start_auth" });
    window.location.href = res.data.authUrl;
  };

  const handleImported = ({ imported }) => {
    setImportMsg(`✓ ${imported} assignment${imported !== 1 ? "s" : ""} imported.`);
    setHasImportedBefore(true);
    refetchAssignments();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Google Classroom Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isConnected ? "bg-emerald-100" : "bg-gray-100"}`}>
              <GraduationCap className={`w-6 h-6 ${isConnected ? "text-emerald-600" : "text-gray-400"}`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-lg">Google Classroom</h2>
              {isConnected === null ? (
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking connection…
                </p>
              ) : isConnected ? (
                <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Google Classroom Connected
                </p>
              ) : (
                <p className="text-sm text-gray-400">Not connected</p>
              )}
            </div>
          </div>

          {isConnected === false && (
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
              Connect Google Classroom
            </Button>
          )}

          {isConnected === true && (
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => { setImportMsg(null); setShowModal(true); }}
                className="w-fit gap-2"
              >
                {hasImportedBefore ? <RefreshCw className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {hasImportedBefore ? "Sync Assignments" : "Import Assignments"}
              </Button>
              {importMsg && (
                <p className="text-sm font-medium text-emerald-600">{importMsg}</p>
              )}
            </div>
          )}
        </Card>

        <ImportAssignmentsModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onImported={handleImported}
        />

        {/* Assignments List */}
        {assignments.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-800 text-base mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-500" />
              Imported Assignments
              <span className="ml-auto text-sm font-normal text-gray-400">{assignments.length} total</span>
            </h3>
            <div className="divide-y divide-gray-100">
              {assignments.map((a) => (
                <div key={a.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{a.title}</p>
                    {a.google_course_id && (
                      <p className="text-xs text-gray-400 mt-0.5">Course: {a.google_course_id}</p>
                    )}
                  </div>
                  {a.due_date && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(a.due_date), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}