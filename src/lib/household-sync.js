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
    { key: "aiApiKey", apply: (v, set) => {
      if (v && set) set(v);
    } }
  ];
  function useHouseholdData({ household, values, setters }) {
    const [status, setStatus] = useState("idle");
    const [msg, setMsg] = useState("");
    const initialized = useRef(false);
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
      HOUSEHOLD_SYNCED_FIELDS.forEach(({ key, apply }) => apply(d[key], setters[key]));
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
        applyPayload(payload);
        initialized.current = true;
        setStatus("ok");
        setMsg("Synced " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
        return true;
      } catch (e) {
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
        if (newSavedAt) lastSavedAtRef.current = newSavedAt;
        await syncReceipts();
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
        setStatus("error");
        setMsg("❌ " + e.message);
        return false;
      }
    }, [household, buildPayload, syncReceipts, loadData]);
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
      saveTimer.current = setTimeout(() => saveData(true), 2e3);
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
      values.aiApiKey
    ]);
    return { status, msg, saveData, loadData };
  }
