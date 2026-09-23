// The app's data model: what an entry, an occurrence, an override and the
// household payload look like. Every money figure is integer cents unless its
// name says otherwise (roundMoney, dollarsToCents and fmt in lib/format.ts are
// the only conversions).

export type Cents = number;
/** A calendar date as stored: "YYYY-MM-DD", local time. */
export type DateStr = string;
/** An ISO-8601 timestamp, as written by `new Date().toISOString()`. */
export type Timestamp = string;

export type EntryType = "income" | "expense" | "transfer";
export type RecurUnit = "day" | "week" | "semimonth" | "month" | "monthend" | "monthweekday" | "year";
export type TransferDirection = "in" | "out";
/** New ids are UUIDs (genId); entries from before that carry Date.now() numbers. */
export type Id = string | number;

/** A scheduled item: one-off or repeating income, expense or transfer. */
export interface Entry {
  id: Id;
  desc: string;
  type: EntryType;
  amount: Cents;
  category: string;
  startDate: DateStr;
  notes?: string;
  repeats?: boolean;
  recurUnit?: RecurUnit;
  recurEvery?: number;
  /** Weekdays (0 = Sunday) for "week" and "monthweekday" schedules. */
  recurDays?: number[];
  /** Which weekday of the month for "monthweekday": 1..4, or -1 for the last. */
  recurNth?: number;
  recurEnd?: DateStr | null;
  /** Per-month amounts (12 figures) when the amount varies through the year. */
  monthlyAmounts?: Cents[] | null;
  transferDirection?: TransferDirection;
  accountId?: string;
  /** Destination account of an inter-account transfer. */
  toAccountId?: string;
  /** Payroll on a bank holiday: true moves the deposit to the prior banking day. */
  bankingDay?: boolean;
  /** The entry this one was copied from by "Copy year". */
  copiedFrom?: string;
  goalId?: string;
  /** Who added it (a household member's user id). */
  userId?: string;
  archived?: boolean;
  [extra: string]: unknown;
}

/** One change to a single occurrence, keyed by occurrence id in its year. */
export interface Override {
  amount?: Cents;
  actualAmount?: Cents;
  month?: number;
  day?: number;
  desc?: string;
  notes?: string;
  skipped?: boolean;
  /** A receipt image as a data URL (held in IndexedDB, not localStorage). */
  attachment?: string | null;
  _by?: string;
  _savedAt?: Timestamp;
  _history?: { ts: Timestamp; by?: string; prev: Override }[];
}
/** occurrence id -> override, for one year. */
export type YearOverrides = Record<string, Override>;
/** year -> that year's overrides. */
export type OverridesByYear = Record<string | number, YearOverrides>;

/** One occurrence of an entry on a date: what the ledger, charts and totals read. */
export interface FlowEvent {
  /** `${entryId}-${year}-${month}-${day}`, plus "-in" on a transfer's second leg. */
  id: string;
  entryId: Id;
  desc: string;
  type: EntryType;
  transferDirection: TransferDirection;
  accountId: string;
  /** What moves the balance: the actual amount if one was recorded, else the planned one. */
  amount: Cents;
  plannedAmount: Cents;
  category: string;
  notes: string;
  attachment: string | null;
  isOverride: boolean;
  _by?: string;
  _savedAt?: Timestamp;
  _leg?: boolean;
  userId?: string;
  month: number;
  day: number;
  date: Date;
  depositDate: Date;
  depositShifted: boolean;
  recurUnit: RecurUnit;
  recurEvery: number;
  repeats: boolean;
}
/** A FlowEvent once computeFlow has run the balance through it. */
export interface FlowRow extends FlowEvent {
  balance: Cents;
}

export interface YearConfig {
  year: number;
  openingBalance: Cents;
}

export interface Goal {
  id: Id;
  name: string;
  target: Cents;
  saved: Cents;
  /** The planned monthly contribution. */
  monthly: Cents;
  targetDate?: DateStr;
  /** A sinking fund: starts again this many months after each target date (0 = once). */
  repeatMonths?: number;
  /** The recurring contribution entry, when one was created with the goal. */
  entryId?: Id | null;
  /** The one-time payout expense on the target date, when one was created. */
  payoutEntryId?: Id | null;
  archived?: boolean;
  createdAt?: Timestamp;
}

export interface Account {
  id: string;
  name?: string;
  kind?: string;
  [extra: string]: unknown;
}

/** A row of household_members, as useHousehold loads it. */
export interface Member {
  user_id: string;
  full_name?: string | null;
  disabled?: boolean;
  role: "owner" | "editor" | "viewer";
  joined_at?: Timestamp;
}

export interface Asset {
  id: string;
  name: string;
  kind: string;
  value: Cents;
  asOf: DateStr;
  note?: string;
  createdAt?: Timestamp;
}

/** A saved entry shape offered when adding a new one. */
export type Template = Partial<Entry> & { desc: string };

/** One line of the household's activity feed. */
export interface ActivityItem {
  id: string;
  at: Timestamp;
  by?: string;
  kind: string;
  what: string;
}

/** A debt's figures, keyed by the entry it belongs to. */
export interface DebtFigures {
  balance?: Cents;
  rate?: number;
  payment?: Cents;
  [extra: string]: unknown;
}

export interface HolidayDay {
  name: string;
  optional?: boolean;
  source?: string;
}

/**
 * Everything that syncs between a household's members: one field per row of
 * HOUSEHOLD_FIELDS (lib/household-sync.ts), which is checked against this at
 * compile time.
 */
export interface HouseholdData {
  entries: Entry[];
  overridesByYr: OverridesByYear;
  yearConfigs: YearConfig[];
  categories: string[];
  categoryColors: Record<string, string>;
  activeYear: number;
  alertThreshold: Cents;
  assets: Asset[];
  goals: Goal[];
  /** Extra monthly payment for the payoff simulation, as typed (dollars). */
  debtExtra: string;
  debtSimExcluded: string[];
  budgetTargets: Record<string, Cents>;
  templates: Template[];
  /** occurrence id -> ticked as paid. */
  completed: Record<string, boolean>;
  debtData: Record<string, DebtFigures>;
  deletedCopyIds: Record<string, boolean>;
  /** year -> date -> holiday. */
  holidays: Record<string, Record<DateStr, HolidayDay>>;
  currency: string;
  locale: string;
  holidayRegion: string;
  activity: ActivityItem[];
  accounts: Account[];
}

/** One member's own view settings: one field per row of MEMBER_PREF_FIELDS. */
export interface MemberPrefs {
  darkMode: boolean;
  forecastHorizon: number;
  dashHidden: Record<string, boolean>;
  dashOrder: string[];
  colOrder: string[];
  budgetColOrder: string[];
  regFilter: string;
  regFilterCats: string[];
  regFilterScheds: string[];
  regFilterStatus: string[];
}

/** The setter for each field of T, as useState/useLS return them. */
export type Setters<T> = { [K in keyof T]: React.Dispatch<React.SetStateAction<T[K]>> };

/** What save_household stores and load_household returns. */
export interface HouseholdPayload extends HouseholdData {
  schemaVersion: number;
  /** When this copy was saved; the server compares it to detect a concurrent save. */
  savedAt?: Timestamp;
}
