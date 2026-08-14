  // The app's user documentation. It replaces the explanatory paragraphs that
  // used to sit inside the UI — a control's label says what it is, this page
  // says how the feature works — and it is where the keyboard shortcuts live
  // now that they aren't a modal.
  //
  // The prose is data, not markup: a section is a list of blocks, and the
  // renderer below turns each block into an element. Editing the docs then
  // means editing English in one place instead of threading text through
  // createElement calls.
  const HELP_SECTIONS = [
    {
      id: "help-start",
      title: "Getting started",
      blocks: [
        { p: "CashFlow is a forward-looking budget. You describe your income and bills once — including how often each one repeats — and the app projects every occurrence across the year, carrying a running balance forward so you can see what your account looks like on any future date." },
        { p: "Three things get you a useful forecast:" },
        { steps: [
          ["Set your opening balance", "Settings → Budget Years holds the starting balance for your first budget year. Every later year carries forward from the one before it, so it is only entered once."],
          ["Add your recurring entries", "Pay, rent or mortgage, loan payments, utilities, subscriptions. Recurring entries fill the whole year from one definition."],
          ["Set an alert threshold", "Settings → Alert Threshold. Balances below it are flagged amber on the Dashboard, in the Forecast and in the Budget grid; below zero is red."]
        ] },
        { p: "Everything is stored on your device first. If the app is configured with a Supabase project, your household's data also syncs to the cloud and to other devices signed in to the same household." }
      ]
    },
    {
      id: "help-entries",
      title: "Entries and schedules",
      blocks: [
        { p: "An entry is a definition, not a single transaction. A monthly rent entry is one row in Entries and twelve rows in the budget." },
        { sub: "Entry types" },
        { defs: [
          ["Income", "Adds to the balance and to income totals."],
          ["Expense", "Subtracts from the balance and adds to expense totals."],
          ["Transfer", "Moves money without counting as income or expense — it changes the running balance but is left out of the income and expense totals and out of Budget vs Actual."]
        ] },
        { sub: "How often it repeats" },
        { defs: [
          ["One-time", "A single date."],
          ["Daily / weekly / monthly / yearly", "Every N days, weeks, months or years. Weekly repeats can name specific weekdays, so “every second Friday” and “every Monday and Thursday” are both one entry."],
          ["Semi-monthly", "The 1st-and-15th pattern, for pay that lands twice a month."],
          ["Ends on", "Optional. A loan that finishes in September stops generating occurrences after it, and the Dashboard flags it as ending soon."]
        ] },
        { p: "Amounts are always entered as positive numbers — the type decides the sign. An amount of $0.00 is allowed but needs a note explaining it." },
        { sub: "Paydays that land on a closed day" },
        { p: "Direct deposit doesn't arrive on a Saturday, a Sunday or a statutory holiday — it lands on the last banking day before. Any repeating income entry with “payroll” in its description is checked against that, so “Ken - Payroll (15th)” on Saturday 15 August is marked ↤ in the budget grid, on the Dashboard and in the Forecast; hover, tap or tab to the marker and it tells you the money is in the account on Friday the 14th, and why." },
        { p: "The occurrence itself does not move, on purpose. It stays on the payday, in the month you budgeted it, and every total, running balance and Budget vs Actual figure is worked out from that date. A 1st-of-month payday paid on the 31st of the month before would otherwise move income between two months' totals to fix what is really a display question — the marker answers it without touching your budget." },
        { p: "Holidays are British Columbia's, including the two the province lists as optional (Easter Monday and Boxing Day). The dates are fetched once per budget year from canada-holidays.ca and kept on your device; the app also works them out from the rules on its own, so the marker is right offline, on a brand-new budget year, and if that site is ever unreachable. Moving a date yourself — dragging the row, or Edit this occurrence — re-checks from wherever you put it." },
        { sub: "Changing one occurrence without changing the plan" },
        { p: "Clicking a row in the budget grid opens that occurrence for editing. For the rest, right-click the row (long-press on touch, or use the ⋮ button) to open the row menu:" },
        { defs: [
          ["Edit this occurrence", "Overrides the amount, notes or actual amount paid for that date only — the entry itself is untouched. It is also where a receipt photo is attached. Settings → Audit lists your twenty most recent overrides with a one-click revert."],
          ["Edit recurring entry", "Changes the entry, and so every occurrence of it."],
          ["Skip this occurrence", "Drops a single date — a month you didn't pay, a bill that was waived. Skipped dates are listed above the grid for that month, each with a Restore button."],
          ["Reset occurrence", "Removes an override and puts the originally scheduled amount back."],
          ["Delete entry", "Removes the entry and all of its scheduled occurrences. The toast that follows offers an undo."]
        ] },
        { sub: "Marking things paid" },
        { p: "The circle beside a row marks that occurrence paid. Paid rows dim and strike through, and the Dashboard's next-seven-days list drops them. Marking paid does not change any amount — it is a tick-off, not a reconciliation." },
        { p: "To record that a bill actually cost something different, open Edit this occurrence and fill in Actual Amount Paid. Leaving it blank means “paid as scheduled”. An actual updates your running balance and Budget vs Actual totals without editing the plan, so next month still shows the amount you expect to pay." },
        { sub: "Getting entries in faster" },
        { defs: [
          ["Templates", "Save a filled-in entry form as a template from the form itself, then reuse it. Settings → Templates lists what you have saved."],
          ["Duplicate", "Copies an existing entry from the Entries row menu."],
          ["CSV import", "Entries → Import CSV takes a bank export, maps its columns to fields, and adds the rows as one-time entries. You review everything — and can drop likely duplicates — before anything is added."],
          ["Describe it in words", "With AI access configured, type “rent 1650 on the 1st of every month” and the entry form fills itself in for you to check."],
          ["Scan a receipt", "Edit this occurrence takes a receipt photo. With AI access configured, Read receipt fills the merchant, date and total in from the image for you to check — nothing is saved until you save the occurrence."]
        ] }
      ]
    },
    {
      id: "help-budget",
      title: "The Budget tab",
      blocks: [
        { p: "Five views of the same year. The month strip switches months; the year pills beside the logo switch budget years." },
        { defs: [
          ["Monthly", "The month as a ledger: opening balance, every occurrence in date order split into 1–14 and 15–31, a marker on today, and the balance after each row. The totals bar stays pinned at the bottom. Select rows with the checkboxes for bulk actions, and export the month to CSV or PDF."],
          ["Daily", "The same month as one card per day that has something on it, with the balance carried to the end of that day — useful for spotting the week where four bills land together. Desktop only: on a phone the Monthly cards already read day by day."],
          ["Budget vs Actual", "What you planned against what is scheduled, per category. Set a target from the row menu; the bar and the amounts turn red once spending passes it."],
          ["Forecast", "A rolling 30, 60 or 90 days from today, across year boundaries, with the running balance beside each row."],
          ["Entries", "The master list of entry definitions. Filter by type, category, schedule, status or date range, sort any column, and search descriptions, notes, categories and amounts — a bare number matches it, and \">500\" or \"<50\" filter by size."]
        ] },
        { sub: "Rollover targets" },
        { p: "A category target can roll over. With rollover on, anything you didn't spend against that category earlier in the year is added to this month's target — envelope-style budgeting, so a quiet month funds a heavy one instead of being lost." },
        { sub: "The Forecast confidence column" },
        { defs: [
          ["✓", "Either income, or an expense that fits inside its category's monthly target."],
          ["—", "No target is set for that category, so there is nothing to judge it against."],
          ["A percentage", "The expense is bigger than the target for its category that month, and by how much. Amber to about 150% of target, red beyond it."]
        ] },
        { p: "Confidence is about your own budget targets, not about whether the bill will arrive. An unbudgeted category is not a problem — it just means the forecast can't check that row for you." }
      ]
    },
    {
      id: "help-dashboard",
      title: "The Dashboard",
      blocks: [
        { p: "The Dashboard answers “am I all right?” at a glance, and every number on it is drawn from the same projection as the Budget tab." },
        { defs: [
          ["Balance today · Next low point · Due rest of month", "The three tiles across the top: where you are now, the lowest balance coming up and how far away it is, and what is still to be paid this month."],
          ["Upcoming — next 7 days", "Everything scheduled in the next week with its balance after, and a circle to tick each one off."],
          ["Annual income, expenses, surplus and lowest balance", "The year as four numbers, each with a sparkline of its shape across the months."],
          ["What changed", "A written comparison of this month against last, generated on demand when AI access is configured."],
          ["Charts", "Running balance, surplus or shortfall by month, income against expenses, top expense categories, income sources, and budget against actual for the year."],
          ["Monthly summary and year-over-year", "The twelve-month table, exportable to CSV or PDF, and a comparison against your other budget years once you have more than one."]
        ] },
        { p: "Customize (top left) shows, hides and reorders each widget individually. Your layout is part of your data, so it syncs across your devices." },
        { p: "When a projected balance drops below your alert threshold, a banner appears at the top of the Dashboard and Budget tabs; View alerts opens the full list, and Dismiss hides the banner until tomorrow." }
      ]
    },
    {
      id: "help-plan",
      title: "The Plan tab",
      blocks: [
        { sub: "Debt payoff" },
        { p: "Debts you already budget for are detected from your entries: an expense whose description or category reads like debt — loan, credit, mortgage, a card name, a vehicle payment — is picked up automatically with its monthly payment. Add a balance and an interest rate and the tracker works out the interest still to pay and the date it clears. Debts you don't pay from this budget can be added manually, and anything detected wrongly can be hidden." },
        { sub: "Payoff strategy" },
        { defs: [
          ["Avalanche", "Highest interest rate first. Costs the least in total interest."],
          ["Snowball", "Smallest balance first. Clears individual debts sooner, which some people find easier to stick to."]
        ] },
        { p: "Both simulations assume you keep paying the same total every month: when one debt clears, its payment rolls into the next one. Extra $/month adds to that total, and the chips above the chart include or exclude individual debts, so you can see what one of them is costing you. Only debts with both a balance and a payment can be simulated." },
        { sub: "Savings goals" },
        { p: "A goal is a target amount, what you have saved so far, and what you put aside each month. The app works out the date you reach it, says whether you are on track for a target date you set, and tells you the monthly figure that would get you there if you aren't. A goal can also add its payout to the budget as a one-time expense on the target date, so a planned purchase shows up in the forecast." }
      ]
    },
    {
      id: "help-ai",
      title: "AI Insights",
      blocks: [
        { p: "The AI features are optional and off until you configure access. They cover the yearly financial assessment, the monthly “what changed” summary, receipt scanning, CSV categorisation and natural-language entry capture." },
        { sub: "Two ways to give the app access" },
        { defs: [
          ["An API key on this device", "Settings → AI Insights holds an Anthropic API key. It is stored on this device only and is deliberately never synced or shared with household members, because it bills your account — so enter it again on each device you use. Anyone who can run script on the page could read it, as with any browser-side key."],
          ["The ai-proxy Edge Function", "Deploying the proxy that ships with the project (see the README) keeps the key on the server, shares it across the whole household, and means no key is held in a browser at all. The app prefers the proxy automatically whenever it is available."]
        ] },
        { p: "Running an AI feature sends the relevant budget data to Anthropic — through your proxy if you have one, straight from your browser if you are using a local key. Nothing is sent until you press the button that does it." },
        { p: "The assessment is generated by a language model. It is a second opinion on your own numbers, not professional financial advice." }
      ]
    },
    {
      id: "help-settings",
      title: "Settings reference",
      blocks: [
        { sub: "General" },
        { defs: [
          ["Alert Threshold", "The balance you want to be warned about. Used for Dashboard alerts, Forecast warnings and the amber balances in the Budget grid."],
          ["Appearance", "Light or dark theme. The choice is per device."],
          ["Notifications", "One notification a day at the hour you choose, listing every bill due that day with its amount, plus a warning when your forecast balance is heading below your threshold. With background delivery configured these arrive as ordinary system notifications whether or not the app is open; without it they only appear while the app is open."],
          ["Budget Years", "Years are added in sequence — the next one only. The first year holds your opening balance; later years carry forward automatically. Switch the active year with the pills beside the logo."],
          ["Data Backup & Restore", "Exports everything to a JSON file, and restores one. Restoring replaces the data you have now, so export first if you are unsure."],
          ["Supabase — Auto Sync", "Shows whether cloud sync is connected and when it last saved. Save Now and Reload from Cloud force the transfer in either direction."],
          ["Manage Categories", "Add, rename, recolour, reorder and remove categories. Renaming applies to new entries; existing entries keep the category name they were saved with."],
          ["Security", "Auto-lock hides the app behind a lock screen after 5, 15 or 30 minutes in the background. On a phone that supports it you can unlock with your fingerprint or face instead of your password; the registration is per device."],
          ["Target Budget Reset", "Sets every category's monthly target to the expenses already scheduled for that month. It overwrites all existing targets for the year — a starting point to fine-tune, not an undoable tweak."],
          ["Danger Zone", "Clears this device's local cache. Data in Supabase is not affected and the app reloads from the cloud straight after; on a device with no cloud sync this is not recoverable."]
        ] },
        { sub: "Household" },
        { p: "Lists the people in your household and creates invite codes for new ones. A family member signs in, enters the code, and shares the same budget." },
        { sub: "Templates" },
        { p: "The entry templates you have saved, with a Remove button for each." },
        { sub: "Audit" },
        { p: "Every per-date override you have made this year, newest first, each with a Revert that restores the originally scheduled amount and notes." }
      ]
    },
    {
      id: "help-shortcuts",
      title: "Keyboard shortcuts",
      blocks: [
        { p: "Shortcuts work whenever you are not typing in a field." },
        { keys: [
          ["1–5", "Switch tabs, in order"],
          ["D / B / P / A / S", "Dashboard · Budget · Plan · AI · Settings"],
          ["F / R", "Budget → Forecast · Entries"],
          ["N", "Quick add entry"],
          ["/", "Focus search"],
          ["←  →", "Previous / next month, in Budget"],
          ["Esc", "Clear search / close"],
          ["?", "Open this page"]
        ] },
        { p: "On a phone, swipe left or right across the budget grid to change months, and pull down at the top of the page to sync." }
      ]
    },
    {
      id: "help-data",
      title: "Your data, offline and privacy",
      blocks: [
        { p: "The app is a single static page with no server of its own. Your budget lives in this browser's storage, and — when the app is configured with a Supabase project — in that project's database, which you control." },
        { defs: [
          ["Offline", "Everything except cloud sync and the AI features works with no connection. Changes made offline are kept on the device and sync when the connection is back."],
          ["Installing", "Install App in the account menu adds it to your home screen or desktop, where it runs in its own window."],
          ["Two devices at once", "If a device has unsynced changes and the cloud copy changed as well, the app stops and asks which to keep rather than guessing."],
          ["Backups", "Cloud sync is not a backup — it copies deletions too. Export a JSON backup from Settings periodically; the app reminds you when it has been more than a month."]
        ] }
      ]
    }
  ];
  function HelpView() {
    const renderBlock = (block, i) => {
      if (block.p) return /* @__PURE__ */ React.createElement("p", { key: i, className: "help-p" }, block.p);
      if (block.sub) return /* @__PURE__ */ React.createElement("h3", { key: i, className: "help-sub" }, block.sub);
      if (block.steps) return /* @__PURE__ */ React.createElement("ol", { key: i, className: "help-steps" }, block.steps.map(([term, desc]) => /* @__PURE__ */ React.createElement("li", { key: term, className: "help-step" }, /* @__PURE__ */ React.createElement("span", { className: "help-term" }, term), /* @__PURE__ */ React.createElement("span", { className: "help-desc" }, desc))));
      if (block.defs) return /* @__PURE__ */ React.createElement("dl", { key: i, className: "help-defs" }, block.defs.map(([term, desc]) => /* @__PURE__ */ React.createElement(React.Fragment, { key: term }, /* @__PURE__ */ React.createElement("dt", { className: "help-term" }, term), /* @__PURE__ */ React.createElement("dd", { className: "help-desc" }, desc))));
      if (block.keys) return /* @__PURE__ */ React.createElement("div", { key: i, className: "help-keys" }, block.keys.map(([key, desc]) => /* @__PURE__ */ React.createElement("div", { key, className: "shortcut-row" }, /* @__PURE__ */ React.createElement("span", { className: "txm" }, desc), /* @__PURE__ */ React.createElement("kbd", { className: "cf-text-mono-13 shortcut-kbd" }, key))));
      return null;
    };
    return /* @__PURE__ */ React.createElement("div", { className: "cf-page help-page" }, /* @__PURE__ */ React.createElement("div", { className: "settings-quicklinks" }, HELP_SECTIONS.map((s) => /* @__PURE__ */ React.createElement(
      "a",
      {
        key: s.id,
        href: `#${s.id}`,
        onClick: (e) => {
          e.preventDefault();
          const el = document.getElementById(s.id);
          if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
        },
        className: "quicklink-pill"
      },
      s.title
    ))), HELP_SECTIONS.map((s) => /* @__PURE__ */ React.createElement(Card, { key: s.id, id: s.id, className: "mb-20" }, /* @__PURE__ */ React.createElement(SectionTitle, null, s.title), s.blocks.map(renderBlock))), /* @__PURE__ */ React.createElement("div", { className: "help-footer txl" }, "Build ", APP_VERSION));
  }
