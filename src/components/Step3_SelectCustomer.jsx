import React, { useState } from "react";

export default function Step3_SelectCustomer({
  customerForm,
  setCustomerForm,
  selectedCustomer,
  setSelectedCustomer,
  searchTerm,
  setSearchTerm,
  searchResults,
  setSearchResults,
  customers,
  setCustomers,
  error,
  setError,
  onBack,
  onNext,
  onCreateCustomer
}) {
  const [editForm, setEditForm] = useState(null);

  const handleSearch = () => {
    const results = customers.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
    setSearchResults(results);
  };

  const handleSaveEdit = () => {
    if (!editForm.name || !editForm.phone) {
      setError("Navn og telefonnummer skal udfyldes.");
      return;
    }

    const updatedList = customers.map((c) =>
      c.phone === selectedCustomer.phone ? { ...c, ...editForm } : c
    );
    setCustomers(updatedList);
    setSelectedCustomer({ ...selectedCustomer, ...editForm });
    setEditForm(null);
    setError("");
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
    setCustomerForm({});
    setEditForm(null);
    setError("");
  };

  return (
    <div>
      <h2 style={{ fontWeight: "bold", textTransform: "uppercase" }}>Kundeoplysninger</h2>

      {/* Hvis der IKKE er valgt en kunde */}
      {!selectedCustomer && (
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          {/* Tilføj eksisterende kunde */}
          <div>
            <h4>🔍 Tilføj eksisterende kunde</h4>
            <input
              type="text"
              placeholder="Søg på navn eller telefonnummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "0.6rem 1rem", width: "300px", marginRight: "1rem" }}
            />
            <button onClick={handleSearch} style={{ padding: "0.6rem 1.5rem" }}>Søg kunde</button>

            {searchResults.map((customer, index) => (
              <div key={index} style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem", borderRadius: "8px" }}>
                <p><strong>{customer.name}</strong> ({customer.phone})</p>
                <p>{customer.email}</p>
                <button onClick={() => setSelectedCustomer(customer)}>Vælg kunde</button>
              </div>
            ))}
          </div>

          {/* Opret ny kunde */}
          <div>
            <h4>➕ Opret ny kunde</h4>
            <input type="text" placeholder="Navn" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} style={inputStyle} /><br />
            <input type="tel" placeholder="Telefonnummer" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} style={inputStyle} /><br />
            <input type="tel" placeholder="Ekstra telefonnummer" value={customerForm.extraPhone || ""} onChange={(e) => setCustomerForm({ ...customerForm, extraPhone: e.target.value })} style={inputStyle} /><br />
            <input type="email" placeholder="E-mail" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} style={inputStyle} /><br />
            <input type="text" placeholder="Adgangskode" value={customerForm.password} onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })} style={inputStyle} /><br />
            <textarea placeholder="Kommentar" value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} rows={3} style={inputStyle} /><br />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button onClick={onCreateCustomer} style={{ padding: "0.6rem 1.5rem" }}>Opret kunde</button>
          </div>
        </div>
      )}

      {/* Hvis der ER valgt en kunde */}
      {selectedCustomer && (
        <div style={{ maxWidth: "500px", border: "2px solid #2166AC", padding: "1rem", borderRadius: "10px", background: "#f3faff", marginBottom: "1rem" }}>
          <h3>Kunde tilføjet</h3>
          <p><strong>{selectedCustomer.name}</strong></p>
          <p>📞 {selectedCustomer.phone}</p>
          {selectedCustomer.extraPhone && <p>📱 Ekstra: {selectedCustomer.extraPhone}</p>}
          <p>✉️ {selectedCustomer.email}</p>
          <p>📝 {selectedCustomer.notes}</p>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={() => setEditForm({ ...selectedCustomer })} style={{ marginRight: "1rem" }}>✏️ Rediger</button>
            <button onClick={handleRemoveCustomer}>❌ Fjern</button>
          </div>
        </div>
      )}

      {/* Redigeringsformular hvis aktiv */}
      {editForm && (
        <div style={{ maxWidth: "500px", padding: "1rem", background: "#fff", borderRadius: "8px", border: "1px solid #ccc" }}>
          <h4>✏️ Rediger kunde</h4>
          <input type="text" placeholder="Navn" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} /><br />
          <input type="tel" value={editForm.phone} disabled style={{ ...inputStyle, backgroundColor: "#f0f0f0", color: "#666" }} /><br />
          <input type="tel" placeholder="Ekstra telefonnummer" value={editForm.extraPhone || ""} onChange={(e) => setEditForm({ ...editForm, extraPhone: e.target.value })} style={inputStyle} /><br />
          <input type="email" placeholder="E-mail" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} /><br />
          <input type="text" placeholder="Adgangskode" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} style={inputStyle} /><br />
          <textarea placeholder="Kommentar" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} style={inputStyle} /><br />
          <button onClick={handleSaveEdit} style={{ padding: "0.6rem 1.5rem", marginTop: "0.5rem" }}>💾 Gem ændringer</button>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <button onClick={onBack} style={{ marginRight: "1rem", backgroundColor: "#22b783", color: "white", padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none" }}>⬅️ Tilbage</button>
        <button disabled={!selectedCustomer} onClick={onNext} style={{ backgroundColor: "#22b783", color: "white", padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none" }}>Fortsæt</button>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "0.6rem 1rem",
  width: "300px",
  marginBottom: "0.5rem"
};
