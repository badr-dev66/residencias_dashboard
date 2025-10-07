import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SignIn() {
  const [userOrEmail, setUserOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let email = userOrEmail.trim();

      // If input doesn't look like an email, treat it as username → resolve to email
      const looksLikeEmail = email.includes("@");
      if (!looksLikeEmail) {
        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email)
          .single();
        if (error || !data?.email) {
          throw new Error("Usuario no encontrado");
        }
        email = data.email;
      }

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authErr) throw authErr;
      // success → Supabase session listener in App.tsx will switch to Dashboard
    } catch (err: any) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

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
      <form
        onSubmit={signIn}
        style={{
          width: 360,
          background: "#0f172a",
          padding: 20,
          border: "1px solid #1e293b",
          borderRadius: 12,
        }}
      >
        <h1>Entrar</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>
          Usuario o email + contraseña
        </p>

        <input
          type="text"
          required
          placeholder="usuario o email"
          value={userOrEmail}
          onChange={(e) => setUserOrEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #334155",
            borderRadius: 8,
            background: "#0b1220",
            color: "#e2e8f0",
            margin: "10px 0",
          }}
        />

        <input
          type="password"
          required
          placeholder="contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #334155",
            borderRadius: 8,
            background: "#0b1220",
            color: "#e2e8f0",
            margin: "10px 0",
          }}
        />

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: busy ? "#0b1220" : "#111827",
            color: "#e2e8f0",
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>

        {error && (
          <div style={{ marginTop: 10, color: "#fecaca" }}>{error}</div>
        )}
      </form>

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        Hecho por badr
      </div>
    </div>
  );
}
