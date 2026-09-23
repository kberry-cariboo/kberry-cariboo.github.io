import { genId, useContext, useEffect, useMemo, useRef, useState } from "../lib/runtime.js";
import { centsToDollars, dollarsToCents, migrateHouseholdPayload } from "../lib/migrate.js";
import { DEFAULT_HOLIDAY_REGION, HOLIDAY_REGIONS, fetchHolidayYear, holidayRegion, holidayRowsForYear, holidayYearForEditing, isYearStored, mergeFetchedHolidays } from "../lib/holidays.js";
import { accountIdOf, isInflowEvent, parseDate, signedAmount } from "../lib/dates.js";
import { applyYearRollforward, planYearRollforward, yearRollforwardParts } from "../lib/year-copy.js";
import { CURRENCIES, DEFAULT_CURRENCY, DEFAULT_LOCALE, NUMBER_LOCALES, fmt, memberName, moneySymbol, roundMoney } from "../lib/format.js";
import { clearBiometric, getBiometricCredId, isBiometricAvailable, registerBiometric } from "../lib/biometric.js";
import { HOUSEHOLD_BACKUP_FIELDS, exportHouseholdBackup, houseApply } from "../lib/household-sync.js";
import { ACCOUNT_KINDS, ACTIVITY_LABELS, HouseholdContext, MONTHS, WEEKDAYS, accountName, accountOpenings, haptic, lowBalanceEpisodes, moveEntryAttachmentsToOverrides, useIsCoarsePointer } from "../lib/app-data.js";
import { Card, ConfirmDialog, FieldLabel, HelpTip, SectionTitle, Sparkline, Toggle, getCatColor } from "./primitives.js";
import { Icon } from "./misc-ui.js";
import { toast } from "./auth-misc.js";
    // The alerts page. See lowBalanceEpisodes for what an alert is and why it
  // is not one row per event: this page's whole job is to say how many
  // distinct things are wrong, and the old one said sixty when the answer
  // was one.
  export function AlertsPanel({ flow, alertThreshold, setTab, findings = [], gotoForecast = () => {
  } }) {
    const episodes = lowBalanceEpisodes(flow, alertThreshold);
    const dateLabel = (ev) => MONTHS[ev.month] + " " + ev.day;

    const renderEpisode = (ep) => {
      const worst = ep.tone === "critical";
      // The sentence a person would say. Everything else on the card is
      // detail under it, not a second version of it.
      const headline = worst
        ? "Below zero from " + dateLabel(ep.start)
        : "Below your " + fmt(alertThreshold) + " buffer from " + dateLabel(ep.start);
      const series = ep.events.map((e) => e.balance);
      return <button key={ep.id} type="button" className="episode" data-tone={ep.tone} onClick={gotoForecast}>
        <div className="episode-head">
          <span className="episode-title">{headline}</span>
          <span className="episode-days">{ep.openEnded ? ep.days + "+ days" : ep.days + " days"}</span>
        </div>
        <div className="episode-low">
          <span className="episode-low-amt">{fmt(ep.low.balance)}</span>
          <span className="episode-low-when">{"lowest on "}{dateLabel(ep.low)}</span>
        </div>
        {series.length > 1 && <div className="episode-spark" aria-hidden="true">
          <Sparkline
            data={series}
            responsive={true}
            area={true}
            height={34}
            color={worst ? "var(--red)" : "var(--amberInk)"}
          />
        </div>}
        <div className="episode-facts">
          {// The one number that answers "what do I do about it".
          <span><strong>{fmt(ep.shortfall)}</strong>{" more would clear it"}</span>
}
          <span>
            {ep.openEnded
            ? "Still below at the end of the 90 days"
            : "Back above on " + dateLabel(ep.recover)}
          </span>
        </div>
        {// What takes it under — the entries on the crossing day itself, not
        // every entry that happens while it is already under.
        ep.trigger.length > 0 && <div className="episode-trigger">
          {ep.trigger.length === 1 ? "Takes it under: " : "Take it under: "}
          {ep.trigger.map((t, i) => <span key={t.id}>
            {i > 0 ? ", " : ""}
            <strong>{t.desc}</strong>
            {" "}
            {fmt(signedAmount(t))}
          </span>)}
        </div>
}
        <span className="episode-cta">See it on the forecast →</span>
      </button>;
    };

    const nothing = episodes.length === 0 && findings.length === 0;
    return <div className="cf-page alerts-page">
      <div className="alerts-head">
        <h2 className="alerts-title">
          {episodes.length === 0 ? "Nothing to flag"
            : episodes.length === 1 ? "1 thing to watch"
            : episodes.length + " things to watch"}
        </h2>
        <span className="alerts-sub">
          {"Next 90 days · buffer "}
          {fmt(alertThreshold)}
          {" · "}
          <a href="#/you/threshold" className="link-primary">change</a>
        </span>
      </div>
      {nothing && <div className="alerts-clear">
        <span className="alerts-clear-icon" aria-hidden="true"><Icon name="check-circle" size={30} /></span>
        <span className="alerts-clear-title">All clear</span>
        <span className="txl">
          {"Your balance stays above "}
          {fmt(alertThreshold)}
          {" for the next 90 days."}
        </span>
      </div>}
      {episodes.length > 0 && <div className="episode-list">{episodes.map(renderEpisode)}</div>}
      {// Everything else the app has worked out and would otherwise only say on
      // the one screen that computes it. "Centralised" has to mean you can come
      // here and see the lot, not just the balance warnings.
      findings.length > 0 && <>
        <h3 className="alerts-group-title">Worth knowing</h3>
        <div className="cf-col cf-gap-8">
          {findings.map((f) =>
          <button
            key={f.id}
            type="button"
            className="notice notice--sm alerts-finding"
            data-tone={f.tone}
            onClick={() => { window.location.hash = "#/" + f.route; }}
          >
            <span className="notice-icon" aria-hidden="true"><Icon name={f.icon} size={14} /></span>
            <span className="notice-msg">{f.text}</span>
            <span className="alert-row-cta">→</span>
          </button>)}
        </div>
      </>
}
    </div>;
  }
  // Delivery hour choices for background push. Labelled in 12-hour form
  // because that's how the alert time reads on the phone that receives it.
  export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`
  }));

  // One line of plain English about whether alerts can reach a closed app.
  // The distinction matters: "notifications are on" means something quite
  // different when they can only fire in a foreground tab.
  export function pushStatusLine(pushState) {
    const detail = (pushState && pushState.detail) || "";
    switch (pushState && pushState.status) {
      case "subscribed":
        return "This device is registered for background delivery — alerts arrive even when the app and browser are closed.";
      case "working":
        return "Registering this device…";
      case "unavailable":
        if (detail === "no-vapid-key") return "Background delivery isn't set up for this deployment, so alerts only appear while the app is open. (Add a VAPID public key — see the README.)";
        if (detail === "bad-vapid-key") return "The configured VAPID public key isn't valid — it must be the 87-character key printed by scripts/gen-vapid-keys.js. Alerts will only appear while the app is open until it's fixed.";
        if (detail === "unsupported" || detail === "no-service-worker") return "This browser can't do background delivery, so alerts only appear while the app is open.";
        if (detail === "no-supabase") return "Background delivery needs the cloud sync connection, so alerts only appear while the app is open.";
        return "Couldn't register this device for background delivery — alerts will only appear while the app is open.";
      default:
        return "Alerts appear while the app is open.";
    }
  }

  // Settings → Statutory Holidays. Exists so the dates driving the payroll
  // deposit marker are visible and correctable rather than an invisible rule:
  // this is the one place that answers "what does the app think a holiday is?".
  //
  // A year is shown from whatever holidaysForYear resolves — the household's
  // stored list if it has one, the computed rules if not — and the first edit
  // to an unstored year materialises the rules into the store so nothing is
  // lost. Rows say where they came from, because "built-in" and "I typed this"
  // are different kinds of trust.
  export function HolidaySettings({ holidays = {}, setHolidays, years = [], activeYear, isOffline = false, holidayRegionCode = DEFAULT_HOLIDAY_REGION, setHolidayRegionCode = () => {
  } }) {
    const [year, setYear] = useState(() => (years.includes(activeYear) ? activeYear : years[0] || (new Date()).getFullYear()));
    const [form, setForm] = useState(null);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [fetchMsg, setFetchMsg] = useState("");
    const [confirmFetch, setConfirmFetch] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    // Read straight from the prop rather than the module registry: the same
    // resolution the budget uses (stored year, else the computed rules), with
    // no render-time write into shared state.
    const rows = holidayRowsForYear(year, holidays);
    const stored = isYearStored(year, holidays);
    const manualCount = rows.filter((r) => r.source === "manual").length;
    const writeYear = (days) => {
      setHolidays((prev) => ({ ...prev, [year]: days }));
    };
    const startAdd = () => {
      setErr("");
      setForm({ mode: "add", date: `${year}-01-01`, name: "", optional: false, original: null });
    };
    const startEdit = (row) => {
      setErr("");
      setForm({ mode: "edit", date: row.date, name: row.name, optional: row.optional, original: row.date });
    };
    const saveForm = () => {
      const name = (form.name || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setErr("Pick a date.");
      if (Number(form.date.slice(0, 4)) !== Number(year)) return setErr(`That date isn't in ${year}. Switch year first, or pick a date in ${year}.`);
      if (!name) return setErr("Give it a name — it's what the deposit marker says.");
      const days = holidayYearForEditing(year, holidays);
      if (form.original && form.original !== form.date) delete days[form.original];
      days[form.date] = { name, optional: !!form.optional, source: "manual" };
      writeYear(days);
      setForm(null);
      setErr("");
      toast(form.mode === "add" ? "Holiday added" : "Holiday updated");
    };
    const removeDate = (date) => {
      const days = holidayYearForEditing(year, holidays);
      delete days[date];
      // Left as an empty object rather than removed: an absent year falls back
      // to the computed rules, which is the opposite of what deleting the last
      // row asks for. (Stored as a holiday_years row with no holidays rows.)
      writeYear(days);
      toast("Holiday removed");
    };
    const runFetch = async () => {
      setConfirmFetch(false);
      setBusy(true);
      setFetchMsg("");
      try {
        const fetched = await fetchHolidayYear(year, holidayRegionCode);
        const res = mergeFetchedHolidays(stored ? holidayYearForEditing(year, holidays) : {}, fetched);
        writeYear(res.days);
        const bits = [`${Object.keys(res.days).length} dates for ${year}`];
        if (res.added) bits.push(`${res.added} new`);
        if (res.updated) bits.push(`${res.updated} changed`);
        if (res.removed) bits.push(`${res.removed} no longer listed`);
        if (res.kept) bits.push(`${res.kept} of your own kept`);
        setFetchMsg("\u2705 " + bits.join(" \u00b7 "));
      } catch (e) {
        setFetchMsg("\u274c " + (e.message || "Couldn't fetch the holiday list."));
      }
      setBusy(false);
    };
    const sourceChip = (source) => {
      const label = source === "manual" ? "Added here" : source === "published" ? "Published" : "Built-in";
      return <span className={"holiday-chip holiday-chip--" + source}>{label}</span>;
    };
    const weekdayOf = (dateStr) => WEEKDAYS[(parseDate(dateStr) || new Date()).getDay()];
    return <Card id="sec-holidays" className="mb-20">
      <SectionTitle
        help="Payroll that falls on one of these is marked in the budget with the day it is actually deposited — the last banking day before. The list starts from British Columbia's rules, including the two the province lists as optional; fetch a year to replace it with the published dates, or add and edit dates yourself."
      >
        Statutory Holidays
      </SectionTitle>
      <div className="cf-row cf-gap-8 cf-wrap mb-12">
        {years.map((y) => <button
          key={y}
          onClick={() => {
            setYear(y);
            setForm(null);
            setFetchMsg("");
            setErr("");
          }}
          className="holiday-year-pill"
          aria-pressed={y === year}
          data-active={y === year}
        >
          {y}
        </button>)}
      </div>
      <div className="cf-row cf-gap-8 cf-wrap mb-12">
        <label className="txm" htmlFor="holiday-region">Province or territory</label>
        <select
          id="holiday-region"
          className="field-input settings-input"
          style={{ flex: "0 1 240px" }}
          value={holidayRegionCode}
          onChange={(e) => setHolidayRegionCode(e.target.value)}
        >
          {HOLIDAY_REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
        </select>
      </div>
      <div className="txl mb-12">
        {rows.length}
        {" date"}
        {rows.length === 1 ? "" : "s"}
        {" for "}
        {year}
        {" \u00b7 "}
        {stored ? `saved in your household${manualCount ? `, ${manualCount} added here` : ""}` : `computed from ${holidayRegion(holidayRegionCode).name}'s general rules`}
      </div>
      {!stored && <div className="italic-hint mb-12">
        The built-in list is worked out from the province's usual rules, so it can differ from a given year's published one — rules change and one-off days get proclaimed. Fetch below replaces it with what canada-holidays.ca lists, and every date can be edited or removed by hand.
      </div>}
      {rows.length === 0 && <div className="italic-hint mb-12">
        {"No holidays for "}
        {year}
        . Payroll on a weekday will be treated as deposited that day.
      </div>}
      {rows.length > 0 && <div className="holiday-list mb-12">
        {rows.map((row) => <div key={row.date} className="holiday-row">
          <div className="holiday-date cf-text-mono-13">
            {row.date}
            <span className="holiday-weekday">{weekdayOf(row.date)}</span>
          </div>
          <div className="holiday-name">
            {row.name}
            {row.optional && <span className="holiday-chip holiday-chip--optional">Optional</span>}
          </div>
          {sourceChip(row.source)}
          <div className="cf-row cf-gap-6">
            <button
              onClick={() => startEdit(row)}
              className="cf-btn cf-btn--secondary cf-btn--compact"
              aria-label={`Edit ${row.name}`}
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(row)}
              className="holiday-remove-btn"
              aria-label={`Remove ${row.name}`}
            >
              Remove
            </button>
          </div>
        </div>)}
      </div>}
      {form && <div className="holiday-form mb-12">
        <div className="cf-row cf-gap-10 cf-wrap">
          <div>
            <FieldLabel htmlFor="holiday-date">Date</FieldLabel>
            <input
              id="holiday-date"
              type="date"
              className="field-input"
              value={form.date}
              onChange={(e) => {
              setForm((f) => ({ ...f, date: e.target.value }));
              setErr("");
            }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <FieldLabel htmlFor="holiday-name">Name</FieldLabel>
            <input
              id="holiday-name"
              className="field-input"
              placeholder="e.g. Family Day"
              value={form.name}
              onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErr("");
            }}
              onKeyDown={(e) => {
              if (e.key === "Enter") saveForm();
            }}
            />
          </div>
        </div>
        <div className="checkbox-help-row mt-10">
          <label className="goal-checkbox-label">
            <input
              type="checkbox"
              className="checkbox-16"
              checked={!!form.optional}
              onChange={(e) => setForm((f) => ({ ...f, optional: e.target.checked }))}
            />
            Optional holiday
          </label>
          <HelpTip
            label="Optional holiday"
            text="BC lists Easter Monday and Boxing Day as optional — not every employer or bank observes them. They still count for the deposit date here; the label is so you can tell them apart."
          />
        </div>
        {err && <div className="field-error-text mt-8" role="alert">{err}</div>}
        <div className="cf-row cf-gap-8 mt-12">
          <button onClick={saveForm} className="cf-btn cf-btn--primary cf-btn--md">
            {form.mode === "add" ? "Add holiday" : "Save holiday"}
          </button>
          <button
            onClick={() => {
            setForm(null);
            setErr("");
          }}
            className="cf-btn cf-btn--secondary cf-btn--md"
          >
            Cancel
          </button>
        </div>
      </div>}
      <div className="cf-row cf-gap-8 cf-wrap">
        {!form && <button onClick={startAdd} className="cf-btn cf-btn--secondary cf-btn--md">
          + Add holiday
        </button>}
        <button
          onClick={() => setConfirmFetch(true)}
          disabled={busy || isOffline}
          title={isOffline ? "You're offline — fetching the published list needs a connection." : void 0}
          className="cf-btn cf-btn--secondary cf-btn--md"
        >
          {busy ? "Fetching\u2026" : `Fetch ${year} for ${holidayRegion(holidayRegionCode).code} from canada-holidays.ca`}
        </button>
        {stored && <button
          onClick={() => setConfirmReset(true)}
          className="cf-btn cf-btn--secondary cf-btn--md"
        >
          Reset to built-in
        </button>}
      </div>
      <div role="status" aria-live="polite">
        {fetchMsg && <div
          className="backup-msg"
          style={{ color: fetchMsg.startsWith("\u2705") ? "var(--greenDk)" : "var(--red)" }}
        >
          {fetchMsg}
        </div>}
      </div>
      {confirmFetch && <ConfirmDialog
        title={`Fetch ${year} holidays?`}
        message={`Replaces the published dates for ${year} with what canada-holidays.ca lists for ${holidayRegion(holidayRegionCode).name}, including its optional holidays.${manualCount ? ` The ${manualCount} date${manualCount === 1 ? "" : "s"} you added here are kept.` : ""} Published dates you removed earlier will come back.`}
        confirmLabel="Fetch"
        confirmVariant="primary"
        onConfirm={runFetch}
        onCancel={() => setConfirmFetch(false)}
      />}
      {confirmReset && <ConfirmDialog
        title={`Reset ${year} to the built-in rules?`}
        message={`Drops your stored list for ${year}, including anything added or edited by hand, and goes back to the dates the app works out from British Columbia's rules.`}
        confirmLabel="Reset"
        onConfirm={() => {
          setHolidays((prev) => {
            const next = { ...prev };
            delete next[year];
            delete next[String(year)];
            return next;
          });
          setConfirmReset(false);
          setFetchMsg("");
          toast(`${year} reset to the built-in holidays`);
        }}
        onCancel={() => setConfirmReset(false)}
      />}
      {confirmDelete && <ConfirmDialog
        title="Remove this holiday?"
        message={`${confirmDelete.name} on ${confirmDelete.date} stops counting as a closed day, so payroll dated then will show as deposited that day.`}
        confirmLabel="Remove"
        onConfirm={() => {
          removeDate(confirmDelete.date);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />}
    </Card>;
  }
  export function SettingsView({ youSub = null, setYouSub = () => {
  }, categories, setCategories, categoryColors = {}, setCategoryColors = () => {
  }, alertThreshold, setAlertThreshold, darkMode, setDarkMode, notifyEnabled = false, setNotifyEnabled = () => {
  }, enableNotifications = async () => {
  }, disableNotifications = async () => {
  }, notifPerm = "unsupported", notifyHour = 8, setNotifyHour = () => {
  }, pushState = { status: "idle", detail: "" }, yearConfigs, setYearConfigs, activeYear, setActiveYear, overridesByYr, setOverridesByYr, entries, setEntries, completed = {}, setCompleted = () => {
  }, goals = [], setGoals = () => {
  }, debtData = {}, setDebtData = () => {
  }, deletedCopyIds = {}, setDeletedCopyIds = () => {
  }, installPrompt = null, triggerInstall = () => {
  }, lockTimeout = 15, setLockTimeout = () => {
  }, templates = [], setTemplates, activeFlow = [], activity = [], accounts = [], setAccounts = () => {
  }, pushUndo = () => {
  }, budgetTargets = {}, setBudgetTargets = () => {
  }, sessionUser = null, logout = () => {
  }, aiApiKey = "", setAiApiKey, sbConfigured = true, houseStatus = "idle", houseMsg = "", houseUnsaved = false, houseSave = () => {
  }, houseLoad = () => {
  }, household = null, members = [], createInvite = () => {
  }, setMemberRole = () => {
  }, setMemberDisabled = () => {
  }, updateMemberName = async () => {
  }, leaveHousehold = async () => {
  }, removeMember = async () => {
  }, deleteMyAccount = async () => {
  }, holidays = {}, setHolidays = () => {
  }, isOffline = false, houseValues = {}, houseSetters = {}, currency = DEFAULT_CURRENCY, setCurrency = () => {
  }, locale = DEFAULT_LOCALE, setLocale = () => {
  }, holidayRegionCode = DEFAULT_HOLIDAY_REGION, setHolidayRegionCode = () => {
  } }) {
    setAiApiKey = setAiApiKey || (() => {
    });
    const [newCat, setNewCat] = useState("");
    const [newCatColor, setNewCatColor] = useState(null);
    const [editIdx, setEditIdx] = useState(null);
    const [editVal, setEditVal] = useState("");
    const [editColor, setEditColor] = useState(null);
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [yearMsg, setYearMsg] = useState("");
    const [pendingRestore, setPendingRestore] = useState(null);
    const [confirmWipe, setConfirmWipe] = useState(false);
    const [removingAccount, setRemovingAccount] = useState(null);
    // What each account's name was when its field took focus, so a rename is
    // logged once on blur rather than once per keystroke.
    const renamedFrom = useRef({});
    const { logActivity, canWrite, myRole } = useContext(HouseholdContext);
    // What each account opens the first budget year with. Derived, never
    // stored for the first account: it takes the remainder, so the shares can
    // never drift from the one opening balance the user actually sets.
    const openingShares = useMemo(() => {
      const first = [...yearConfigs].sort((a, b) => a.year - b.year)[0];
      return accountOpenings(accounts, first ? first.openingBalance : 0);
    }, [accounts, yearConfigs]);
    const [confirmTgtReset, setConfirmTgtReset] = useState(false);
    const [showAiKey, setShowAiKey] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    // Which way out is being confirmed: { kind: "owner" | "remove" | "leave" | "delete", member }.
    const [lifecycle, setLifecycle] = useState(null);
    const [lifecycleMsg, setLifecycleMsg] = useState("");
    const runLifecycle = async () => {
      const { kind, member } = lifecycle || {};
      setLifecycle(null);
      setLifecycleMsg("");
      try {
        if (kind === "owner") await setMemberRole(member.user_id, "owner");
        else if (kind === "remove") await removeMember(member.user_id);
        else if (kind === "leave") await leaveHousehold();
        else if (kind === "delete") await deleteMyAccount();
      } catch (e) {
        setLifecycleMsg(e.message || "That didn't work.");
      }
    };
    const lifecycleDialog = () => {
      if (!lifecycle) return null;
      const name = lifecycle.member ? lifecycle.member.full_name || "this member" : "";
      const others = members.filter((m) => m.user_id !== (sessionUser && sessionUser.id)).length;
      const copy = {
        owner: [`Make ${name} an owner?`, `${name} will be able to do everything you can, including removing members and making other owners. You can't undo this from here.`, "Make owner", "primary"],
        remove: [`Remove ${name}?`, `${name} loses access to this household straight away. What they added stays; their own settings for it are deleted. They can rejoin only with a new invite code.`, "Remove", "danger"],
        leave: others
          ? ["Leave this household?", "You lose access to its budget on every device. What you added stays for the others. To come back you need a new invite code.", "Leave", "danger"]
          : ["Leave and delete this household?", "You're its only member, so leaving deletes the household and everything in it — entries, receipts, goals, history. Export a backup first if you might want it.", "Leave and delete", "danger"],
        delete: ["Delete your account?", others
          ? "You leave this household (what you added stays for the others) and your sign-in is deleted. This can't be undone."
          : "You're this household's only member, so the household and everything in it is deleted along with your sign-in. Export a backup first if you might want it. This can't be undone.", "Delete my account", "danger"]
      }[lifecycle.kind];
      return <ConfirmDialog
        title={copy[0]}
        message={copy[1]}
        confirmLabel={copy[2]}
        confirmVariant={copy[3]}
        onConfirm={runLifecycle}
        onCancel={() => setLifecycle(null)}
      />;
    };
    const [inviteBusy, setInviteBusy] = useState(false);
    const [memberMsg, setMemberMsg] = useState("");
    const [editMemberId, setEditMemberId] = useState(null);
    const [editMemberVal, setEditMemberVal] = useState("");
    const [memberBusy, setMemberBusy] = useState(false);
    const saveMemberName = async (userId) => {
      const name = editMemberVal.trim();
      if (!name) {
        setMemberMsg("Name can't be empty.");
        return;
      }
      setMemberBusy(true);
      setMemberMsg("");
      try {
        await updateMemberName(userId, name);
        setEditMemberId(null);
      } catch (e) {
        setMemberMsg(e.message || "Couldn't rename this member.");
      }
      setMemberBusy(false);
    };
    const [tgtResetMsg, setTgtResetMsg] = useState("");
    const [confirmDelYear, setConfirmDelYear] = useState(null);
    const [confirmCopyYear, setConfirmCopyYear] = useState(null);
    const [historyOpen, setHistoryOpen] = useState({});
    const notifSupported = typeof Notification !== "undefined";
    const [bioSupported, setBioSupported] = useState(false);
    // Biometric unlock is a phone/tablet feature: offer setup only on coarse-pointer
    // devices. If it's already enabled (e.g. legacy desktop setup), keep the block
    // visible so it can still be turned off.
    const isCoarse = useIsCoarsePointer();
    const [bioEnabled, setBioEnabled] = useState(() => !!(sessionUser && getBiometricCredId(sessionUser.id)));
    const [bioBusy, setBioBusy] = useState(false);
    const [bioMsg, setBioMsg] = useState("");
    useEffect(() => {
      let live = true;
      isBiometricAvailable().then((v) => {
        if (live) setBioSupported(v);
      });
      return () => {
        live = false;
      };
    }, []);
    const [lockOnLaunch, setLockOnLaunch] = useState(() => {
      try {
        return localStorage.getItem("cf_lock_on_launch") === "1";
      } catch (e) {
        return false;
      }
    });
    const toggleLockOnLaunch = (v) => {
      setLockOnLaunch(v);
      try {
        if (v) localStorage.setItem("cf_lock_on_launch", "1");
        else localStorage.removeItem("cf_lock_on_launch");
      } catch (e) {
        // Storage can throw outright in private/partitioned modes. Nothing
        // here is essential to the current interaction, so a failure is
        // genuinely ignorable — real save failures surface via
        // notifyStorageWriteFailure.
      }
    };
    const toggleBiometric = async () => {
      if (!sessionUser || bioBusy) return;
      setBioMsg("");
      if (bioEnabled) {
        clearBiometric(sessionUser.id);
        setBioEnabled(false);
        toggleLockOnLaunch(false);
        return;
      }
      setBioBusy(true);
      try {
        await registerBiometric(sessionUser.id, sessionUser.email, sessionUser.fullName);
        setBioEnabled(true);
      } catch (e) {
        setBioMsg(e.name === "NotAllowedError" ? "Cancelled — nothing was changed." : e.message || "Couldn't set up fingerprint / face unlock on this device.");
      } finally {
        setBioBusy(false);
      }
    };
    const sortedYears = [...yearConfigs].sort((a, b) => a.year - b.year);
    const nextYear = (yearConfigs.length ? Math.max(...yearConfigs.map((yc) => yc.year)) : (new Date()).getFullYear()) + 1;
    const addYear = () => {
      const y = nextYear;
      if (yearConfigs.find((yc) => yc.year === y)) {
        setYearMsg(`Year ${y} already exists.`);
        return;
      }
      // Adding a year never touches existing years' data. Ongoing recurring
      // entries flow into the new year automatically via expandEntries; the
      // new year is seeded with a copy of the previous year's budget targets
      // and clones of its one-time entries (shifted to the same month/day).
      // (Entries used to have their end dates cleared here, which retroactively
      // resurrected ended entries in earlier years — that was a data bug.)
      const prevYear = y - 1;
      // Same routine the Copy button and the Budget grid's "+ Add" pill run —
      // see src/lib/year-copy.js. deletedCopyIds included: the tombstones are
      // keyed by source entry, not by year, so a copy the user deleted before
      // removing and re-adding this year must not come back with it.
      const plan = planYearRollforward({ entries, overridesByYr, budgetTargets, fromYear: prevYear, toYear: y, deletedCopyIds });
      applyYearRollforward(plan, y, { setEntries, setOverridesByYr, setBudgetTargets });
      setYearConfigs((prev) => [...prev, { year: y, openingBalance: 0 }].sort((a, b) => a.year - b.year));
      setActiveYear(y);
      const parts = yearRollforwardParts(plan.counts, prevYear);
      logActivity("year", `Added budget year ${y}` + (parts.length ? ` \u2014 ${parts.join(", ")}` : ""));
      setYearMsg(`Year ${y} added — ${prevYear} is untouched.${parts.length ? ` ${parts.join(", ")}.` : ""} Recurring entries without an end date carry forward automatically.`);
    };
    const delYear = (yr) => {
      if (yearConfigs.length <= 1) {
        setYearMsg("Cannot delete the only year.");
        return;
      }
      const prevConfigs = yearConfigs, prevOverrides = overridesByYr, prevActive = activeYear;
      setYearConfigs((prev) => prev.filter((yc) => yc.year !== yr));
      setOverridesByYr((prev) => {
        const n = { ...prev };
        delete n[yr];
        return n;
      });
      if (activeYear === yr) setActiveYear((sortedYears.find((yc) => yc.year !== yr)?.year) || sortedYears[0].year);
      logActivity("year", `Removed budget year ${yr}, and the per-date edits made in it`);
      setYearMsg(`Year ${yr} removed.`);
      // The year's per-occurrence edits go with it, and they are not
      // recoverable from anywhere else — which is exactly why this one needs
      // an undo more than the entry delete that already had one.
      pushUndo(`Budget year ${yr} removed`, () => {
        setYearConfigs(prevConfigs);
        setOverridesByYr(prevOverrides);
        setActiveYear(prevActive);
        setYearMsg("");
      });
    };
    const updateOpenBal = (yr, val) => setYearConfigs((prev) => prev.map((yc) => yc.year === yr ? { ...yc, openingBalance: val } : yc));
    const [catMsg, setCatMsg] = useState("");
    const addCat = () => {
      const v = newCat.trim();
      if (!v) {
        setCatMsg("Enter a category name.");
        return;
      }
      if (categories.some((c) => c.toLowerCase() === v.toLowerCase())) {
        setCatMsg(`"${v}" already exists.`);
        return;
      }
      setCategories((p) => [...p, v]);
      if (newCatColor) setCategoryColors((p) => ({ ...p, [v]: newCatColor }));
      setNewCat("");
      setNewCatColor(null);
      setCatMsg("");
    };
    const delCat = (i) => {
      const name = categories[i];
      // Remove is reached from inside the row's editor, so close it: leaving
      // editIdx on i leaves the editor open over whichever category slid up
      // into that position, which reads as having renamed the wrong one.
      setEditIdx(null);
      setEditColor(null);
      // Snapshot both lists before touching either: a category's colour is
      // stored separately from its name, so restoring only the name brings it
      // back grey.
      const prevCats = categories, prevColors = categoryColors;
      setCategories((p) => p.filter((_, j) => j !== i));
      setCategoryColors((p) => {
        if (!p[name]) return p;
        const n = { ...p };
        delete n[name];
        return n;
      });
      pushUndo(`Category "${name}" removed`, () => {
        setCategories(prevCats);
        setCategoryColors(prevColors);
      });
    };
    // A category's name is not a label sitting beside the data, it is the key
    // the data is filed under: an entry, a template and a budget target all
    // name their category as a string, and so does the per-category rollover
    // flag. Renaming only the list left every one of them pointing at a name
    // that no longer existed — the entries kept the old category, Budget vs
    // Actual grew a row for a category the list did not have, the target you
    // had set was stranded under the old name while the new one started from
    // nothing, and opening one of those entries offered a dropdown its own
    // category was missing from. The rename has to reach all of it, and
    // because it now touches the entries it is worth being able to take back,
    // like removing one is.
    const saveEdit = () => {
      const v = editVal.trim();
      if (!v || editIdx === null) return;
      const oldName = categories[editIdx];
      const renamed = oldName !== v;
      // Adding a category refuses a name already in the list; renaming to one
      // did not, which left two rows with the same name — and, now that a
      // rename carries the entries and targets with it, would have written
      // this category's target over the other one's on the way past. Same
      // guard, same wording.
      if (renamed && categories.some((c, i) => i !== editIdx && c.toLowerCase() === v.toLowerCase())) {
        setCatMsg(`"${v}" already exists.`);
        return;
      }
      const prevCats = categories, prevColors = categoryColors;
      const prevEntries = entries, prevTemplates = templates, prevTargets = budgetTargets;
      setCategories((p) => p.map((c, i) => i === editIdx ? v : c));
      setCategoryColors((p) => {
        const n = { ...p };
        const color = editColor !== null ? editColor : n[oldName];
        if (renamed) delete n[oldName];
        if (color) n[v] = color;
        else delete n[v];
        return n;
      });
      if (renamed) {
        setEntries((p) => p.map((e) => e.category === oldName ? { ...e, category: v } : e));
        setTemplates((p) => (Array.isArray(p) ? p : []).map((t) => t.category === oldName ? { ...t, category: v } : t));
        // Targets are keyed "YYYY:M" -> { category: cents }, plus the reserved
        // _rollover map of category -> true. Both are keyed by the name.
        setBudgetTargets((p) => {
          const next = {};
          let touched = false;
          for (const k of Object.keys(p || {})) {
            const m = p[k];
            if (!m || typeof m !== "object" || !(oldName in m)) { next[k] = m; continue; }
            const copy = { ...m };
            copy[v] = copy[oldName];
            delete copy[oldName];
            next[k] = copy;
            touched = true;
          }
          return touched ? next : p;
        });
        logActivity("category", `Renamed the category ${oldName} to ${v}`);
        pushUndo(`Category "${oldName}" renamed`, () => {
          setCategories(prevCats);
          setCategoryColors(prevColors);
          setEntries(prevEntries);
          setTemplates(prevTemplates);
          setBudgetTargets(prevTargets);
        });
      }
      setEditIdx(null);
      setEditVal("");
      setEditColor(null);
    };
    const onDragStart = (i) => {
      setDragIdx(i);
    };
    const onDragOver = (e, i) => {
      e.preventDefault();
      setDragOverIdx(i);
    };
    const onDrop = (i) => {
      if (dragIdx === null || dragIdx === i) return;
      const arr = [...categories];
      const [item] = arr.splice(dragIdx, 1);
      arr.splice(i, 0, item);
      setCategories(arr);
      setDragIdx(null);
      setDragOverIdx(null);
    };
    // Keyboard/touch alternative to drag-reordering.
    const moveCat = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= categories.length) return;
      const arr = [...categories];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      setCategories(arr);
    };
    // ── Settings is a directory, not a scroll ────────────────────────────
    //
    // It was 7.5 phone screens: fourteen cards down one page, with three more
    // pages behind pills at the top, a sticky section bar and a fourteen-pill
    // index strip both trying to make that scrollable. Two of those cards were
    // 56% of the page on their own — Manage Categories at 94 controls and
    // Statutory Holidays at 31 — because they are management screens that had
    // been filed as sections.
    //
    // Each setting is its own page now, and the root is a directory of rows
    // that each show what the setting is currently *set to*. That is the part
    // the scroll never gave you: you had to reach a card to find out what it
    // said. Every page is routed (#/you/categories), so Back works, a link to
    // one is a link, and the section bar and index strip are both gone — a
    // directory needs no index.
    const SETTINGS_PAGES = {
      years: { title: "Budget years", value: () => sortedYears.map((y) => y.year).join(", "), render: () => <Card
        id="sec-years"
        className="mb-20"
      >
        <SectionTitle>Budget Years</SectionTitle>
        {sortedYears.map((yc) => {
      return <div
        key={yc.year}
        className="year-row"
        style={{
        background: activeYear === yc.year ? "var(--stripe)" : "var(--bg)",
        border: `1px solid ${activeYear === yc.year ? "var(--primary)" : "var(--border)"}`
      }}
      >
        <span className="year-number">{yc.year}</span>
        {sortedYears[0].year === yc.year && <div className="year-openbal">
          <span className="openbal-label">Opening balance</span>
          <span className="txm">{moneySymbol()}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            className="cf-text-mono-13 openbal-input"
            // "Opening balance" next to it is a span, not a label — name the
            // field per-year so it's unambiguous when several years are listed.
            aria-label={`Opening balance for ${yc.year}`}
            value={centsToDollars(yc.openingBalance)}
            onChange={(e) => updateOpenBal(yc.year, dollarsToCents(e.target.value))}
          />
        </div>}
        {sortedYears[0].year !== yc.year && <span className="txl flex-1">
          {"Carries forward from "}
          {sortedYears[sortedYears.indexOf(yc) - 1]?.year}
        </span>}
        <button
          onClick={() => setActiveYear(yc.year)}
          className="cf-checkbtn year-active-btn"
          style={{
        background: activeYear === yc.year ? "var(--primary)" : "transparent",
        color: activeYear === yc.year ? "#fff" : "var(--textMid)"
      }}
        >
          {activeYear === yc.year ? "Active" : "Switch"}
        </button>
        {(() => {
        const nextY = yc.year + 1;
        const hasNext = yearConfigs.some((y) => y.year === nextY);
        const hasTargets = Object.keys(budgetTargets || {}).some((k) => k.startsWith(yc.year + ":"));
        const hasSingles = entries.some((e) => !e.repeats && (e.startDate || "").startsWith(yc.year + "-"));
        const hasOvs = Object.keys(overridesByYr[yc.year] || {}).length > 0;
        const runCopy = () => {
          // Compare-and-sync rather than blind copy: anything added to this
          // year after the next year was created gets carried forward, but
          // values already set on the next year are never overwritten.
          const plan = planYearRollforward({ entries, overridesByYr, budgetTargets, fromYear: yc.year, toYear: nextY, deletedCopyIds });
          applyYearRollforward(plan, nextY, { setEntries, setOverridesByYr, setBudgetTargets });
          const parts = yearRollforwardParts(plan.counts, yc.year);
          setYearMsg(parts.length ? `\u2705 ${yc.year} \u2192 ${nextY}: ${parts.join(", ")}. Anything you edited in ${nextY} was left alone.` : `\u2705 ${nextY} already matches ${yc.year} \u2014 nothing to change.`);
        };
        return hasNext && (hasTargets || hasSingles || hasOvs) && <button
          onClick={() => setConfirmCopyYear({ year: yc.year, nextY, run: runCopy })}
          title={`Sync ${yc.year} into ${nextY} \u2014 adds missing budget targets and one-time entries, updates unedited copies, never touches anything edited in ${nextY}`}
          className="copy-year-btn"
        >
          Copy →
          {nextY}
        </button>;
      })()}
        <button
          onClick={() => {
        if (yearConfigs.length <= 1) {
          setYearMsg("Cannot delete the only year.");
          return;
        }
        setConfirmDelYear(yc.year);
      }}
          className="cf-btn cf-btn--danger cf-btn--yearremove"
        >
          Remove
        </button>
      </div>;
    })}
        <div className="cf-row cf-gap-8 mt-12">
          <button onClick={addYear} className="cf-btn cf-btn--primary cf-btn--md">
            {`+ Add ${nextYear}`}
          </button>
        </div>
        <div role="status" aria-live="polite">
          {yearMsg && <div className="txm mt-8">{yearMsg}</div>}
        </div>
        {confirmDelYear !== null && <ConfirmDialog
          title={`Remove budget year ${confirmDelYear}?`}
          message={`Budget year ${confirmDelYear} will be removed from the app, along with any per-occurrence edits made in ${confirmDelYear}. Entries and budget targets are not deleted.`}
          confirmLabel="Remove Year"
          onConfirm={() => {
          delYear(confirmDelYear);
          setConfirmDelYear(null);
        }}
          onCancel={() => setConfirmDelYear(null)}
        />}
        {confirmCopyYear !== null && <ConfirmDialog
          title={`Copy ${confirmCopyYear.year} into ${confirmCopyYear.nextY}?`}
          message={`Missing budget targets and one-time entries from ${confirmCopyYear.year} will be added to ${confirmCopyYear.nextY}, and unedited copies will be updated to match. Anything you've already edited in ${confirmCopyYear.nextY} is left alone.`}
          confirmLabel="Copy"
          confirmVariant="primary"
          onConfirm={() => {
          confirmCopyYear.run();
          setConfirmCopyYear(null);
        }}
          onCancel={() => setConfirmCopyYear(null)}
        />}
      </Card> },
      accounts: { title: "Accounts", value: () => accounts.length + (accounts.length === 1 ? " account" : " accounts"), render: () => <Card
        id="sec-accounts"
        className="mb-20"
      >
        <SectionTitle
          help="Where the household’s money lives. A credit card is an ordinary account here — its balance simply runs below zero. Every view shows all of them added together unless you narrow it with the Account picker above the budget."
        >
          Accounts
        </SectionTitle>
        <div className="mb-14">
          {accounts.map((a, i) => <div key={a.id} className="account-row">
            <input
              aria-label={`Name of account ${i + 1}`}
              className="field-input account-name"
              value={a.name}
              onChange={(e) => setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, name: e.target.value } : x))}
              // Recorded on blur, not on every keystroke: a rename would otherwise
              // write one log line per character typed.
              onFocus={(e) => {
        renamedFrom.current[a.id] = e.target.value;
      }}
              onBlur={(e) => {
        const was = renamedFrom.current[a.id];
        delete renamedFrom.current[a.id];
        if (was !== void 0 && was !== e.target.value) logActivity("account", `Renamed the account ${was} to ${e.target.value}`);
      }}
            />
            <select
              aria-label={`Kind of ${a.name}`}
              className="field-input account-kind"
              value={a.kind || "chequing"}
              onChange={(e) => setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, kind: e.target.value } : x))}
            >
              {ACCOUNT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            {i === 0 ? <span className="txl account-opening-note">
              {"Opens with the rest \u2014 "}
              <strong className="cf-text-mono-13">{fmt(openingShares[a.id] || 0)}</strong>
            </span> : <span
              className="cf-row cf-gap-6"
            >
              <span className="dollar-sm">{moneySymbol()}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                aria-label={`Opening balance of ${a.name}`}
                className="field-input field-input--mono account-opening"
                value={centsToDollars(Number.isFinite(a.opening) ? a.opening : 0)}
                onChange={(e) => setAccounts((prev) => prev.map((x) => x.id === a.id ? { ...x, opening: dollarsToCents(e.target.value) } : x))}
              />
            </span>}
            {accounts.length > 1 && i > 0 && <button
              className="cf-btn cf-btn--secondary cf-btn--micro"
              onClick={() => setRemovingAccount(a)}
              aria-label={`Remove ${a.name}`}
            >
              Remove
            </button>}
          </div>)}
        </div>
        <div className="cf-row cf-gap-10 cf-wrap">
          <button
            className="cf-btn cf-btn--secondary cf-btn--md"
            onClick={() => {
        setAccounts((prev) => [...prev, { id: genId(), name: "New account", kind: "savings", opening: 0 }]);
        logActivity("account", "Added an account");
      }}
          >
            + Add account
          </button>
        </div>
        <div className="hint mt-10">
          The first account holds whatever is left of the budget year’s opening balance once the others are accounted for, so the shares always add up to the one figure you set under Budget Years.
        </div>
        {removingAccount && <ConfirmDialog
          title={`Remove ${removingAccount.name}?`}
          message={(() => {
        const n = entries.filter((e) => accountIdOf(e) === removingAccount.id).length;
        const t = entries.filter((e) => e.toAccountId === removingAccount.id).length;
        return n + t === 0 ? "Nothing is filed under this account, so removing it changes no figures." : `${n + t} ${n + t === 1 ? "entry moves" : "entries move"} back to ${accountName(accounts, (accounts[0] || {}).id)}. No entry is deleted and no amount changes \u2014 they simply stop being separated out.`;
      })()}
          confirmLabel="Remove"
          onCancel={() => setRemovingAccount(null)}
          onConfirm={() => {
        // Entries are re-homed rather than deleted: an account is a label on
        // money, and removing the label must not remove the money.
        setEntries((prev) => prev.map((e) => {
          if (accountIdOf(e) !== removingAccount.id && e.toAccountId !== removingAccount.id) return e;
          const next = { ...e };
          if (accountIdOf(e) === removingAccount.id) delete next.accountId;
          if (e.toAccountId === removingAccount.id) delete next.toAccountId;
          return next;
        }));
        setAccounts((prev) => prev.filter((x) => x.id !== removingAccount.id));
        logActivity("account", `Removed the account ${removingAccount.name}`);
        setRemovingAccount(null);
      }}
        />}
      </Card> },
      categories: { title: "Categories", value: () => String(categories.length), render: () => <Card
        id="sec-categories"
        className="mb-20"
      >
        <SectionTitle
          help={(isCoarse ? "Use the arrows to reorder." : "Drag to reorder.") + " Renaming applies to new entries; entries you already have keep the category name they were saved with."}
        >
          Manage Categories
        </SectionTitle>
        <div className="mb-16">
          {categories.map((cat, i) => <div
            key={cat}
            draggable={true}
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            className="cat-row"
            style={{
          background: dragOverIdx === i ? "var(--stripe)" : "var(--bg)"
        }}
          >
            <span className="drag-handle">⠿</span>
            {editIdx === i ? <>
              <label
                title="Category color"
                className="color-swatch"
                style={{
        background: editColor !== null ? editColor : getCatColor(cat, categories, categoryColors)
      }}
              >
                <input
                  type="color"
                  value={editColor !== null ? editColor : getCatColor(cat, categories, categoryColors)}
                  onChange={(e) => setEditColor(e.target.value)}
                  // Eleven of these on the General page, all announced as an unnamed
                  // "color picker" — the visible label is the swatch itself.
                  aria-label={`Colour for ${cat}`}
                  className="color-swatch-input"
                />
              </label>
              <input
                className="settings-input flex-1"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                autoFocus={true}
              />
              <button onClick={saveEdit} className="cf-btn cf-btn--compact cf-btn--primary">Save</button>
              <button
                onClick={() => {
        setEditIdx(null);
        setEditColor(null);
      }}
                className="cf-btn cf-btn--compact cf-btn--secondary"
              >
                Cancel
              </button>
              {// Reset and Remove live in here now rather than on every resting row.
      // Five buttons on a row the phone had to wrap made each category 195px
      // tall; these two are the ones you reach for having decided to change
      // this category, which is exactly what opening the editor says.
      categoryColors[cat] && <button
        onClick={() => setCategoryColors((prev) => {
          const next = { ...prev };
          delete next[cat];
          return next;
        })}
        title="Reset to automatic color"
        className="cf-btn cf-btn--compact cf-btn--secondary"
      >
        Reset colour
      </button>
}
              <button onClick={() => delCat(i)} className="cf-btn cf-btn--compact cf-btn--danger">
                Remove
              </button>
            </> : <
      >
        <label
          title="Change color"
          className="color-swatch"
          style={{
        background: getCatColor(cat, categories, categoryColors)
      }}
        >
          <input
            type="color"
            value={getCatColor(cat, categories, categoryColors)}
            onChange={(e) => setCategoryColors((p) => ({ ...p, [cat]: e.target.value }))}
            aria-label={`Colour for ${cat}`}
            className="color-swatch-input"
          />
        </label>
        <button
          className="cat-open"
          onClick={() => {
          setEditIdx(i);
          setEditVal(cat);
          setEditColor(null);
        }}
        >
          {cat}
        </button>
        <div className="cat-actions-row">
          <button
            aria-label={`Move ${cat} up`}
            className="wm-arrow"
            disabled={i === 0}
            style={{ opacity: i === 0 ? 0.3 : 1 }}
            onClick={() => moveCat(i, -1)}
          >
            ↑
          </button>
          <button
            aria-label={`Move ${cat} down`}
            className="wm-arrow"
            disabled={i === categories.length - 1}
            style={{ opacity: i === categories.length - 1 ? 0.3 : 1 }}
            onClick={() => moveCat(i, 1)}
          >
            ↓
          </button>
        </div>
      </>}
          </div>)}
        </div>
        <div className="cf-row cf-gap-8">
          <label
            title="Pick a color (optional — auto-assigned if left default)"
            className="color-swatch"
            style={{
      background: newCatColor || "var(--border)"
    }}
          >
            <input
              type="color"
              value={newCatColor || "#888888"}
              onChange={(e) => setNewCatColor(e.target.value)}
              aria-label="Colour for the new category"
              className="color-swatch-input"
            />
          </label>
          <input
            className="settings-input flex-1"
            value={newCat}
            aria-label="New category name"
            placeholder="New category name…"
            onChange={(e) => {
          setNewCat(e.target.value);
          if (catMsg) setCatMsg("");
        }}
            onKeyDown={(e) => e.key === "Enter" && addCat()}
          />
          <button onClick={addCat} className="cf-btn cf-btn--primary cf-btn--md">+ Add</button>
        </div>
        {catMsg && <div role="alert" className="error-text-mt8">{catMsg}</div>}
      </Card> },
      money: { title: "Currency & format", value: () => currency + " \xB7 " + locale, render: () => <Card
        id="sec-money"
        className="mb-20"
      >
        <SectionTitle
          help="Changes how every amount in the app is written — the symbol, and where the thousands and decimal separators go. It does not convert anything: the numbers you have entered stay the numbers they are."
        >
          {"Currency & Format"}
        </SectionTitle>
        <div className="cf-row cf-gap-16 cf-wrap">
          <div>
            <label className="field-label" htmlFor="set-currency">Currency</label>
            <select
              id="set-currency"
              className="field-input settings-input"
              style={{ minWidth: 220 }}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>
                {`${c.code} \u2014 ${c.name}`}
              </option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="set-locale">Number format</label>
            <select
              id="set-locale"
              className="field-input settings-input"
              style={{ minWidth: 220 }}
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              {NUMBER_LOCALES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="hint mt-10">
          {"One thousand two hundred and change looks like "}
          <strong className="cf-text-mono-13">{fmt(123456)}</strong>
          {" \u00b7 a negative is "}
          <strong className="cf-text-mono-13">{fmt(-123456)}</strong>
        </div>
        <div className="hint mt-6">
          Only currencies with two decimal places are listed. Amounts are stored as whole cents throughout the app, so a currency with none (yen) or three (dinar) would need more than a formatting change.
        </div>
      </Card> },
      holidays: { title: "Statutory holidays", value: () => holidayRegion(holidayRegionCode).code, render: () => <HolidaySettings
        holidayRegionCode={holidayRegionCode}
        setHolidayRegionCode={setHolidayRegionCode}
        holidays={holidays}
        setHolidays={setHolidays}
        isOffline={isOffline}
        activeYear={activeYear}
        years={[...new Set([...(yearConfigs || []).map((yc) => Number(yc.year)), (new Date()).getFullYear()])].sort()}
      /> },
      reset: { title: "Target budget reset", value: () => String(activeYear), render: () => <Card
        id="sec-reset"
        className="mb-20"
      >
        <SectionTitle>{"Target Budget Reset \u2014 "}{activeYear}</SectionTitle>
        <button onClick={() => setConfirmTgtReset(true)} className="reset-targets-btn">
          ↺ Reset Targets to Actuals
        </button>
        <div role="status" aria-live="polite">
          {tgtResetMsg && <div className="success-text-mt10">{tgtResetMsg}</div>}
        </div>
        {confirmTgtReset && <ConfirmDialog
          title={`Reset all ${activeYear} targets?`}
          message={`This replaces every monthly budget target for ${activeYear} with the actual expense totals per category for each month. Existing targets for ${activeYear} will be overwritten. Other years are unaffected.`}
          confirmLabel="Reset Targets"
          onConfirm={() => {
          const prevTargets = budgetTargets;
          const byMonthCat = {};
          (activeFlow || []).filter((ev) => ev.type === "expense").forEach((ev) => {
            const key = `${activeYear}:${ev.month}`;
            if (!byMonthCat[key]) byMonthCat[key] = {};
            byMonthCat[key][ev.category] = (byMonthCat[key][ev.category] || 0) + ev.amount;
          });
          setBudgetTargets((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => {
              if (k.startsWith(activeYear + ":")) delete next[k];
            });
            Object.keys(byMonthCat).forEach((key) => {
              const cats = {};
              Object.keys(byMonthCat[key]).forEach((c) => {
                cats[c] = roundMoney(byMonthCat[key][c]);
              });
              next[key] = cats;
            });
            return next;
          });
          const monthsSet = Object.keys(byMonthCat).length;
          setTgtResetMsg(`Targets for ${activeYear} reset from actuals across ${monthsSet} month${monthsSet !== 1 ? "s" : ""}.`);
          setConfirmTgtReset(false);
          // A year of hand-set targets is overwritten in one press, and the
          // confirm dialog is the only thing between the button and the loss.
          pushUndo(`${activeYear} targets reset from actuals`, () => {
            setBudgetTargets(prevTargets);
            setTgtResetMsg("");
          });
        }}
          onCancel={() => setConfirmTgtReset(false)}
        />}
      </Card> },
      appearance: { title: "Appearance", value: () => darkMode ? "Dark" : "Light", render: () => <Card
        id="sec-appearance"
        className="mb-20"
      >
        <SectionTitle>Appearance</SectionTitle>
        <div className="cf-row cf-gap-16">
          <Toggle value={darkMode} onChange={setDarkMode} label="Dark Mode" />
          <span className="txl">{darkMode ? "Dark theme active" : "Light theme active"}</span>
        </div>
      </Card> },
      threshold: { title: "Alert threshold", value: () => fmt(alertThreshold), render: () => <Card
        id="sec-alert"
        className="mb-20"
      >
        <SectionTitle>Alert Threshold</SectionTitle>
        <div className="cf-row cf-gap-12">
          <label className="settings-label" htmlFor="alert-threshold">Warn when balance drops below</label>
          <div className="cf-row cf-gap-8">
            <span className="dollar-md">{moneySymbol()}</span>
            <input
              id="alert-threshold"
              type="number"
              inputMode="decimal"
              step="100"
              min="0"
              className="settings-input w-120"
              value={centsToDollars(alertThreshold)}
              onChange={(e) => setAlertThreshold(Math.max(0, dollarsToCents(e.target.value)))}
            />
          </div>
        </div>
      </Card> },
      notifications: { title: "Notifications", value: () => notifyEnabled ? "On \xB7 " + ((HOUR_OPTIONS.find((h) => h.value === notifyHour) || {}).label || "") : "Off", render: () => <Card
        id="sec-notifications"
        className="mb-20"
      >
        <SectionTitle>Notifications</SectionTitle>
        {!notifSupported ? <div className="txl">Your browser doesn't support notifications.</div> : <
        >
          <div className="cf-row cf-gap-16">
            <Toggle
              value={notifyEnabled}
              onChange={(v) => {
      if (v) enableNotifications();
      else disableNotifications();
    }}
              label="Enable notifications"
            />
            <span className="txl">
              {notifPerm === "denied" ? "Blocked by your browser" : notifyEnabled ? "On" : "Off"}
            </span>
          </div>
          {notifPerm === "denied" && <div role="alert" className="error-text-mt6">
            Notifications are blocked for this site. Enable them in your browser's site settings, then toggle this back on.
          </div>}
          {notifyEnabled && notifPerm === "granted" && <>
            <div className="cf-row cf-gap-12 cf-wrap mt-14">
              <label htmlFor="notify-hour-select" className="tx">Daily alert time</label>
              <select
                id="notify-hour-select"
                value={notifyHour}
                onChange={(e) => setNotifyHour(parseInt(e.target.value, 10))}
                className="autolock-select"
              >
                {HOUR_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div className="txl mt-8">{pushStatusLine(pushState)}</div>
            {pushState.status === "unavailable" && pushState.detail && <div className="txl mt-4">
              {pushState.detail}
            </div>}
          </>}
        </>}
      </Card> },
      household: { title: "Household", value: () => members.length + (members.length === 1 ? " member" : " members"), render: () => <div
      >
        <Card className="mb-20">
          <SectionTitle
            help="Everyone listed here signs in with their own email and password and shares this budget."
          >
            Household Members
          </SectionTitle>
          {members.map((m) => {
      const isEditing = editMemberId === m.user_id;
      return <div key={m.user_id} className="member-row">
        <div className="flex-1-minw160">
          {isEditing ? <input
            autoFocus={true}
            aria-label="Member name"
            className="field-input member-edit-input"
            value={editMemberVal}
            onChange={(e) => setEditMemberVal(e.target.value)}
            onKeyDown={(e) => {
            if (e.key === "Enter") saveMemberName(m.user_id);
            if (e.key === "Escape") setEditMemberId(null);
          }}
          /> : <div className="tx-sb">
        {m.full_name || "(no name)"}
        {" "}
        {sessionUser?.id === m.user_id && <span className="you-tag">
          (You)
        </span>}
      </div>}
          <div className="hint mt-2">
            {m.role === "owner" ? "Owner" : m.role === "viewer" ? "View-only" : "Member"}
            {m.disabled ? " \u00b7 Disabled" : ""}
          </div>
        </div>
        {isEditing ? <>
          <button
            onClick={() => saveMemberName(m.user_id)}
            disabled={memberBusy}
            className="cf-btn cf-btn--primary cf-btn--xs"
          >
            {memberBusy ? "Saving\u2026" : "Save"}
          </button>
          <button
            onClick={() => setEditMemberId(null)}
            disabled={memberBusy}
            className="cf-btn cf-btn--secondary cf-btn--xs"
          >
            Cancel
          </button>
        </> : <>
        <button
          onClick={() => {
            setMemberMsg("");
            setEditMemberId(m.user_id);
            setEditMemberVal(m.full_name || "");
          }}
          className="cf-btn cf-btn--secondary cf-btn--xs"
        >
          ✎ Edit
        </button>
        {sessionUser?.id !== m.user_id && <button
          onClick={async () => {
            setMemberMsg("");
            try {
              await setMemberDisabled(m.user_id, !m.disabled);
            } catch (e) {
              setMemberMsg(e.message || "Only the household owner can do this.");
            }
          }}
          className={(m.disabled ? "cf-btn cf-btn--primary" : "cf-btn cf-btn--danger") + " cf-btn--xs"}
        >
          {m.disabled ? "Enable" : "Disable"}
        </button>}
        {sessionUser?.id !== m.user_id && m.role !== "owner" && <button
          onClick={async () => {
            setMemberMsg("");
            try {
              await setMemberRole(m.user_id, m.role === "viewer" ? "member" : "viewer");
            } catch (e) {
              setMemberMsg(e.message || "Only the household owner can do this.");
            }
          }}
          title={m.role === "viewer"
            ? "Let this person change the budget again"
            : "This person keeps seeing everything, and stops being able to change it"}
          className="cf-btn cf-btn--secondary cf-btn--xs"
        >
          {m.role === "viewer" ? "Allow changes" : "Make view-only"}
        </button>}
        {myRole === "owner" && sessionUser?.id !== m.user_id && m.role !== "owner" && <button
          onClick={() => setLifecycle({ kind: "owner", member: m })}
          aria-label={`Make ${m.full_name || "this member"} an owner`}
          className="cf-btn cf-btn--secondary cf-btn--xs"
        >
          Make owner
        </button>}
        {myRole === "owner" && sessionUser?.id !== m.user_id && <button
          onClick={() => setLifecycle({ kind: "remove", member: m })}
          aria-label={`Remove ${m.full_name || "this member"} from the household`}
          className="cf-btn cf-btn--danger cf-btn--xs"
        >
          Remove
        </button>}
      </>}
      </div>;
    })}
          {memberMsg && <div role="alert" className="error-text-mt10">{memberMsg}</div>}
        </Card>
        <Card className="mb-20">
          <SectionTitle
            help="Generate a one-time code. Share it with them, then have them sign up and enter it on the “Join with invite code” screen."
          >
            Invite a family member
          </SectionTitle>
          <button
            onClick={async () => {
          setInviteBusy(true);
          try {
            const code = await createInvite();
            setInviteCode(code);
          } catch (e) {
            setMemberMsg(e.message || "Couldn't create an invite code.");
          }
          setInviteBusy(false);
        }}
            // Inviting seats the newcomer as a writer, so the server refuses a
            // view-only member; say so here rather than after the press.
            disabled={inviteBusy || !canWrite}
            aria-describedby={canWrite ? void 0 : "invite-viewonly-note"}
            className="cf-btn cf-btn--primary cf-btn--md"
          >
            {inviteBusy ? "Generating…" : "Generate invite code"}
          </button>
          {!canWrite && <p id="invite-viewonly-note" className="c-textMid mt-8">
            View-only members can't invite people. Ask the household owner for a code.
          </p>}
          {inviteCode && <div className="invite-code-display">{inviteCode}</div>}
        </Card>
        <Card className="mb-20">
          <SectionTitle>Leave this household</SectionTitle>
          <p className="c-textMid mb-12">
            {members.length > 1
        ? (myRole === "owner" && !members.some((m) => m.role === "owner" && m.user_id !== (sessionUser && sessionUser.id) && !m.disabled)
          ? "You're its only owner. Make another member an owner first, so the household isn't left without one."
          : "You'll lose access on every device. What you added stays for the others.")
        : "You're its only member, so leaving deletes the household and everything in it."}
          </p>
          <button
            onClick={() => setLifecycle({ kind: "leave" })}
            className="cf-btn cf-btn--danger cf-btn--md"
          >
            {members.length > 1 ? "Leave household" : "Leave and delete household"}
          </button>
          {lifecycleMsg && <div role="alert" className="error-text-mt10">{lifecycleMsg}</div>}
        </Card>
        {lifecycleDialog()}
      </div> },
      backup: { title: "Backup & restore", value: () => "", render: () => <>
        <Card id="sec-backup" className="mb-20">
          <SectionTitle>{"Data Backup & Restore"}</SectionTitle>
          <div className="cf-row cf-gap-10 cf-wrap">
            <button
              onClick={() => {
      exportHouseholdBackup(houseValues);
    }}
              className="cf-btn cf-btn--primary cf-btn--md cf-btn--iconrow"
            >
              <Icon name="download" size={14} />
              Export Backup
            </button>
            <label className="cf-btn cf-btn--secondary cf-btn--md cf-btn--iconrow">
              <Icon name="upload" size={14} />
              Import Backup
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          // Parsing is not recognition. Any .json at all used to reach the
          // confirm dialog, and confirming one from some other app restored
          // nothing while reporting "Backup restored successfully!" — the user
          // is then told their data is back when it never moved. A real backup
          // carries the export stamp, or (before that stamp existed) at least
          // one of the fields we know how to restore.
          const looksLikeBackup = parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.exportedAt !== void 0 || parsed.schemaVersion !== void 0 || HOUSEHOLD_BACKUP_FIELDS.some((f) => f.key in parsed));
          if (!looksLikeBackup) {
            setYearMsg("\u274C That file isn't a CashFlow backup. Choose a CashFlow_Backup_*.json file exported from Settings.");
            return;
          }
          setYearMsg("");
          setPendingRestore({ parsed, fileName: file.name });
        } catch (err) {
          setYearMsg("\u274C Could not read backup file. Make sure it's a valid CashFlow backup.");
        }
      };
      reader.onerror = () => setYearMsg("\u274C Couldn't read that file off this device. Try again.");
      reader.readAsText(file);
      e.target.value = "";
    }}
              />
            </label>
          </div>
          <div role="status" aria-live="polite">
            {yearMsg && <div
              className="backup-msg"
              style={{
      color: yearMsg.startsWith("\u2705") ? "var(--greenDk)" : yearMsg.startsWith("\u274C") ? "var(--red)" : "var(--textMid)"
    }}
            >
              {yearMsg}
            </div>}
          </div>
        </Card>
        {pendingRestore && <ConfirmDialog
          title="Restore backup?"
          message={`Restoring "${pendingRestore.fileName}" replaces everything this app stores for your household \u2014 entries, overrides, budget targets, goals, categories, debts and the rest \u2014 with what's in this file. Anything the file doesn't carry goes back to its default. You can undo it from the notice that appears straight afterwards; after that, it's permanent.`}
          confirmLabel="Restore"
          confirmVariant="danger"
          onCancel={() => setPendingRestore(null)}
          onConfirm={() => {
          // Everything the restore is about to replace, captured before it
          // does. This is the most destructive action in the app — the dialog
          // says so — and until now it was also the only one with no way back
          // short of having exported a backup first, which is precisely the
          // habit someone restoring a backup has just discovered they lack.
          const beforeRestore = HOUSEHOLD_BACKUP_FIELDS.reduce((acc, f) => {
            acc[f.key] = houseValues[f.key];
            return acc;
          }, {});
          try {
            const parsed = pendingRestore.parsed;
            // An old backup can predate any of the storage migrations — before
            // schema v8 its amounts are dollars, before v9 its debt figures
            // are — so it goes through the same upgrade a stale cloud payload
            // gets on load, keyed on the version stamped in the file itself.
            const d = migrateHouseholdPayload(parsed, parsed.schemaVersion || 0);
            const fixed = moveEntryAttachmentsToOverrides(
              Array.isArray(d.entries) ? d.entries : [],
              d.overridesByYr && typeof d.overridesByYr === "object" ? d.overridesByYr : {}
            );
            // Restore *replaces*, which is what the confirm dialog promises and
            // what "this cannot be undone" implies. So a field the file doesn't
            // carry is reset to its default rather than left alone: restoring a
            // backup taken before a goal existed used to leave that goal in
            // place, silently blending two points in time and handing the user
            // a state that was never backed up. A backup from an older build
            // legitimately lacks fields added since — resetting those is the
            // correct reading of "restore to this file".
            //
            // Entries and overrides go in first and by hand: legacy backups
            // carry receipt images on the entry, which moveEntryAttachmentsToOverrides
            // above has just re-keyed onto the occurrences they belong to.
            setEntries(fixed.entries);
            setOverridesByYr(fixed.overridesByYr);
            // The rest is the table again, vetted by the same guards a payload
            // from the cloud goes through — a guard that rejects the file's
            // value (missing, or the wrong type) falls through to the default.
            HOUSEHOLD_BACKUP_FIELDS.forEach((f) => {
              if (f.key === "entries" || f.key === "overridesByYr") return;
              const set = houseSetters[f.key];
              if (!set) return;
              let applied = false;
              houseApply(f)(d[f.key], (v) => {
                applied = true;
                set(v);
              });
              if (!applied) set(f.initial());
            });
            setYearMsg("\u2705 Backup restored successfully!");
            pushUndo(`Restored "${pendingRestore.fileName}"`, () => {
              HOUSEHOLD_BACKUP_FIELDS.forEach((f) => {
                const set = houseSetters[f.key];
                if (set) set(beforeRestore[f.key]);
              });
              setYearMsg("");
            });
          } catch (err) {
            setYearMsg("\u274C Could not read backup file. Make sure it's a valid CashFlow backup.");
          }
          setPendingRestore(null);
        }}
        />}
      </> },
      sync: { title: "Cloud sync", value: () => houseUnsaved ? "Changes pending" : "On", render: () => sbConfigured && household && <Card
        id="sec-sync"
        className="mb-20"
      >
        <SectionTitle>☁ Supabase — Auto Sync</SectionTitle>
        {houseUnsaved && <div role="status" className="error-text-mt6 mb-8">
          This device has changes that haven't reached the cloud yet. They're kept safely on this device and will sync automatically when the connection is back — they won't be overwritten in the meantime.
        </div>}
        <div
          role="status"
          className="sync-status-row"
          style={{
      background: houseStatus === "error" ? "var(--redLt)" : "rgba(39,174,115,0.08)",
      border: `1px solid ${houseStatus === "error" ? "var(--red)" : "rgba(39,174,115,0.25)"}`
    }}
        >
          <div className="sync-icon">
            {houseStatus === "error" ? "\u2717" : houseStatus === "syncing" ? "\u27f3" : "\u2601"}
          </div>
          <div className="flex-1">
            <div className="tx-sb">Auto-sync active</div>
            <div className="hint mt-2">Changes save automatically to your household's Supabase project</div>
          </div>
          {houseMsg && <div
            className="sync-msg"
            style={{ color: houseStatus === "error" ? "var(--red)" : "var(--greenDk)" }}
          >
            {houseMsg}
          </div>}
        </div>
        <div className="cf-row cf-gap-8 mt-12">
          <button
            onClick={() => houseSave(false)}
            disabled={houseStatus === "syncing"}
            className="cf-btn cf-btn--secondary cf-btn--md cf-btn--iconrow-sm"
          >
            <Icon name="upload" size={12} />
            Save Now
          </button>
          <button
            onClick={() => houseLoad()}
            disabled={houseStatus === "syncing"}
            className="cf-btn cf-btn--secondary cf-btn--md cf-btn--iconrow-sm"
          >
            <Icon name="download" size={12} />
            Reload from Cloud
          </button>
        </div>
      </Card>, when: () => !!(sbConfigured && household) },
      templates: { title: "Entry templates", value: () => String((templates || []).length), render: () => <div
      >
        <Card className="mb-20">
          <SectionTitle>Entry Templates</SectionTitle>
          {(templates || []).length === 0 && <div className="italic-hint">
            No templates saved yet. Use the entry form to create one.
          </div>}
          {(templates || []).map((t, i) => <div key={t.desc || i} className="template-row">
            <div className="flex-1">
              <div className="tx-sb">{t.desc}</div>
              <div className="hint mt-2">
                {isInflowEvent(t) ? "+" : "-"}
                {fmt(t.amount)}
                {" \u00b7 "}
                {t.category}
                {t.repeats && <span>{" \u00b7 Recurring"}</span>}
              </div>
            </div>
            <button
              onClick={() => setTemplates((prev) => prev.filter((_, j) => j !== i))}
              className="cf-btn cf-btn--danger cf-btn--yearremove"
            >
              Remove
            </button>
          </div>)}
        </Card>
      </div> },
      activity: { title: "Activity", value: () => String((activity || []).length), render: () => <div>
        <Card className="mb-20">
          <SectionTitle
            help="Everything anyone in the household has changed, newest first — entries, single dates, budget targets, goals and debts. Kept for the last 200 changes."
          >
            Activity
          </SectionTitle>
          {(activity || []).length === 0 ? <div className="italic-hint">
            Nothing yet. Every change anyone makes to the budget shows up here, with who made it.
          </div> : (activity || []).map((a) => {
      const who = memberName(a.by, members, { selfId: sessionUser && sessionUser.id });
      return <div key={a.id} className="activity-row">
        <span className={"activity-kind activity-kind--" + a.kind}>{ACTIVITY_LABELS[a.kind] || a.kind}</span>
        <div className="flex-1 min-w-0">
          <div className="tx">{a.what}</div>
          <div className="hint mt-2">{new Date(a.at).toLocaleString()}{who ? ` \u00b7 ${who}` : ""}</div>
        </div>
      </div>;
    })}
        </Card>
        <Card className="mb-20">
          <SectionTitle
            help="Single dates you have edited in the Budget grid, with the value each one had before. Revert puts an occurrence back to what its entry says."
          >
            {"Edited dates \u2014 "}
            {activeYear}
          </SectionTitle>
          {(() => {
      const ovrs = overridesByYr[activeYear] || {};
      const rows = Object.entries(ovrs).filter(([, o]) => o && o._savedAt).sort((a, b) => (b[1]._savedAt || "").localeCompare(a[1]._savedAt || "")).slice(0, 20);
      if (rows.length === 0) {
        return <div className="italic-hint">
          No edits yet. Click any row in the Budget view to edit a single date — it'll appear here.
        </div>;
      }
      return rows.map(([eventId, ov]) => {
        const parts = eventId.split("-");
        const entry = entries.find((e) => String(e.id) === parts[0]);
        const month = parseInt(parts[parts.length - 2]);
        const day = parseInt(parts[parts.length - 1]);
        const dateLabel = entry && !isNaN(month) && !isNaN(day) ? `${MONTHS[month]} ${day}` : eventId;
        const hist = ov._history || [];
        const isOpen = !!historyOpen[eventId];
        return <div key={eventId} className="audit-entry">
          <div className="cf-row-between cf-gap-10 cf-wrap">
            <div className="flex-1-minw160">
              <div className="tx-sb">{entry ? entry.desc : "Unknown entry"}{" \xB7 "}{dateLabel}</div>
              <div className="hint mt-2">
                {ov.amount !== void 0 && <>{"Amount \u2192 "}{fmt(ov.amount)}{" "}</>}
                {ov.notes && <>· Note: "{ov.notes}{'" '}</>}
                {"\xB7 Saved "}
                {new Date(ov._savedAt).toLocaleString()}
                {(() => {
          const who = memberName(ov._by, members, { selfId: sessionUser && sessionUser.id });
          return who ? ` \xB7 by ${who}` : "";
        })()}
              </div>
            </div>
            <div className="cf-row cf-gap-6">
              {hist.length > 0 && <button
                onClick={() => setHistoryOpen((p) => ({ ...p, [eventId]: !p[eventId] }))}
                className="cf-btn cf-btn--secondary cf-btn--micro"
              >
                {isOpen ? "Hide" : "History"}
                {" ("}
                {hist.length}
                )
              </button>}
              <button
                onClick={() => setOverridesByYr((prev) => {
              const yOvs = { ...prev[activeYear] || {} };
              delete yOvs[eventId];
              return { ...prev, [activeYear]: yOvs };
            })}
                className="revert-btn"
                title="Restore the originally scheduled values for this date"
              >
                ↺ Revert
              </button>
            </div>
          </div>
          {isOpen && <div className="history-list">
            {[...hist].reverse().map((h, i) => <div key={i} className="history-item-text">
              {new Date(h.ts).toLocaleString()}
              {(() => {
          const who = memberName(h.by, members, { selfId: sessionUser && sessionUser.id });
          return who ? ` (${who})` : "";
        })()}
              {" \u2014 previous value:"}
              {" "}
              {h.prev && h.prev.amount !== void 0 ? fmt(h.prev.amount) : "(scheduled default)"}
              {h.prev && h.prev.notes ? ` \xB7 "${h.prev.notes}"` : ""}
            </div>)}
          </div>}
        </div>;
      });
    })()}
        </Card>
      </div> },
      ai: { title: "AI key", value: () => aiApiKey ? "Set" : "Not set", render: () => <Card
        id="sec-ai-key"
        className="mb-20"
      >
        <SectionTitle>AI Insights — Anthropic API Key</SectionTitle>
        <div className="txl lh-15 mb-12">
          Get a key at
          {" "}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="link-primary"
          >
            console.anthropic.com
          </a>
          .
        </div>
        <div className="cf-row cf-gap-10 cf-wrap">
          <input
            type={showAiKey ? "text" : "password"}
            aria-label="Anthropic API Key"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="cf-text-mono-13 ai-key-input"
          />
          <button
            onClick={() => setShowAiKey((v) => !v)}
            className="cf-btn cf-btn--secondary cf-btn--showhide"
          >
            {showAiKey ? "Hide" : "Show"}
          </button>
          {aiApiKey.trim() && <button onClick={() => setAiApiKey("")} className="clear-key-btn">
            Clear key
          </button>}
        </div>
        <div className="key-disclaimer-row">
          <span className="ai-disclaimer-icon"><Icon name="key" size={12} /></span>
          <span>
            Stored on this device only and sent straight from your browser to Anthropic — anyone who can run script on this page can read it.
          </span>
        </div>
      </Card> },
      security: { title: "Security", value: () => lockTimeout ? "Lock after " + lockTimeout + "m" : "No auto-lock", render: () => <Card
        id="sec-security"
        className="mb-20"
      >
        <SectionTitle>Security</SectionTitle>
        <div className="cf-row cf-gap-12 cf-wrap">
          <label htmlFor="auto-lock-select" className="tx">Auto-lock when in background</label>
          <select
            id="auto-lock-select"
            value={lockTimeout}
            onChange={(e) => setLockTimeout(parseInt(e.target.value, 10))}
            className="autolock-select"
          >
            <option value={0}>Off</option>
            <option value={5}>After 5 minutes</option>
            <option value={15}>After 15 minutes</option>
            <option value={30}>After 30 minutes</option>
          </select>
        </div>
        {sessionUser && (bioEnabled || bioSupported && isCoarse) && <div className="bio-section">
          <div className="cf-row cf-gap-16">
            <Toggle value={bioEnabled} onChange={toggleBiometric} label="Unlock with fingerprint / face" />
            {bioBusy && <span className="bio-busy-text">Follow your device's prompt…</span>}
          </div>
          {bioEnabled && <div className="mt-14">
            <Toggle
              value={lockOnLaunch}
              onChange={toggleLockOnLaunch}
              label="Require fingerprint sign-on when the app opens"
            />
          </div>}
          {bioMsg && <div role="alert" className="error-text-mt6">{bioMsg}</div>}
        </div>}
      </Card> },
      danger: { title: "Danger zone", value: () => "", tone: "danger", render: () => <Card
        id="sec-danger"
        className="danger-card"
      >
        <SectionTitle>Danger Zone</SectionTitle>
        <button
          onClick={() => setConfirmWipe(true)}
          className="cf-btn cf-btn--danger cf-btn--md cf-btn--dangerwide"
        >
          <Icon name="trash" size={13} />
          Reset Local Cache
        </button>
        {confirmWipe && <ConfirmDialog
          title="Reset local cache?"
          message={household ? "This clears entries, overrides, categories, templates, budget targets, and saved years cached on this device, then reloads them fresh from Supabase. Your cloud data is not deleted." : "This will permanently delete all entries, overrides, categories, templates, budget targets, and saved years from this device. This cannot be undone."}
          confirmLabel="Reset Everything"
          onConfirm={() => {
          try {
            // Everything cf_ *except* what belongs to this device rather than
            // to the household. The sweep used to take those too, and none of
            // them come back from Supabase: the browser-held Anthropic key
            // (the AI features then stop working with no explanation), the
            // WebAuthn credential (biometric unlock silently unenrols), the
            // notification hour and app-lock timeout, and the remembered
            // sign-in email. The dialog promises to clear the cached copy of
            // the household and reload it from the cloud, and that is now all
            // it does.
            const keep = (k) => k.startsWith("cf_webauthn_") || [
              "cf_ai_key", "cf_lock_timeout", "cf_lock_on_launch",
              "cf_notify_enabled", "cf_notify_hour", "cf_saved_email",
              "cf_last_backup", "cf_coach_swipe"
            ].includes(k);
            Object.keys(localStorage)
              .filter((k) => k.startsWith("cf_") && !keep(k))
              .forEach((k) => localStorage.removeItem(k));
          } catch (e) {
            // Storage can throw outright in private/partitioned modes.
            // Nothing here is essential to the current interaction, so a
            // failure is genuinely ignorable — real save failures surface
            // via notifyStorageWriteFailure.
          }
          window.location.reload();
        }}
          onCancel={() => setConfirmWipe(false)}
        />}
        {household && <div className="danger-delete-account">
          <p className="c-textMid">
            Deleting your account removes your sign-in and your own settings, and takes you out of the household. If you're its only member, the household goes too.
          </p>
          <button
            onClick={() => setLifecycle({ kind: "delete" })}
            className="cf-btn cf-btn--danger cf-btn--md"
          >
            Delete my account
          </button>
          {lifecycleMsg && <div role="alert" className="error-text-mt10">{lifecycleMsg}</div>}
          {lifecycleDialog()}
        </div>}
      </Card> }
    };
    // Grouped by what you came here to do, not alphabetically. The old index
    // strip was alphabetical because it was an index; a directory you read
    // top to bottom wants the related things together.
    const SETTINGS_GROUPS = [
      ["Your money", ["years", "accounts", "categories", "money", "holidays", "reset"]],
      ["Alerts & display", ["appearance", "threshold", "notifications"]],
      ["Sharing & data", ["household", "sync", "backup", "templates", "activity"]],
      ["Advanced", ["ai", "security", "danger"]]
    ];
    const openPage = youSub && SETTINGS_PAGES[youSub] ? SETTINGS_PAGES[youSub] : null;
    return <div className="cf-page settings-page">
      {openPage ? <div className="set-detail-head">
        <button className="set-back" onClick={() => { haptic(); setYouSub(null); }}>
          <span aria-hidden="true">‹</span>
          Settings
        </button>
        {/* No page title here: every one of these pages already opens with its
            own heading, and that heading is the better of the two — it carries
            the help tip and the live year ("Target Budget Reset — 2026"). A
            second copy above it was just the same words twice. */}
      </div> : <div className="set-dir-head">
        <a href="#/help" className="settings-help-link"><Icon name="help" size={14} />Help</a>
      </div>}
      {openPage ? <div className="settings-cards set-detail">{openPage.render()}</div>
        : <div className="set-dir">
          {SETTINGS_GROUPS.map(([groupTitle, ids]) => {
            const rows = ids.filter((id) => SETTINGS_PAGES[id] && (!SETTINGS_PAGES[id].when || SETTINGS_PAGES[id].when()));
            if (!rows.length) return null;
            return <div key={groupTitle} className="set-group">
              <h2 className="set-group-title">{groupTitle}</h2>
              <div className="set-list">
                {rows.map((id) => {
                const d = SETTINGS_PAGES[id];
                let val = "";
                try { val = d.value() || ""; } catch (e) { val = ""; }
                return <button
                  key={id}
                  className={"set-row" + (d.tone === "danger" ? " set-row--danger" : "")}
                  onClick={() => { haptic(); setYouSub(id); }}
                >
                  <span className="set-row-label">{d.title}</span>
                  <span className="set-row-value">{val}</span>
                  <span className="set-row-chev" aria-hidden="true">›</span>
                </button>;
              })}
              </div>
            </div>;
          })}
        </div>}
    </div>;;
  }
  export class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { err: null };
    }
    static getDerivedStateFromError(e) {
      return { err: e };
    }
    componentDidCatch(e, info) {
      console.error("CashFlow render error:", e, info);
    }
    render() {
      if (this.state.err) {
        return <div className="errorboundary-wrap">
          <div className="errorboundary-title">⚠ Something went wrong</div>
          <pre className="errorboundary-pre">{this.state.err.message}{"\n\n"}{this.state.err.stack}</pre>
          <button onClick={() => this.setState({ err: null })} className="errorboundary-retry-btn">
            Try Again
          </button>
        </div>;
      }
      return this.props.children;
    }
  }
