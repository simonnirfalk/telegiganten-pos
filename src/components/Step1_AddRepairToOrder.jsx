import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import devices from "../data/devices.json";
import repairs from "../data/repairs.json";
import RepairModal from "../components/RepairModal";

export default function Step1_AddRepairToOrder({ order, setOrder, onNext }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalDevice, setModalDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Alle");

  const categories = ["Alle", "iPhone", "Samsung", "Motorola", "iPad", "MacBook"];

  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    margin: "0.5rem 0",
    cursor: "pointer"
  };

  const deviceStyle = {
    backgroundColor: "#fff",
    color: "black",
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
    justifyContent: "center"
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Alle" || d.name.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  }).slice(0, searchTerm || selectedCategory !== "Alle" ? undefined : 20);

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

  const handleRemoveRepair = (index) => {
    const updated = [...order.repairs];
    updated.splice(index, 1);
    setOrder({ ...order, repairs: updated });
  };

  const totalPrice = order.repairs.reduce((sum, r) => sum + r.price, 0);
  const totalTime = order.repairs.reduce((sum, r) => sum + r.time, 0);

  return (
    <div style={{ padding: "2rem", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, marginRight: "auto" }}>
          🏠 Dashboard
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
              >
                {device.name}
              </div>
            ))}
          </div>

          <button
            disabled={order.repairs.length === 0}
            onClick={onNext}
            style={{ ...buttonStyle, marginTop: "2rem" }}
          >
            Fortsæt
          </button>
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
          color: "#111"
        }}>
          <h4 style={{ textTransform: "uppercase" }}>Ordreoversigt</h4>
          <h5>🔧 Reparationer</h5>
          {order.repairs.length === 0 && <p>Ingen reparationer valgt endnu.</p>}
          {order.repairs.map((r, i) => (
            <div key={i} style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}>
              <strong>{r.device}</strong><br />
              {r.repair} ({r.price} kr / {r.time} min)
              <br />
              <button onClick={() => handleRemoveRepair(i)} style={{ ...buttonStyle, backgroundColor: "red", marginTop: "0.3rem", padding: "0.3rem 0.5rem" }}>❌</button>
            </div>
          ))}
          <p style={{ marginTop: "1rem" }}><strong>Samlet:</strong> {totalPrice} kr • {totalTime} min</p>
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
