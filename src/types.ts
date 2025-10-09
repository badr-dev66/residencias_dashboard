// src/types.ts

export type Weekday = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";

export type Residencia = {
  id: string;
  name: string;
  fixed_delivery_day: Weekday;
  biweekly: boolean;
  biweekly_offset: 0 | 1;
  prep_on_days: Weekday[];
  patients: number; // NEW
  floors: number;   // NEW
};

export type ChecklistItem = {
  id: string;
  residencia_id: string;
  week_start: string; // yyyy-mm-dd (Monday)
  weekly_changes_done: boolean;
  repasado: boolean;
  emblistada: boolean; // NEW
  day_to_make: string | null;    // yyyy-mm-dd
  day_to_deliver: string | null; // yyyy-mm-dd
  notes: string | null;
  updated_at: string;
};