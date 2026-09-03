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
  // ── The one list of household data ─────────────────────────────────────────
  //
  // Every mechanism that has to know about a piece of household data derives
  // from this table: the localStorage key and default it loads with, the guard
  // that vets a value arriving from the cloud or a backup file, whether editing
  // it schedules a save, whether it belongs in a JSON export, and which keys to
  // clear when a second household signs in on the same device.
  //
  // It exists because adding one field used to mean editing ten hand-maintained
  // lists across three files plus the SQL, and missing any one of them failed
  // *silently*. Holidays shipped missing two of them: it wasn't in the autosave
  // dependency array, so editing a holiday on its own scheduled no save at all,
  // and it had no column in the payload function, so what did get sent was
  // dropped by the server without an error. Both looked completely wired.
  //
  // Adding a field is now one row here, and nothing else on the client:
  // useHouseholdState below creates its state from this table, so there is no
  // second list left to forget. App.js destructures the bindings it happens to
  // use, but that's local convenience — an undestructured field still syncs,
  // and a misspelt one is a ReferenceError rather than silence.
  //
  // The database declares the same set in cf_payload_keys() (supabase/schema.sql)
  // — it can't derive from this table, being SQL run by hand against Supabase —
  // so tests/payload-fields.mjs fails CI if the two ever disagree, and
  // cf_apply_household_payload refuses a payload key it has no column for
  // rather than dropping it. Adding a field here means adding it there too.
  //
  //   kind      how a value from the cloud or a backup file is vetted
  //     array     must be an array
  //     object    must be a non-null object
  //     value     must not be null/undefined (numbers, booleans)
  //     truthy    must be truthy (a year of 0 or an empty filter is not a value)
  //   apply     a custom guard, when one of the above won't do
  //   backup    goes into Settings → Export Backup, and is restored from one
  //
  // There is no "does editing this count as unsaved work" flag. There was one,
  // on seven of the twenty-eight fields, and the other twenty-one were the bug:
  // edit a category, a currency, the alert threshold, a holiday or a debt
  // figure while autosave is off (which is what a failed load leaves you with)
  // and nothing recorded that the device was holding work — so the next
  // successful load took the plain adoptLoaded path and replaced it, with no
  // prompt and no push. Every field in this table is a field the server is
  // supposed to have, so editing any of them is unsaved work.
  const HOUSEHOLD_FIELDS = [
    { key: "entries", storage: "cf_entries", initial: () => [], kind: "array", backup: true },
    { key: "overridesByYr", storage: "cf_overrides", initial: () => ({}), kind: "object", backup: true },
    { key: "yearConfigs", storage: "cf_years", initial: () => [{ year: (/* @__PURE__ */ new Date()).getFullYear(), openingBalance: 0 }], kind: "array", backup: true },
    { key: "categories", storage: "cf_categories", initial: () => DEFAULT_CATEGORIES, kind: "array", backup: true },
    { key: "categoryColors", storage: "cf_category_colors", initial: () => DEFAULT_CATEGORY_COLORS, kind: "object", backup: true },
    // The default must track the cf_years row above — a hardcoded year left
    // fresh installs pointed at an empty year once the calendar rolled over.
    { key: "activeYear", storage: "cf_activeYear", initial: () => (/* @__PURE__ */ new Date()).getFullYear(), kind: "truthy", backup: true },
    { key: "alertThreshold", storage: "cf_alertThresh", initial: () => DEFAULT_ALERT_THRESHOLD, kind: "value", backup: true },
    { key: "darkMode", storage: "cf_darkMode", initial: () => {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch (e) {
        return false;
      }
    }, kind: "value", backup: true },
    { key: "forecastHorizon", storage: "cf_forecastHorizon", initial: () => 90, kind: "value" },
    { key: "goals", storage: "cf_goals", initial: () => [], kind: "array", backup: true },
    { key: "dashHidden", storage: "cf_dash_hidden", initial: () => ({}), kind: "object" },
    { key: "dashOrder", storage: "cf_dash_order", initial: () => [], kind: "array" },
    // "actions" is a fixed trailing column, not a reorderable one: an older
    // payload that still lists it would otherwise reintroduce it.
    { key: "colOrder", storage: "cf_col_order", initial: () => DEFAULT_ENTRIES_COLS, apply: (v, set) => {
      if (Array.isArray(v) && v.length > 1) set(v.filter((c) => c !== "actions"));
    } },
    // The four Entries filters keep their old "cf_reg_filter"/"regFilter"
    // names on purpose: renaming a storage key or a payload field would
    // silently reset every existing user's saved filters, locally and in any
    // synced household, on upgrade. Only the in-code bindings in App.js were
    // renamed to the "entries" wording used everywhere else.
    { key: "regFilter", storage: "cf_reg_filter", initial: () => "all", kind: "truthy" },
    { key: "regFilterCats", storage: "cf_reg_filter_cats", initial: () => [], kind: "array" },
    { key: "regFilterScheds", storage: "cf_reg_filter_scheds", initial: () => [], kind: "array" },
    { key: "regFilterStatus", storage: "cf_reg_filter_status", initial: () => [], kind: "array" },
    { key: "budgetTargets", storage: "cf_budgtargets", initial: () => ({}), kind: "object", backup: true },
    { key: "templates", storage: "cf_templates", initial: () => [], kind: "array", backup: true },
    { key: "completed", storage: "cf_completed", initial: () => ({}), kind: "object", backup: true },
    { key: "debtData", storage: "cf_debt_data", initial: () => ({}), kind: "object", backup: true },
    // Tombstones for the year-copy sync: source-entry id -> true, recorded
    // whenever the user deletes a one-time entry that was itself a copy
    // (entry.copiedFrom set). Without this, re-running "Copy year -> year+1"
    // has no way to tell "never copied" apart from "copied, then the user
    // deliberately deleted it" — both just look like the target entry is
    // missing — and would resurrect the deleted copy on the next sync.
    { key: "deletedCopyIds", storage: "cf_deleted_copy_ids", initial: () => ({}), kind: "object", backup: true },
    // { [year]: { "YYYY-MM-DD": { name, optional, source } } } — the
    // household's own statutory-holiday list, managed in Settings. Empty until
    // someone edits a year or fetches one; every year without an entry falls
    // back to the rules in holidays.js. Household data like anything else:
    // corrected on one device, right on every device.
    { key: "holidays", storage: "cf_holidays", initial: () => ({}), kind: "object", backup: true },
    // Household-wide, not per-device: everyone sharing a budget has to see the
    // same figures in the same currency, and the statutory holidays that
    // decide when a payday lands are already household data (the `holidays`
    // table above).
    { key: "currency", storage: "cf_currency", initial: () => DEFAULT_CURRENCY, kind: "truthy", backup: true },
    { key: "locale", storage: "cf_locale", initial: () => DEFAULT_LOCALE, kind: "truthy", backup: true },
    { key: "holidayRegion", storage: "cf_holiday_region", initial: () => DEFAULT_HOLIDAY_REGION, kind: "truthy", backup: true },
    // What changed, who changed it, and when — reverse-chronological, newest
    // first, capped at ACTIVITY_LIMIT. Household data, so a shared budget stops
    // appearing to edit itself: the Audit page could only ever show occurrence
    // overrides, which is one kind of change out of seven.
    //
    // A plain array under last-write-wins, like everything else in the payload.
    // Two devices writing concurrently is already the conflict the savedAt
    // check catches, so this needs no merge rule of its own — and a log is the
    // one field where losing the loser's entries is the same outcome as losing
    // the loser's edits, which is what the user is being told about anyway.
    { key: "activity", storage: "cf_activity", initial: () => [], kind: "array", backup: true },
    // Where the household's money lives. Never empty: a payload without one is
    // given the single default account by migrateHouseholdPayload, so every
    // reader can assume at least one exists.
    // A custom apply, not the plain array guard: that one accepts `[]`, and a
    // household with zero accounts is the single state the rest of the app
    // cannot render — every entry would point at an account that isn't there.
    // An absent or empty list means "whatever this device already has", which
    // for a household that predates accounts is the one default below.
    { key: "accounts", storage: "cf_accounts", initial: () => [{ id: DEFAULT_ACCOUNT_ID, name: DEFAULT_ACCOUNT_NAME, kind: "chequing" }], backup: true, apply: (v, set) => {
      if (Array.isArray(v) && v.length > 0) set(v);
    } }
  ];
  // Long enough to answer "what happened while I was away" across a busy week,
  // short enough that the log never becomes the largest thing in the payload:
  // 200 records at ~120 bytes is ~24 KB against a household of a few hundred KB.
  const ACTIVITY_LIMIT = 200;
  // Creates the localStorage-backed state for every field in the table, in
  // table order, and returns the two objects useHouseholdData indexes by field
  // key. Calling useLS in a loop is safe here precisely because
  // HOUSEHOLD_FIELDS is a module-level constant: the number of hooks and their
  // order can't vary between renders.
  //
  // This is what lets the table be the only place a field is declared. App.js
  // used to repeat every field three more times — one useLS call, one entry in
  // a houseValues literal, one in a houseSetters literal — and omitting either
  // literal produced a field that looked wired but never left the device.
  function useHouseholdState() {
    const values = {};
    const setters = [];
    for (const f of HOUSEHOLD_FIELDS) {
      const [value, set] = useLS(f.storage, f.initial);
      values[f.key] = value;
      setters.push(set);
    }
    // `values` is rebuilt every render (plain reads, no computation) so
    // buildPayload can never close over a stale field. The setters object is
    // built once — useLS's setter identity never changes — which is what keeps
    // applyPayload and loadData stable, and the household-load effect firing
    // on `household` rather than on every render.
    const stableSetters = useMemo(
      () => HOUSEHOLD_FIELDS.reduce((o, f, i) => {
        o[f.key] = setters[i];
        return o;
      }, {}),
      []
    );
    return { values, setters: stableSetters };
  }
  const HOUSEHOLD_GUARDS = {
    array: (v, set) => {
      if (Array.isArray(v)) set(v);
    },
    object: (v, set) => {
      if (v && typeof v === "object") set(v);
    },
    value: (v, set) => {
      if (v != null) set(v);
    },
    truthy: (v, set) => {
      if (v) set(v);
    }
  };
  const houseApply = (f) => f.apply || HOUSEHOLD_GUARDS[f.kind] || HOUSEHOLD_GUARDS.value;
  // What the payload carries, and what a second household's leftovers are
  // cleared from — both were separate hand-written lists.
  const HOUSEHOLD_SYNCED_FIELDS = HOUSEHOLD_FIELDS.map((f) => ({ key: f.key, apply: houseApply(f) }));
  const HOUSEHOLD_BACKUP_FIELDS = HOUSEHOLD_FIELDS.filter((f) => f.backup);
  // Every synced field's localStorage key, plus the per-year AI report cache.
  // On a shared device, a field's apply() only overwrites local state when the
  // newly-loaded household actually has a value for it — so without clearing
  // these first, a second household signing in on the same device would
  // inherit any field the first household's save happened not to set, i.e. the
  // previous household's leftover financial data. Device-level prefs that
  // aren't household-scoped (lock timeout, saved email, biometric credential,
  // swipe-coach dismissal) are deliberately left alone, as is cf_ai_key: a
  // personal credential isn't the household's to clear.
  const HOUSEHOLD_LOCAL_STORAGE_KEYS = HOUSEHOLD_FIELDS.map((f) => f.storage);
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
    // True while a save is actually in flight (see saveData's queue below).
    const savingNow = useRef(false);
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
      if (!d) return {};
      // A payload saved by an older, un-migrated client (another device that
      // hasn't reloaded yet) can predate any of the storage migrations. Pass
      // its own version through — migrateHouseholdPayload gates each step on
      // it, so a current payload costs one object spread and nothing else.
      // Never re-add an outer `< SCHEMA_VERSION` gate here: that is what used
      // to send an already-migrated payload back through the conversions.
      const data = migrateHouseholdPayload(d, d.schemaVersion || 0);
      // Report what actually reached state, field by field. The guards reject
      // values they don't like and a payload need not carry every field, so
      // "what the payload said" and "what the app now holds" are different
      // things — and it is the latter the sync baseline has to be built from.
      const applied = {};
      HOUSEHOLD_SYNCED_FIELDS.forEach(({ key, apply }) => apply(data[key], (v) => {
        applied[key] = v;
        setters[key](v);
      }));
      return applied;
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
    // The synced shape of a set of field values. Shared by the payload that
    // gets sent and by the baseline the autosave compares against, so the two
    // can never be normalised differently and disagree about what "unchanged"
    // means.
    const normaliseFields = (src) => {
      const out = {};
      HOUSEHOLD_SYNCED_FIELDS.forEach(({ key }) => {
        out[key] = src[key];
      });
      out.entries = stripAttachments(out.entries);
      out.overridesByYr = stripOverrideAttachments(out.overridesByYr);
      out.schemaVersion = SCHEMA_VERSION;
      return out;
    };
    const buildPayload = useCallback(() => {
      const out = normaliseFields(values);
      out.savedAt = (/* @__PURE__ */ new Date()).toISOString();
      return out;
    }, [values]);
    // A fingerprint of everything that gets synced, with savedAt removed — it
    // is a fresh timestamp on every build, so leaving it in would make every
    // payload look different from every other one.
    const sigOf = (p) => {
      const c = Object.assign({}, p);
      delete c.savedAt;
      return JSON.stringify(c);
    };
    // What the cloud is known to already hold. Set when a save succeeds, and
    // when a load applies the server's copy.
    const syncedSig = useRef(null);
    // `values` is rebuilt every render; the load callbacks are deliberately
    // stable (see stableSetters above), so they read the current set through
    // this rather than closing over one.
    const valuesRef = useRef(values);
    valuesRef.current = values;
    // The baseline the autosave compares against: the fields the load just
    // applied, over the ones it left alone.
    const adoptLoaded = (applied) => {
      syncedSig.current = sigOf(normaliseFields(Object.assign({}, valuesRef.current, applied)));
    };
    const loadData = useCallback(async () => {
      if (!supabaseClient || !household) return false;
      // Flush any pending debounced save first — otherwise a pull-to-refresh
      // or "Reload from Cloud" inside the 2s autosave window silently
      // overwrites the just-made local edit with the server copy.
      //
      // Not while a save is already running, though: saves are serialised, and
      // the CONFLICT branch of a save calls this function, so awaiting another
      // save here would be waiting on the very save that is waiting on us. The
      // in-flight save is the flush; the timer is still cleared so it can't
      // fire into the middle of the load.
      if (saveTimer.current && initialized.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (!savingNow.current) await saveDataRef.current(true);
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
        adoptLoaded(applyPayload(payload));
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
    const runSave = useCallback(async (silent = false) => {
      if (!supabaseClient || !household) return false;
      if (!silent) setStatus("syncing");
      savingNow.current = true;
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
        // Only on success: a failed save must leave the previous signature in
        // place so the retry still sees a difference and goes through.
        syncedSig.current = sigOf(payload);
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
      } finally {
        savingNow.current = false;
      }
    }, [household, buildPayload, syncReceipts, loadData, clearUnsaved, markUnsaved]);
    const runSaveRef = useRef(runSave);
    useEffect(() => {
      runSaveRef.current = runSave;
    }, [runSave]);
    // Saves run one at a time. Two overlapping saves both quote the
    // `savedAt` they loaded with, so whichever commits second fails its own
    // conflict check — and the CONFLICT branch above recovers by reloading,
    // which throws away every edit made since the first save started. That is
    // this device losing its own work to itself: type, save, keep typing while
    // the request is still in the air on a slow connection, and the newer edit
    // vanishes a few seconds later, complete with a toast blaming another
    // device. Queuing behind the in-flight save costs nothing (the debounce
    // means the common case has an empty queue) and makes that impossible.
    //
    // The queued run goes through the ref rather than a captured closure so it
    // builds its payload from the state at the moment it actually runs — the
    // whole point is to include the edits made while it was waiting.
    const savingRef = useRef(null);
    const saveData = useCallback((silent = false) => {
      const next = (savingRef.current || Promise.resolve()).catch(() => {
      }).then(() => runSaveRef.current(silent));
      savingRef.current = next;
      return next;
    }, []);
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
        // Nothing to say. loadData sets initialized.current synchronously
        // while the setters it just called land a render later, so the act of
        // *loading* a household arrives here looking exactly like someone
        // editing it — and every launch used to push the cloud's own copy
        // straight back at it, advancing savedAt for every other device and
        // inviting a conflict none of them caused. Comparing content rather
        // than trusting the render that carried it also covers any other
        // route to a no-op save.
        if (sigOf(buildPayload()) === syncedSig.current) return;
        saveData(true);
      }, 2e3);
      return () => clearTimeout(saveTimer.current);
    // Derived from the table rather than listed by hand: a field left out of
    // this array is only ever saved as a passenger on somebody else's edit,
    // which is a silent failure and exactly how holidays shipped. The array's
    // length is fixed (HOUSEHOLD_FIELDS is a module constant), which is all
    // React requires of a dependency list.
    }, HOUSEHOLD_FIELDS.map((f) => values[f.key]));
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
      adoptLoaded(applyPayload(payload));
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

    // Autosave is a 2-second trailing debounce, and a page that goes away
    // takes the pending timer with it. Type a figure and switch apps, lock the
    // phone, or close the tab inside those two seconds and the save never
    // happened — and nothing recorded that it hadn't, because the marker is
    // written when a save is *attempted and fails*, not when one is merely
    // scheduled. The next load then applied the server copy over the edit
    // without asking. On a phone, editing and immediately backgrounding the
    // app is the ordinary way to use it, not an edge case.
    //
    // So the debounce is flushed on the way out. `pagehide` is the reliable
    // end-of-page event on iOS (where `beforeunload` frequently does not
    // fire), and `visibilitychange` to hidden covers backgrounding without a
    // navigation. Both go through the same saveData the timer would have
    // called: a request started here is not guaranteed to finish, but an
    // unfinished one leaves the unsaved marker its failure path sets, which is
    // exactly what the next load needs to see.
    useEffect(() => {
      if (!household) return;
      const flush = () => {
        if (!saveTimer.current || !initialized.current || divergence) return;
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        // Mark first, then save. If the page dies mid-request the marker is
        // already on disk, so the edit is remembered rather than lost; a save
        // that does land clears it.
        markUnsaved();
        saveDataRef.current(true);
      };
      const onHide = () => {
        if (document.visibilityState === "hidden") flush();
      };
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", flush);
      return () => {
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", flush);
      };
    }, [household, divergence, markUnsaved]);

    // Edits made while autosave is disabled (i.e. the initial load failed) are
    // the exact case that used to vanish. Nothing will try to save them until
    // connectivity returns, so record that they exist.
    useEffect(() => {
      if (!household || !loadAttempted.current || initialized.current) return;
      markUnsaved();
    // Every field, derived from the table — for the same reason the autosave
    // effect above derives its dependencies rather than listing them. A field
    // missing from this array is one whose offline edit nothing remembers, and
    // an unremembered edit is not kept back for the user to resolve: loadData
    // only reaches its divergence branch when the marker is set, so without it
    // the server copy is applied over the edit silently.
    }, HOUSEHOLD_FIELDS.map((f) => values[f.key]).concat([household, markUnsaved]));

    return { status, msg, saveData, loadData, unsaved, divergence, keepLocalChanges, discardLocalChanges };
  }
