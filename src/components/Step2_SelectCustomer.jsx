import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaArrowLeft, FaEdit, FaTrash, FaUserPlus, FaCheck } from "react-icons/fa";

export default function Step2_SelectCustomer({
  customers,
  setCustomers,
  order,
  setOrder,
  onBack,
  onNext
}) {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    extraPhone: "",
    email: "",
    password: "",
    notes: ""
  });
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (customers.length === 0) {
      setCustomers([
        {
          id: 1,
          name: "Mads Andersen",
          phone: "22223333",
          extraPhone: "",
          email: "mads@eksempel.dk",
          password: "kode123",
          notes: "Foretrækker afhentning før kl. 16"
        },
        {
          id: 2,
          name: "Laura Jensen",
          phone: "44445555",
          extraPhone: "50505050",
          email: "laura@eksempel.dk",
          password: "hemmelig",
          notes: ""
        }
      ]);
    }
  }, [customers, setCustomers]);

  const handleSearch = () => {
    const results = customers.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
    setSearchResults(results);
  };

  const handleSelectCustomer = (customer) => {
    setOrder({ ...order, customer });
    setSearchTerm("");
    setSearchResults([]);
    setError("");
    setIsEditing(false);
  };

  const handleCreateCustomer = () => {
    if (!formData.name || !formData.phone) {
      setError("Navn og telefonnummer er påkrævet.");
      return;
    }

    const exists = customers.find((c) => c.phone === formData.phone);
    if (exists) {
      setError("Telefonnummer findes allerede.");
      return;
    }

    const newCustomer = {
      ...formData,
      id: Date.now()
    };

    setCustomers([...customers, newCustomer]);
    setOrder({ ...order, customer: newCustomer });
    setFormData({ name: "", phone: "", extraPhone: "", email: "", password: "", notes: "" });
    setError("");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({ ...order.customer });
  };

  const handleSaveChanges = () => {
    const updated = customers.map((c) =>
      c.phone === order.customer.phone ? { ...c, ...formData } : c
    );
    setCustomers(updated);
    setOrder({ ...order, customer: { ...formData } });
    setIsEditing(false);
    setError("");
  };

  const handleRemoveCustomer = () => {
    setOrder({ ...order, customer: null });
    setIsEditing(false);
  };

  const inputStyle = { padding: "0.5rem", width: "100%", marginBottom: "0.5rem" };

  const buttonStyle = {
    backgroundColor: "#2166AC",
    color: "white",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    border: "none",
    marginRight: "0.5rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  };

  const redButtonStyle = {
    ...buttonStyle,
    backgroundColor: "red"
  };

  const totalPrice = order.repairs.reduce((sum, r) => sum + r.price, 0);
  const totalTime = order.repairs.reduce((sum, r) => sum + r.time, 0);

  return (
    <div>
      {/* Topknapper */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, marginRight: "auto" }}>
          <FaHome /> Dashboard
        </button>
        <button onClick={onBack} style={buttonStyle}>
          <FaArrowLeft /> Tilbage
        </button>
      </div>

      <div style={{ display: "flex", gap: "2rem" }}>
        {/* Venstre side */}
        <div style={{ flex: 2 }}>
          <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Tilføj kunde</h2>

          {!order.customer && (
            <>
              <h4>Søg eksisterende kunde</h4>
              <input type="text" placeholder="Navn eller telefonnummer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={inputStyle} />
              <button onClick={handleSearch} style={buttonStyle}><FaUserPlus /> Søg</button>

              {searchResults.map((c, i) => (
                <div key={i} style={{
                  background: "#fff",
                  border: "1px solid #ccc",
                  padding: "1rem",
                  marginTop: "1rem",
                  borderRadius: "8px"
                }}>
                  <strong>{c.name}</strong><br />
                  {c.phone} • {c.email}<br />
                  <button onClick={() => handleSelectCustomer(c)} style={{ ...buttonStyle, marginTop: "0.5rem" }}>
                    <FaCheck /> Vælg kunde
                  </button>
                </div>
              ))}
            </>
          )}

          {!order.customer && (
            <>
              <h4 style={{ marginTop: "2rem" }}>Opret ny kunde</h4>
              <input placeholder="Navn" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
              <input placeholder="Telefonnummer" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
              <input placeholder="Ekstra telefonnummer" value={formData.extraPhone} onChange={(e) => setFormData({ ...formData, extraPhone: e.target.value })} style={inputStyle} />
              <input placeholder="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
              <input placeholder="Adgangskode" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
              <textarea placeholder="Kommentar" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={inputStyle} rows={3} />
              {error && <p style={{ color: "red" }}>{error}</p>}
              <button onClick={handleCreateCustomer} style={buttonStyle}><FaUserPlus /> Opret kunde</button>
            </>
          )}

          {order.customer && isEditing && (
            <>
              <h4>Rediger kunde</h4>
              <input placeholder="Navn" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
              <input placeholder="Ekstra telefonnummer" value={formData.extraPhone} onChange={(e) => setFormData({ ...formData, extraPhone: e.target.value })} style={inputStyle} />
              <input placeholder="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
              <input placeholder="Adgangskode" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
              <textarea placeholder="Kommentar" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={inputStyle} rows={3} />
              <button onClick={handleSaveChanges} style={buttonStyle}><FaCheck /> Gem ændringer</button>
            </>
          )}
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
          <h5 style={{ marginBottom: "0.5rem" }}>🔧 Reparationer</h5>
          {order.repairs.map((r, i) => (
            <div key={i} style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}>
              <strong>{r.device}</strong><br />
              {r.repair} ({r.price} kr / {r.time} min)
            </div>
          ))}
          <p><strong>Samlet:</strong> {totalPrice} kr • {totalTime} min</p>
          <hr />
          <h5>👤 Kunde</h5>
          {order.customer ? (
            <div>
              <p><strong>{order.customer.name}</strong></p>
              <p>{order.customer.phone}</p>
              {order.customer.extraPhone && <p>{order.customer.extraPhone}</p>}
              <p>{order.customer.email}</p>
              <p>{order.customer.notes}</p>
              <button onClick={handleEdit} style={buttonStyle}><FaEdit /> Rediger</button>
              <button onClick={handleRemoveCustomer} style={redButtonStyle}><FaTrash /> Fjern</button>
            </div>
          ) : (
            <p>Ingen kunde valgt.</p>
          )}
          <button
            disabled={!order.customer}
            onClick={onNext}
            style={{ ...buttonStyle, marginTop: "1rem", width: "100%" }}
          >
            <FaCheck /> Fortsæt
          </button>
        </div>
      </div>
    </div>
  );
}
