import React, { useEffect, useState } from "react";
import Select from "react-select";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function EditRepairsPage() {
  const [data, setData] = useState([]);
  const [editedRepairs, setEditedRepairs] = useState({});
  const [savingStatus, setSavingStatus] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [repairsPerPage, setRepairsPerPage] = useState(50);
  const [pageInput, setPageInput] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRepair, setNewRepair] = useState({
    brand: "",
    model: "",
    title: "",
    price: "",
    duration: ""
  });

  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [globalTitle, setGlobalTitle] = useState("");
  const [globalPrice, setGlobalPrice] = useState("");
  const [globalDuration, setGlobalDuration] = useState("");
  const [globalScope, setGlobalScope] = useState("all"); // 'all', 'brands', 'models'
  const [globalBrands, setGlobalBrands] = useState([]);
  const [globalModels, setGlobalModels] = useState([]);
  const [repairTitleOptions, setRepairTitleOptions] = useState([]);
  const [expandedBrands, setExpandedBrands] = useState([]);

    const resetGlobalModal = () => {
      setGlobalTitle("");
      setGlobalPrice("");
      setGlobalDuration("");
      setGlobalScope("all");
      setGlobalBrands([]);
      setGlobalModels([]);
    };

    const handleModalClose = () => {
      setShowGlobalModal(false);
      resetGlobalModal();
    };

  const handleCreateRepair = async () => {
    const brand = data.find(b => b.brand === newRepair.brand);
    const model = brand?.models.find(m => m.model === newRepair.model);

    if (!model) {
      alert("Ugyldig model.");
      return;
    }

    const model_id = model.options?.[0]?.model_id;
    if (!model_id) {
      alert("Kunne ikke finde model_id.");
      return;
    }

    try {
      const res = await fetch("https://telegiganten.dk/wp-json/telegiganten/v1/create-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRepair.title,
          model_id: model_id,
          price: parseInt(newRepair.price),
          time: parseInt(newRepair.duration)
        })
      });

      const result = await res.json();

      if (result?.status === "created") {
        const newOption = {
          id: result.repair_id,
          title: newRepair.title,
          price: parseInt(newRepair.price),
          duration: parseInt(newRepair.duration)
        };

        setData(prev => {
          return prev.map(b => {
            if (b.brand !== newRepair.brand) return b;
            return {
              ...b,
              models: b.models.map(m => {
                if (m.model !== newRepair.model) return m;
                return {
                  ...m,
                  options: [...m.options, newOption]
                };
              })
            };
          });
        });

        setNewRepair({ brand: "", model: "", title: "", price: "", duration: "" });
      } else {
        alert("Noget gik galt: " + (result?.message || "Ukendt fejl"));
      }
    } catch (err) {
      console.error("Fejl ved oprettelse:", err);
      alert("Der opstod en fejl ved oprettelse.");
    }
  };

  useEffect(() => {
    fetch("https://telegiganten.dk/wp-json/telegiganten/v1/all-repairs")
      .then(res => res.json())
      .then(data => {
        setData(data);
        const titles = [];
        data.forEach(b =>
          b.models.forEach(m =>
            m.options.forEach(o => {
              if (!titles.includes(o.title)) titles.push(o.title);
            })
          )
        );
        setRepairTitleOptions(titles.sort());
      })
      .catch(err => console.error("Fejl ved hentning:", err));
  }, []);

  const handleEdit = (repairId, field, value) => {
    setEditedRepairs(prev => ({
      ...prev,
      [repairId]: {
        ...prev[repairId],
        [field]: value
      }
    }));
  };

const handleSave = async (repairId) => {
  if (!editedRepairs[repairId]) return;
  setSavingStatus(prev => ({ ...prev, [repairId]: "saving" }));

  try {
    const res = await fetch("https://telegiganten.dk/wp-json/telegiganten/v1/update-repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repair_id: repairId,
        fields: {
          ...(editedRepairs[repairId].title !== undefined && { title: editedRepairs[repairId].title }),
          ...(editedRepairs[repairId].price !== undefined && {
            _telegiganten_repair_repair_price: editedRepairs[repairId].price
          }),
          ...(editedRepairs[repairId].duration !== undefined && {
            _telegiganten_repair_repair_time: editedRepairs[repairId].duration
          })
        }
      })
    });

    const result = await res.json();
    if (result?.status === "updated") {
      setSavingStatus(prev => ({ ...prev, [repairId]: "success" }));

      // 🔁 Opdater lokalt i state (uden re-fetch)
      setData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData)); // Deep copy
        for (const brand of newData) {
          for (const model of brand.models) {
            for (const option of model.options) {
              if (option.id === repairId) {
                if (editedRepairs[repairId].title !== undefined) {
                  option.title = editedRepairs[repairId].title;
                }
                if (editedRepairs[repairId].price !== undefined) {
                  option.price = editedRepairs[repairId].price;
                }
                if (editedRepairs[repairId].duration !== undefined) {
                  option.duration = editedRepairs[repairId].duration;
                }
              }
            }
          }
        }
        return newData;
      });

      // Fjern ændringen fra editedRepairs
      setEditedRepairs(prev => {
        const updated = { ...prev };
        delete updated[repairId];
        return updated;
      });
    } else {
      setSavingStatus(prev => ({ ...prev, [repairId]: "error" }));
    }
  } catch {
    setSavingStatus(prev => ({ ...prev, [repairId]: "error" }));
  }
};


  const handleSaveAll = async () => {
    const allIds = Object.keys(editedRepairs);
    if (allIds.length === 0) return;

    setSavingAll(true);

    for (const id of allIds) {
      await handleSave(id); // bruger vores optimerede enkeltsave med lokal setData
    }

    setSavingAll(false);
  };

  const handleDelete = async (repairId) => {
    const confirmDelete = window.confirm("Er du sikker på at du vil slette? Denne handling kan ikke fortrydes.");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`https://telegiganten.dk/wp-json/telegiganten/v1/delete-repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repair_id: repairId })
      });

      const result = await res.json();
      if (result?.status === "deleted") {
        // Fjern reparationen lokalt
        setData(prevData => {
          return prevData.map(brand => ({
            ...brand,
            models: brand.models.map(model => ({
              ...model,
              options: model.options.filter(opt => opt.id !== repairId)
            }))
          }));
        });
      } else {
        alert("Noget gik galt ved sletning.");
      }
    } catch (err) {
      console.error("Fejl ved sletning:", err);
      alert("Kunne ikke slette reparationen.");
    }
  };

  const handleApplyGlobalChange = async () => {
    if (!globalTitle || (!globalPrice && !globalDuration)) {
      alert("Udfyld titel og mindst ét felt (pris eller tid).");
      return;
    }

    const confirm = window.confirm("Er du sikker på, at du vil opdatere reparationer globalt?");
    if (!confirm) return;

    // Find model- og brand-id'er
    const brandIds = globalBrands.map(brandName =>
      data.find(b => b.brand === brandName)?.models.map(m => m.options?.[0]?.model_id)
    ).flat().filter(Boolean);

    const modelIds = globalModels.map(modelName =>
      data.flatMap(b => b.models).find(m => m.model === modelName)?.options?.[0]?.model_id
    ).filter(Boolean);

    const body = {
      title: globalTitle.trim(),
      fields: {
        ...(globalPrice && { _telegiganten_repair_repair_price: globalPrice }),
        ...(globalDuration && { _telegiganten_repair_repair_time: globalDuration })
      },
      scope: globalScope,
      brands: globalScope === "brands" ? brandIds : [],
      models: globalScope === "models" ? modelIds : []
    };

    try {
      const res = await fetch("https://telegiganten.dk/wp-json/telegiganten/v1/apply-repair-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const result = await res.json();
      if (result.status === "success") {
        alert(result.message);
        setShowGlobalModal(false);
        setGlobalTitle("");
        setGlobalPrice("");
        setGlobalDuration("");
        setGlobalBrands([]);
        setGlobalModels([]);
        setGlobalScope("all");
      } else {
        alert("Der opstod en fejl: " + (result.message || "Ukendt fejl"));
      }
    } catch (err) {
      console.error("Fejl ved global opdatering:", err);
      alert("Fejl ved opdatering. Prøv igen.");
    }
  };


  // ➤ Kombineret filtrering
  const filteredData = data
  .filter(brand => !selectedBrand || brand.brand === selectedBrand)
  .map(brand => ({
    ...brand,
    models: brand.models
      .filter(model => {
        if (selectedModel && model.model !== selectedModel) return false;

        const searchWords = searchTerm.toLowerCase().split(" ").filter(Boolean);

        // Check if ANY of the model's options match ALL words
        return model.options.some(opt => {
          return searchWords.every(word =>
            model.model.toLowerCase().includes(word) ||
            opt.title.toLowerCase().includes(word)
          );
        });
      })
      .map(model => {
        const searchWords = searchTerm.toLowerCase().split(" ").filter(Boolean);

        return {
          ...model,
          options: model.options.filter(opt =>
            searchWords.every(word =>
              model.model.toLowerCase().includes(word) ||
              opt.title.toLowerCase().includes(word)
            )
          )
        };
      })
  }))
  .filter(brand => brand.models.length > 0);

const allFilteredRepairs = [];
filteredData.forEach(brand => {
  brand.models.forEach(model => {
    model.options.forEach(option => {
      allFilteredRepairs.push({
        brand: brand.brand,
        model: model.model,
        ...option
      });
    });
  });
});

const totalRepairs = allFilteredRepairs.length;
const totalPages = Math.ceil(totalRepairs / repairsPerPage);

const paginatedRepairs = allFilteredRepairs.slice(
  (currentPage - 1) * repairsPerPage,
  currentPage * repairsPerPage
);

useEffect(() => {
  const escHandler = (e) => {
    if (e.key === "Escape") handleModalClose();
  };
  document.addEventListener("keydown", escHandler);
  return () => document.removeEventListener("keydown", escHandler);
}, []);

  return (
        <div style={{ padding: "2rem" }}>
          {/* Top-knap */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <button
              onClick={() => navigate("/")}
              style={{ backgroundColor: "#2166AC", color: "white", padding: "0.6rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
            >
              <FaHome /> Dashboard
            </button>
          </div>
          <h2 style={{ textTransform: "uppercase", fontWeight: "bold" }}>Redigér reparationer</h2>

      {showCreateForm && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            margin: "1rem 0"
          }}
        >
          <select
            value={newRepair.brand}
            onChange={(e) => {
              setNewRepair({ ...newRepair, brand: e.target.value, model: "" });
            }}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
          >
            <option value="">Vælg enhed</option>
            {data.map(b => (
              <option key={b.brand} value={b.brand}>{b.brand}</option>
            ))}
          </select>

          <select
            value={newRepair.model}
            onChange={(e) => setNewRepair({ ...newRepair, model: e.target.value })}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
            disabled={!newRepair.brand}
          >
            <option value="">Vælg model</option>
            {data.find(b => b.brand === newRepair.brand)?.models.map(m => (
              <option key={m.model} value={m.model}>{m.model}</option>
            )) ?? []}
          </select>

          <input
            type="text"
            placeholder="Titel"
            value={newRepair.title}
            onChange={(e) => setNewRepair({ ...newRepair, title: e.target.value })}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
          />

          <input
            type="number"
            placeholder="Pris"
            value={newRepair.price}
            onChange={(e) => setNewRepair({ ...newRepair, price: e.target.value })}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "100px" }}
          />

          <input
            type="number"
            placeholder="Tid (min)"
            value={newRepair.duration}
            onChange={(e) => setNewRepair({ ...newRepair, duration: e.target.value })}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "100px" }}
          />

          <button
            onClick={handleCreateRepair}
            style={{
              backgroundColor: "#22b783",
              color: "white",
              padding: "10px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
            disabled={
              !newRepair.brand || !newRepair.model || !newRepair.title || !newRepair.price || !newRepair.duration
            }
          >
            Opret reparation
          </button>
        </div>
      )}

      <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#f9f9f9",
            padding: "1rem 0",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1.5rem",
            borderBottom: "1px solid #ddd"
          }}
        >
          <input
            type="text"
            placeholder="Søg model eller reparation..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "250px" }}
          />

          <select
            value={selectedBrand}
            onChange={e => {
              setSelectedBrand(e.target.value);
              setSelectedModel("");
            }}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
          >
            <option value="">Alle enheder</option>
            {data.map(b => (
              <option key={b.brand} value={b.brand}>{b.brand}</option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
          >
            <option value="">Alle modeller</option>
            {data
              .find(b => b.brand === selectedBrand)?.models.map(m => (
                <option key={m.model} value={m.model}>{m.model}</option>
              )) ?? []}
          </select>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <button
              onClick={handleSaveAll}
              style={{
                backgroundColor: Object.keys(editedRepairs).length === 0 ? "#ccc" : "#2166AC",
                color: "white",
                padding: "10px 16px",
                border: "none",
                borderRadius: "6px",
                cursor: Object.keys(editedRepairs).length === 0 ? "not-allowed" : "pointer"
              }}
              disabled={Object.keys(editedRepairs).length === 0 || savingAll}
            >
              {savingAll ? "Gemmer..." : "Gem alle ændringer"}
            </button>

              <button
                onClick={() => setShowGlobalModal(true)}
                style={{
                  marginTop: "0.5rem",
                  backgroundColor: "#2166AC",
                  color: "white",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Global opdatering
              </button>


            {Object.keys(editedRepairs).length > 0 && !savingAll && (
              <span style={{ color: "#cc0000", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Husk at gemme ændringer!
              </span>
            )}
          </div>

          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            style={{
              backgroundColor: "#2166AC",
              color: "white",
              padding: "10px 16px",
              border: "none",
              borderRadius: "6px",
              marginTop: "0.5rem",
              cursor: "pointer"
            }}
          >
            {showCreateForm ? "Skjul opretformular" : "Opret reparation"}
          </button>

        </div>


      {/* LISTE */}
      <table className="w-full text-sm border mt-4">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="text-left p-3 text-base font-semibold">Enhed / Model</th>
            <th className="text-left p-3 text-base font-semibold">Titel</th>
            <th className="text-left p-3 text-base font-semibold">Pris</th>
            <th className="text-left p-3 text-base font-semibold">Tid</th>
            <th className="text-left p-3 text-base font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {paginatedRepairs.map((repair) => {
            const edited = editedRepairs[repair.id] || {};
            const status = savingStatus[repair.id];

            return (
              <tr key={repair.id} className="border-t">
                <td className="p-2 pr-6">
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "1rem", lineHeight: "1.3" }}>{repair.model}</div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>{repair.brand}</div>
                  </div>
                </td>
                <td className="p-2 p1-5">
                  <input
                    className="border p-1 w-full"
                    value={edited.title ?? repair.title}
                    onChange={(e) => handleEdit(repair.id, "title", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border p-1 w-full"
                    value={edited.price ?? repair.price}
                    onChange={(e) => handleEdit(repair.id, "price", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border p-1 w-full"
                    value={edited.duration ?? repair.duration}
                    onChange={(e) => handleEdit(repair.id, "duration", e.target.value)}
                  />
                </td>
                <td className="p-2 flex gap-2 items-center">
                  <button
                    onClick={() => handleSave(repair.id)}
                    disabled={status === "saving"}
                    style={{
                      backgroundColor: status === "saving" ? "#ccc" : "#2166AC", // grå hvis gemmer
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: status === "saving" ? "not-allowed" : "pointer"
                    }}
                    onMouseEnter={(e) => {
                      if (!status === "saving") e.target.style.backgroundColor = "#1fa374";
                    }}
                    onMouseLeave={(e) => {
                      if (!status === "saving") e.target.style.backgroundColor = "#22b783";
                    }}
                  >
                    {status === "saving" ? "Gemmer..." : "GEM"}
                  </button>
                  <button
                    onClick={() => handleDelete(repair.id)}
                    title="Slet reparation"
                    style={{
                      backgroundColor: "#dc2626",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    SLET
                  </button>

                  {status === "success" && (
                    <span className="text-green-600 text-sm">✔ Gemt</span>
                  )}
                  {status === "error" && (
                    <span className="text-red-600 text-sm">Fejl!</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

  {/* PAGINATION */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      marginTop: "2rem",
      flexWrap: "wrap"
    }}
  >
    {/* Forrige-knap */}
    <button
      disabled={currentPage === 1}
      onClick={() => setCurrentPage(currentPage - 1)}
      style={{
        backgroundColor: currentPage === 1 ? "#ccc" : "#2166AC",
        color: "white",
        padding: "6px 14px",
        borderRadius: "6px",
        border: "none",
        cursor: currentPage === 1 ? "not-allowed" : "pointer"
      }}
    >
      Forrige
    </button>

    <span style={{ fontSize: "0.95rem" }}>
      Side {currentPage} af {totalPages} ({totalRepairs} resultater)
    </span>

    {/* Næste-knap */}
    <button
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage(currentPage + 1)}
      style={{
        backgroundColor: currentPage === totalPages ? "#ccc" : "#2166AC",
        color: "white",
        padding: "6px 14px",
        borderRadius: "6px",
        border: "none",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer"
      }}
    >
      Næste
    </button>

    {/* Gå til side */}
    <label htmlFor="pageJump" style={{ fontSize: "0.9rem" }}>Gå til side:</label>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const pageNum = parseInt(pageInput);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          setCurrentPage(pageNum);
          setPageInput("");
        }
      }}
      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
    >
      <input
        id="pageJump"
        type="number"
        value={pageInput}
        onChange={e => setPageInput(e.target.value)}
        min={1}
        max={totalPages}
        style={{
          border: "1px solid #ccc",
          padding: "6px 8px",
          borderRadius: "6px",
          width: "60px"
        }}
      />
      <button
        type="submit"
        style={{
          backgroundColor: "#2166AC",
          color: "white",
          padding: "6px 14px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer"
        }}
      >
        Gå
      </button>
    </form>

    {/* Vælg antal pr. side */}
    <label htmlFor="perPage" style={{ fontSize: "0.9rem" }}>Vis pr. side:</label>
    <select
      id="perPage"
      value={repairsPerPage}
      onChange={e => {
        setRepairsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
      }}
      style={{
        border: "1px solid #ccc",
        padding: "6px 8px",
        borderRadius: "6px",
        maxWidth: "100px"
      }}
    >
      <option value={50}>50</option>
      <option value={100}>100</option>
      <option value={200}>200</option>
    </select>
  </div>


  {/* Global opdatering */}
  {showGlobalModal && (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={() => setShowGlobalModal(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          width: "600px",
          maxWidth: "90%",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
      >
        <h3 style={{ marginBottom: "1rem" }}>Global opdatering</h3>

        <Select
          options={repairTitleOptions.map(title => ({ value: title, label: title }))}
          value={globalTitle ? { value: globalTitle, label: globalTitle } : null}
          onChange={(selectedOption) => setGlobalTitle(selectedOption?.value || "")}
          placeholder="Vælg reparationstitel..."
          isClearable
          styles={{
            container: base => ({ ...base, marginBottom: "1rem" }),
            control: base => ({ ...base, padding: "2px" }),
          }}
        />

        <input
          type="number"
          placeholder="Ny pris"
          value={globalPrice}
          onChange={(e) => setGlobalPrice(e.target.value)}
          style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
        />
        <input
          type="number"
          placeholder="Ny tid (min)"
          value={globalDuration}
          onChange={(e) => setGlobalDuration(e.target.value)}
          style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
        />

        <div style={{ marginBottom: "1rem" }}>
          <strong>Vælg forekomster:</strong>
          <div style={{
            marginTop: "0.5rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "0.75rem",
            maxHeight: "300px",
            overflowY: "auto"
          }}>
            {/* Alle forekomster */}
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "0.75rem",
              gap: "0.5rem"
            }}>
              <input
                type="checkbox"
                checked={globalScope === "all"}
                onChange={() => {
                  setGlobalScope("all");
                  setGlobalBrands([]);
                  setGlobalModels([]);
                }}
              />
              <span style={{ fontWeight: 500 }}>Alle forekomster</span>
            </div>

            {/* Enheder og modeller */}
            {data.map(b => (
              <div key={b.brand} style={{ marginBottom: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem"
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={globalScope === "brands" && globalBrands.includes(b.brand)}
                      onChange={() => {
                        const checked = globalBrands.includes(b.brand);
                        setGlobalScope("brands");
                        setGlobalBrands(prev =>
                          checked ? prev.filter(x => x !== b.brand) : [...prev, b.brand]
                        );
                        setGlobalModels([]);
                      }}
                    />
                    <span style={{ fontWeight: 500 }}>{b.brand}</span>
                  </label>

                  <button
                    onClick={() =>
                      setExpandedBrands(prev =>
                        prev.includes(b.brand)
                          ? prev.filter(x => x !== b.brand)
                          : [...prev, b.brand]
                      )
                    }
                    style={{
                      fontSize: "0.75rem",
                      background: "none",
                      border: "1px solid #ccc",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: "#2166AC",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {expandedBrands.includes(b.brand) ? "Skjul modeller" : "Vis modeller"}
                  </button>
                </div>

                {expandedBrands.includes(b.brand) && (
                  <div style={{ paddingLeft: "1.75rem", marginTop: "0.5rem" }}>
                    {b.models.map(m => (
                      <label
                        key={m.model}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.9rem",
                          marginBottom: "0.25rem"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={globalScope === "models" && globalModels.includes(m.model)}
                          onChange={() => {
                            const checked = globalModels.includes(m.model);
                            setGlobalScope("models");
                            setGlobalModels(prev =>
                              checked ? prev.filter(x => x !== m.model) : [...prev, m.model]
                            );
                            setGlobalBrands([]);
                          }}
                        />
                        {m.model}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>


        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button
            onClick={() => setShowGlobalModal(false)}
            style={{
              backgroundColor: "#ccc",
              color: "#000",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none"
            }}
          >
            Annuller
          </button>
          <button
            onClick={handleApplyGlobalChange}
            style={{
              backgroundColor: "#22b783",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none"
            }}
          >
            Opdater globalt
          </button>
        </div>
      </div>
    </div>
  )}

    </div>
  );
}