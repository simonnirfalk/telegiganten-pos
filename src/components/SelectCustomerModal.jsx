// src/components/SelectCustomerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { shapeCustomerFromApi } from "../utils/customerUtils";

export default function SelectCustomerModal({ onSelect, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Hent kunder via proxy
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await api.getCustomers();
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setCustomers(data.map(shapeCustomerFromApi));
        } else {
          throw new Error("Ugyldigt dataformat");
        }
      } catch (err) {
        console.error("Fejl ved hentning af kunder:", err);
        if (isMounted) setError("Kunder kunne ikke hentes.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Luk på Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter" && !loading && !error && filteredCustomers.length > 0) {
        // Vælg første match med Enter for hurtighed
        onSelect?.(filteredCustomers[0]);
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, loading, error]);

  // Hjælpere til søgning/sortering
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const normPhone = (s) => (s || "").toString().replace(/\s+/g, "");

  const filteredCustomers = useMemo(() => {
    const q = norm(searchTerm);
    const qPhone = normPhone(searchTerm);
    const list = customers.filter((c) => {
      const name = norm(c.name);
      const phone = normPhone(c.phone);
      const email = norm(c.email);
      return (
        (q && (name.includes(q) || email.includes(q))) ||
        (qPhone && phone.includes(qPhone)) ||
        (!q && !qPhone) // tom søgning → alle
      );
    });

    // Stabil sortering: navn A→Å, derefter telefon
    return list.sort((a, b) => {
      const an = norm(a.name), bn = norm(b.name);
      if (an < bn) return -1;
      if (an > bn) return 1;
      const ap = normPhone(a.phone), bp = normPhone(b.phone);
      if (ap < bp) return -1;
      if (ap > bp) return 1;
      return 0;
    });
  }, [customers, searchTerm]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "10px",
          width: "90%",
          maxWidth: "520px",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Vælg kunde</h2>

        <input
          type="text"
          placeholder="Søg navn, telefon eller e-mail"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          style={{
            marginBottom: "1rem",
            width: "100%",
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #ccc"
          }}
        />

        {loading && <p>Indlæser kunder…</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && !error && filteredCustomers.length === 0 && (
          <p>Ingen kunder matcher.</p>
        )}

        {!loading && !error && filteredCustomers.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid #eee",
              cursor: "pointer",
              borderRadius: "6px",
              transition: "background 0.2s"
            }}
            onClick={() => { onSelect?.(c); onClose?.(); }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Vælg kunde"
          >
            <strong>{c.name || "—"}</strong><br />
            {c.phone || "—"} • {c.email || "—"}
          </div>
        ))}

        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              background: "#ccc",
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}
