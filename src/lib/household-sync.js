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
      updateMyName,
      signOut
    };
  }
  function useHouseholdData({
    household,
    entries,
    setEntries,
    overridesByYr,
    setOverridesByYr,
    yearConfigs,
    setYearConfigs,
    budgetTargets,
    setBudgetTargets,
    templates,
    setTemplates,
    completed,
    setCompleted,
    goals = [],
    setGoals = () => {
    },
    dashHidden = {},
    setDashHidden = () => {
    },
    dashOrder = [],
    setDashOrder = () => {
    },
    categories,
    setCategories,
    categoryColors = {},
    setCategoryColors = () => {
    },
    activeYear,
    setActiveYear,
    alertThreshold,
    setAlertThreshold,
    darkMode,
    setDarkMode,
    forecastHorizon = 90,
    setForecastHorizon = () => {
    },
    colOrder = [],
    setColOrder = () => {
    },
    regFilter = "all",
    setRegFilter = () => {
    },
    regFilterCats = [],
    setRegFilterCats = () => {
    },
    regFilterScheds = [],
    setRegFilterScheds = () => {
    },
    regFilterStatus = [],
    setRegFilterStatus = () => {
    },
    aiApiKey = "",
    setAiApiKey
  }) {
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
    const applyPayload = useCallback((d) => {
      if (!d) return;
      if (d.entries) setEntries(d.entries);
      if (d.overridesByYr) setOverridesByYr(d.overridesByYr);
      if (d.yearConfigs) setYearConfigs(d.yearConfigs);
      if (d.categories) setCategories(d.categories);
      if (d.categoryColors && typeof d.categoryColors === "object") setCategoryColors(d.categoryColors);
      if (d.activeYear) setActiveYear(d.activeYear);
      if (d.alertThreshold != null) setAlertThreshold(d.alertThreshold);
      if (d.darkMode != null) setDarkMode(d.darkMode);
      if (d.forecastHorizon != null) setForecastHorizon(d.forecastHorizon);
      if (Array.isArray(d.goals)) setGoals(d.goals);
      if (d.dashHidden && typeof d.dashHidden === "object") setDashHidden(d.dashHidden);
      if (Array.isArray(d.dashOrder)) setDashOrder(d.dashOrder);
      if (Array.isArray(d.colOrder) && d.colOrder.length > 1) setColOrder(d.colOrder.filter((c) => c !== "actions"));
      if (d.regFilter) setRegFilter(d.regFilter);
      if (Array.isArray(d.regFilterCats)) setRegFilterCats(d.regFilterCats);
      if (Array.isArray(d.regFilterScheds)) setRegFilterScheds(d.regFilterScheds);
      if (Array.isArray(d.regFilterStatus)) setRegFilterStatus(d.regFilterStatus);
      if (d.budgetTargets) setBudgetTargets(d.budgetTargets);
      if (d.templates) setTemplates(d.templates);
      if (d.completed) setCompleted(d.completed);
      if (d.aiApiKey && setAiApiKey) setAiApiKey(d.aiApiKey);
    }, [setEntries, setOverridesByYr, setYearConfigs, setCategories, setCategoryColors, setActiveYear, setAlertThreshold, setDarkMode, setForecastHorizon, setGoals, setDashHidden, setDashOrder, setColOrder, setRegFilter, setRegFilterCats, setRegFilterScheds, setRegFilterStatus, setBudgetTargets, setTemplates, setCompleted, setAiApiKey]);
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
      Object.keys(overridesByYr || {}).forEach((year) => {
        const yOvs = overridesByYr[year] || {};
        Object.keys(yOvs).forEach((k) => {
          if (yOvs[k] && yOvs[k].attachment) map["override:" + year + ":" + k] = yOvs[k].attachment;
        });
      });
      return map;
    }, [overridesByYr]);
    const buildPayload = useCallback(() => ({
      entries: stripAttachments(entries),
      overridesByYr: stripOverrideAttachments(overridesByYr),
      yearConfigs,
      categories,
      categoryColors,
      budgetTargets,
      templates,
      completed,
      activeYear,
      alertThreshold,
      darkMode,
      forecastHorizon,
      colOrder,
      regFilter,
      regFilterCats,
      regFilterScheds,
      regFilterStatus,
      goals,
      dashHidden,
      dashOrder,
      aiApiKey,
      schemaVersion: SCHEMA_VERSION,
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
    }), [entries, overridesByYr, yearConfigs, categories, categoryColors, budgetTargets, templates, completed, activeYear, alertThreshold, darkMode, forecastHorizon, colOrder, regFilter, regFilterCats, regFilterScheds, regFilterStatus, goals, dashHidden, dashOrder, aiApiKey]);
    const loadData = useCallback(async () => {
      if (!supabaseClient || !household) return false;
      setStatus("syncing");
      setMsg("Loading…");
      try {
        const { data, error } = await supabaseClient.rpc("load_household");
        if (error) throw error;
        const payload = (data && data.data) || {};
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
        const { error } = await supabaseClient.rpc("save_household", { p_data: payload });
        if (error) throw error;
        await syncReceipts();
        setStatus("ok");
        setMsg("Saved " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
        return true;
      } catch (e) {
        setStatus("error");
        setMsg("❌ " + e.message);
        return false;
      }
    }, [household, buildPayload, syncReceipts]);
    useEffect(() => {
      if (!household) {
        lastLoadedHousehold.current = null;
        initialized.current = false;
        receiptCache.current = {};
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
      entries,
      overridesByYr,
      yearConfigs,
      categories,
      categoryColors,
      alertThreshold,
      darkMode,
      activeYear,
      budgetTargets,
      templates,
      completed,
      forecastHorizon,
      colOrder,
      regFilter,
      regFilterCats,
      regFilterScheds,
      regFilterStatus,
      goals,
      dashHidden,
      dashOrder,
      aiApiKey
    ]);
    return { status, msg, saveData, loadData };
  }
