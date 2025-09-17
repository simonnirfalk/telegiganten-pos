// src/pages/Step1_AddRepairToOrder.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus, FaUserPlus, FaUser, FaHome, FaLock, FaPhone, FaEnvelope, FaEdit
} from "react-icons/fa";
import RepairModal from "../components/RepairModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import SelectCustomerModal from "../components/SelectCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import OrderSidebarCompact from "../components/OrderSidebarCompact";
import { useRepairContext } from "../context/RepairContext";
import { api } from "../data/apiClient";
import { getNextOrderId } from "../data/orderId";

// Fælles sortere
import {
  sortBrands,
  makeModelSorter,
  sortRepairs,
  brandOrder as BrandPriorityOrder,
} from "../helpers/sorting";

/* ----------------- Små helpers til søgning ----------------- */
function norm(str = "") {
  return (str + "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function deriveShortCodes(titleNorm) {
  const codes = new Set();
  const compact = titleNorm.replace(/\s+/g, "");
  const letterNumMatches = [
    ...titleNorm.matchAll(/\b([a-z])\s?(\d{2,4})\b/g),
    ...compact.matchAll(/\b([a-z])(\d{2,4})\b/g),
    ...titleNorm.matchAll(/\b([a-z]{2})\s?(\d{1,4})\b/g),
  ];
  for (const m of letterNumMatches) {
    const code = (m[1] + m[2]).toLowerCase();
    if (code.length >= 3) codes.add(code);
  }
  return Array.from(codes);
}
function buildHaystack(model, brandTitle) {
  const raw = `${brandTitle || ""} ${model?.title || ""} ${
    Array.isArray(model?.aliases) ? model.aliases.join(" ") : ""
  }`;
  const base = norm(raw);
  const withoutGalaxy = base.replace(/\bgalaxy\b/g, " ").replace(/\s+/g, " ").trim();
  const shortCodes = deriveShortCodes(base);
  const hay = [base, withoutGalaxy, shortCodes.join(" ")].join(" ");
  return hay.replace(/\s+/g, " ").trim();
}
function tokenize(q = "") {
  const n = norm(q);
  if (!n) return [];
  return n.split("").every((c) => c === " ") ? [] : n.split(" ").filter(Boolean);
}

// Strengt ord-match: token skal optræde som helt ord i hay
function tokenMatchStrict(hay, token) {
  if (!token) return true;
  const re = new RegExp(`\\b${token}\\b`, "i");
  return re.test(hay);
}

// Byg hay *kun* fra model/aliases (uden brand), så vi kan kræve et "model-hit"
function buildModelOnlyHay(model) {
  const raw = `${model?.title || ""} ${
    Array.isArray(model?.aliases) ? model.aliases.join(" ") : ""
  }`;
  const base = norm(raw);
  const shortCodes = deriveShortCodes(base);
  const hay = [base, shortCodes.join(" ")].join(" ");
  return hay.replace(/\s+/g, " ").trim();
}

/* ----------------- Modal for brugerdefineret enhed ----------------- */
function CustomRepairModal({ open, onClose, onAdd }) {
  const [device, setDevice] = useState("");
  const [repair, setRepair] = useState("");
  const [price, setPrice]   = useState("");
  const [time, setTime]     = useState("");

  useEffect(() => {
    if (open) {
      setDevice(""); setRepair(""); setPrice(""); setTime("");
    }
  }, [open]);

  if (!open) return null;

  const priceNum = Number(price);
  const timeNum  = Number(time);
  const canSave  = device.trim() && repair.trim() && Number.isFinite(priceNum) && Number.isFinite(timeNum);

  const handleSave = () => {
    if (!canSave) return;
    onAdd({
      device: device.trim(),
      repair: repair.trim(),
      price: Number(price) || 0,
      time: Number(time) || 0,
      model_id: 0,
      part: null,
    });
    onClose();
  };

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>➕ Brugerdefineret enhed</h3>
        <label style={m.label}>Model / Enhed</label>
        <input value={device} onChange={(e)=>setDevice(e.target.value)} placeholder="fx iPhone 13 Pro" style={m.input}/>
        <label style={m.label}>Reparation</label>
        <input value={repair} onChange={(e)=>setRepair(e.target.value)} placeholder="fx Skærm (A+)" style={m.input}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={m.label}>Pris (kr)</label>
            <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="0" style={m.input}/>
          </div>
          <div>
            <label style={m.label}>Tid (min)</label>
            <input type="number" value={time} onChange={(e)=>setTime(e.target.value)} placeholder="0" style={m.input}/>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={m.btnGhost}>Annuller</button>
          <button onClick={handleSave} disabled={!canSave} style={{ ...m.btnPrimary, opacity: canSave ? 1 : 0.6, cursor: canSave ? "pointer" : "not-allowed" }}>Tilføj</button>
        </div>
      </div>
    </div>
  );
}
const m = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 1000 },
  modal: { width: "min(520px, 92vw)", background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,.2)" },
  label: { display: "block", fontSize: 12, margin: "6px 0 4px", color: "#374151" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 },
  btnGhost: { background: "transparent", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#111" },
  btnPrimary: { background: "#2166AC", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700 },
};

/* ----------------- Hovedkomponent ----------------- */
export default function Step1_AddRepairToOrder({
  order,
  setOrder,
  onNext,
  customers,
  setCustomers,
  prefillFromBooking,
}) {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalDevice, setModalDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Alle");

  // “Brugerdefineret enhed”
  const [openCustom, setOpenCustom] = useState(false);

  const [openCreateCustomer, setOpenCreateCustomer] = useState(false);
  const [openSelectCustomer, setOpenSelectCustomer] = useState(false);
  const [openEditCustomer, setOpenEditCustomer] = useState(false);

  const { data: repairStructureRaw = [], loading } = useRepairContext();
  const repairStructure = Array.isArray(repairStructureRaw) ? repairStructureRaw : [];

  // Server-filtrerede repairs til den valgte model
  const [modalRepairs, setModalRepairs] = useState(null);
  const [modalRepairsLoading, setModalRepairsLoading] = useState(false);

  // HENT NÆSTE ORDRE-ID OG SÆT DET PÅ FELTET `id`
  useEffect(() => {
    let cancelled = false;
    async function initOrderId() {
      if (!order?.id) {
        try {
          const id = await getNextOrderId();
          if (!cancelled) setOrder((prev) => ({ ...prev, id }));
        } catch (err) {
          console.error("Kunne ikke hente næste order_id", err);
        }
      }
    }
    initOrderId();
    return () => { cancelled = true; };
  }, [order?.id, setOrder]);

  // Hent kunder via proxy
  useEffect(() => {
    let isMounted = true;
    api.getCustomers()
      .then((data) => {
        if (!isMounted) return;
        const mapped = (Array.isArray(data) ? data : []).map((c) => ({
          id: c.id,
          name: c.name || "",
          phone: c.phone || "",
          email: c.email || "",
          extraPhone: c.extraPhone || "",
        }));
        setCustomers(mapped);
      })
      .catch((err) => console.error("Fejl ved hentning af kunder:", err));
    return () => { isMounted = false; };
  }, [setCustomers]);

  useEffect(() => {
    if (prefillFromBooking?.model_id) {
      api.incrementModelUsage(prefillFromBooking.model_id).catch(() => {});
    }
  }, [prefillFromBooking]);

  // Når der vælges en model (modalDevice), hent dens aktive repairs fra backend
  useEffect(() => {
    let alive = true;
    async function loadRepairs() {
      if (!modalDevice?.id) {
        if (alive) setModalRepairs(null);
        return;
      }
      try {
        setModalRepairsLoading(true);
        const arr = await api.getRepairsForModel(modalDevice.id, { activeOnly: true }); // SERVER-side filtrering
        if (!alive) return;
        const sorted = Array.isArray(arr) ? [...arr].sort(sortRepairs) : [];
        setModalRepairs(sorted);
      } catch (e) {
        if (alive) {
          console.warn("Kunne ikke hente server-filtrerede repairs – falder tilbage til context:", e?.message || e);
          setModalRepairs(null);
        }
      } finally {
        if (alive) setModalRepairsLoading(false);
      }
    }
    loadRepairs();
    return () => { alive = false; };
  }, [modalDevice?.id]);

  /* ---------- POPULÆRE MODELLER (fra API) ---------- */
  const [popular, setPopular] = useState({ ids: [], titles: [], order: [] });
  const [loadingPopular, setLoadingPopular] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingPopular(true);
        // Forventer getPopularModelsTop(limit) ⇒ [{ id, title }]
        const list = await api.getPopularModelsTop(20);
        const ids = list.map(x => Number(x.id)).filter(Boolean);
        const titles = list.map(x => String(x.title || "")).filter(Boolean);
        const order = [...ids]; // bevar serverens rækkefølge (allerede sorteret efter popularitet)
        if (alive) setPopular({ ids, titles, order });
      } catch (e) {
        console.warn("Kunne ikke hente populære modeller:", e?.message || e);
        if (alive) setPopular({ ids: [], titles: [], order: [] });
      } finally {
        if (alive) setLoadingPopular(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---------- UI styles ---------- */
  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    justifyContent: "center",
    marginBottom: "0.5rem",
  };
  const inputStyle = {
    width: "100%",
    marginBottom: "0.5rem",
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "0.9rem",
  };
  const deviceStyle = {
    background: "linear-gradient(135deg, #e0e0e0 0%, #f9f9f9 100%)",
    border: "1px solid #ccc",
    padding: "1rem",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100px",
    transition: "box-shadow 0.2s ease",
  };

  /* ---------- Model/brand filtrering ---------- */
  const customCategoryOrder = [
    "Alle","iPhone","Samsung mobil","iPad","MacBook","iMac","Samsung Galaxy Tab","Motorola mobil","OnePlus mobil",
    "Nokia mobil","Xiaomi mobil","Sony Xperia","Oppo mobil","Microsoft mobil","Honor mobil",
    "Google Pixel","Apple Watch","Samsung Book","Huawei tablet","Mobil","Tablet","Laptop","Stationær computer",
  ];

  const allCategories = useMemo(
    () =>
      customCategoryOrder.filter(
        (cat) => cat === "Alle" || repairStructure.some((b) => b.title === cat)
      ),
    [repairStructure]
  );

  const normalizedSearch = useMemo(() => searchTerm.trim(), [searchTerm]);
  const searchTokens = useMemo(() => tokenize(normalizedSearch), [normalizedSearch]);

  // Brands (filtreret + sorteret)
  const brandsFiltered = useMemo(() => {
    // 1) Hvis en konkret kategori er valgt, brug kun det brand
    if (selectedCategory !== "Alle" && repairStructure.some((b) => b.title === selectedCategory)) {
      return repairStructure.filter((b) => b.title === selectedCategory).sort(sortBrands);
    }

    // 2) Global søgning → alle brands
    if (searchTokens.length > 0) {
      return [...repairStructure].sort(sortBrands);
    }

    // 3) Default (Alle + ingen søgning) → brands der indeholder de populære modeller
    const hasPopular = (b) =>
      (b.models || []).some(
        (m) =>
          (m.id && popular.ids.includes(Number(m.id))) ||
          (m.title && popular.titles.includes(String(m.title)))
      );

    return repairStructure.filter(hasPopular).sort(sortBrands);
  }, [repairStructure, selectedCategory, searchTokens, popular]);

  // Hjælp: brand-prioritet tal (til søgning hvor flere brands blandes)
  const brandPriorityIndex = useMemo(() => {
    const map = new Map();
    BrandPriorityOrder.forEach((name, idx) => map.set(name, idx));
    return (brandTitle) => {
      const i = map.get(String(brandTitle || ""));
      return typeof i === "number" ? i : 999;
    };
  }, []);

  // Modeller (filtreret + sorteret pr brand)
  const filteredModels = useMemo(() => {
    const modelsWithBrand = brandsFiltered.flatMap((b) =>
      (Array.isArray(b.models) ? b.models : []).map((m) => ({ ...m, __brand: b.title }))
    );

    if (modelsWithBrand.length === 0) return [];

    // A) Default (Alle + ingen søgning) → vis KUN populære modeller i API-rækkefølge
    if (searchTokens.length === 0 && selectedCategory === "Alle") {
      const inPopular = modelsWithBrand.filter(
        (m) =>
          (m.id && popular.ids.includes(Number(m.id))) ||
          (m.title && popular.titles.includes(String(m.title)))
      );
      // sortér efter serverens order hvis vi har den, ellers brug normal sortering
      const indexOf = (id) => {
        const n = Number(id || 0);
        const i = popular.order.indexOf(n);
        return i === -1 ? 9999 : i;
      };
      if (popular.order.length > 0) {
        return inPopular.sort((a, b) => indexOf(a.id) - indexOf(b.id));
      }
      // fallback sortering hvis backend ikke gav order
      return inPopular.sort((a, b) => {
        const ba = a.__brand || "";
        const bb = b.__brand || "";
        const pA = brandPriorityIndex(ba);
        const pB = brandPriorityIndex(bb);
        if (pA !== pB) return pA - pB;
        const sorter = makeModelSorter(ba);
        const res = sorter(a, b);
        return res !== 0 ? res : String(a.title || "").localeCompare(String(b.title || ""), "da");
      });
    }

    // B) Søgning → AND-match pr. model (søger i ALLE modeller)
    if (searchTokens.length > 0) {
      const matched = modelsWithBrand.filter((m) => {
        const hayAll   = buildHaystack(m, m.__brand);   // brand + model + aliases + shortcodes
        const hayModel = buildModelOnlyHay(m);          // model + aliases + shortcodes (uden brand)

        // 1) ALLE tokens skal findes (strengt) et eller andet sted i hayAll
        const allTokensHit = searchTokens.every((t) => tokenMatchStrict(hayAll, t));

        if (!allTokensHit) return false;

        // 2) Mindst ÉT token skal matche model/aliases (for at undgå brand-only hits)
        const oneTokenHitsModel = searchTokens.some((t) => tokenMatchStrict(hayModel, t));

        return oneTokenHitsModel;
      });

      return matched.sort((a, b) => {
        const ba = a.__brand || "";
        const bb = b.__brand || "";
        const pA = brandPriorityIndex(ba);
        const pB = brandPriorityIndex(bb);
        if (pA !== pB) return pA - pB;
        const modelSorter = makeModelSorter(ba);
        const res = modelSorter(a, b);
        return res !== 0 ? res : String(a.title || "").localeCompare(String(b.title || ""), "da");
      });
    }


    // C) Kategori ≠ Alle og ingen søgning → vis ALLE modeller i den kategori
    return [...modelsWithBrand].sort((a, b) => {
      const ba = a.__brand || "";
      const bb = b.__brand || "";
      const pA = brandPriorityIndex(ba);
      const pB = brandPriorityIndex(bb);
      if (pA !== pB) return pA - pB;
      const modelSorter = makeModelSorter(ba);
      const res = modelSorter(a, b);
      return res !== 0 ? res : String(a.title || "").localeCompare(String(b.title || ""), "da");
    });
  }, [brandsFiltered, selectedCategory, searchTokens, popular, brandPriorityIndex]);

  /* ---------- Handlers ---------- */
  const handleAddRepair = (deviceName, repair) => {
    if (repair.model_id) {
      api.incrementModelUsage(repair.model_id).catch(() => {});
    }
    const next = {
      device: deviceName,
      repair: repair.title,
      price: repair.price,
      time: repair.time,
      model_id: repair.model_id,
      part: repair.part
        ? {
            id: repair.part.id ?? repair.part.ID ?? null,
            model: repair.part.model ?? "",
            stock: repair.part.stock ?? "",
            location: repair.part.location ?? "",
            category: repair.part.category ?? "",
            repair: repair.part.repair ?? "",
          }
        : null,
    };
    setOrder((prev) => ({ ...prev, repairs: [...prev.repairs, next] }));
    setModalDevice(null);
  };

  const onRemoveRepair = (idx) => {
    setOrder((prev) => ({
      ...prev,
      repairs: prev.repairs.filter((_, i) => i !== idx),
    }));
  };

  // Opdater pris/tid for en linje
  const onUpdateRepair = (idx, patch) => {
    setOrder((prev) => {
      const next = [...prev.repairs];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, repairs: next };
    });
  };

  const addCustomLine = (line) => {
    setOrder((prev) => ({ ...prev, repairs: [...prev.repairs, line] }));
  };

  const handleCreateCustomer = (newCustomer) => {
    setCustomers((prev) => [...prev, newCustomer]);
    setOrder((prev) => ({ ...prev, customer: newCustomer }));
    setOpenCreateCustomer(false);
  };
  const handleSelectCustomer = (selectedCustomer) => {
    setOrder({ ...order, customer: selectedCustomer });
    setOpenSelectCustomer(false);
  };
  const handleSaveCustomer = (editedCustomer) => {
    const updatedCustomers = customers.map((c) =>
      c.id === editedCustomer.id ? editedCustomer : c
    );
    setCustomers(updatedCustomers);
    setOrder({ ...order, customer: editedCustomer });
    setOpenEditCustomer(false);
  };

  // Bekræft hvis adgangskode er tom
  const handleNext = () => {
    const pwd = (order.password || "").trim();
    if (!pwd) {
      const ok = window.confirm("Er du sikker på at du ikke skal bruge adgangskoden?");
      if (!ok) return;
    }
    onNext();
  };

  /* ---------- Render ---------- */
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {/* Venstre kolonne */}
      <div style={{ flex: 1, padding: "2rem", minWidth: 0 }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, width: "fit-content" }}>
          <FaHome /> Dashboard
        </button>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ width: "160px" }}>
            <h4 style={{ textTransform: "uppercase" }}>Kategorier</h4>
            {allCategories.map((cat) => (
              <div
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "0.5rem",
                  marginBottom: "0.5rem",
                  borderRadius: "6px",
                  backgroundColor: selectedCategory === cat ? "#2166AC" : "#f0f0f0",
                  color: selectedCategory === cat ? "white" : "#111",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                {cat}
              </div>
            ))}
          </div>

          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <h2 style={{ textTransform: "uppercase" }}>Vælg enhed og reparation</h2>

            {/* Søg + Brugerdefineret enhed */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder={loadingPopular ? "Indlæser populære modeller..." : "Søg efter model..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setOpenCustom(true)}
                style={{ ...buttonStyle, width: "auto", marginBottom: 0, whiteSpace: "nowrap", display: "inline-flex" }}
                title="Tilføj brugerdefineret enhed"
              >
                <FaPlus /> Brugerdefineret enhed
              </button>
            </div>

            {loading ? (
              <p>Indlæser modeller...</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    style={deviceStyle}
                    onClick={() => setModalDevice(model)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    {model.title}
                  </div>
                ))}
                {filteredModels.length === 0 && (
                  <div style={{ gridColumn: "1 / -1", opacity: 0.7 }}>
                    {searchTerm.trim()
                      ? "Ingen modeller fundet."
                      : (loadingPopular ? "Indlæser populære modeller…" : "Ingen populære modeller fundet.")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        style={{
          width: "400px",
          backgroundColor: "#fff",
          borderLeft: "1px solid #ddd",
          padding: "2rem 1rem",
        }}
      >
        <OrderSidebarCompact
          order={order}
          onRemoveRepair={onRemoveRepair}
          onUpdateRepair={onUpdateRepair}
        />

        {/* Kunde */}
        <h4
          style={{
            textTransform: "uppercase",
            borderBottom: "1px solid #ddd",
            marginTop: "2rem",
            marginBottom: "1rem",
          }}
        >
          Kunde
        </h4>
        {order.customer ? (
          <div style={{ marginBottom: "1rem" }}>
            <strong>{order.customer.name}</strong>
            <br />
            <FaPhone /> {order.customer.phone}
            <br />
            <FaEnvelope /> {order.customer.email || "-"}
            <div style={{ marginTop: "0.5rem", display: "flex", gap: 8 }}>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "#1a1a1aff",
                }}
                onClick={() => setOpenEditCustomer(true)}
              >
                <FaEdit style={{ marginRight: 6 }} />
                Rediger
              </button>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "#b91c1c",
                }}
                onClick={() => setOrder({ ...order, customer: null })}
              >
                Fjern
              </button>
            </div>
          </div>
        ) : (
          <>
            <button style={{ ...buttonStyle, marginTop: 0 }} onClick={() => setOpenCreateCustomer(true)}>
              <FaUserPlus /> Opret kunde
            </button>
            <button style={buttonStyle} onClick={() => setOpenSelectCustomer(true)}>
              <FaUser /> Vælg kunde
            </button>
          </>
        )}

        {/* Adgangskode, Kontakt & Note */}
        <h4
          style={{
            textTransform: "uppercase",
            borderBottom: "1px solid #ddd",
            marginTop: "2rem",
            marginBottom: "1rem",
          }}
        >
          Adgangskode & Note
        </h4>

        <label style={{ fontSize: "0.9rem" }}>
          <FaLock /> Adgangskode
        </label>
        <input
          type="text"
          placeholder="Adgangskode"
          style={inputStyle}
          value={order.password || ""}
          onChange={(e) => setOrder({ ...order, password: e.target.value })}
        />

        <label style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
          <FaPhone /> Kontakt (alternativt tlf.nr.)
        </label>
        <input
          type="text"
          placeholder="Kontakt telefonnummer"
          style={inputStyle}
          value={order.contact || ""}
          onChange={(e) => setOrder({ ...order, contact: e.target.value })}
        />

        <label style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
          <FaEdit /> Note
        </label>
        <textarea
          placeholder="Skriv en note her..."
          style={{ ...inputStyle, height: "80px", resize: "vertical" }}
          value={order.note || ""}
          onChange={(e) => setOrder({ ...order, note: e.target.value })}
        />

        {/* Fortsæt */}
        <div style={{ paddingTop: "1rem" }}>
          <button
            style={buttonStyle}
            onClick={handleNext}
            disabled={order.repairs.length === 0}
            aria-disabled={order.repairs.length === 0}
          >
            <FaPlus /> Fortsæt
          </button>
        </div>
      </div>

      {/* Modals (til at TILFØJE reparationer) */}
      <RepairModal
        device={modalDevice}
        repairs={
          (modalRepairs ?? (
            (
              repairStructure
                .flatMap((brand) => Array.isArray(brand.models) ? brand.models : [])
                .find((m) => m.id === (modalDevice?.id ?? null)) || {}
            ).repairs || []
          ))
            .filter(r => String(r.repair_option_active ?? "1") === "1")
            .slice()
            .sort(sortRepairs)
        }
        loading={modalRepairsLoading}
        onAdd={handleAddRepair}
        onClose={() => setModalDevice(null)}
      />

      {/* Brugerdefineret enhed */}
      <CustomRepairModal
        open={openCustom}
        onClose={() => setOpenCustom(false)}
        onAdd={addCustomLine}
      />

      {openCreateCustomer && (
        <CreateCustomerModal
          onCreate={handleCreateCustomer}
          onClose={() => setOpenCreateCustomer(false)}
        />
      )}
      {openSelectCustomer && (
        <SelectCustomerModal
          customers={[...customers, { id: "test-kunde", name: "Test Kunde", phone: "12345678", email: "test@telegiganten.dk" }]}
          onSelect={(selectedCustomer) => {
            setOrder({ ...order, customer: selectedCustomer });
            setOpenSelectCustomer(false);
          }}
          onClose={() => setOpenSelectCustomer(false)}
        />
      )}
      {openEditCustomer && order.customer && (
        <EditCustomerModal
          customer={order.customer}
          onSave={handleSaveCustomer}
          onClose={() => setOpenEditCustomer(false)}
        />
      )}
    </div>
  );
}
