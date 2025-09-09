// src/components/Step1_AddRepairToOrder.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaUserPlus, FaUser, FaHome, FaLock, FaPhone, FaEnvelope, FaEdit } from "react-icons/fa";
import RepairModal from "../components/RepairModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import SelectCustomerModal from "../components/SelectCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import OrderSidebarCompact from "../components/OrderSidebarCompact";
import { useRepairContext } from "../context/RepairContext";
import { api } from "../data/apiClient";
import { getNextOrderId } from "../data/orderId";

/* ----------------- Søgehelpers (fleksibel match) ----------------- */
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

  const [openCreateCustomer, setOpenCreateCustomer] = useState(false);
  const [openSelectCustomer, setOpenSelectCustomer] = useState(false);
  const [openEditCustomer, setOpenEditCustomer] = useState(false);

  const { data: repairStructure = [], loading } = useRepairContext();

  // HENT NÆSTE ORDRE-ID OG SÆT DET PÅ FELTET `id` (← VIGTIGT)
  useEffect(() => {
    let cancelled = false;
    async function initOrderId() {
      if (!order?.id) {
        try {
          const id = await getNextOrderId();
          if (!cancelled) {
            setOrder((prev) => ({ ...prev, id }));
          }
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
    api
      .getCustomers()
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
  const popularModelNames = [
    "iPhone 11","iPhone 12","iPhone 13","iPhone 14","iPhone 15",
    "iPhone 11 Pro","iPhone 12 Mini","iPhone 13 Pro Max","iPhone 14 Plus","iPhone 15 Pro",
    "Samsung Galaxy S20 FE","Samsung Galaxy S21+","Samsung Galaxy S22","Samsung Galaxy S23 Ultra","Samsung Galaxy S24",
    "Samsung Galaxy A55","Samsung Galaxy A34","Samsung Galaxy A14","Samsung Galaxy A54","Samsung Galaxy A72",
    "iPad 10.2 (2021)","iPad Pro 11 (2018)","MacBook Pro 13 inch A1708","MacBook Air 13 inch, A2179","Motorola Moto G54",
  ];

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

  const brandsFiltered = useMemo(() => {
    if (selectedCategory !== "Alle") {
      return repairStructure.filter((b) => b.title === selectedCategory);
    }
    if (searchTokens.length > 0) {
      return repairStructure; // global søgning
    }
    return repairStructure.filter((b) =>
      (b.models || []).some((m) => popularModelNames.includes(m.title))
    );
  }, [repairStructure, selectedCategory, searchTokens, popularModelNames]);

  const filteredModels = useMemo(() => {
    const modelsWithBrand = brandsFiltered.flatMap((b) =>
      (b.models || []).map((m) => ({ ...m, __brand: b.title }))
    );

    if (searchTokens.length === 0) {
      if (selectedCategory === "Alle") {
        return modelsWithBrand
          .filter((m) => popularModelNames.includes(m.title))
          .sort(
            (a, b) =>
              popularModelNames.indexOf(a.title) -
              popularModelNames.indexOf(b.title)
          );
      }
      return modelsWithBrand;
    }

    // Fleksibel søgning (AND over tokens)
    return modelsWithBrand.filter((m) => {
      const hay = buildHaystack(m, m.__brand);
      return searchTokens.every((t) => hay.includes(norm(t)));
    });
  }, [brandsFiltered, selectedCategory, searchTokens, popularModelNames]);

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

  // NY: opdater KUN pris/tid for en specifik linje
  const onUpdateRepair = (idx, patch) => {
    setOrder((prev) => {
      const next = [...prev.repairs];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, repairs: next };
    });
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
            <input
              type="text"
              placeholder="Søg efter model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
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
          onUpdateRepair={onUpdateRepair}  /* <— NY prop */
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

      {/* Modals (kun til at TILFØJE reparationer) */}
      <RepairModal
        device={modalDevice}
        repairs={
          (
            repairStructure.flatMap((brand) => brand.models || []).find(
              (m) => m.id === modalDevice?.id
            ) || {}
          ).repairs || []
        }
        onAdd={handleAddRepair}
        onClose={() => setModalDevice(null)}
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
