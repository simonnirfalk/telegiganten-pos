// src/context/RepairContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { proxyFetch } from "../data/apiClient";

// Struktur som Step1 forventer: [{ title: brand, models: [{ id, title, repairs: [...] }] }]
const RepairCtx = createContext({ data: [], loading: false, error: null });

export function RepairProvider({ children }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Hent hele træet server-side filtreret til KUN aktive repairs
        const raw = await proxyFetch({
          path: "/wp-json/telegiganten/v1/all-repairs?active_only=1",
          method: "GET",
        });

        const byBrand = Array.isArray(raw) ? raw : [];
        // Map plugin-struktur -> Step1-struktur
        const mapped = byBrand.map((brand) => ({
          title: brand.brand,
          models: (brand.models || []).map((m) => ({
            id: m.options?.[0]?.model_id ?? m.id ?? null, // robust id
            title: m.model,
            // Bemærk: kun aktive kommer fra endpointet pga. active_only=1
            repairs: (m.options || []).map((o) => ({
              id: o.id,
              title: o.title,
              price: Number(o.price) || 0,
              time: Number(o.duration) || 0,
              model_id: o.model_id,
              repair_option_active: 1, // serveren har allerede filtreret; marker som aktiv
            })),
          })),
        }));

        if (alive) setData(mapped);
      } catch (e) {
        if (alive) setError(e?.message || "Kunne ikke hente repairs.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <RepairCtx.Provider value={{ data, loading, error }}>
      {children}
    </RepairCtx.Provider>
  );
}

export function useRepairContext() {
  return useContext(RepairCtx);
}
