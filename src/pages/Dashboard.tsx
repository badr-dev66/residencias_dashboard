import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ChecklistItem, Residencia, Weekday } from "../types";
import {
  getWeekStartISO,
  todayISO,
  getSuggestedPrepDate,
  getSuggestedDeliverDate,
} from "../utils/dates";

type MapChecklist = Record<string, ChecklistItem>;
const ORDER: Weekday[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
type FilterMode = "all" | "prepToday" | "deliverToday";

export default function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [resis, setResis] = useState<Residencia[]>([]);
  const [itemsByResi, setItemsByResi] = useState<MapChecklist>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const weekStart = getWeekStartISO();
  const today = todayISO();

  // --- Load data ---
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rdata, error: rerr } = await supabase
        .from("residencias")
        .select("*")
        .order("name", { ascending: true });
      if (rerr) {
        console.error(rerr);
        setLoading(false);
        return;
      }

      const residencias = (rdata || []) as Residencia[];
      setResis(residencias);

      const { data: cdata, error: cerr } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("week_start", weekStart);
      if (cerr) {
        console.error(cerr);
        setLoading(false);
        return;
      }

      const map: MapChecklist = {};
      (cdata || []).forEach((it) => (map[it.residencia_id] = it as ChecklistItem));

      // Auto-create missing rows
      const patches: any[] = [];
      for (const r of residencias) {
        const existing = map[r.id];
        if (!existing) {
          patches.push({
            residencia_id: r.id,
            week_start: weekStart,
            weekly_changes_done: false,
            repasado: false,
            day_to_make: getSuggestedPrepDate(weekStart, r.fixed_delivery_day),
            day_to_deliver: getSuggestedDeliverDate(weekStart, r.fixed_delivery_day),
            notes: null,
          });
        }
      }
      if (patches.length > 0) {
        const { data: upData, error: upErr } = await supabase
          .from("checklist_items")
          .upsert(patches, { onConflict: "residencia_id,week_start" })
          .select();
        if (upErr) console.error(upErr);
        (upData || []).forEach(
          (it) => (map[(it as ChecklistItem).residencia_id] = it as ChecklistItem)
        );
      }

      setItemsByResi(map);
      setLoading(false);
    })();
  }, [weekStart]);

  // --- Hooks always before render ---
  const filteredResis = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? resis.filter((r) => r.name.toLowerCase().includes(s)) : resis;
    if (filter === "prepToday") {
      return base.filter((r) => itemsByResi[r.id]?.day_to_make === today);
    }
    if (filter === "deliverToday") {
      return base.filter((r) => itemsByResi[r.id]?.day_to_deliver === today);
    }
    return base;
  }, [q, resis, itemsByResi, filter, today]);

  const summary = useMemo(() => {
    let prepared = 0,
      delivered = 0,
      pending = 0;
    for (const r of resis) {
      const it = itemsByResi[r.id];
      const done = (it?.weekly_changes_done && it?.repasado) ?? false;
      if (done) prepared++;
      if (it?.day_to_deliver) delivered++;
      if (!done) pending++;
    }
    return { prepared, delivered, pending };
  }, [resis, itemsByResi]);

  const grouped = useMemo(() => {
    const g: Record<Weekday, Residencia[]> = {
      Lunes: [],
      Martes: [],
      Miércoles: [],
      Jueves: [],
      Viernes: [],
    };
    filteredResis.forEach((r) => g[r.fixed_delivery_day].push(r));
    ORDER.forEach((d) => g[d].sort((a, b) => a.name.localeCompare(b.name)));
    return g;
  }, [filteredResis]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1220",
          color: "#e2e8f0",
        }}
      >
        Cargando…
      </div>
    );
  }

  async function savePatch(residencia_id: string, patch: Partial<ChecklistItem>) {
    const existing = itemsByResi[residencia_id];
    const row: any = {
      residencia_id,
      week_start: weekStart,
      weekly_changes_done: existing?.weekly_changes_done ?? false,
      repasado: existing?.repasado ?? false,
      day_to_make: existing?.day_to_make ?? null,
      day_to_deliver: existing?.day_to_deliver ?? null,
      notes: existing?.notes ?? null,
      ...patch,
    };
    if (existing?.id) row.id = existing.id;

    const { data, error } = await supabase
      .from("checklist_items")
      .upsert(row, { onConflict: "residencia_id,week_start" })
      .select()
      .single();
    if (error) console.error(error);
    else setItemsByResi((prev) => ({ ...prev, [residencia_id]: data as ChecklistItem }));
  }

  function Card({ r }: { r: Residencia }) {
    const it = itemsByResi[r.id];
    const done = (it?.weekly_changes_done && it?.repasado) ?? false;
    const saleToday = it?.day_to_deliver === today;

    const color = done
      ? "#14532d"
      : it?.weekly_changes_done || it?.repasado
      ? "#7c2d12"
      : "#7f1d1d";
    const bg = saleToday
      ? "rgba(59,130,246,.10)"
      : done
      ? "rgba(16,185,129,.10)"
      : it?.weekly_changes_done || it?.repasado
      ? "rgba(245,158,11,.12)"
      : "rgba(239,68,68,.08)";

    return (
      <div
        style={{
          border: `1px solid ${color}`,
          background: bg,
          borderRadius: 14,
          padding: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 600 }}>{r.name}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
          Sale: <b>{r.fixed_delivery_day}</b> · Prep en:{" "}
          {r.prep_on_days.join(" / ")} {r.biweekly ? "· c/2 semanas" : ""}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={it?.weekly_changes_done ?? false}
              onChange={(e) => savePatch(r.id, { weekly_changes_done: e.target.checked })}
            />{" "}
            Cambios
          </label>
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={it?.repasado ?? false}
              onChange={(e) => savePatch(r.id, { repasado: e.target.checked })}
            />{" "}
            Repasado
          </label>
          <span
            style={{
              border: "1px solid #2f415a",
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 12,
              color: done ? "#86efac" : "#cbd5e1",
            }}
          >
            {done ? "✔ Completo" : "Pendiente"}
          </span>
          {saleToday && (
            <span
              style={{
                border: "1px solid #1d4ed8",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 12,
                color: "#93c5fd",
              }}
            >
              Sale hoy
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Día preparación</div>
            <input
              type="date"
              value={it?.day_to_make ?? ""}
              onChange={(e) => savePatch(r.id, { day_to_make: e.target.value || null })}
              style={{
                padding: "6px 8px",
                border: "1px solid #334155",
                borderRadius: 8,
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Día salida</div>
            <input
              type="date"
              value={it?.day_to_deliver ?? ""}
              onChange={(e) =>
                savePatch(r.id, { day_to_deliver: e.target.value || null })
              }
              style={{
                padding: "6px 8px",
                border: "1px solid #334155",
                borderRadius: 8,
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Notas</div>
          <textarea
            value={it?.notes ?? ""}
            onChange={(e) => savePatch(r.id, { notes: e.target.value || null })}
            rows={2}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #334155",
              borderRadius: 8,
              background: "#0b1220",
              color: "#e2e8f0",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e2e8f0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            border: "1px solid #1e293b",
            borderRadius: 16,
            background: "rgba(255,255,255,.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg,#22d3ee,#818cf8)",
              }}
            ></div>
            Residencias · Semana {weekStart}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              ✔ {summary.prepared} preparados · 🚚 {summary.delivered} salidas · ⏳{" "}
              {summary.pending} pendientes
            </div>
            <input
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #334155",
                borderRadius: 10,
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
            <button
              onClick={onSignOut}
              style={{
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
                padding: "8px 12px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Salir
            </button>
          </div>
        </header>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilter("prepToday")}
            style={{
              border: "1px solid #334155",
              padding: "6px 10px",
              borderRadius: 999,
              background:
                filter === "prepToday"
                  ? "linear-gradient(135deg,#22d3ee,#818cf8)"
                  : "#0b1220",
              color: filter === "prepToday" ? "#0b1220" : "#e2e8f0",
            }}
          >
            Preparar hoy
          </button>
          <button
            onClick={() => setFilter("deliverToday")}
            style={{
              border: "1px solid #334155",
              padding: "6px 10px",
              borderRadius: 999,
              background:
                filter === "deliverToday"
                  ? "linear-gradient(135deg,#22d3ee,#818cf8)"
                  : "#0b1220",
              color: filter === "deliverToday" ? "#0b1220" : "#e2e8f0",
            }}
          >
            Sale hoy
          </button>
          <button
            onClick={() => setFilter("all")}
            style={{
              border: "1px solid #334155",
              padding: "6px 10px",
              borderRadius: 999,
              background:
                filter === "all"
                  ? "linear-gradient(135deg,#22d3ee,#818cf8)"
                  : "#0b1220",
              color: filter === "all" ? "#0b1220" : "#e2e8f0",
            }}
          >
            Todas
          </button>
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>
            Hoy: {today}
          </span>
        </div>

        {/* 5-column layout */}
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr", marginTop: 16 }}>
          <style>{`@media (min-width: 900px){ .grid5 { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }}`}</style>
          <div className="grid5">
            {ORDER.map((day) => {
              const list = grouped[day];
              return (
                <div
                  key={day}
                  style={{
                    border: "1px solid #1f2a3a",
                    borderRadius: 16,
                    padding: 12,
                    background: "rgba(255,255,255,.03)",
                  }}
                >
                  <h3
                    style={{
                      margin: "4px 0 10px 0",
                      fontSize: 14,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    {day} · Sale
                  </h3>
                  {list.length === 0 && (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Sin residencias
                    </div>
                  )}
                  {list.map((r) => (
                    <Card key={r.id} r={r} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
        <footer style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
          Hecho por BADR
        </footer>

    </div>
  );
}
