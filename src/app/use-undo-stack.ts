import { useCallback, useEffect, useRef, useState } from "../lib/runtime.js";
  // The undo toast's stack: each entry a label and the function that puts
  // things back. Moved out of App as is.
  export function useUndoStack() {
    const [undoStack, setUndoStack] = useState([]);
    // An undoable action is a label for the toast plus the function that puts
    // things back.
    //
    // The stack used to hold the deleted *entry*, and App knew how to restore
    // one — which meant entry deletion was the only action that could ever
    // offer undo. Everything else destructive (removing a category, removing
    // a budget year, "Reset Targets to Actuals", restoring a backup over your
    // data) committed immediately with no way back, having taught the user
    // through the one case that destructive things here are recoverable.
    // Holding the revert instead puts that knowledge with the caller, which
    // is the only place that knows what it just changed.
    const pushUndo = useCallback((label, revert) => {
      setUndoStack((prev) => [...prev.slice(-9), { label, revert }]);
    }, []);
    // The global shortcut handler mounts once; without this it would close
    // over an empty stack forever.
    const undoStackRef = useRef([]);
    useEffect(() => {
      undoStackRef.current = undoStack;
    }, [undoStack]);
    const undoLast = useCallback(() => {
      setUndoStack((prev) => {
        if (!prev.length) return prev;
        return prev.slice(0, -1);
      });
    }, []);
  const clearUndo = useCallback(() => setUndoStack([]), []);
  return { undoStack, pushUndo, undoStackRef, undoLast, clearUndo };
  }
