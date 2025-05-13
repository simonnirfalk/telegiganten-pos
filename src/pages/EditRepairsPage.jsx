import React, { useEffect, useState } from "react";

export default function PriceEditorPage() {
  const [repairs, setRepairs] = useState([]);
  const [editing, setEditing] = useState({});

  useEffect(() => {
    fetch("https://telegiganten.dk/wp-json/telegiganten/v1/repairs")
      .then((res) => res.json())
      .then(setRepairs)
      .catch((err) => console.error("Fejl ved hentning af reparationer:", err));
  }, []);

  const handleChange = (id, field, value) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (id) => {
    const { title, price, time } = editing[id] || {};
    const response = await fetch(
      "https://telegiganten.dk/wp-json/wp/v2/tg_repair/" + id,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer YOUR_AUTH_TOKEN"
        },
        body: JSON.stringify({
          title,
          meta: {
            _telegiganten_repair_repair_price: price,
            _telegiganten_repair_repair_time: time
          }
        })
      }
    );

    const result = await response.json();
    if (!result.id) return alert("Noget gik galt ved opdatering.");

    setRepairs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, title, price, time } : r))
    );
    setEditing((prev) => {
      const newEdit = { ...prev };
      delete newEdit[id];
      return newEdit;
    });
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>Rediger priser og tider</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={cellStyle}>Titel</th>
            <th style={cellStyle}>Pris</th>
            <th style={cellStyle}>Tid</th>
            <th style={cellStyle}>Gem</th>
          </tr>
        </thead>
        <tbody>
          {repairs.map((r) => {
            const isEditing = editing[r.id] || {};
            return (
              <tr key={r.id}>
                <td style={cellStyle}>
                  <input
                    value={isEditing.title ?? r.title}
                    onChange={(e) => handleChange(r.id, "title", e.target.value)}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    value={isEditing.price ?? r.price}
                    onChange={(e) => handleChange(r.id, "price", e.target.value)}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    value={isEditing.time ?? r.time}
                    onChange={(e) => handleChange(r.id, "time", e.target.value)}
                  />
                </td>
                <td style={cellStyle}>
                  <button onClick={() => handleSave(r.id)}>Gem</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle = {
  padding: "0.5rem",
  border: "1px solid #ddd"
};
