import { useEffect } from "../lib/runtime.js";
import { todayStr } from "../lib/dates.js";
import { applyGoalRollovers, planGoalRollovers } from "../lib/sinking.js";
import { logDesc } from "./use-budget-actions.js";
  // Rolls repeating goals (sinking funds) into their next cycle when their date
  // arrives. Moved out of App as is.
  export function useGoalRollovers({ goals, entries, setGoals, setEntries, logActivity }) {
    // A repeating goal is a sinking fund: when its date arrives the money is
    // spent and the next cycle begins. Nothing else moves it along, so it is
    // rolled here, on load and whenever goals or entries change.
    //
    // Safe to run on every render that changes them, because a plan for a
    // household with nothing due reports no change and applies nothing —
    // tests/sinking.mjs pins that, since without it this would be a loop.
    useEffect(() => {
      const plan = planGoalRollovers(goals, entries, todayStr());
      if (!plan.changed) return;
      applyGoalRollovers(plan, { setGoals, setEntries });
      plan.rolls.forEach((r) => {
        const g = goals.find((x) => x.id === r.goalId);
        logActivity("goal", `${logDesc(g ? g.name : "A goal")} rolled over to ${r.to}`);
      });
    }, [goals, entries, setGoals, setEntries, logActivity]);
  }
