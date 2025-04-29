import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaTrashAlt, FaPhone, FaEnvelope, FaUserPlus, FaUser, FaHome, FaLock } from "react-icons/fa";
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
  const [editingRepairIndex, setEditingRepairIndex] = useState(null);
  const [editingRepair, setEditingRepair] = useState({});

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
      {/* Venstre side */}
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, width: "fit-content" }}>
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
