// Three-way merge of household fields, row by row.
//
// When a save is refused because someone else wrote the same field since this
// device last saw it (save_household_fields), or when another member's save
// arrives over Realtime, there are three copies of that field: the one both
// sides started from (base), this device's (local) and the server's (remote).
// Each row — an entry, a goal, one occurrence's override — merges on its own:
//
//   unchanged here        -> take theirs (including their deletion)
//   unchanged there       -> keep ours (including our deletion)
//   changed identically   -> either
//   changed differently   -> a clash
//
// so two people editing different entries, or one editing an entry while the
// other adds one, both keep their work. Only two different edits to the same
// row need a person to choose, and that is the divergence dialog's job.
//
// Pure functions of plain data; nothing here touches state or the network.
import type { HouseholdData } from "../types.js";

// How each field is made of rows.
type Shape =
  | { kind: "value" }                          // one value: the whole field is the row
  | { kind: "rows"; key: (row: any) => string } // an array of rows with an identity
  | { kind: "list" }                           // an array of strings, as a set
  | { kind: "map"; depth: 1 | 2 }              // { key: row } or { key: { key: row } }
  | { kind: "log"; limit: number };            // append-only records with an id

const byId = (r: any) => String(r && r.id);
// Long enough to answer "what happened while I was away" across a busy week,
// short enough that the log never becomes the largest thing in the payload:
// 200 records at ~120 bytes is ~24 KB against a household of a few hundred KB.
export const ACTIVITY_LIMIT = 200;

export const FIELD_SHAPES: Record<keyof HouseholdData, Shape> = {
  entries: { kind: "rows", key: byId },
  goals: { kind: "rows", key: byId },
  assets: { kind: "rows", key: byId },
  accounts: { kind: "rows", key: byId },
  templates: { kind: "rows", key: (t) => String(t && t.desc) },
  yearConfigs: { kind: "rows", key: (y) => String(y && y.year) },
  activity: { kind: "log", limit: ACTIVITY_LIMIT },
  overridesByYr: { kind: "map", depth: 2 },
  holidays: { kind: "map", depth: 2 },
  completed: { kind: "map", depth: 1 },
  categoryColors: { kind: "map", depth: 1 },
  debtData: { kind: "map", depth: 1 },
  deletedCopyIds: { kind: "map", depth: 1 },
  budgetTargets: { kind: "map", depth: 1 },
  categories: { kind: "list" },
  debtSimExcluded: { kind: "list" },
  activeYear: { kind: "value" },
  alertThreshold: { kind: "value" },
  debtExtra: { kind: "value" },
  currency: { kind: "value" },
  locale: { kind: "value" },
  holidayRegion: { kind: "value" },
};

// Keys that don't decide whether a row changed. `_history` is an audit trail
// the server stores in its own shape, so the same row comes back with it
// rewritten; `attachment` travels separately (receipts) and its change is
// already marked by the `_savedAt` stamp every occurrence edit carries.
const IGNORED = new Set(["_history", "attachment"]);
const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})$/;

// A form of a row in which two copies that mean the same thing are equal:
// keys in order, timestamps in one format, and absent, null and empty values
// alike (the server returns an unset date as null where the client wrote "").
export function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      if (IGNORED.has(k)) continue;
      const c = canonical((v as Record<string, unknown>)[k]);
      if (c === undefined || c === null || c === "") continue;
      if (Array.isArray(c) && c.length === 0) continue;
      out[k] = c;
    }
    return out;
  }
  if (typeof v === "string" && ISO.test(v)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return v;
}
export const sameRow = (a: unknown, b: unknown): boolean => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export type RowMerge<T> = { value: T; clashes: string[] };

/** Which side a clashing row takes: this device's (the default) or theirs. */
export type ClashRule = "local" | "remote";

// One row: undefined means "not there" (never existed, or deleted).
function mergeRow<T>(key: string, b: T | undefined, l: T | undefined, r: T | undefined, clashes: string[], onClash: ClashRule): T | undefined {
  if (sameRow(l, b)) return r;
  if (sameRow(r, b)) return l;
  if (sameRow(l, r)) return l;
  clashes.push(key);
  return onClash === "remote" ? r : l;
}

function mergeRows(shape: { key: (row: any) => string }, base: any[], local: any[], remote: any[], onClash: ClashRule): RowMerge<any[]> {
  const index = (arr: any[]) => new Map((Array.isArray(arr) ? arr : []).map((row) => [shape.key(row), row]));
  const b = index(base), l = index(local), r = index(remote);
  const clashes: string[] = [];
  const merged = new Map<string, any>();
  for (const k of new Set([...b.keys(), ...l.keys(), ...r.keys()])) {
    const v = mergeRow(k, b.get(k), l.get(k), r.get(k), clashes, onClash);
    if (v !== undefined) merged.set(k, v);
  }
  // Their order, then rows only this device has, in this device's order.
  const order = [...r.keys(), ...[...l.keys()].filter((k) => !r.has(k))];
  return { value: order.filter((k) => merged.has(k)).map((k) => merged.get(k)), clashes };
}

function mergeMap(depth: 1 | 2, base: any, local: any, remote: any, onClash: ClashRule, prefix = ""): RowMerge<Record<string, any>> {
  const obj = (o: any) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});
  const b = obj(base), l = obj(local), r = obj(remote);
  const clashes: string[] = [];
  const out: Record<string, any> = {};
  for (const k of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
    if (depth === 2 && (k in l || k in r)) {
      const inner = mergeMap(1, b[k], l[k], r[k], onClash, prefix + k + "/");
      clashes.push(...inner.clashes);
      if (Object.keys(inner.value).length || (k in l && k in r)) out[k] = inner.value;
      continue;
    }
    const v = mergeRow(prefix + k, b[k], l[k], r[k], clashes, onClash);
    if (v !== undefined) out[k] = v;
  }
  return { value: out, clashes };
}

function mergeList(base: any, local: any, remote: any): RowMerge<string[]> {
  const arr = (a: any) => (Array.isArray(a) ? a : []);
  const b = new Set(arr(base)), l = new Set(arr(local)), r = new Set(arr(remote));
  // Kept unless one side removed it; added if either side added it.
  const keep = (x: string) => (l.has(x) || !b.has(x)) && (r.has(x) || !b.has(x));
  const order = [...arr(remote), ...arr(local).filter((x: string) => !r.has(x))];
  return { value: [...new Set(order)].filter(keep), clashes: [] };
}

function mergeLog(limit: number, local: any, remote: any): RowMerge<any[]> {
  const all = new Map<string, any>();
  for (const rec of [...(Array.isArray(remote) ? remote : []), ...(Array.isArray(local) ? local : [])]) {
    if (rec && rec.id != null && !all.has(String(rec.id))) all.set(String(rec.id), rec);
  }
  const value = [...all.values()].sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, limit);
  return { value, clashes: [] };
}

// Merges one field. `clashes` names the rows (entry ids, "2026/<occId>" for an
// override, the field itself for a single value) changed differently on both
// sides; the value holds this device's version of each (or theirs, with
// onClash "remote"), so nothing is lost while a person decides.
export function mergeField<K extends keyof HouseholdData>(field: K, base: unknown, local: unknown, remote: unknown, onClash: ClashRule = "local"): RowMerge<HouseholdData[K]> {
  const shape = FIELD_SHAPES[field];
  if (!shape) throw new Error("No merge rule for household field " + String(field));
  switch (shape.kind) {
    case "rows": return mergeRows(shape, base as any[], local as any[], remote as any[], onClash) as RowMerge<any>;
    case "map": return mergeMap(shape.depth, base, local, remote, onClash) as RowMerge<any>;
    case "list": return mergeList(base, local, remote) as RowMerge<any>;
    case "log": return mergeLog(shape.limit, local, remote) as RowMerge<any>;
    default: {
      const clashes: string[] = [];
      const value = mergeRow(String(field), base, local, remote, clashes, onClash);
      return { value: value as HouseholdData[K], clashes };
    }
  }
}

export interface PayloadMerge {
  /** The merged value of each field that was merged. */
  merged: Partial<HouseholdData>;
  /** Field -> rows changed differently on both sides. Empty when it all merged. */
  clashes: Partial<Record<keyof HouseholdData, string[]>>;
}

// Merges the named fields. Fields not named are not touched.
export function mergeFields(fields: (keyof HouseholdData)[], base: Partial<HouseholdData>, local: Partial<HouseholdData>, remote: Partial<HouseholdData>, onClash: ClashRule = "local"): PayloadMerge {
  const merged: Partial<HouseholdData> = {};
  const clashes: PayloadMerge["clashes"] = {};
  for (const f of fields) {
    const res = mergeField(f, base[f], local[f], remote[f], onClash);
    (merged as Record<string, unknown>)[f] = res.value;
    if (res.clashes.length) clashes[f] = res.clashes;
  }
  return { merged, clashes };
}

const FIELD_NAMES: Record<keyof HouseholdData, string> = {
  entries: "Entry", goals: "Goal", assets: "Asset", accounts: "Account", templates: "Template",
  yearConfigs: "Budget year", overridesByYr: "Occurrence", holidays: "Holiday", completed: "Paid mark",
  categoryColors: "Category colour", debtData: "Debt", deletedCopyIds: "Copied entry", budgetTargets: "Envelope",
  categories: "Categories", debtSimExcluded: "Payoff plan", activeYear: "Active year",
  alertThreshold: "Low-balance alert", debtExtra: "Extra debt payment", currency: "Currency",
  locale: "Number format", holidayRegion: "Holiday region", activity: "Activity",
};

// What clashed, as a person would name it: "Entry “Rent”", "“Rent” on Mar 1,
// 2026", "Currency". Names come from this device's copy, or the server's for a
// row deleted here; `months` are the short month names.
export function describeClashes(clashes: Partial<Record<keyof HouseholdData, string[]>>, data: Partial<HouseholdData>, months: string[], other: Partial<HouseholdData> = {}): string[] {
  const find = (field: "entries" | "goals" | "assets" | "accounts", id: string): any =>
    ((data[field] as any[]) || []).find((x) => String(x.id) === id) || ((other[field] as any[]) || []).find((x) => String(x.id) === id);
  const entryName = (id: string) => {
    const e = find("entries", id);
    return e ? "“" + e.desc + "”" : "an entry";
  };
  const out: string[] = [];
  for (const field of Object.keys(clashes) as (keyof HouseholdData)[]) {
    const label = FIELD_NAMES[field] || String(field);
    for (const key of clashes[field] || []) {
      if (FIELD_SHAPES[field] && FIELD_SHAPES[field].kind === "value") out.push(label);
      else if (field === "entries") out.push(find("entries", key) ? "Entry " + entryName(key) : "An entry");
      else if (field === "goals" || field === "assets" || field === "accounts") {
        const row = find(field, key);
        out.push(label + (row && row.name ? " “" + row.name + "”" : ""));
      } else if (field === "overridesByYr") {
        // "<year>/<entryId>-<year>-<month>-<day>", the entry id itself possibly
        // containing dashes (a UUID).
        const m = /^(\d+)\/(.*)-(\d{4})-(\d{1,2})-(\d{1,2})(-in)?$/.exec(key);
        out.push(m ? entryName(m[2]) + " on " + (months[+m[4]] || "?") + " " + m[5] + ", " + m[3] : label);
      } else out.push(label + " “" + key.split("/").pop() + "”");
    }
  }
  return out;
}
