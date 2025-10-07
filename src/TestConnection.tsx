import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Residencia = { id: string; name: string; fixed_delivery_day: string };

export default function TestConnection() {
  const [rows, setRows] = useState<Residencia[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("residencias")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data || []);
      });
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h2>Residencias (desde Supabase)</h2>
      {error && <div style={{ color: "crimson" }}>Error: {error}</div>}
      {rows.map((r) => (
        <div key={r.id}>• {r.name} — {r.fixed_delivery_day}</div>
      ))}
      {rows.length === 0 && !error && <div>Cargando…</div>}
    </div>
  );
}
