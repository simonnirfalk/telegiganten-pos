// Step1_AddRepairToOrder.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaTrashAlt, FaPhone, FaEnvelope, FaUserPlus, FaUser, FaHome, FaLock } from "react-icons/fa";
import RepairModal from "../components/RepairModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import SelectCustomerModal from "../components/SelectCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import { useRepairContext } from "../context/RepairContext";

function generateOrderId() {
  const last = Number(localStorage.getItem("lastOrderId") || 0) + 1;
  localStorage.setItem("lastOrderId", last);
  return `40${String(last).padStart(3, "0")}`;
}

export default function Step1_AddRepairToOrder({ order, setOrder, onNext, customers, setCustomers }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalDevice, setModalDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Alle");
  const [openCreateCustomer, setOpenCreateCustomer] = useState(false);
  const [openSelectCustomer, setOpenSelectCustomer] = useState(false);
  const [openEditCustomer, setOpenEditCustomer] = useState(false);
  const [editingRepairIndex, setEditingRepairIndex] = useState(null);
  const [editingRepair, setEditingRepair] = useState({});

  const { data: repairStructure, loading } = useRepairContext();

  useEffect(() => {
    if (!order.id) {
      setOrder((prev) => ({ ...prev, id: generateOrderId() }));
    }
  }, [order.id, setOrder]);

  useEffect(() => {
    fetch("https://telegiganten.dk/wp-json/telegiganten/v1/customers")
      .then(res => res.json())
      .then(data => {
        const mapped = data.map(c => ({
          id: c.id,
          name: c.title,
          phone: c.phone || "",
          email: c.email || "",
          extraPhone: c.extra_phone || ""
        }));
        setCustomers(mapped);
      })
      .catch(err => console.error("Fejl ved hentning af kunder:", err));
  }, []);

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
    marginBottom: "0.5rem"
  };

  const smallButtonStyle = {
    backgroundColor: "#ccc",
    color: "#333",
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.8rem",
    marginRight: "0.5rem"
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
    transition: "box-shadow 0.2s ease"
  };

  const inputStyle = {
    width: "100%",
    marginBottom: "0.5rem",
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "0.9rem"
  };

  const popularModelNames = [
    "iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15",
    "iPhone 11 Pro", "iPhone 12 Mini", "iPhone 13 Pro Max", "iPhone 14 Plus", "iPhone 15 Pro",
    "Samsung Galaxy S20 FE", "Samsung Galaxy S21+", "Samsung Galaxy S22", "Samsung Galaxy S23 Ultra", "Samsung Galaxy S24",
    "Samsung Galaxy A55", "Samsung Galaxy A34", "Samsung Galaxy A14", "Samsung Galaxy A54", "Samsung Galaxy A72",
    "iPad 10.2 (2021)", "iPad Pro 11 (2018)",
    "MacBook Pro 13 inch A1708", "MacBook Air 13 inch, A2179",
    "Motorola Moto G54"
  ];

  const customCategoryOrder = [
    "Alle", "iPhone", "Samsung mobil", "iPad", "MacBook", "iMac", "Samsung Galaxy Tab", "Motorola mobil",
    "OnePlus mobil", "Nokia mobil", "Huawei mobil", "Xiaomi mobil", "Sony Xperia", "Oppo mobil", "Microsoft mobil", "Honor mobil",
    "Google Pixel", "Apple Watch", "Samsung Book", "Huawei tablet"
  ];

  const allCategories = customCategoryOrder.filter(cat =>
    cat === "Alle" || repairStructure.some(b => b.title === cat)
  );

  const brandsFiltered = selectedCategory === "Alle"
    ? repairStructure.filter(b => b.models.some(m => popularModelNames.includes(m.title)))
    : repairStructure.filter(b => b.title === selectedCategory);

  const filteredModels = brandsFiltered.flatMap(b => b.models)
    .filter(m => selectedCategory !== "Alle" || popularModelNames.includes(m.title))
    .filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (selectedCategory === "Alle") {
        return popularModelNames.indexOf(a.title) - popularModelNames.indexOf(b.title);
      }
      return 0;
    });

  const handleAddRepair = (deviceName, repair) => {
    if (repair.model_id) {
      fetch("https://telegiganten.dk/wp-json/telegiganten/v1/increment-model-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model_id: repair.model_id })
      }).catch(err => console.error("Fejl ved opdatering af model-usage:", err));
    }

    setOrder({
      ...order,
      repairs: [...order.repairs, {
        device: deviceName,
        repair: repair.title,
        price: repair.price,
        time: repair.time,
        model_id: repair.model_id
      }]
    });
  };

  const dummyCustomer = {
    id: "test-kunde",
    name: "Test Kunde",
    phone: "12345678",
    email: "test@telegiganten.dk"
  };

  const handleCreateCustomer = (newCustomer) => {
    const payload = {
      name: newCustomer.name?.trim(),
      phone: newCustomer.phone?.replace(/\s+/g, ""),
      email: newCustomer.email?.trim() || "",
      extraPhone: newCustomer.extraPhone?.replace(/\s+/g, "") || ""
    };
  
    if (!payload.name || !payload.phone) {
      console.error("Navn og telefonnummer mangler. Payload:", payload);
      return;
    }
  
    fetch("https://telegiganten.dk/wp-json/telegiganten/v1/create-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "created" || data.status === "exists") {
          const savedCustomer = {
            ...payload,
            id: data.customer_id
          };
          setCustomers(prev => [...prev, savedCustomer]);
          setOrder(prev => ({ ...prev, customer: savedCustomer }));
        } else {
          console.error("Uventet svar fra server:", data);
        }
        setOpenCreateCustomer(false);
      })
      .catch(err => {
        console.error("Fejl ved oprettelse af kunde:", err);
      });
  };

  const handleSelectCustomer = (selectedCustomer) => {
    setOrder({ ...order, customer: selectedCustomer });
    setOpenSelectCustomer(false);
  };

  const handleSaveCustomer = (editedCustomer) => {
    const updatedCustomers = customers.map(c =>
      c.id === editedCustomer.id ? editedCustomer : c
    );
    setCustomers(updatedCustomers);
    setOrder({ ...order, customer: editedCustomer });
    setOpenEditCustomer(false);
  };

  const handleRemoveCustomer = () => {
    setOrder({ ...order, customer: null });
  };

  const startEditingRepair = (index) => {
    setEditingRepairIndex(index);
    setEditingRepair({ ...order.repairs[index] });
  };

  const saveEditedRepair = (index) => {
    const updated = [...order.repairs];
    updated[index] = { ...editingRepair };
    setOrder({ ...order, repairs: updated });
    setEditingRepairIndex(null);
  };

  const removeRepair = (index) => {
    const updated = [...order.repairs];
    updated.splice(index, 1);
    setOrder({ ...order, repairs: updated });
  };

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
                  fontWeight: "500"
                }}
              >
                {cat}
              </div>
            ))}
          </div>

          <div style={{ flexGrow: 1 }}>
            <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Vælg enhed og reparation</h2>
            <input
              type="text"
              placeholder="Søg efter model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            {loading ? <p>Indlæser modeller...</p> : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                marginTop: "1rem"
              }}>
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    style={deviceStyle}
                    onClick={() => setModalDevice(model)}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
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
<div style={{
  width: "400px",
  backgroundColor: "#fff",
  borderLeft: "1px solid #ddd",
  padding: "2rem 1rem",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  position: "sticky",
  top: 0,
  overflow: "hidden"
}}>
  {/* Scrollbart indhold */}
  <div style={{ flexGrow: 1, overflowY: "auto" }}>
    {/* REPARATIONER */}
    <h4 style={{ textTransform: "uppercase", borderBottom: "1px solid #ddd", marginBottom: "1rem" }}>Reparationer</h4>
    {order.repairs.length === 0 ? (
      <p>Ingen reparationer valgt endnu.</p>
    ) : (
      <table style={{ width: "100%", fontSize: "0.85rem", marginBottom: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <th style={{ textAlign: "left" }}>Model</th>
            <th>Reparation</th>
            <th>Pris</th>
            <th>Min</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {order.repairs.map((r, i) => (
            <tr key={i}>
              <td>{editingRepairIndex === i
                ? <input value={editingRepair.device} onChange={(e) => setEditingRepair({ ...editingRepair, device: e.target.value })} />
                : r.device}
              </td>
              <td>{editingRepairIndex === i
                ? <input value={editingRepair.repair} onChange={(e) => setEditingRepair({ ...editingRepair, repair: e.target.value })} />
                : r.repair}
              </td>
              <td>{editingRepairIndex === i
                ? <input value={editingRepair.price} onChange={(e) => setEditingRepair({ ...editingRepair, price: e.target.value })} />
                : `${r.price} kr`}</td>
              <td>{editingRepairIndex === i
                ? <input value={editingRepair.time} onChange={(e) => setEditingRepair({ ...editingRepair, time: e.target.value })} />
                : `${r.time}`}</td>
              <td>
                {editingRepairIndex === i ? (
                  <button onClick={() => saveEditedRepair(i)}>✔️</button>
                ) : (
                  <>
                    <button onClick={() => startEditingRepair(i)}><FaEdit /></button>
                    <button onClick={() => removeRepair(i)}><FaTrashAlt /></button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    {/* KUNDE */}
    <h4 style={{ textTransform: "uppercase", borderBottom: "1px solid #ddd", marginTop: "2rem", marginBottom: "1rem" }}>Kunde</h4>
    {order.customer ? (
      <div style={{ marginBottom: "1rem" }}>
        <strong>{order.customer.name}</strong><br />
        <FaPhone /> {order.customer.phone}<br />
        <FaEnvelope /> {order.customer.email || "-"}
        <div style={{ marginTop: "0.5rem" }}>
          <button style={smallButtonStyle} onClick={() => setOpenEditCustomer(true)}><FaEdit /> Rediger</button>
          <button style={smallButtonStyle} onClick={handleRemoveCustomer}><FaTrashAlt /> Fjern</button>
        </div>
      </div>
    ) : (
      <>
        <button style={buttonStyle} onClick={() => setOpenCreateCustomer(true)}><FaUserPlus /> Opret kunde</button>
        <button style={buttonStyle} onClick={() => setOpenSelectCustomer(true)}><FaUser /> Vælg kunde</button>
      </>
    )}

    {/* NOTE & ADGANGSKODE */}
    <h4 style={{ textTransform: "uppercase", borderBottom: "1px solid #ddd", marginTop: "2rem", marginBottom: "1rem" }}>Adgangskode & Note</h4>
    <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}><FaLock /> Adgangskode</label>
    <input
      type="text"
      placeholder="Adgangskode"
      style={inputStyle}
      value={order.password || ""}
      onChange={(e) => setOrder({ ...order, password: e.target.value })}
    />
    <label style={{ fontWeight: "bold", fontSize: "0.9rem", marginTop: "0.5rem" }}><FaEdit /> Note</label>
    <textarea
      placeholder="Skriv en note her..."
      style={{ ...inputStyle, height: "80px", resize: "vertical" }}
      value={order.note || ""}
      onChange={(e) => setOrder({ ...order, note: e.target.value })}
    />
    {/* KNAP – altid synlig */}
  <div style={{ paddingTop: "1rem" }}>
    <button style={buttonStyle}
      onClick={onNext}
      disabled={order.repairs.length === 0}>
      <FaPlus /> Fortsæt
    </button>
  </div>
  </div> 
</div>

      <RepairModal
        device={modalDevice}
        repairs={repairStructure
          .flatMap(brand => brand.models)
          .find(model => model.id === modalDevice?.id)?.repairs || []}
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
          customers={[...customers, dummyCustomer]}
          onSelect={handleSelectCustomer}
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
