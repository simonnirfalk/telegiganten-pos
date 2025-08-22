// src/pages/Step1_AddRepairToOrder.jsx
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

function generateOrderId() {
  const last = Number(localStorage.getItem("lastOrderId") || 0) + 1;
  localStorage.setItem("lastOrderId", last);
  return `40${String(last).padStart(3, "0")}`;
}

export default function Step1_AddRepairToOrder({
  order,
  setOrder,
  onNext,
  customers,
  setCustomers,
}) {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalDevice, setModalDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Alle");

  const [openCreateCustomer, setOpenCreateCustomer] = useState(false);
  const [openSelectCustomer, setOpenSelectCustomer] = useState(false);
  const [openEditCustomer, setOpenEditCustomer] = useState(false);

  // når !== null er vi i “rediger”-tilstand for denne index
  const [editingRepairIndex, setEditingRepairIndex] = useState(null);

  const { data: repairStructure = [], loading } = useRepairContext();

  useEffect(() => {
    if (!order.id) {
      setOrder((prev) => ({ ...prev, id: generateOrderId() }));
    }
  }, [order.id, setOrder]);

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
    return () => {
      isMounted = false;
    };
  }, [setCustomers]);

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
    fontWeight: "bold",
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
    "Nokia mobil","Huawei mobil","Xiaomi mobil","Sony Xperia","Oppo mobil","Microsoft mobil","Honor mobil",
    "Google Pixel","Apple Watch","Samsung Book","Huawei tablet",
  ];

  const allCategories = useMemo(
    () => customCategoryOrder.filter(
      (cat) => cat === "Alle" || repairStructure.some((b) => b.title === cat)
    ),
    [repairStructure]
  );

  const brandsFiltered =
    selectedCategory === "Alle"
      ? repairStructure.filter((b) =>
          (b.models || []).some((m) => popularModelNames.includes(m.title))
        )
      : repairStructure.filter((b) => b.title === selectedCategory);

  const filteredModels = useMemo(() => {
    return brandsFiltered
      .flatMap((b) => b.models || [])
      .filter(
        (m) => selectedCategory !== "Alle" || popularModelNames.includes(m.title)
      )
      .filter((m) => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (selectedCategory === "Alle") {
          return (
            popularModelNames.indexOf(a.title) -
            popularModelNames.indexOf(b.title)
          );
        }
        return 0;
      });
  }, [brandsFiltered, searchTerm, selectedCategory]);

  /* ---------- Hjælpere ---------- */
  function findModelByTitle(title) {
    const allModels = repairStructure.flatMap((b) => b.models || []);
    return allModels.find((m) => (m.title || "").trim() === (title || "").trim()) || null;
    // (fallback kunne være case-insensitive, men det her er mest stabilt ift. dine data)
  }

  /* ---------- Handlers ---------- */

  // FÅR reparation + evt. r.part fra RepairModal
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

    // hvis vi er i rediger-tilstand, erstat elementet i stedet for at pushe
    if (editingRepairIndex !== null && editingRepairIndex >= 0) {
      setOrder((prev) => {
        const updated = [...prev.repairs];
        updated[editingRepairIndex] = next;
        return { ...prev, repairs: updated };
      });
      setEditingRepairIndex(null);
    } else {
      setOrder((prev) => ({ ...prev, repairs: [...prev.repairs, next] }));
    }

    setModalDevice(null);
  };

  const onEditRepair = (idx) => {
    const r = order.repairs[idx];
    // find modellen ud fra device-navnet og åbn modalen
    const model = findModelByTitle(r.device);
    setEditingRepairIndex(idx);
    setModalDevice(model || null);
  };

  const onRemoveRepair = (idx) => {
    setOrder((prev) => ({
      ...prev,
      repairs: prev.repairs.filter((_, i) => i !== idx),
    }));
  };

  const dummyCustomer = {
    id: "test-kunde",
    name: "Test Kunde",
    phone: "12345678",
    email: "test@telegiganten.dk",
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

  const handleRemoveCustomer = () => {
    setOrder({ ...order, customer: null });
  };

  /* ---------- Render ---------- */
  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", overflow: "hidden" }}>
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
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

          <div style={{ flexGrow: 1 }}>
            <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>
              Vælg enhed og reparation
            </h2>
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
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ flexGrow: 1, overflowY: "auto" }}>
          {/* Reparationer – kompakt visning */}
          <OrderSidebarCompact
            order={order}
            onEditRepair={onEditRepair}
            onRemoveRepair={onRemoveRepair}
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
              <button style={buttonStyle} onClick={() => setOpenCreateCustomer(true)}>
                <FaUserPlus /> Opret kunde
              </button>
              <button style={buttonStyle} onClick={() => setOpenSelectCustomer(true)}>
                <FaUser /> Vælg kunde
              </button>
            </>
          )}

          {/* Note & adgangskode */}
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
          <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
            <FaLock /> Adgangskode
          </label>
          <input
            type="text"
            placeholder="Adgangskode"
            style={inputStyle}
            value={order.password || ""}
            onChange={(e) => setOrder({ ...order, password: e.target.value })}
          />
          <label style={{ fontWeight: "bold", fontSize: "0.9rem", marginTop: "0.5rem" }}>
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
            <button style={buttonStyle} onClick={onNext} disabled={order.repairs.length === 0}>
              <FaPlus /> Fortsæt
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
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
        onClose={() => {
          setModalDevice(null);
          setEditingRepairIndex(null);
        }}
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
