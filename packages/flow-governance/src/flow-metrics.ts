import { FlowMetrics, WorkItem } from "./types.js";

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MS_IN_HOUR = 1000 * 60 * 60;

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_IN_HOUR;
}

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_IN_DAY;
}

export function computeFlowMetrics(workItems: WorkItem[], now = new Date()): FlowMetrics[] {
  const grouped: Record<string, WorkItem[]> = {};

  for (const item of workItems) {
    grouped[item.team] = grouped[item.team] ?? [];
    grouped[item.team].push(item);
  }

  return Object.entries(grouped).map(([team, items]) => {
    const completed = items.filter((item) => item.completedAt);
    const leadTimeDays =
      completed.length === 0
        ? 0
        : completed.reduce(
            (acc, item) => acc + daysBetween(item.createdAt, item.completedAt ?? now),
            0
          ) / completed.length;

    const cycleTimeDays =
      completed.length === 0
        ? 0
        : completed.reduce((acc, item) => {
            if (!item.startedAt) return acc;
            return acc + daysBetween(item.startedAt, item.completedAt ?? now);
          }, 0) / completed.filter((item) => item.startedAt).length;

    const wipCount = items.filter((item) => item.status !== "done").length;

    const blockedTimeHours = completed.reduce((acc, item) => {
      if (!item.blockedWindows || item.blockedWindows.length === 0) return acc;
      const blocked = item.blockedWindows.reduce((blockedAcc, window) => {
        const end = window.end ?? now;
        if (end < window.start) return blockedAcc;
        return blockedAcc + hoursBetween(window.start, end);
      }, 0);
      return acc + blocked;
    }, 0);

    const totalBlockedEvents = items.reduce(
      (acc, item) => acc + (item.blockedWindows ? item.blockedWindows.length : 0),
      0
    );
    const averageBlockedHours =
      totalBlockedEvents === 0 ? 0 : blockedTimeHours / totalBlockedEvents;

    const totalRework = completed.reduce((acc, item) => acc + (item.reworkCount ?? 0), 0);
    const reworkPercentage = completed.length === 0 ? 0 : (totalRework / completed.length) * 100;

    return {
      team,
      leadTimeDays: Number(leadTimeDays.toFixed(2)),
      cycleTimeDays: Number((cycleTimeDays || 0).toFixed(2)),
      wipCount,
      blockedTimeHours: Number(averageBlockedHours.toFixed(2)),
      reworkPercentage: Number(reworkPercentage.toFixed(2)),
    };
  });
}
