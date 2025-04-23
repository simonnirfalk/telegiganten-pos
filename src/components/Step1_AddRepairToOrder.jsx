// Step1_AddRepairToOrder.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaTrashAlt, FaHome, FaEdit } from "react-icons/fa";
import devices from "../data/devices.json";
import repairs from "../data/repairs.json";
import RepairModal from "../components/RepairModal";

export default function Step1_AddRepairToOrder({ order, setOrder, onNext }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalDevice, setModalDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Alle");
  const [editing, setEditing] = useState({});

  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    margin: "0.5rem 0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  };

  const removeButtonStyle = {
    backgroundColor: "red",
    color: "white",
    padding: "0.3rem 0.5rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.9rem"
  };

  const inputStyle = {
    width: "100%",
    margin: "0.2rem 0",
    padding: "0.3rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "0.9rem"
  };

  const deviceStyle = {
    background: "linear-gradient(135deg, #e0e0e0 0%, #f9f9f9 100%)",
    color: "#000",
    border: "1px solid #ccc",
    padding: "1rem",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "center",
    fontWeight: "bold",
    boxSizing: "border-box",
    height: "100px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "box-shadow 0.2s ease"
  };

  const hoverStyle = {
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
  };

  const categories = ["Alle", "iPhone", "Samsung", "Motorola", "iPad", "MacBook"];

  const parseGeneration = (name) => {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const parseVariantRank = (name) => {
    if (/pro max/i.test(name)) return 3;
    if (/pro/i.test(name)) return 2;
    if (/plus|mini/i.test(name)) return 1;
    return 0;
  };

  const filteredDevices = devices
    .filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "Alle" || d.name.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const genA = parseGeneration(a.name);
      const genB = parseGeneration(b.name);
      if (genA !== genB) return genB - genA;
      return parseVariantRank(a.name) - parseVariantRank(b.name);
    })
    .slice(0, searchTerm || selectedCategory !== "Alle" ? undefined : 20);

  const handleAddRepair = (deviceName, repair) => {
    setOrder({
      ...order,
      repairs: [...order.repairs, {
        device: deviceName,
        repair: repair.name,
        price: repair.price,
        time: repair.time
      }]
    });
  };

  const handleUpdateRepairField = (index, field, value) => {
    const updated = [...order.repairs];
    updated[index][field] = value;
    setOrder({ ...order, repairs: updated });
    setEditing(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: false
      }
    }));
  };

  const handleRemoveRepair = (index) => {
    const updated = [...order.repairs];
    updated.splice(index, 1);
    setOrder({ ...order, repairs: updated });
  };

  const totalPrice = order.repairs.reduce((sum, r) => sum + parseInt(r.price || 0, 10), 0);
  const totalTime = order.repairs.reduce((sum, r) => sum + parseInt(r.time || 0, 10), 0);

  return (
    <div style={{ padding: "2rem", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, marginRight: "auto" }}>
          <FaHome /> Dashboard
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem" }}>
        {/* Kategorier */}
        <div style={{ width: "160px" }}>
          <h4 style={{ textTransform: "uppercase" }}>Kategorier</h4>
          {categories.map((cat) => (
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

        {/* Modeller */}
        <div style={{ flexGrow: 1 }}>
          <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Vælg enhed og reparation</h2>
          <input
            type="text"
            placeholder="Søg efter model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "0.5rem", marginBottom: "1rem", width: "100%", maxWidth: "400px" }}
          />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem"
          }}>
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                style={deviceStyle}
                onClick={() => setModalDevice(device)}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = hoverStyle.boxShadow}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
              >
                {device.name}
              </div>
            ))}
          </div>
        </div>

        {/* Ordreoversigt */}
        <div style={{
          width: "320px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fff",
          padding: "1rem",
          height: "fit-content",
          position: "sticky",
          top: "2rem",
          color: "#111",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <h4 style={{ textTransform: "uppercase" }}>Oversigt</h4>
            <h5>🔧 Reparationer</h5>
            {order.repairs.length === 0 && <p>Ingen reparationer valgt endnu.</p>}
            {order.repairs.map((r, i) => (
              <div key={i} style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}>
                <div style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "0.2rem" }}>
                  {editing[i]?.device ? (
                    <input
                      style={inputStyle}
                      defaultValue={r.device}
                      autoFocus
                      onBlur={(e) => handleUpdateRepairField(i, "device", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    />
                  ) : (
                    <span onClick={() => setEditing({ ...editing, [i]: { ...editing[i], device: true } })}>
                      {r.device} <FaEdit style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: "normal", marginBottom: "0.4rem" }}>
                  {editing[i]?.repair ? (
                    <input
                      style={inputStyle}
                      defaultValue={r.repair}
                      autoFocus
                      onBlur={(e) => handleUpdateRepairField(i, "repair", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    />
                  ) : (
                    <span onClick={() => setEditing({ ...editing, [i]: { ...editing[i], repair: true } })}>
                      {r.repair} <FaEdit style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>Pris:</strong>{" "}
                    {editing[i]?.price ? (
                      <input
                        style={inputStyle}
                        defaultValue={r.price}
                        autoFocus
                        onBlur={(e) => handleUpdateRepairField(i, "price", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      />
                    ) : (
                      <span onClick={() => setEditing({ ...editing, [i]: { ...editing[i], price: true } })}>
                        {r.price} kr <FaEdit style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }} />
                      </span>
                    )}
                  </div>
                  <div>
                    <strong>Tid:</strong>{" "}
                    {editing[i]?.time ? (
                      <input
                        style={inputStyle}
                        defaultValue={r.time}
                        autoFocus
                        onBlur={(e) => handleUpdateRepairField(i, "time", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      />
                    ) : (
                      <span onClick={() => setEditing({ ...editing, [i]: { ...editing[i], time: true } })}>
                        {r.time} min <FaEdit style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }} />
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveRepair(i)}
                  style={removeButtonStyle}
                >
                  <FaTrashAlt /> Fjern
                </button>
              </div>
            ))}
            <p style={{ marginTop: "1rem" }}>
              <strong>Samlet:</strong> {totalPrice} kr • {totalTime} min
            </p>
          </div>

          <button
            disabled={order.repairs.length === 0}
            onClick={onNext}
            style={{ ...buttonStyle, marginTop: "1rem", width: "100%" }}
          >
            <FaPlus /> Fortsæt
          </button>
        </div>
      </div>

      <RepairModal
        device={modalDevice}
        repairs={repairs.filter(r => r.deviceId === modalDevice?.id)}
        onAdd={handleAddRepair}
        onClose={() => setModalDevice(null)}
      />
    </div>
  );
}
