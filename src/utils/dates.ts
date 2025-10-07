export type Weekday = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";

/** Monday (yyyy-mm-dd) for the given date */
export function getWeekStartISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // go back to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return toISODate(date);
}

/** Today (yyyy-mm-dd) in local time */
export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

/** Add days to an ISO date (yyyy-mm-dd) and return ISO */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Convert a Date to yyyy-mm-dd */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Index of weekday within Mon–Fri (Mon=0..Fri=4) */
export function weekdayIndex(day: Weekday): number {
  return ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].indexOf(day);
}

/** Delivery date (yyyy-mm-dd) for a residencia in the current week */
export function getSuggestedDeliverDate(weekStartISO: string, day: Weekday): string {
  return addDaysISO(weekStartISO, weekdayIndex(day));
}

/** Suggested prep date (yyyy-mm-dd) based on delivery day (editable later) */
export function getSuggestedPrepDate(weekStartISO: string, day: Weekday): string {
  // Rules:
  // Lunes -> previous Friday (-3)
  // Martes -> Monday (0)
  // Miércoles -> Monday (0)
  // Jueves -> Tuesday (+1)
  // Viernes -> Wednesday (+2)
  const offsets: Record<Weekday, number> = {
    Lunes: -3,
    Martes: 0,
    Miércoles: 0,
    Jueves: 1,
    Viernes: 2,
  };
  return addDaysISO(weekStartISO, offsets[day]);
}
