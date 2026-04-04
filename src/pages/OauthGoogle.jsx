import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function OauthGoogle() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const stateParam = params.get("state"); // classId or "global" or undefined

    if (!code) {
      setError("No authorization code found.");
      return;
    }

    // Determine class_folder_id from state param or localStorage fallback
    let classFolderId = null;
    if (stateParam && stateParam !== "global" && stateParam !== "undefined") {
      classFolderId = stateParam;
    } else {
      const stored = localStorage.getItem("class_folder_id");
      if (stored && stored !== "null") classFolderId = stored;
    }

    const isGlobal = !classFolderId;

    base44.functions.invoke("googleClassroom", {
      action: "exchange_code",
      code,
      class_folder_id: classFolderId || null
    }).then(() => {
      localStorage.removeItem("class_folder_id");
      localStorage.removeItem("gc_pending_class");
      localStorage.removeItem("gc_global_connect");
      // Clear the gc_banner_dismissed so the banner knows we're now connected
      localStorage.removeItem("gc_banner_dismissed");

      if (isGlobal) {
        // Redirect to Settings to show connected status
        window.location.href = createPageUrl("Settings");
      } else {
        window.location.href = createPageUrl(`ClassDetail?id=${classFolderId}&gc_connected=1`);
      }
    }).catch((err) => {
      console.error("Google Classroom OAuth error:", err);
      setError("Failed to connect Google Classroom. Please try again.");
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-base">
          {error || "Connecting Google Classroom…"}
        </p>
      </div>
    </div>
  );
}