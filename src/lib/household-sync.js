  // ── Centralized Supabase auth calls ────────────────────────────────
  // Every supabase.auth touchpoint lives in this file (these helpers plus
  // useHousehold below); components never call supabaseClient directly.
  async function sbSignIn(email, password) {
    if (!supabaseClient) throw new Error("Supabase isn't configured yet.");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function sbSignUp(email, password) {
    if (!supabaseClient) throw new Error("Supabase isn't configured yet.");
    const { error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
  }
  async function sbResetPassword(email) {
    if (!supabaseClient) throw new Error("Supabase isn't configured yet.");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
  }
  // Verify the current password by re-authenticating, then set the new one.
  async function sbChangePassword(email, currentPassword, nextPassword) {
    try {
      await sbSignIn(email, currentPassword);
    } catch (e) {
      throw new Error("Current password is incorrect.");
    }
    const { error } = await supabaseClient.auth.updateUser({ password: nextPassword });
    if (error) throw error;
  }
  // localStorage keys behind HOUSEHOLD_SYNCED_FIELDS below (the useLS key for
  // each synced field, from App.js) plus the per-year AI report cache. On a
  // shared device, HOUSEHOLD_SYNCED_FIELDS' apply() only overwrites a field
  // when the newly-loaded household actually has a truthy value for it — so
  // without clearing these first, a second household signing in on the same
  // device would inherit any field the first household's save happened not to
  // set, i.e. the previous household's leftover financial data. Device-level
  // prefs that aren't household-scoped (lock timeout, saved email, biometric
  // credential, swipe-coach dismissal) are deliberately left alone.
  const HOUSEHOLD_LOCAL_STORAGE_KEYS = [
    "cf_entries", "cf_overrides", "cf_years", "cf_categories", "cf_category_colors",
    "cf_activeYear", "cf_alertThresh", "cf_darkMode", "cf_forecastHorizon", "cf_col_order",
    "cf_reg_filter", "cf_reg_filter_cats", "cf_reg_filter_scheds", "cf_reg_filter_status",
    "cf_budgtargets", "cf_templates", "cf_completed", "cf_goals",
    "cf_dash_hidden", "cf_dash_order", "cf_debt_data", "cf_deleted_copy_ids"
  ];
  function clearHouseholdLocalState() {
    try {
      HOUSEHOLD_LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      Object.keys(localStorage).filter((k) => k.startsWith("cf_ai_report_")).forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      // Storage can throw outright in private/partitioned modes. Nothing
      // here is essential to the current interaction, so a failure is
      // genuinely ignorable — real save failures surface via
      // notifyStorageWriteFailure.
    }
  }
  function useHousehold() {
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [household, setHousehold] = useState(null);
    const [members, setMembers] = useState([]);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const refreshMembership = useCallback(async (uid) => {
      if (!supabaseClient) return;
      setMembershipLoading(true);
      try {
        const { data: myRow } = await supabaseClient.from("household_members").select("household_id").eq("user_id", uid).limit(1).maybeSingle();
        if (!myRow) {
          setHousehold(null);
          setMembers([]);
          return;
        }
        const [{ data: hh }, { data: mem }] = await Promise.all([
          supabaseClient.from("households").select("id, name").eq("id", myRow.household_id).maybeSingle(),
          supabaseClient.from("household_members").select("user_id, full_name, disabled, role, joined_at").eq("household_id", myRow.household_id).order("joined_at")
        ]);
        setHousehold(hh || { id: myRow.household_id, name: "My Household" });
        setMembers(mem || []);
      } finally {
        setMembershipLoading(false);
      }
    }, []);
    useEffect(() => {
      if (!supabaseClient) {
        setAuthLoading(false);
        setMembershipLoading(false);
        return;
      }
      supabaseClient.auth.getSession().then(({ data }) => {
        setSession(data.session || null);
        setAuthLoading(false);
        if (data.session) refreshMembership(data.session.user.id);
        else setMembershipLoading(false);
      });
      const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
        if (sess) {
          refreshMembership(sess.user.id);
        } else {
          setHousehold(null);
          setMembers([]);
          setMembershipLoading(false);
        }
      });
      return () => {
        var _a;
        (_a = sub == null ? void 0 : sub.subscription) == null ? void 0 : _a.unsubscribe();
      };
    }, [refreshMembership]);
    const createHousehold = useCallback(async (fullName) => {
      if (!supabaseClient) throw new Error("Supabase isn't configured yet.");
      const { error } = await supabaseClient.rpc("create_household", { p_full_name: fullName || "" });
      if (error) throw error;
      if (session) await refreshMembership(session.user.id);
    }, [session, refreshMembership]);
    const joinHousehold = useCallback(async (code, fullName) => {
      if (!supabaseClient) throw new Error("Supabase isn't configured yet.");
      const { error } = await supabaseClient.rpc("join_household", { p_code: code, p_full_name: fullName || "" });
      if (error) throw error;
      if (session) await refreshMembership(session.user.id);
    }, [session, refreshMembership]);
    const createInvite = useCallback(async () => {
      if (!supabaseClient) throw new Error("Supabase isn't configured yet.");
      const { data, error } = await supabaseClient.rpc("create_invite");
      if (error) throw error;
      return data;
    }, []);
    const setMemberDisabled = useCallback(async (userId, disabled) => {
      if (!supabaseClient || !household || !session) return;
      const { error } = await supabaseClient.from("household_members").update({ disabled }).eq("household_id", household.id).eq("user_id", userId);
      if (error) throw error;
      await refreshMembership(session.user.id);
    }, [household, session, refreshMembership]);
    const updateMyName = useCallback(async (fullName) => {
      if (!supabaseClient || !household || !session) return;
      const { error } = await supabaseClient.from("household_members").update({ full_name: fullName }).eq("household_id", household.id).eq("user_id", session.user.id);
      if (error) throw error;
      await refreshMembership(session.user.id);
    }, [household, session, refreshMembership]);
    // Rename any member row. RLS allows your own row always and other rows
    // only for the owner — a silently-filtered update returns zero rows, which
    // we surface as a permission error instead of a fake success.
    const updateMemberName = useCallback(async (userId, fullName) => {
      if (!supabaseClient || !household || !session) return;
      const { data, error } = await supabaseClient.from("household_members").update({ full_name: fullName }).eq("household_id", household.id).eq("user_id", userId).select("user_id");
      if (error) throw error;
      if (!data || !data.length) throw new Error("Only the household owner can rename other members.");
      await refreshMembership(session.user.id);
    }, [household, session, refreshMembership]);
    const signOut = useCallback(async () => {
      if (!supabaseClient) return;
      await supabaseClient.auth.signOut();
      clearHouseholdLocalState();
    }, []);
    return {
      configured: !!supabaseClient,
      session,
      authLoading,
      household,
      members,
      membershipLoading,
      createHousehold,
      joinHousehold,
      createInvite,
      setMemberDisabled,
      updateMemberName,
      updateMyName,
      signOut
    };
  }
  // Every field synced between App state and the household's Supabase row.
  // Both directions — load (apply server data to state) and save (build the
  // payload to send) — read from this single list instead of two
  // hand-written ones that could silently drift apart (a field added to one
  // and forgotten in the other was exactly the class of bug this closes).
  // Adding a new synced setting: one useLS() in App.js, one property each in
  // the `values`/`setters` objects at the useHouseholdData call site, one
  // name in the debounce effect's dependency list there, and one entry here.
  // Each `apply` is a direct, unchanged transcription of the validation that
  // previously lived inline in applyPayload — legacy/malformed data (an old
  // backup, an older app version's payload) is still guarded exactly as
  // before, just declared once instead of duplicated across apply/build.
  // Deliberately NOT in this list: aiApiKey. It's a personal credential with
  // the holder's own billing behind it, and household_settings is readable by
  // every member — syncing it handed your API key to everyone you share a
  // budget with. It now lives only in this device's localStorage; enter it
  // per device. cf_ai_key is likewise absent from HOUSEHOLD_LOCAL_STORAGE_KEYS
  // above for the same reason: it isn't the household's to clear.
  const HOUSEHOLD_SYNCED_FIELDS = [
    { key: "entries", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "overridesByYr", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "yearConfigs", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "categories", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "categoryColors", apply: (v, set) => {
      if (v && typeof v === "object") set(v);
    } },
    { key: "activeYear", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "alertThreshold", apply: (v, set) => {
      if (v != null) set(v);
    } },
    { key: "darkMode", apply: (v, set) => {
      if (v != null) set(v);
    } },
    { key: "forecastHorizon", apply: (v, set) => {
      if (v != null) set(v);
    } },
    { key: "goals", apply: (v, set) => {
      if (Array.isArray(v)) set(v);
    } },
    { key: "dashHidden", apply: (v, set) => {
      if (v && typeof v === "object") set(v);
    } },
    { key: "dashOrder", apply: (v, set) => {
      if (Array.isArray(v)) set(v);
    } },
    { key: "colOrder", apply: (v, set) => {
      if (Array.isArray(v) && v.length > 1) set(v.filter((c) => c !== "actions"));
    } },
    { key: "regFilter", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "regFilterCats", apply: (v, set) => {
      if (Array.isArray(v)) set(v);
    } },
    { key: "regFilterScheds", apply: (v, set) => {
      if (Array.isArray(v)) set(v);
    } },
    { key: "regFilterStatus", apply: (v, set) => {
      if (Array.isArray(v)) set(v);
    } },
    { key: "budgetTargets", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "templates", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "completed", apply: (v, set) => {
      if (v) set(v);
    } },
    { key: "debtData", apply: (v, set) => {
      if (v && typeof v === "object") set(v);
    } },
    { key: "deletedCopyIds", apply: (v, set) => {
      if (v && typeof v === "object") set(v);
    } }
  ];
  // Edits that never reached the server. The service worker means the app
  // loads and is fully usable offline, so this is a real state to be in — and
  // previously a silent data-loss one: a failed load left autosave disabled,
  // the edits lived only in localStorage, and the next successful load
  // overwrote them from the server without a word.
  //
  // Two markers, both persisted so they survive the tab being closed:
  //   cf_unsaved_since  — set when a save fails or an edit happens while
  //                       autosave is disabled; cleared on a successful save.
  //   cf_last_synced_at — the payload savedAt this device last agreed with.
  //                       Comparing it to the server's tells us whether the
  //                       cloud moved on while we were away, which is the
  //                       difference between "safe to push" and "ask the user".
  const UNSAVED_KEY = "cf_unsaved_since";
  const SYNCED_AT_KEY = "cf_last_synced_at";
  const readMarker = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const writeMarker = (k, v) => {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {
      // Storage can throw outright in private/partitioned modes. Nothing
      // here is essential to the current interaction, so a failure is
      // genuinely ignorable — real save failures surface via
      // notifyStorageWriteFailure.
    }
  };

  function useHouseholdData({ household, values, setters }) {
    const [status, setStatus] = useState("idle");
    const [msg, setMsg] = useState("");
    // True when this device is holding edits the server hasn't got.
    const [unsaved, setUnsaved] = useState(() => !!readMarker(UNSAVED_KEY));
    // Set when *both* sides changed independently — there's no safe automatic
    // answer, so the user picks. Holds the server copy while they decide.
    const [divergence, setDivergence] = useState(null);
    const initialized = useRef(false);
    const loadAttempted = useRef(false);
    const markUnsaved = useCallback(() => {
      if (!readMarker(UNSAVED_KEY)) writeMarker(UNSAVED_KEY, (/* @__PURE__ */ new Date()).toISOString());
      setUnsaved(true);
    }, []);
    const clearUnsaved = useCallback(() => {
      writeMarker(UNSAVED_KEY, null);
      setUnsaved(false);
    }, []);
    const saveTimer = useRef(null);
    const lastLoadedHousehold = useRef(null);
    // ownerKey ('override:<year>:<occId>') -> data URL, mirroring what the
    // receipts table holds server-side. Used to diff on save so only
    // added/changed/removed images travel over the network. Receipts are
    // strictly per-occurrence; entry-level attachments no longer exist.
    const receiptCache = useRef({});
    // The `savedAt` this device last loaded from the server — sent back on
    // every save so the server can detect a concurrent save from another
    // device/member and reject instead of silently overwriting it (AR2).
    const lastSavedAtRef = useRef(null);
    const applyPayload = useCallback((d) => {
      if (!d) return;
      // Money is cents from schema v8 on; a payload saved by an older,
      // un-migrated client (another device that hasn't reloaded yet) is
      // still dollars and needs upgrading before it reaches app state.
      const data = (d.schemaVersion || 0) < SCHEMA_VERSION ? centsifyHouseholdPayload(d) : d;
      HOUSEHOLD_SYNCED_FIELDS.forEach(({ key, apply }) => apply(data[key], setters[key]));
    }, [setters]);
    // Receipt images live in the receipts table as binary blobs, not inside the
    // save payload — the payload only carries the rest of each entry/override.
    const stripAttachments = (list) => (list || []).map((e) => {
      if (!e || e.attachment === void 0) return e;
      const copy = Object.assign({}, e);
      delete copy.attachment;
      return copy;
    });
    const stripOverrideAttachments = (byYr) => {
      const out = {};
      Object.keys(byYr || {}).forEach((year) => {
        const yOvs = byYr[year] || {};
        out[year] = {};
        Object.keys(yOvs).forEach((k) => {
          const o = yOvs[k];
          if (o && o.attachment !== void 0) {
            const copy = Object.assign({}, o);
            delete copy.attachment;
            out[year][k] = copy;
          } else {
            out[year][k] = o;
          }
        });
      });
      return out;
    };
    const collectAttachments = useCallback(() => {
      const map = {};
      Object.keys(values.overridesByYr || {}).forEach((year) => {
        const yOvs = values.overridesByYr[year] || {};
        Object.keys(yOvs).forEach((k) => {
          if (yOvs[k] && yOvs[k].attachment) map["override:" + year + ":" + k] = yOvs[k].attachment;
        });
      });
      return map;
    }, [values.overridesByYr]);
    const buildPayload = useCallback(() => {
      const out = {};
      HOUSEHOLD_SYNCED_FIELDS.forEach(({ key }) => {
        out[key] = values[key];
      });
      out.entries = stripAttachments(out.entries);
      out.overridesByYr = stripOverrideAttachments(out.overridesByYr);
      out.schemaVersion = SCHEMA_VERSION;
      out.savedAt = (/* @__PURE__ */ new Date()).toISOString();
      return out;
    }, [values]);
    const loadData = useCallback(async () => {
      if (!supabaseClient || !household) return false;
      // Flush any pending debounced save first — otherwise a pull-to-refresh
      // or "Reload from Cloud" inside the 2s autosave window silently
      // overwrites the just-made local edit with the server copy.
      if (saveTimer.current && initialized.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        await saveDataRef.current(true);
      }
      setStatus("syncing");
      setMsg("Loading…");
      try {
        const { data, error } = await supabaseClient.rpc("load_household");
        if (error) throw error;
        const payload = (data && data.data) || {};
        lastSavedAtRef.current = payload.savedAt || null;
        const receipts = (data && data.receipts) || [];
        const rmap = {};
        receipts.forEach((r) => {
          if (r && r.ownerKey && r.b64) rmap[r.ownerKey] = "data:" + (r.mime || "image/jpeg") + ";base64," + r.b64;
        });
        receiptCache.current = Object.assign({}, rmap);
        // Re-attach receipt images to the occurrences they belong to so the
        // rest of the app keeps seeing plain `attachment` data URLs.
        if (payload.overridesByYr && typeof payload.overridesByYr === "object") {
          Object.keys(payload.overridesByYr).forEach((year) => {
            const yOvs = payload.overridesByYr[year] || {};
            Object.keys(yOvs).forEach((k) => {
              const src = rmap["override:" + year + ":" + k];
              if (src) yOvs[k] = Object.assign({}, yOvs[k], { attachment: src });
            });
          });
        }
        // Unsaved local edits must never be silently overwritten by the
        // server copy. Which resolution is safe depends on whether the cloud
        // moved on while this device was offline.
        if (readMarker(UNSAVED_KEY)) {
          const serverSavedAt = payload.savedAt || null;
          const lastAgreed = readMarker(SYNCED_AT_KEY);
          if (!serverSavedAt || serverSavedAt === lastAgreed) {
            // Nobody else changed anything — this device's copy is simply the
            // newer one. Push it instead of applying the older server state.
            initialized.current = true;
            const pushed = await saveDataRef.current(true);
            if (pushed) {
              toast("Synced the changes you made while offline.");
              return true;
            }
            // Still can't reach the server: keep local state as-is rather
            // than replacing it with a copy we know is stale.
            setStatus("error");
            setMsg("⚠ Unsaved changes on this device — will retry");
            return false;
          }
          // Both sides moved. There is no correct automatic answer, so stop
          // and let the user choose; local state is left untouched meanwhile.
          loadAttempted.current = true;
          setDivergence({ payload, rmap });
          setStatus("error");
          setMsg("⚠ Unsaved changes here and newer changes in the cloud");
          return false;
        }
        applyPayload(payload);
        writeMarker(SYNCED_AT_KEY, payload.savedAt || null);
        initialized.current = true;
        loadAttempted.current = true;
        setStatus("ok");
        setMsg("Synced " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
        return true;
      } catch (e) {
        loadAttempted.current = true;
        setStatus("error");
        setMsg("❌ " + e.message + (/load_household/.test(e.message || "") ? " — run supabase/schema.sql in your Supabase SQL editor to update the database." : ""));
        return false;
      }
    }, [household, applyPayload]);
    const syncReceipts = useCallback(async () => {
      const current = collectAttachments();
      const cached = receiptCache.current;
      const parse = (dataUrl) => {
        const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl || "");
        return m ? { mime: m[1], b64: m[2] } : null;
      };
      for (const key of Object.keys(current)) {
        if (cached[key] === current[key]) continue;
        const img = parse(current[key]);
        if (!img) continue;
        const { error } = await supabaseClient.rpc("put_receipt", { p_owner_key: key, p_mime: img.mime, p_b64: img.b64 });
        if (error) throw error;
        cached[key] = current[key];
      }
      for (const key of Object.keys(cached)) {
        if (current[key]) continue;
        const { error } = await supabaseClient.rpc("delete_receipt", { p_owner_key: key });
        if (error) throw error;
        delete cached[key];
      }
    }, [collectAttachments]);
    const saveData = useCallback(async (silent = false) => {
      if (!supabaseClient || !household) return false;
      if (!silent) setStatus("syncing");
      try {
        const payload = buildPayload();
        const { data: newSavedAt, error } = await supabaseClient.rpc("save_household", {
          p_data: payload,
          p_expected_saved_at: lastSavedAtRef.current
        });
        if (error) throw error;
        if (newSavedAt) {
          lastSavedAtRef.current = newSavedAt;
          writeMarker(SYNCED_AT_KEY, newSavedAt);
        }
        await syncReceipts();
        clearUnsaved();
        setStatus("ok");
        setMsg("Saved " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
        return true;
      } catch (e) {
        // Another member's save landed since this device last loaded —
        // pull their version instead of silently clobbering it, and say so.
        if (/^CONFLICT:/.test(e.message || "")) {
          setStatus("error");
          setMsg("⚠ Updated on another device — reloading the latest version…");
          await loadData();
          toast("Another device saved changes to this household — reloaded the latest version. Please redo your last change if it's missing.", "error");
          return false;
        }
        // Anything else (offline, server down, transient network) leaves the
        // edits on this device only. Remember that, so a later load can't
        // quietly overwrite them and a reconnect can retry.
        markUnsaved();
        setStatus("error");
        setMsg("❌ " + e.message);
        return false;
      }
    }, [household, buildPayload, syncReceipts, loadData, clearUnsaved, markUnsaved]);
    // loadData is declared before saveData, so it reaches the latest saveData
    // through a ref (also keeps loadData's identity stable across payload edits).
    const saveDataRef = useRef(saveData);
    useEffect(() => {
      saveDataRef.current = saveData;
    }, [saveData]);
    useEffect(() => {
      if (!household) {
        lastLoadedHousehold.current = null;
        initialized.current = false;
        receiptCache.current = {};
        lastSavedAtRef.current = null;
        return;
      }
      if (lastLoadedHousehold.current === household.id) return;
      lastLoadedHousehold.current = household.id;
      initialized.current = false;
      // Autosave stays disabled until a load succeeds (loadData flips
      // `initialized` on success) — saving after a failed load would overwrite
      // the household with this device's (possibly empty) local state. A manual
      // "Reload from Cloud" retries and re-enables autosave when it succeeds.
      loadData().then((ok) => {
        if (!ok) lastLoadedHousehold.current = null;
      });
    }, [household, loadData]);
    useEffect(() => {
      if (!household || !initialized.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        saveData(true);
      }, 2e3);
      return () => clearTimeout(saveTimer.current);
    }, [
      values.entries,
      values.overridesByYr,
      values.yearConfigs,
      values.categories,
      values.categoryColors,
      values.alertThreshold,
      values.darkMode,
      values.activeYear,
      values.budgetTargets,
      values.templates,
      values.completed,
      values.forecastHorizon,
      values.colOrder,
      values.regFilter,
      values.regFilterCats,
      values.regFilterScheds,
      values.regFilterStatus,
      values.goals,
      values.dashHidden,
      values.dashOrder,
      values.debtData,
      values.deletedCopyIds
    ]);
    // --- resolving a divergence -------------------------------------------
    // Deliberately only reachable from an explicit user choice; nothing here
    // runs automatically, because either branch discards somebody's work.
    const keepLocalChanges = useCallback(async () => {
      if (!divergence) return;
      // Adopt the server's savedAt so the conflict check passes — we are
      // knowingly overwriting it.
      lastSavedAtRef.current = divergence.payload.savedAt || null;
      initialized.current = true;
      setDivergence(null);
      const ok = await saveDataRef.current(false);
      if (ok) toast("This device's version is now the shared one.");
    }, [divergence]);
    const discardLocalChanges = useCallback(() => {
      if (!divergence) return;
      const { payload, rmap } = divergence;
      receiptCache.current = Object.assign({}, rmap);
      if (payload.overridesByYr && typeof payload.overridesByYr === "object") {
        Object.keys(payload.overridesByYr).forEach((year) => {
          const yOvs = payload.overridesByYr[year] || {};
          Object.keys(yOvs).forEach((k) => {
            const src = rmap["override:" + year + ":" + k];
            if (src) yOvs[k] = Object.assign({}, yOvs[k], { attachment: src });
          });
        });
      }
      applyPayload(payload);
      lastSavedAtRef.current = payload.savedAt || null;
      writeMarker(SYNCED_AT_KEY, payload.savedAt || null);
      clearUnsaved();
      initialized.current = true;
      setDivergence(null);
      setStatus("ok");
      setMsg("Synced " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
      toast("Using the cloud version. This device's unsaved changes were discarded.", "error");
    }, [divergence, applyPayload, clearUnsaved]);

    // Retry whenever the device plausibly has connectivity again. Without
    // this, a save that failed offline was never attempted again until the
    // user happened to make another edit.
    useEffect(() => {
      if (!household) return;
      const retry = () => {
        if (!readMarker(UNSAVED_KEY) || divergence) return;
        try {
          if (navigator.onLine === false) return;
        } catch (e) {
          // Some browsers don't expose onLine; assume we're online and let
          // the request decide.
        }
        if (initialized.current) saveDataRef.current(true);
        else loadData();
      };
      const onVisible = () => {
        if (document.visibilityState === "visible") retry();
      };
      window.addEventListener("online", retry);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("online", retry);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }, [household, loadData, divergence]);

    // Edits made while autosave is disabled (i.e. the initial load failed) are
    // the exact case that used to vanish. Nothing will try to save them until
    // connectivity returns, so record that they exist.
    useEffect(() => {
      if (!household || !loadAttempted.current || initialized.current) return;
      markUnsaved();
    }, [household, markUnsaved, values.entries, values.overridesByYr, values.yearConfigs, values.completed, values.goals, values.budgetTargets]);

    return { status, msg, saveData, loadData, unsaved, divergence, keepLocalChanges, discardLocalChanges };
  }
