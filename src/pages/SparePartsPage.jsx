import React, { useEffect, useState } from "react";
import { FaUndo, FaTrash, FaPlus, FaHistory } from "react-icons/fa";

export default function SparePartsPage() {
  const [parts, setParts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState([]);
  const [newPart, setNewPart] = useState({ model: "", price: "", stock: "", location: "", category: "", cost_price: "", repair: "" });
  const [editingIndex, setEditingIndex] = useState(null);

  const fetchParts = async () => {
    const res = await fetch("/wp-json/telegiganten/v1/spareparts");
    const data = await res.json();
    setParts(data);
    setFiltered(data);
  };

  useEffect(() => { fetchParts(); }, []);

  useEffect(() => {
    const terms = search.toLowerCase().split(" ").filter(Boolean);
    setFiltered(
      parts.filter(p => terms.every(t =>
        p.model.toLowerCase().includes(t) ||
        p.location.toLowerCase().includes(t) ||
        p.category.toLowerCase().includes(t) ||
        p.repair.toLowerCase().includes(t)
      ))
    );
  }, [search, parts]);

  const saveChange = async (id, field, value) => {
    const old = parts.find(p => p.id === id)[field];
    setParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setHistory(prev => [{ id, field, old, newVal: value }, ...prev.slice(0, 9)]);

    await fetch(`/wp-json/telegiganten/v1/spareparts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parts.find(p => p.id === id), [field]: value })
    });
  };

  const undoLast = () => {
    const last = history[0];
    if (!last) return;
    saveChange(last.id, last.field, last.old);
    setHistory(prev => prev.slice(1));
  };

  const addPart = async () => {
    const res = await fetch("/wp-json/telegiganten/v1/spareparts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPart)
    });
    const result = await res.json();
    if (result.status === "created") fetchParts();
    setNewPart({ model: "", price: "", stock: "", location: "", category: "", cost_price: "", repair: "" });
  };

  const deletePart = async (id) => {
    if (!window.confirm("Er du sikker på at du vil slette?")) return;
    await fetch(`/wp-json/telegiganten/v1/spareparts/${id}`, { method: "DELETE" });
    fetchParts();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={undoLast} className="bg-green-600 text-white p-2 rounded"><FaUndo /></button>
          <button onClick={() => alert(JSON.stringify(history, null, 2))} className="bg-green-600 text-white p-2 rounded"><FaHistory /></button>
        </div>
        <div className="flex gap-2">
          <input
            className="border p-2 rounded"
            placeholder="Søg..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <button onClick={() => setEditingIndex(editingIndex === -1 ? null : -1)} className="bg-green-600 text-white p-2 rounded"><FaPlus /></button>
        </div>
      </div>

      {editingIndex === -1 && (
        <div className="grid grid-cols-7 gap-2 mb-6">
          {Object.keys(newPart).map(field => (
            <input
              key={field}
              placeholder={field}
              value={newPart[field]}
              onChange={e => setNewPart(prev => ({ ...prev, [field]: e.target.value }))}
              className="border p-2 rounded"
            />
          ))}
          <button onClick={addPart} className="col-span-1 bg-blue-600 text-white p-2 rounded">Tilføj</button>
        </div>
      )}

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Model</th>
            <th className="p-2 text-left">Pris</th>
            <th className="p-2 text-left">Lager</th>
            <th className="p-2 text-left">Lokation</th>
            <th className="p-2 text-left">Kategori</th>
            <th className="p-2 text-left">Kostpris</th>
            <th className="p-2 text-left">Reparation</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(part => (
            <tr key={part.id} className="border-t">
              {Object.keys(newPart).map(field => (
                <td key={field} className="p-1">
                  <input
                    className="border p-1 w-full"
                    value={part[field] ?? ""}
                    onChange={e => saveChange(part.id, field, e.target.value)}
                  />
                </td>
              ))}
              <td>
                <button onClick={() => deletePart(part.id)} className="bg-red-600 text-white px-2 py-1 rounded"><FaTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
