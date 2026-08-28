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
        { shot: ["settings-years", "Settings \u2192 Budget Years. The opening balance sits on the first year in the list; later years say what they carry forward from."] },
        { p: "Everything is stored on your device first. If the app is configured with a Supabase project, your household's data also syncs to the cloud and to other devices signed in to the same household." }
      ]
    },
    {
      id: "help-walkthroughs",
      title: "Step by step",
      blocks: [
        { p: "The seven things people actually do, in order, with the screen each step happens on. The sections after this one are the reference: what every view and setting does." },

        { sub: "1. Set up your first budget" },
        { steps: [
          ["Open Settings \u2192 Budget Years", "The avatar at the top right opens the menu; Settings is in it. On a phone, Settings is the last item in the bottom bar."],
          ["Type your opening balance", "What is in the account today. It goes on the first year in the list \u2014 every later year carries forward from the one before it, so you enter this once and never again."],
          ["Add your income", "Budget \u2192 Entries \u2192 + Add Entry. Start with pay: choose Income, enter the amount of one paycheque, and set how often it repeats."],
          ["Add the bills you already know", "Rent or mortgage, loans, utilities, subscriptions. One entry each, with its own schedule \u2014 a monthly bill entered once fills the whole year."],
          ["Set an alert threshold", "Settings \u2192 Alert Threshold. Any projected balance below it is flagged amber; below zero is red. Pick the number that would actually worry you."]
        ] },
        { p: "That is enough for a working forecast. The Dashboard will now show a balance for any date in the year." },

        { sub: "2. Add a recurring bill" },
        { steps: [
          ["Open the entry form", "+ Add on any budget view, or + Add Entry on the Entries list. Both open the same form."],
          ["Describe it and enter the amount", "Always a positive number \u2014 choosing Expense is what makes it subtract."],
          ["Pick the schedule", "Monthly on the 12th, every second Friday, the 1st and the 15th, every Monday and Thursday: all of these are one entry, not twelve."],
          ["Set Ends on if it finishes", "A car loan with nine payments left stops generating occurrences after the last one, and the Dashboard flags it as ending soon."],
          ["Save", "The bill appears on every date it falls on, for the whole year, with the running balance adjusted after each one."]
        ] },
        { shot: ["entry-form", "The entry form. Describe it in words at the top fills the rest in for you when AI access is configured."] },

        { sub: "3. Record what a bill actually cost" },
        { p: "Marking a row paid is a tick-off; it does not change any amount. Recording a different figure is a separate step, and it deliberately does not touch next month's plan." },
        { steps: [
          ["Open the occurrence", "Click the row in the Monthly grid \u2014 or right-click it (long-press on a phone, or the \u22EE button) and choose Edit this occurrence."],
          ["Fill in Actual Amount Paid", "Leave it blank and the occurrence counts as paid exactly as scheduled. Fill it in and your running balance and Budget vs Actual use the real figure."],
          ["Save", "Only that date changes. The entry still says what you expect to pay, so next month is unaffected."]
        ] },
        { p: "Settings \u2192 Audit lists the twenty most recent overrides, each with a one-click revert, if you want to check or undo what has been changed. In a household with more than one member each one names who made it, and the occurrence editor says so too \u2014 so \u201cwho moved the rent to the 3rd?\u201d has an answer. Entries carry their author the same way; open one and the form says who added it. Changes made before this existed have no author recorded and simply show nothing." },

        { sub: "4. Change or skip a single date" },
        { p: "Right-click a row in the budget grid \u2014 long-press on touch, or use the \u22EE button at the end of the row \u2014 to open the row menu. Every option on it affects one date except Edit recurring entry and Delete entry, which affect all of them." },
        { shot: ["row-menu", "The row menu. Everything above the divider is about this one date."] },
        { steps: [
          ["A one-off different amount", "Edit this occurrence."],
          ["A month you didn't pay", "Skip this occurrence. Skipped dates are listed above that month's grid, each with a Restore button, so nothing disappears silently."],
          ["Undo a change", "Reset occurrence puts the originally scheduled amount back."],
          ["Move it to another date", "Drag the row, or set a new day in Edit this occurrence. A payday you move is re-checked for weekends and holidays from wherever you put it."]
        ] },

        { sub: "5. Set a budget target and watch it" },
        { steps: [
          ["Open Budget \u2192 Budget vs Actual", "Every category you use is listed with what is scheduled against it this month."],
          ["Set a target from the row menu", "The bar fills as spending approaches it, and turns red once it goes past."],
          ["Turn on rollover for categories that vary", "Anything you didn't spend earlier in the year is added to this month's target \u2014 envelope-style, so a quiet month funds a heavy one instead of being lost."]
        ] },
        { shot: ["bva", "Budget vs Actual. The Total row at the bottom carries the same over-or-under note as each category."] },
        { p: "Targets are what the Forecast's “vs Target” column judges each row against, so setting a few makes the forecast more useful as well." },

        { sub: "6. Roll into next year" },
        { p: "Recurring entries without an end date flow into a new year on their own. What needs carrying over is everything else \u2014 and one button does all of it." },
        { steps: [
          ["Add the year", "Settings \u2192 Budget Years \u2192 + Add <year>, or the + Add <year> pill at the end of the month strip once you are in November or December. Both do exactly the same work."],
          ["Check what it says it did", "It reports the budget targets copied, the one-time entries brought forward, the modified occurrences carried over, and the occurrences it mirrored last year's amount pattern onto."],
          ["Fill in the gaps and re-run it if you like", "Copy \u2192 <year> on the earlier year syncs anything you have added since. It is safe to press repeatedly: it only ever adds what is missing, and never touches anything you have already edited in the new year."]
        ] },
        { p: "One-time entries are copied onto the same month and day, with any edit you made to them in the old year baked in. A copy you delete on purpose is remembered and is not brought back on the next run." },

        { sub: "7. Back up, and restore" },
        { p: "Export a backup before anything you are unsure about. The app reminds you every 30 days." },
        { steps: [
          ["Settings \u2192 Data Backup & Restore \u2192 Export Backup", "Saves a dated CashFlow_Backup_YYYY-MM-DD.json holding everything the app stores for your household \u2014 entries, per-date edits, targets, goals, debts, categories, holidays and receipt photos."],
          ["Keep it somewhere that isn't this device", "That is the point of it."],
          ["To restore, choose Import Backup", "Pick the file, read what the confirmation says, and confirm."]
        ] },
        { shot: ["settings-backup", "Settings \u2192 Data Backup & Restore."] },
        { p: "Restoring replaces everything with what is in the file, and anything the file doesn't carry goes back to its default \u2014 which is why it asks first. The toast that follows offers one undo, for the few seconds it is up; after that the only way back is another backup." }
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
          ["Transfer", "Moves money without counting as income or expense — it changes the running balance and appears in the In or Out column of every grid, but stays out of the income and expense totals and out of Budget vs Actual. When a year has any transfers, the Dashboard's monthly summary grows a Transfers column so each row still adds up: income, less expenses, plus transfers, is the surplus — and the surplus is always the movement in the closing balance beside it."]
        ] },
        { sub: "How often it repeats" },
        { defs: [
          ["One-time", "A single date."],
          ["Daily / weekly / monthly / yearly", "Every N days, weeks, months or years. Weekly repeats can name specific weekdays, so “every second Friday” and “every Monday and Thursday” are both one entry."],
          ["Semi-monthly", "The 1st-and-15th pattern, for pay that lands twice a month."],
          ["Monthly — last day", "The final day of every month, whatever its length: 28 February, 31 March, 30 April. Not the same as a monthly entry that happens to start on the last day — that one keeps the start date's day number, so one created in February stays on the 28th all year."],
          ["Monthly — nth weekday", "“The third Friday”, “the last Tuesday”. Pick which one and which weekday; both default to whatever your start date already is. “Last” and “fourth” are the same day in most months and different in the long ones, which is why they are separate choices. A month with only four of the chosen weekday has no fifth one, so a “fifth” entry simply doesn't occur in those months."],
          ["Ends on", "Optional. A loan that finishes in September stops generating occurrences after it, and the Dashboard flags it as ending soon."]
        ] },
        { p: "Amounts are always entered as positive numbers — the type decides the sign. An amount of $0.00 is allowed but needs a note explaining it." },
        { sub: "Paydays that land on a closed day" },
        { p: "Direct deposit doesn't arrive on a Saturday, a Sunday or a statutory holiday — it lands on the last banking day before. Any repeating income entry with “payroll” in its description is checked against that by default, so “Ken - Payroll (15th)” on Saturday 15 August is marked ↤ in the budget grid, on the Dashboard and in the Forecast; hover, tap or tab to the marker and it tells you the money is in the account on Friday the 14th, and why." },
        { p: "A guess from a description is only ever a guess, so any repeating income entry can say for itself. Its “Deposit date” setting offers “Paid the last banking day before” for a deposit the description doesn’t give away — a salary, a pension — and “Paid on the date shown” for money that arrives whatever the banks are doing. Left alone it keeps reading the description, which is what every entry did before the setting existed." },
        { p: "The occurrence itself does not move, on purpose. It stays on the payday, in the month you budgeted it, and every total, running balance and Budget vs Actual figure is worked out from that date. A 1st-of-month payday paid on the 31st of the month before would otherwise move income between two months' totals to fix what is really a display question — the marker answers it without touching your budget." },
        { p: "Which province's or territory's holidays apply is set in Settings → Statutory Holidays, and defaults to British Columbia. The built-in list is computed from that region's usual rules and includes the days it commonly treats as optional; each one is listed on the day it is observed and only there. Rules change and one-off days get proclaimed, so the built-in list is a baseline — the Fetch button replaces a year with what canada-holidays.ca publishes for your region, and any date can be added, edited or removed by hand. Outside Canada, add the days that matter to you by hand and the deposit rule works the same way." },
        { sub: "Changing one occurrence without changing the plan" },
        { p: "Clicking a row in the budget grid opens that occurrence for editing. For the rest, right-click the row (long-press on touch, or use the ⋮ button) to open the row menu:" },
        { defs: [
          ["Edit this occurrence", "Overrides the amount, notes or actual amount paid for that date only — the entry itself is untouched. It is also where a receipt photo is attached. Settings → Audit lists your twenty most recent overrides with a one-click revert."],
          ["Edit recurring entry", "Changes the entry, and so every occurrence of it."],
          ["Skip this occurrence", "Drops a single date — a month you didn't pay, a bill that was waived. Skipped dates are listed above the grid for that month, each with a Restore button."],
          ["Reset occurrence", "Removes an override and puts the originally scheduled amount back."],
          ["Delete entry", "Removes the entry and all of its scheduled occurrences. The toast that follows offers an undo."],
          ["Undo, generally", "Removing a category or a budget year, resetting a year of targets, removing a budget target and restoring a backup all raise the same undo toast. Ctrl+Z (Cmd+Z on a Mac) does the same thing as its button. Marking an occurrence paid has no toast \u2014 the tick is its own undo."]
        ] },
        { sub: "Marking things paid" },
        { p: "The circle beside a row marks that occurrence paid. Paid rows dim and strike through, and the Dashboard's next-seven-days list drops them. Marking paid does not change any amount — it is a tick-off, not a reconciliation." },
        { sub: "Reconciling to your bank" },
        { p: "Every balance in the app is projected: the year's opening balance, plus everything scheduled since. Reality drifts from that — cash spent, a rounding, a purchase nobody entered — so the Dashboard's “Balance today” tile has a Reconcile link. Enter what your account actually shows and the difference is recorded as a dated adjustment on today." },
        { p: "The adjustment is a transfer, not an expense, so it moves the balance without counting as spending: it stays out of your income and expense totals, out of Budget vs Actual and out of the category charts. It sits in the ledger on the day you made it and can be deleted like any other entry. Reconciling this way is why you never have to go back and edit January's opening balance, which would rewrite every month behind it." },
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
        { shot: ["budget-grid", "Budget \u2192 Monthly. The month splits at the 15th, today is marked, and the balance after every row is on the right."] },
        { shot: ["budget-toolbar", "Every grid carries the same toolbar: CSV and PDF export the view you are looking at, + Add opens the entry form."] },
        { defs: [
          ["Monthly", "The month as a ledger: opening balance, every occurrence in date order split into 1–14 and 15–31, a marker on today, and the balance after each row. The totals bar stays pinned at the bottom. Select rows with the checkboxes for bulk actions, and export the month to CSV or PDF."],
          ["Calendar", "The same month laid out as a month: bills on the day they fall, the balance carried to the end of each day, and any day that drops below your alert threshold tinted — which is what makes the week where four bills land together visible at a glance. Pick a day to open what is on it. On a phone each day shows a dot per event and the same tint, and the day you pick opens below the grid."],
          ["Budget vs Actual", "What you planned against what is scheduled, per category. Set a target from the row menu; the bar and the amounts turn red once spending passes it."],
          ["Forecast", "A rolling 30, 60 or 90 days from today, across year boundaries. The chart at the top draws the balance day by day, with the low point and your alert threshold marked; the list below it is every event behind that line. Turn on \u201cWhat if\u2026\u201d to drop a recurring entry or put a different amount on it and see the second curve that would result \u2014 nothing there changes your budget, and it stays on the device you try it on."],
          ["Entries", "The master list of entry definitions. Filter by type, category, schedule, status or date range, sort any column, and search descriptions, notes, categories and amounts. Tick rows to move several to another category at once, or delete them together — both offer a single undo for the whole selection."]
        ] },
        { sub: "Rollover targets" },
        { p: "A category target can roll over. With rollover on, anything you didn't spend against that category earlier in the year is added to this month's target — envelope-style budgeting, so a quiet month funds a heavy one instead of being lost." },
        { sub: "Searching" },
        { p: "There is one search, in the header on a desktop and above the list on a phone — the same box either way, and its placeholder names what it will search. On Entries and on Plan it filters the list you are looking at. Anywhere else it jumps to the Budget month that matches, so typing a payee finds the month it falls in." },
        { sub: "Dates and amounts" },
        { p: "Dates are written the same way everywhere, in the format your Currency & Format setting chooses. The ledgers — Monthly, Calendar and Forecast — are scoped to one year, so a date inside that year reads “Aug 28” and only a date outside it carries the year. The Entries list holds definitions rather than a year's events, so it always shows the year." },
        { p: "Amounts follow one rule: a column that names the direction (the In and Out columns of the grids) shows a plain figure, and a single amount that has to carry both directions — the Entries list, and every card layout on a phone — is signed. Money in is green, money out is the ordinary text colour, and a transfer is blue wherever it appears." },
        { sub: "What differs on a phone" },
        { p: "The same five destinations in the same order, named the same way, and the same five Budget sub-views — nothing is hidden at phone width. What changes is how much each view can afford to say: the grids become cards, and a Calendar day shows a dot per event rather than a line per event, with the day you pick opening below the grid." },
        { sub: "The Forecast “vs Target” column" },
        { p: "It reads the whole month, not the single row: for each occurrence it adds up everything spent in that category that month up to and including this one, then compares the running figure against the month's target. So the second grocery run of the month is judged on where it leaves the month, not on whether $260 sits under the $560 target on its own." },
        { defs: [
          ["✓", "The category is still inside its target for the month at this point."],
          ["A percentage", "The category is over its monthly target here, and by how much. Amber to 120%, red beyond it."],
          ["—", "Money coming in, or no target set for that category — nothing to compare against."]
        ] },
        { p: "This is about your own budget targets, not about whether the bill will arrive. An unbudgeted category is not a problem — it just means the forecast can't check that row for you." }
      ]
    },
    {
      id: "help-dashboard",
      title: "The Dashboard",
      blocks: [
        { p: "The Dashboard answers “am I all right?” at a glance, and every number on it is drawn from the same projection as the Budget tab." },
        { shot: ["dashboard-upcoming", "Upcoming \u2014 next 7 days. The circle beside each row ticks it off; ticked rows drop out of this list."] },
        { shot: ["dashboard-kpis", "The year as four numbers, each with a sparkline of its shape across the months."] },
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
        { shot: ["plan-goals", "A savings goal: progress, the date it is reached at the current monthly figure, and whether that clears a target date you set."] },
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
          ["Currency & Format", "The currency symbol, and where the thousands and decimal separators go. It changes how amounts are written, not what they are worth — nothing is converted. Only two-decimal currencies are listed, because amounts are stored as whole cents throughout the app. Shared with the household, so everyone sees the same figures the same way."],
          ["Appearance", "Light or dark theme. The choice is per device."],
          ["Notifications", "One notification a day at the hour you choose, listing every bill due that day with its amount, plus a warning when your forecast balance is heading below your threshold. With background delivery configured these arrive as ordinary system notifications whether or not the app is open; without it they only appear while the app is open."],
          ["Budget Years", "Years are added in sequence — the next one only. The first year holds your opening balance; later years carry forward automatically. Switch the active year with the pills beside the logo."],
          ["Data Backup & Restore", "Exports everything to a JSON file, and restores one. Restoring replaces the data you have now, so export first if you are unsure."],
          ["Supabase — Auto Sync", "Shows whether cloud sync is connected and when it last saved. Save Now and Reload from Cloud force the transfer in either direction."],
          ["Manage Categories", "Add, rename, recolour, reorder and remove categories. Renaming applies to new entries; existing entries keep the category name they were saved with."],
          ["Statutory Holidays", "The dates behind the payroll deposit marker, one budget year at a time. A year starts from British Columbia's rules — marked “built-in” — and switches to a list of your own the moment you add, edit or remove a date. “Fetch from canada-holidays.ca” pulls that year's published dates on demand, keeping anything you added by hand and replacing the rest; “Reset to built-in” throws the stored list away and goes back to the rules. The list is part of your household data, so it syncs and is included in a backup."],
          ["Security", "Auto-lock hides the app behind a lock screen after 5, 15 or 30 minutes in the background. On a phone that supports it you can unlock with your fingerprint or face instead of your password; the registration is per device."],
          ["Target Budget Reset", "Sets every category's monthly target to the expenses already scheduled for that month. It overwrites all existing targets for the year — a starting point to fine-tune, not an undoable tweak."],
          ["Danger Zone", "Clears this device's local cache. Data in Supabase is not affected and the app reloads from the cloud straight after; on a device with no cloud sync this is not recoverable."]
        ] },
        { sub: "Household" },
        { p: "Lists the people in your household and creates invite codes for new ones. A family member signs in, enters the code, and shares the same budget." },
        { sub: "Templates" },
        { p: "The entry templates you have saved, with a Remove button for each." },
        { sub: "Activity" },
        { p: "What anyone in the household has changed, newest first — entries added, edited and deleted, single dates moved or skipped, budget targets, goals and debts — each with who made the change and when. The last 200 changes are kept, and the list is household data, so everyone sharing the budget sees the same one." },
        { p: "Underneath it, every per-date override you have made this year, each with a Revert that restores the originally scheduled amount and notes." }
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
      if (block.shot) {
        const [name, caption] = block.shot;
        const size = HELP_SHOTS[name];
        // width/height are the real pixel size (see src/lib/help-shots.js) so
        // the box is reserved before a lazily-loaded image arrives — otherwise
        // every shot below the fold shoves the text you are reading down the
        // page as it loads. The caption is the accessible description too: a
        // screenshot of a screen the reader is looking at needs saying once,
        // not twice, so the img itself is decorative and the figcaption
        // carries the words.
        return /* @__PURE__ */ React.createElement("figure", { key: i, className: "help-shot" }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: `images/help/${name}.png`,
            alt: "",
            loading: "lazy",
            decoding: "async",
            width: size ? size.w : void 0,
            height: size ? size.h : void 0,
            className: "help-shot-img"
          }
        ), /* @__PURE__ */ React.createElement("figcaption", { className: "help-shot-cap" }, caption));
      }
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
