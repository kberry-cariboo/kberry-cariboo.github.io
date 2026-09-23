import { safeStorage, useEffect, useState } from "../lib/runtime.js";
import { exportHouseholdBackup } from "../lib/household-sync.js";
  // The 30-day "time for a backup" reminder. Moved out of App as is.
  export function useBackupNudge(houseValues) {
    const [showBackupNudge, setShowBackupNudge] = useState(false);
    useEffect(() => {
      try {
        const last = localStorage.getItem("cf_last_backup");
        const daysSince = last ? Math.floor((Date.now() - parseInt(last)) / 864e5) : 999;
        if (daysSince >= 30) setTimeout(() => setShowBackupNudge(true), 5e3);
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    }, []);
    const dismissBackup = (doExport = false) => {
      setShowBackupNudge(false);
      safeStorage.set("cf_last_backup", String(Date.now()));
      // The same file Settings → Backup makes, from the same builder.
      if (doExport) exportHouseholdBackup(houseValues);
    };
  return { showBackupNudge, dismissBackup };
  }
