import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Step1_AddRepairToOrder({ devices, order, setOrder, onNext }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const dummyRepairs = [
    { device: "iPhone 13", repairs: [{ name: "Skærmskift", price: 1000, time: 60 }, { name: "Batteriskift", price: 500, time: 30 }] },
    { device: "Samsung Galaxy S22", repairs: [{ name: "Skærmskift", price: 1100, time: 70 }] },
  ];

  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    margin: "0.5rem 0",
    cursor: "pointer"
  };

  const deviceStyle = (active) => ({
    backgroundColor: active ? "#2166AC" : "#fff",
    color: active ? "white" : "black",
    border: `1px solid ${active ? "#2166AC" : "#ccc"}`,
    padding: "1rem",
    borderRadius: "10px",
    cursor: "pointer",
    minWidth: "200px"
  });

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRepair = (device, repair) => {
    setOrder({
      ...order,
      repairs: [...order.repairs, { device, repair: repair.name, price: repair.price, time: repair.time }]
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
    <div>
      {/* Fast header med Dashboard */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, marginRight: "auto" }}>
          🏠 Dashboard
        </button>
      </div>

      <div style={{ display: "flex", gap: "2rem" }}>
        {/* Venstre side */}
        <div style={{ flex: 2 }}>
          <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Vælg enhed og reparation</h2>

          <input
            type="text"
            placeholder="Søg efter model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "0.5rem", marginBottom: "1rem", width: "100%", maxWidth: "400px" }}
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {filteredDevices.map((device, i) => (
              <div key={i} style={deviceStyle(false)}>
                <strong>{device.name}</strong>
                <div style={{ marginTop: "0.5rem" }}>
                  {dummyRepairs
                    .find((d) => d.device === device.name)?.repairs
                    .map((repair, idx) => (
                      <div key={idx} style={{
                        backgroundColor: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        padding: "0.5rem",
                        marginTop: "0.5rem",
                        color: "#111",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>{repair.name} ({repair.price} kr / {repair.time} min)</span>
                        <button
                          onClick={() => handleAddRepair(device.name, repair)}
                          style={{ ...buttonStyle, padding: "0.3rem 0.8rem", fontSize: "0.9rem" }}
                        >
                          ➕ Tilføj
                        </button>
                      </div>
                    ))}
                </div>
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

        {/* Højreside */}
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
    </div>
  );
}
