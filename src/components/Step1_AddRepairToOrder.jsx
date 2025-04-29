import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaTrashAlt, FaEdit, FaPlus } from "react-icons/fa";
import devices from "../data/devices.json";
import repairs from "../data/repairs.json";
import RepairModal from "../components/RepairModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import SelectCustomerModal from "../components/SelectCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";

export default function Step1_AddRepairToOrder({ order, setOrder, onNext, customers, setCustomers }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalDevice, setModalDevice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Alle");
  const [openCreateCustomer, setOpenCreateCustomer] = useState(false);
  const [openSelectCustomer, setOpenSelectCustomer] = useState(false);
  const [openEditCustomer, setOpenEditCustomer] = useState(false);

  const categories = ["Alle", "iPhone", "Samsung", "Motorola", "iPad", "MacBook"];

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

  const filteredDevices = devices
    .filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "Alle" || d.name.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchesSearch && matchesCategory;
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

  const handleCreateCustomer = (newCustomer) => {
    setCustomers([...customers, newCustomer]);
    setOrder({ ...order, customer: newCustomer });
    setOpenCreateCustomer(false);
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

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", overflow: "hidden" }}>
      {/* Venstre side */}
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#2166AC",
            color: "white",
            padding: "0.4rem 1rem",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            width: "fit-content"
          }}
        >
          <FaHome /> Dashboard
        </button>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
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

          <div style={{ flexGrow: 1 }}>
            <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Vælg enhed og reparation</h2>
            <input
              type="text"
              placeholder="Søg efter model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginTop: "1rem"
            }}>
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  style={deviceStyle}
                  onClick={() => setModalDevice(device)}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                  {device.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{
        width: "360px",
        backgroundColor: "#fff",
        borderLeft: "1px solid #ddd",
        padding: "2rem 1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto"
      }}>
        <div>
          <h4 style={{ textTransform: "uppercase" }}>Oversigt</h4>

          {order.repairs.length === 0 ? (
            <p>Ingen reparationer valgt endnu.</p>
          ) : (
            <>
              {order.repairs.map((r, i) => (
                <div key={i} style={{ marginBottom: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
                  <strong>{r.device}</strong><br />
                  {r.repair}<br />
                  <small>{r.price} kr • {r.time} min</small>
                </div>
              ))}
              <p><strong>Samlet:</strong> {order.repairs.reduce((sum, r) => sum + r.price, 0)} kr • {order.repairs.reduce((sum, r) => sum + r.time, 0)} min</p>
            </>
          )}

          {/* Kundevisning */}
          {order.customer && (
            <div style={{ marginTop: "1rem", padding: "0.5rem", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
              <strong>{order.customer.name}</strong><br />
              📞 {order.customer.phone}<br />
              ✉️ {order.customer.email || "-"}
              <div style={{ marginTop: "0.5rem" }}>
                <button style={smallButtonStyle} onClick={() => setOpenEditCustomer(true)}>✏️ Rediger</button>
                <button style={smallButtonStyle} onClick={handleRemoveCustomer}>🗑️ Fjern</button>
              </div>
            </div>
          )}

          {/* Kundehandlinger */}
          {!order.customer && (
            <>
              <button style={buttonStyle} onClick={() => setOpenCreateCustomer(true)}>➕ Opret kunde</button>
              <button style={buttonStyle} onClick={() => setOpenSelectCustomer(true)}>👤 Vælg kunde</button>
            </>
          )}

          {/* Adgangskode + Note */}
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>🔒 Adgangskode</label>
            <input
              type="text"
              placeholder="Adgangskode"
              style={inputStyle}
              value={order.password || ""}
              onChange={(e) => setOrder({ ...order, password: e.target.value })}
            />

            <label style={{ fontWeight: "bold", fontSize: "0.9rem", marginTop: "0.5rem" }}>📝 Note</label>
            <textarea
              placeholder="Skriv en note her..."
              style={{ ...inputStyle, height: "80px", resize: "vertical" }}
              value={order.note || ""}
              onChange={(e) => setOrder({ ...order, note: e.target.value })}
            />
          </div>
        </div>

        {/* Fortsæt-knap */}
        <button
          onClick={onNext}
          disabled={order.repairs.length === 0}
          style={{
            backgroundColor: "#22b783",
            color: "white",
            border: "none",
            padding: "1rem",
            borderRadius: "8px",
            fontWeight: "bold",
            marginTop: "2rem",
            width: "100%",
            fontSize: "1rem"
          }}
        >
          <FaPlus /> Fortsæt
        </button>
      </div>

      {/* Modaler */}
      <RepairModal
        device={modalDevice}
        repairs={repairs.filter(r => r.deviceId === modalDevice?.id)}
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
          customers={customers}
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
