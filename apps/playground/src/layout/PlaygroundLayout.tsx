import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { getCatalog, type FixtureEntry } from "../lib/specLoader.js";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/custom", label: "Custom Spec" },
];

export default function PlaygroundLayout(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const catalog = getCatalog();

  function handleEngineChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const engine = e.target.value;
    if (!engine) { navigate("/"); return; }
    const first = catalog.find((c: FixtureEntry) => c.kind === "engine" && c.engine === engine);
    if (first) navigate(`/engine/${first.engine}/${first.slug}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        /* Engines emit fixed width/height SVG attributes; scale them down so a
           rendered interactive never overflows its column. viewBox keeps ratio. */
        [data-oedu-root] svg { max-width: 100%; height: auto; }

        /* Below this width the fixed sidebar would starve the main pane, so
           stack the catalog above it instead of squeezing both. */
        @media (max-width: 720px) {
          .pg-body { flex-wrap: wrap; }
          .pg-aside { width: 100%; border-right: none; border-bottom: 1px solid #ccc; max-height: 40vh; }
        }
      `}</style>
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 16px", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
        <strong>Playground</strong>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} style={{ textDecoration: location.pathname === n.to ? "underline" : "none", color: "#0366d6" }}>{n.label}</Link>
        ))}
        <select
          aria-label="Filter by engine"
          onChange={handleEngineChange}
          style={{ marginLeft: "auto" }}
        >
          <option value="">All engines</option>
          {[...new Set(catalog.filter((c: FixtureEntry) => c.kind === "engine").map((c: FixtureEntry) => c.engine))].map((e: string | undefined) => (
            <option key={e ?? ""} value={e ?? ""}>{e}</option>
          ))}
        </select>
      </header>
      <div className="pg-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside className="pg-aside" style={{ width: 240, borderRight: "1px solid #ccc", padding: 8, overflowY: "auto", background: "#f5f5f5" }}>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Catalog</summary>
            <ul style={{ listStyle: "none", padding: 0, fontSize: 13, marginTop: 4 }}>
              {catalog.map((c: FixtureEntry) => (
                <li key={c.id}>
                  <Link to={c.kind === "composition" ? `/lesson/${c.slug}` : `/engine/${c.engine}/${c.slug}`} style={{ color: "#0366d6", textDecoration: "none" }}>
                    {c.title ?? c.slug}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </aside>
        <main style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}