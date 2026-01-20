// /pages/BuybackAdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * KONFIGURATION
 * Justér baseUrl hvis din POS ikke kører på samme domæne som WordPress.
 * Eksempel: const WP_BASE = "https://telegiganten.dk";
 * Hvis POS og WP kører på samme origin, kan WP_BASE være tom string.
 */
const WP_BASE = "https://telegiganten.dk";
const API = {
  list: `${WP_BASE}/wp-json/telegiganten/v1/buyback/prices`,
  importFromSheet: `${WP_BASE}/wp-json/telegiganten/v1/buyback/import-from-sheet`,
};

const PAGE_SIZE = 25;
const BLUE = "#2166AC";

function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "px-3 py-2 rounded-xl border font-medium transition-colors " +
        "bg-[var(--tg-blue)] text-white border-[var(--tg-blue)] hover:bg-white hover:text-[var(--tg-blue)] " +
        className
      }
      style={{ ["--tg-blue"]: BLUE }}
    >
      {children}
    </button>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--tg-blue)] " +
        className
      }
      style={{ ["--tg-blue"]: BLUE }}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--tg-blue)] " +
        className
      }
      style={{ ["--tg-blue"]: BLUE }}
    />
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        className="sr-only"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
      <span
        className={
          "w-10 h-6 flex items-center rounded-full p-1 transition-colors " +
          (checked ? "bg-[var(--tg-blue)]" : "bg-gray-300") +
          (disabled ? " opacity-60" : "")
        }
        style={{ ["--tg-blue"]: BLUE }}
      >
        <span
          className={
            "bg-white w-4 h-4 rounded-full shadow transform transition-transform " +
            (checked ? "translate-x-4" : "")
          }
        />
      </span>
    </label>
  );
}

/**
 * Hjælpefunktioner til API
 */
async function apiList(params = {}) {
  const url = new URL(API.list);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json(); // forventer { rows: [...], count: N } (som i plugin)
}

async function apiSave(row) {
  // PUT hvis id findes, ellers POST (plugin bør acceptere begge)
  const method = row.id ? "PUT" : "POST";
  const res = await fetch(API.list, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Save failed: ${res.status} ${msg}`);
  }
  return res.json();
}

async function apiDelete(id) {
  const url = new URL(API.list);
  url.searchParams.set("id", id);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Delete failed: ${res.status} ${msg}`);
  }
  return res.json();
}

async function apiImport(docId) {
  // valgfri docId – plugin understøtter import uden proxy
  const res = await fetch(API.importFromSheet, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId: docId || null }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Import failed: ${res.status} ${msg}`);
  }
  return res.json(); // forventer fx { imported: 123 }
}

/**
 * Række-komponent (redigerbar)
 */
function EditableRow({ row, onSave, onDelete }) {
  const [draft, setDraft] = useState(row || {});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !row?.id;

  useEffect(() => {
    setDraft(row || {});
  }, [row]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: draft.id,
        brand: (draft.brand || "").trim(),
        model_name: (draft.model_name || "").trim(),
        storage_gb: Number(draft.storage_gb) || null,
        condition_code: (draft.condition_code || "A").toUpperCase(),
        price_dkk: Number(String(draft.price_dkk).replace(/[^\d]/g, "")) || 0,
        active: draft.active ? 1 : 0,
        notes: draft.notes || null,
      };
      await onSave?.(payload);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!row?.id) return;
    if (!confirm(`Slet buyback-række for ${row.model_name}?`)) return;
    setDeleting(true);
    try {
      await onDelete?.(row.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-2">
        <TextInput
          value={draft.brand || ""}
          onChange={(e) => set("brand", e.target.value)}
          placeholder="Brand"
        />
      </td>
      <td className="p-2">
        <TextInput
          value={draft.model_name || ""}
          onChange={(e) => set("model_name", e.target.value)}
          placeholder="Modelnavn"
        />
      </td>
      <td className="p-2">
        <TextInput
          type="number"
          inputMode="numeric"
          value={draft.storage_gb ?? ""}
          onChange={(e) => set("storage_gb", e.target.value)}
          placeholder="GB"
        />
      </td>
      <td className="p-2">
        <Select
          value={draft.condition_code || "A"}
          onChange={(e) => set("condition_code", e.target.value)}
        >
          {["A", "B", "C", "D"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </td>
      <td className="p-2">
        <TextInput
          value={draft.price_dkk ?? ""}
          onChange={(e) => set("price_dkk", e.target.value)}
          placeholder="Pris (DKK)"
        />
      </td>
      <td className="p-2">
        <Toggle
          checked={!!draft.active}
          onChange={(v) => set("active", v ? 1 : 0)}
        />
      </td>
      <td className="p-2">
        <TextInput
          value={draft.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Noter…"
        />
      </td>
      <td className="p-2 flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {isNew ? "Opret" : "Gem"}
        </Button>
        {!isNew && (
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="!bg-white !text-[var(--tg-blue)] hover:!bg-[var(--tg-blue)] hover:!text-white"
          >
            Slet
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function BuybackAdminPage() {
  // Filtre & søgning
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("");
  const [condition, setCondition] = useState("");
  const [active, setActive] = useState("1"); // "1" = kun aktive, "" = alle, "0" = kun inaktive

  // Data
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  // Paging
  const [page, setPage] = useState(1);
  const pagesTotal = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [docId, setDocId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        q: search || undefined,
        brand: brand || undefined,
        model_name: model || undefined,
        storage_gb: storage || undefined,
        condition_code: condition || undefined,
        active: active === "" ? undefined : active, // "" -> alle
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };
      const r = await apiList(params);
      setRows(r.rows || []);
      setCount(r.count ?? (r.rows ? r.rows.length : 0));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setSearch("");
    setBrand("");
    setModel("");
    setStorage("");
    setCondition("");
    setActive("1");
    setPage(1);
    setTimeout(load, 0);
  };

  const handleSave = async (payload) => {
    await apiSave(payload);
    await load();
  };

  const handleDelete = async (id) => {
    await apiDelete(id);
    await load();
  };

  const handleImport = async () => {
    if (
      docId &&
      !/^[A-Za-z0-9_\-]{10,}$/.test(docId.trim())
    ) {
      if (
        !confirm(
          "Det ligner ikke et Google Sheet ID – fortsæt alligevel og lad plugin’et bruge standardindstillingen?"
        )
      ) {
        return;
      }
    }
    setImporting(true);
    setError("");
    try {
      const r = await apiImport(docId.trim() || null);
      alert(`Import gennemført. Antal rækker oprettet/overskrevet: ${r.imported ?? "?"}`);
      await load();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4">
      {/* Sideheader */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Buyback – modeller & priser</h1>
        <div className="flex items-center gap-2">
          <TextInput
            placeholder="Google Sheet Doc ID (valgfrit)"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            style={{ width: 280 }}
          />
          <Button onClick={handleImport} disabled={importing}>
            Importér fra Google Sheet
          </Button>
        </div>
      </div>

      {/* Filtre */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
        <TextInput
          placeholder="Søg (fri tekst)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextInput
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <TextInput
          placeholder="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <TextInput
          placeholder="Lager (GB)"
          inputMode="numeric"
          value={storage}
          onChange={(e) => setStorage(e.target.value)}
        />
        <Select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="">Stand (alle)</option>
          {["A", "B", "C", "D"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">Aktive + inaktive</option>
          <option value="1">Kun aktive</option>
          <option value="0">Kun inaktive</option>
        </Select>
      </div>
      <div className="flex gap-2 mb-4">
        <Button onClick={applyFilters}>Anvend filtre</Button>
        <Button
          onClick={clearFilters}
          className="!bg-white !text-[var(--tg-blue)] hover:!bg-[var(--tg-blue)] hover:!text-white"
        >
          Nulstil
        </Button>
      </div>

      {/* Fejl/Loading */}
      {error && (
        <div className="mb-3 p-3 rounded-lg border border-red-300 bg-red-50 text-red-800">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          Henter data…
        </div>
      )}

      {/* Opret ny */}
      <div className="mb-3 p-3 rounded-xl border border-gray-200">
        <div className="font-semibold mb-2">Opret ny pris</div>
        <table className="w-full table-fixed">
          <colgroup>
            <col width="12%" />
            <col width="24%" />
            <col width="10%" />
            <col width="8%" />
            <col width="14%" />
            <col width="8%" />
            <col width="16%" />
            <col width="8%" />
          </colgroup>
          <thead>
            <tr className="text-left text-sm text-gray-600">
              <th className="p-2">Brand</th>
              <th className="p-2">Model</th>
              <th className="p-2">Lager (GB)</th>
              <th className="p-2">Stand</th>
              <th className="p-2">Pris (DKK)</th>
              <th className="p-2">Aktiv</th>
              <th className="p-2">Noter</th>
              <th className="p-2">Handling</th>
            </tr>
          </thead>
          <tbody>
            <EditableRow
              row={{
                brand: "",
                model_name: "",
                storage_gb: "",
                condition_code: "A",
                price_dkk: "",
                active: 1,
                notes: "",
              }}
              onSave={handleSave}
            />
          </tbody>
        </table>
      </div>

      {/* Tabel med eksisterende data */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <colgroup>
            <col width="12%" />
            <col width="24%" />
            <col width="10%" />
            <col width="8%" />
            <col width="14%" />
            <col width="8%" />
            <col width="16%" />
            <col width="8%" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-600">
              <th className="p-2">Brand</th>
              <th className="p-2">Model</th>
              <th className="p-2">Lager (GB)</th>
              <th className="p-2">Stand</th>
              <th className="p-2">Pris (DKK)</th>
              <th className="p-2">Aktiv</th>
              <th className="p-2">Noter</th>
              <th className="p-2">Handling</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-600" colSpan={8}>
                  Ingen rækker fundet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <EditableRow
                  key={r.id}
                  row={r}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (bund) */}
      <div className="mt-3 flex items-center gap-3">
        <Button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Forrige
        </Button>
        <div className="flex items-center gap-2">
          <span>
            Side{" "}
            <strong>
              {page} / {pagesTotal}
            </strong>
          </span>
          <TextInput
            style={{ width: 80 }}
            inputMode="numeric"
            value={String(page)}
            onChange={(e) => {
              const v = parseInt(e.target.value || "1", 10);
              if (!Number.isNaN(v)) setPage(Math.min(Math.max(1, v), pagesTotal));
            }}
          />
        </div>
        <Button
          onClick={() =>
            setPage((p) => Math.min(pagesTotal, p + 1))
          }
          disabled={page >= pagesTotal}
        >
          Næste
        </Button>
        <div className="text-sm text-gray-600 ml-auto">
          Viser {rows.length} / {count} rækker
        </div>
      </div>
    </div>
  );
}
