import React from "react";

export default function Step3_SelectCustomer({
  customerForm,
  setCustomerForm,
  selectedCustomer,
  setSelectedCustomer,
  searchTerm,
  setSearchTerm,
  searchResults,
  setSearchResults,
  error,
  setError,
  onBack,
  onNext,
  onSearch,
  onCreateCustomer,
  onUpdateCustomer
}) {
  const handleEdit = () => {
    setCustomerForm({ ...selectedCustomer });
    setSelectedCustomer(null);
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      password: "",
      notes: "",
    });
  };

  const isEditing = selectedCustomer && customerForm.phone === selectedCustomer.phone;

  const handleSubmit = () => {
    if (isEditing) {
      onUpdateCustomer(customerForm);
    } else {
      onCreateCustomer(customerForm);
    }
  };

  return (
    <div>
      <h3 style={{ fontWeight: "bold", textTransform: "uppercase" }}>Kundeoplysninger</h3>

      {!selectedCustomer && (
        <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem" }}>
          {/* Sektion: Søg kunde */}
          <div>
            <h4>🔍 Tilføj eksisterende kunde</h4>
            <input
              type="text"
              placeholder="Søg på navn eller telefonnummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "0.6rem 1rem", width: "300px", marginRight: "1rem" }}
            />
            <button onClick={onSearch} style={{ padding: "0.6rem 1.5rem" }}>
              Søg kunde
            </button>

            {searchResults.map((customer, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ccc",
                  padding: "1rem",
                  marginTop: "1rem",
                  borderRadius: "8px",
                  maxWidth: "300px",
                }}
              >
                <p>
                  <strong>{customer.name}</strong> ({customer.phone})
                </p>
                <p>{customer.email}</p>
                <button onClick={() => setSelectedCustomer(customer)}>Vælg kunde</button>
              </div>
            ))}
          </div>

          {/* Sektion: Opret/redigér kunde */}
          <div>
            <h4>{isEditing ? "✏️ Rediger kunde" : "➕ Opret ny kunde"}</h4>
            <input
              type="text"
              placeholder="Navn"
              value={customerForm.name}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, name: e.target.value })
              }
              style={{
                padding: "0.6rem 1rem",
                width: "300px",
                marginBottom: "0.5rem",
              }}
            />
            <br />
            <input
              type="tel"
              placeholder="Telefonnummer"
              value={customerForm.phone}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, phone: e.target.value })
              }
              style={{
                padding: "0.6rem 1rem",
                width: "300px",
                marginBottom: "0.5rem",
              }}
              disabled={isEditing}
            />
            <br />
            <input
              type="email"
              placeholder="E-mail"
              value={customerForm.email}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, email: e.target.value })
              }
              style={{
                padding: "0.6rem 1rem",
                width: "300px",
                marginBottom: "0.5rem",
              }}
            />
            <br />
            <input
              type="text"
              placeholder="Adgangskode"
              value={customerForm.password}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, password: e.target.value })
              }
              style={{
                padding: "0.6rem 1rem",
                width: "300px",
                marginBottom: "0.5rem",
              }}
            />
            <br />
            <textarea
              placeholder="Kommentar"
              value={customerForm.notes}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, notes: e.target.value })
              }
              rows={3}
              style={{
                padding: "0.6rem 1rem",
                width: "300px",
                marginBottom: "0.5rem",
              }}
            />
            <br />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button
              onClick={handleSubmit}
              style={{ padding: "0.6rem 1.5rem" }}
            >
              {isEditing ? "Gem ændringer" : "Opret kunde"}
            </button>
          </div>
        </div>
      )}

      {/* Valgt kunde vises her */}
      {selectedCustomer && (
        <div
          style={{
            maxWidth: "400px",
            border: "2px solid #2166AC",
            padding: "1rem",
            borderRadius: "10px",
            background: "#f3faff",
          }}
        >
          <h3>Kunde tilføjet</h3>
          <p>
            <strong>{selectedCustomer.name}</strong>
          </p>
          <p>{selectedCustomer.phone}</p>
          <p>{selectedCustomer.email}</p>
          <p>{selectedCustomer.notes}</p>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={handleEdit} style={{ marginRight: "1rem" }}>
              ✏️ Rediger
            </button>
            <button onClick={handleRemoveCustomer}>❌ Fjern</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={onBack}
          style={{
            marginRight: "1rem",
            backgroundColor: "#22b783",
            color: "white",
            padding: "0.6rem 1.5rem",
            borderRadius: "8px",
            border: "none",
          }}
        >
          ⬅️ Tilbage
        </button>
        <button
          disabled={!selectedCustomer}
          onClick={onNext}
          style={{
            backgroundColor: "#22b783",
            color: "white",
            padding: "0.6rem 1.5rem",
            borderRadius: "8px",
            border: "none",
          }}
        >
          Fortsæt
        </button>
      </div>
    </div>
  );
}
