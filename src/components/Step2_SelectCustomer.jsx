import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaTrashAlt, FaPlus } from "react-icons/fa";

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
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

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
    setIsEditingCustomer(false);
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
    setIsEditingCustomer(true);
    setFormData({ ...order.customer });
  };

  const handleSaveChanges = () => {
    const updated = customers.map((c) =>
      c.phone === order.customer.phone ? { ...c, ...formData } : c
    );
    setCustomers(updated);
    setOrder({ ...order, customer: { ...formData } });
    setIsEditingCustomer(false);
    setError("");
  };

  const handleRemoveCustomer = () => {
    setOrder({ ...order, customer: null });
    setIsEditingCustomer(false);
  };

  const handleRemoveRepair = (index) => {
    const updated = [...order.repairs];
    updated.splice(index, 1);
    setOrder({ ...order, repairs: updated });
  };

  const handlePasswordChange = (e) => {
    setOrder({ ...order, password: e.target.value });
  };

  const handleNoteChange = (e) => {
    setOrder({ ...order, note: e.target.value });
  };

  const inputStyle = { padding: "0.5rem", width: "100%", marginBottom: "0.5rem", maxWidth: "400px" };

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

  const totalPrice = order.repairs.reduce((sum, r) => sum + parseInt(r.price || 0, 10), 0);
  const totalTime = order.repairs.reduce((sum, r) => sum + parseInt(r.time || 0, 10), 0);

  return (
    <div>
      {/* Øverste faste knapper */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")} style={{ ...buttonStyle, marginRight: "auto" }}>
          <FaHome /> Dashboard
        </button>
        <button onClick={onBack} style={buttonStyle}>⬅️ Tilbage</button>
      </div>

      <div style={{ display: "flex", gap: "2rem" }}>
        {/* Venstre side: kundeformular */}
        <div style={{ flex: 2, display: "flex", flexDirection: "column", maxWidth: "500px" }}>
          <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Tilføj kunde</h2>

          {!order.customer && (
            <>
              <h4>Søg eksisterende kunde</h4>
              <input type="text" placeholder="Navn eller telefonnummer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={inputStyle} />
              <button onClick={handleSearch} style={buttonStyle}>Søg</button>

              {searchResults.map((c, i) => (
                <div key={i} style={{
                  background: "#fff",
                  border: "1px solid #ccc",
                  padding: "1rem",
                  marginTop: "1rem",
                  borderRadius: "8px",
                  maxWidth: "400px"
                }}>
                  <strong>{c.name}</strong><br />
                  {c.phone} • {c.email}<br />
                  <button onClick={() => handleSelectCustomer(c)} style={{ ...buttonStyle, marginTop: "0.5rem" }}>
                    Vælg kunde
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
              <textarea placeholder="Note" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, height: "80px" }} />
              {error && <p style={{ color: "red" }}>{error}</p>}
              <button onClick={handleCreateCustomer} style={buttonStyle}>Opret kunde</button>
            </>
          )}

          {order.customer && isEditingCustomer && (
            <>
              <h4>Rediger kunde</h4>
              <input placeholder="Navn" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
              <input placeholder="Ekstra telefonnummer" value={formData.extraPhone} onChange={(e) => setFormData({ ...formData, extraPhone: e.target.value })} style={inputStyle} />
              <input placeholder="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
              <input placeholder="Adgangskode" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
              <textarea placeholder="Note" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, height: "80px" }} />
              <button onClick={handleSaveChanges} style={buttonStyle}>Gem ændringer</button>
            </>
          )}
        </div>

        {/* Sidebar oversigt */}
        <div style={{
          width: "320px",
          minHeight: "calc(100vh - 4rem)",
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fff",
          padding: "1rem",
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
            {order.repairs.map((r, i) => (
              <div key={i} style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}>
                <div style={{ fontSize: "1rem", fontWeight: "bold" }}>{r.device}</div>
                <div style={{ fontSize: "0.9rem" }}>{r.repair}</div>
                <div style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
                  <div><strong>Pris:</strong> {r.price} kr</div>
                  <div><strong>Tid:</strong> {r.time} min</div>
                </div>
                <button onClick={() => handleRemoveRepair(i)} style={removeButtonStyle}>
                  <FaTrashAlt /> Fjern
                </button>
              </div>
            ))}

            <p style={{ marginTop: "1rem" }}>
              <strong>Samlet:</strong> {totalPrice} kr • {totalTime} min
            </p>

            <div style={{ marginTop: "1rem" }}>
              <h5>🔒 Adgangskode</h5>
              <input
                style={inputStyle}
                value={order.password || ""}
                onChange={handlePasswordChange}
                placeholder="Adgangskode"
              />
              <h5>📝 Note</h5>
              <textarea
                style={{ ...inputStyle, height: "80px" }}
                value={order.note || ""}
                onChange={handleNoteChange}
                placeholder="Skriv en note her..."
              />
            </div>
          </div>

          <button
            disabled={!order.customer}
            onClick={onNext}
            style={{ ...buttonStyle, marginTop: "1rem", width: "100%" }}
          >
            <FaPlus /> Fortsæt
          </button>
        </div>
      </div>
    </div>
  );
}
