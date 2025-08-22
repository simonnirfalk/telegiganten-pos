// src/pages/EditRepairsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import SwitchToggle from "../components/SwitchToggle";
import { api, proxyFetch } from "../data/apiClient";

/* --------------------- Sorteringshjælpere --------------------- */
const brandOrder = [
  "iPhone", "Samsung mobil", "iPad", "MacBook", "iMac", "Samsung Galaxy Tab", "Motorola mobil",
  "OnePlus mobil", "Nokia mobil", "Huawei mobil", "Xiaomi mobil", "Sony Xperia", "Oppo mobil",
  "Microsoft mobil", "Honor mobil", "Google Pixel", "Apple Watch", "Samsung Book", "Huawei tablet"
];

const sortBrands = (a, b) => {
  const ia = brandOrder.indexOf(a.brand);
  const ib = brandOrder.indexOf(b.brand);
  const sa = ia === -1 ? 999 : ia;
  const sb = ib === -1 ? 999 : ib;
  if (sa !== sb) return sa - sb;
  return a.brand.localeCompare(b.brand, "da");
};

const variantOrder = ["", " Plus", " Pro", " Pro Max"];
const extractModelRank = (modelName) => {
  const match = String(modelName || "").match(/\d+/);
  const number = match ? parseInt(match[0], 10) : 0;
  const variant = variantOrder.findIndex((v) => String(modelName || "").includes(v));
  return { number, variant: variant === -1 ? 0 : variant };
};

const sortModels = (a, b) => {
  const aRank = extractModelRank(a.model);
  const bRank = extractModelRank(b.model);
  if (aRank.number !== bRank.number) return bRank.number - aRank.number; // nyeste først
  return aRank.variant - bRank.variant; // Standard → Plus → Pro → Pro Max
};

const repairTitleOrder = [
  "Skærm", "Skærm A+", "Skærm OEM", "Skærm (Officiel - pulled)", "Beskyttelsesglas", "Batteri",
  "Bundstik", "Bagcover (glas)", "Bagcover (inkl. ramme)", "Bagkamera", "Frontkamera", "Højtaler",
  "Ørehøjtaler", "Vandskade", "Tænd/sluk", "Volumeknap", "Software", "Overfør data til ny enhed", "Diagnose"
];
const sortRepairs = (a, b) => {
  const ia = repairTitleOrder.indexOf(a.title);
  const ib = repairTitleOrder.indexOf(b.title);
  const sa = ia === -1 ? 999 : ia;
  const sb = ib === -1 ? 999 : ib;
  if (sa !== sb) return sa - sb;
  return String(a.title || "").localeCompare(String(b.title || ""), "da");
};

// finder alle model_id'er under et brand-navn
const getModelIdsForBrand = (brandName) => {
  const b = data.find((x) => x.brand === brandName);
  if (!b) return [];
  // vi tager model_id fra options (de er ens for samme model)
  const ids = [];
  b.models.forEach((m) => {
    const mid = m.options?.[0]?.model_id;
    if (mid) ids.push(mid);
  });
  return ids;
};

// finder model_id for et givent model-navn (unik inden for et brand)
const getModelIdByModelName = (modelName) => {
  for (const b of data) {
    const m = b.models.find((mm) => mm.model === modelName);
    if (m?.options?.[0]?.model_id) return m.options[0].model_id;
  }
  return null;
};

/* --------------------- Komponent --------------------- */
export default function EditRepairsPage() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [editedRepairs, setEditedRepairs] = useState({});
  const [savingStatus, setSavingStatus] = useState({});
  const [savingAll, setSavingAll] = useState(false);

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

  /* --------------------- Aktiver/deaktiver --------------------- */
  const toggleRepairActive = async (repairId, isActive) => {
    try {
      await api.updateRepair({
        repair_id: repairId,
        fields: { repair_option_active: isActive ? 1 : 0 },
      });

      // Optimistisk UI-opdatering
      setData((prev) =>
        prev.map((brand) => ({
          ...brand,
          models: brand.models.map((model) => ({
            ...model,
            options: model.options.map((opt) =>
              opt.id === repairId
                ? { ...opt, repair_option_active: isActive ? 1 : 0 }
                : opt
            ),
          })),
        }))
      );
    } catch (err) {
      console.error("Fejl ved toggle:", err);
      alert("Kunne ikke opdatere aktiv-status.");
    }
  };

  const handleDeleteTemplate = async (repairId) => {
    if (!window.confirm("Er du sikker på, at du vil slette denne skabelon?")) return;
    try {
      await api.deleteRepairTemplate(repairId);
      // Fjern fra lokal state
      setData((prev) =>
        prev.map((brand) => ({
          ...brand,
          models: brand.models.map((model) => ({
            ...model,
            options: model.options.filter((opt) => opt.id !== repairId),
          })),
        }))
      );
    } catch (err) {
      console.error("Fejl ved sletning:", err);
      alert("Kunne ikke slette skabelonen.");
    }
  };

  /* --------------------- Opret ny repair-option --------------------- */
  const handleCreateRepair = async () => {
    const brand = data.find((b) => b.brand === newRepair.brand);
    const model = brand?.models.find((m) => m.model === newRepair.model);

    if (!model) {
      alert("Ugyldig model.");
      return;
    }

    // Vi tager model_id fra en af modelens options (struktur fra /all-repairs)
    const model_id = model.options?.[0]?.model_id;
    if (!model_id) {
      alert("Kunne ikke finde model_id.");
      return;
    }

    try {
      const payload = {
        title: newRepair.title,
        model_id,
        price: parseInt(newRepair.price || "0", 10),
        time: parseInt(newRepair.duration || "0", 10),
      };
      const result = await api.createRepairTemplate(payload);

      if (result?.status === "created") {
        const newOption = {
          id: result.repair_id,
          title: newRepair.title,
          price: payload.price,
          duration: payload.time,
          model_id,
          // nyoprettet er aktiv medmindre andet siges
          repair_option_active: 1,
        };

        setData((prev) =>
          prev.map((b) =>
            b.brand !== newRepair.brand
              ? b
              : {
                  ...b,
                  models: b.models.map((m) =>
                    m.model !== newRepair.model
                      ? m
                      : { ...m, options: [...m.options, newOption].sort(sortRepairs) }
                  ),
                }
          )
        );

        setNewRepair({ brand: "", model: "", title: "", price: "", duration: "" });
      } else {
        alert("Noget gik galt: " + (result?.message || "Ukendt fejl"));
      }
    } catch (err) {
      console.error("Fejl ved oprettelse:", err);
      alert("Der opstod en fejl ved oprettelse.");
    }
  };

  /* --------------------- Load data via proxy --------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Hent all-in-one struktur
        const raw = await proxyFetch({ path: "/wp-json/telegiganten/v1/all-repairs" });

        // Normalisér:
        // - Sørg for at repair_option_active = 1 hvis feltet mangler (løser “alt er inaktivt”)
        // - Sortér i ønskede ordner
        const normalized = (Array.isArray(raw) ? raw : []).map((brand) => ({
          ...brand,
          models: (brand.models || [])
            .map((model) => ({
              ...model,
              options: (model.options || [])
                .map((opt) => ({
                  ...opt,
                  // hvis serveren ikke sender feltet → antag aktiv
                  repair_option_active:
                    String(opt.repair_option_active ?? "1") === "1" ? 1 : 0,
                }))
                .sort(sortRepairs),
            }))
            .sort(sortModels),
        }));

        const sorted = normalized.sort(sortBrands);
        if (mounted) setData(sorted);

        // Udfyld titel-options til Global opdatering
        const titlesSet = new Set();
        sorted.forEach((b) =>
          b.models.forEach((m) =>
            m.options.forEach((o) => {
              if (o?.title) titlesSet.add(o.title);
            })
          )
        );
        if (mounted) setRepairTitleOptions(Array.from(titlesSet).sort((a, b) => a.localeCompare(b, "da")));
      } catch (err) {
        console.error("Fejl ved hentning:", err);
        // bevidst ingen alert – siden kan stadig bruges uden data
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* --------------------- Redigér og gem --------------------- */
  const handleEdit = (repairId, field, value) => {
    setEditedRepairs((prev) => ({
      ...prev,
      [repairId]: { ...prev[repairId], [field]: value },
    }));
  };

  const handleSave = async (repairId) => {
    if (!editedRepairs[repairId]) return;
    setSavingStatus((p) => ({ ...p, [repairId]: "saving" }));
    try {
      const patch = {
        ...(editedRepairs[repairId].title !== undefined && {
          title: editedRepairs[repairId].title,
        }),
        ...(editedRepairs[repairId].price !== undefined && {
          _telegiganten_repair_repair_price: editedRepairs[repairId].price,
        }),
        ...(editedRepairs[repairId].duration !== undefined && {
          _telegiganten_repair_repair_time: editedRepairs[repairId].duration,
        }),
      };

      await api.updateRepair({ repair_id: repairId, fields: patch });

      // Opdatér lokalt
      setData((prev) => {
        const next = prev.map((brand) => ({
          ...brand,
          models: brand.models.map((model) => ({
            ...model,
            options: model.options.map((opt) =>
              opt.id === repairId
                ? {
                    ...opt,
                    ...(editedRepairs[repairId].title !== undefined && {
                      title: editedRepairs[repairId].title,
                    }),
                    ...(editedRepairs[repairId].price !== undefined && {
                      price: editedRepairs[repairId].price,
                    }),
                    ...(editedRepairs[repairId].duration !== undefined && {
                      duration: editedRepairs[repairId].duration,
                    }),
                  }
                : opt
            ),
          })),
        }));
        return next;
      });

      setSavingStatus((p) => ({ ...p, [repairId]: "success" }));
      setEditedRepairs((prev) => {
        const n = { ...prev };
        delete n[repairId];
        return n;
      });
    } catch (e) {
      console.error("Fejl ved gem:", e);
      setSavingStatus((p) => ({ ...p, [repairId]: "error" }));
    }
  };

  const handleSaveAll = async () => {
    const allIds = Object.keys(editedRepairs);
    if (allIds.length === 0) return;
    setSavingAll(true);
    for (const id of allIds) {
      // sekventielt for at holde det simpelt
      // (kunne optimeres til Promise.all)
      // eslint-disable-next-line no-await-in-loop
      await handleSave(id);
    }
    setSavingAll(false);
  };

  /* --------------------- Filtrering + Pagination --------------------- */
  const filteredData = useMemo(() => {
    const words = searchTerm.toLowerCase().split(" ").filter(Boolean);

    return (data || [])
      .filter((brand) => !selectedBrand || brand.brand === selectedBrand)
      .map((brand) => ({
        ...brand,
        models: (brand.models || [])
          .filter((model) => {
            if (selectedModel && model.model !== selectedModel) return false;
            if (words.length === 0) return true;
            // match hvis modelnavn eller nogen option-titel indeholder ALLE søgeord
            return model.options.some((opt) =>
              words.every(
                (w) =>
                  model.model.toLowerCase().includes(w) ||
                  String(opt.title || "").toLowerCase().includes(w)
              )
            );
          })
          .map((model) => ({
            ...model,
            options: (model.options || []).filter((opt) =>
              words.every(
                (w) =>
                  model.model.toLowerCase().includes(w) ||
                  String(opt.title || "").toLowerCase().includes(w)
              )
            ),
          })),
      }))
      .filter((brand) => brand.models.length > 0);
  }, [data, selectedBrand, selectedModel, searchTerm]);

  const allFilteredRepairs = useMemo(() => {
    const arr = [];
    filteredData.forEach((brand) => {
      brand.models.forEach((model) => {
        model.options.forEach((opt) => {
          arr.push({ brand: brand.brand, model: model.model, ...opt });
        });
      });
    });
    return arr;
  }, [filteredData]);

  const totalRepairs = allFilteredRepairs.length;
  const totalPages = Math.max(1, Math.ceil(totalRepairs / repairsPerPage));
  const paginatedRepairs = allFilteredRepairs.slice(
    (currentPage - 1) * repairsPerPage,
    currentPage * repairsPerPage
  );

  useEffect(() => {
    const escHandler = (e) => e.key === "Escape" && handleModalClose();
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, []);

  /* --------------------- Render --------------------- */
  return (
    <div style={{ padding: "2rem" }}>
      {/* Top-knap */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#2166AC",
            color: "white",
            padding: "0.6rem 1rem",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <FaHome /> Dashboard
        </button>
      </div>

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1rem" }}>
        Redigér reparationer
      </h2>

      {/* Handling-knapper */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={() => setShowGlobalModal(true)}
          style={{
            backgroundColor: "#2166AC",
            color: "white",
            padding: "10px 16px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Global opdatering
        </button>

        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          style={{
            backgroundColor: "#2166AC",
            color: "white",
            padding: "10px 16px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {showCreateForm ? "Skjul opretformular" : "Opret reparation"}
        </button>

        {/* Slet alle/aktiver alle – deaktiveret, da endpoints ikke findes i API'et */}
      </div>

      {/* Opret formular */}
      {showCreateForm && (
        <div
          style={{
            marginBottom: "2rem",
            border: "1px solid #ddd",
            padding: "1rem",
            borderRadius: "6px",
          }}
        >
          <h4 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontWeight: "bold" }}>
            Opret ny reparation
          </h4>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <select
              value={newRepair.brand}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, brand: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "200px" }}
            >
              <option value="">Vælg enhed</option>
              {data.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand}
                </option>
              ))}
            </select>

            <select
              value={newRepair.model}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, model: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "200px" }}
            >
              <option value="">Vælg model</option>
              {(data.find((b) => b.brand === newRepair.brand)?.models || []).map((m) => (
                <option key={m.model} value={m.model}>
                  {m.model}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Titel"
              value={newRepair.title}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, title: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
            />

            <input
              type="number"
              placeholder="Pris"
              value={newRepair.price}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, price: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "120px" }}
            />

            <input
              type="number"
              placeholder="Tid (min)"
              value={newRepair.duration}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, duration: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "120px" }}
            />

            <button
              onClick={handleCreateRepair}
              style={{
                backgroundColor: "#22b783",
                color: "white",
                padding: "10px 16px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Opret
            </button>
          </div>
        </div>
      )}

      {/* Sticky filter/gem-bar */}
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
          borderBottom: "1px solid #ddd",
        }}
      >
        <input
          type="text"
          placeholder="Søg model eller reparation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "250px" }}
        />

        <select
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setSelectedModel("");
          }}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
        >
          <option value="">Alle enheder</option>
          {data.map((b) => (
            <option key={b.brand} value={b.brand}>
              {b.brand}
            </option>
          ))}
        </select>

        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
        >
          <option value="">Alle modeller</option>
          {(data.find((b) => b.brand === selectedBrand)?.models || []).map((m) => (
            <option key={m.model} value={m.model}>
              {m.model}
            </option>
          ))}
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
              cursor: Object.keys(editedRepairs).length === 0 ? "not-allowed" : "pointer",
            }}
            disabled={Object.keys(editedRepairs).length === 0 || savingAll}
          >
            {savingAll ? "Gemmer..." : "Gem alle ændringer"}
          </button>

          {Object.keys(editedRepairs).length > 0 && !savingAll && (
            <span style={{ color: "#cc0000", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Husk at gemme ændringer!
            </span>
          )}
        </div>
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
          {paginatedRepairs.map((repair, index) => {
            const edited = editedRepairs[repair.id] || {};
            const status = savingStatus[repair.id];
            const isFirstOfModel =
              index === 0 || repair.model !== paginatedRepairs[index - 1].model;

            // Brug alternating baggrund pr. model-gruppe
            const isOddModelGroup = (() => {
              let groupIndex = 0;
              for (let i = 0; i <= index; i++) {
                if (i === 0 || paginatedRepairs[i].model !== paginatedRepairs[i - 1].model) {
                  groupIndex++;
                }
              }
              return groupIndex % 2 === 1;
            })();

            const isActive = String(repair.repair_option_active ?? "1") === "1";

            const rowStyle = {
              backgroundColor: isOddModelGroup ? "#f8f8f8" : "#ffffff",
              borderLeft: "4px solid " + (isOddModelGroup ? "#2166AC" : "#22b783"),
              opacity: isActive ? 1 : 0.5,
            };

            return (
              <tr key={repair.id} className="border-t" style={rowStyle}>
                <td className="p-2 pr-6" style={{ verticalAlign: "top" }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "1rem", lineHeight: "1.3" }}>
                      {repair.model}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>{repair.brand}</div>
                  </div>
                </td>
                <td className="p-2 p1-5" style={{ verticalAlign: "top" }}>
                  <input
                    className="border p-1 w-full"
                    value={edited.title ?? repair.title ?? ""}
                    onChange={(e) => handleEdit(repair.id, "title", e.target.value)}
                  />
                </td>
                <td className="p-2" style={{ verticalAlign: "top" }}>
                  <input
                    className="border p-1 w-full"
                    value={edited.price ?? repair.price ?? ""}
                    onChange={(e) => handleEdit(repair.id, "price", e.target.value)}
                  />
                </td>
                <td className="p-2" style={{ verticalAlign: "top" }}>
                  <input
                    className="border p-1 w-full"
                    value={edited.duration ?? repair.duration ?? ""}
                    onChange={(e) => handleEdit(repair.id, "duration", e.target.value)}
                  />
                </td>
                <td className="p-2 flex gap-2 items-center" style={{ verticalAlign: "top" }}>
                  {/* Aktiv/deaktiv */}
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>Aktiv</span>
                    <SwitchToggle
                      checked={isActive}
                      onChange={(checked) => toggleRepairActive(repair.id, checked)}
                    />
                  </label>

                  <button
                    onClick={() => handleSave(repair.id)}
                    disabled={status === "saving"}
                    style={{
                      backgroundColor: status === "saving" ? "#ccc" : "#2166AC",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: status === "saving" ? "not-allowed" : "pointer",
                    }}
                  >
                    {status === "saving" ? "Gemmer..." : "GEM"}
                  </button>

                  <button
                    onClick={() => handleDeleteTemplate(repair.id)}
                    style={{
                      backgroundColor: "#cc0000",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
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

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginTop: "2rem",
          flexWrap: "wrap",
        }}
      >
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          style={{
            backgroundColor: currentPage === 1 ? "#ccc" : "#2166AC",
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          Forrige
        </button>

        <span style={{ fontSize: "0.95rem" }}>
          Side {currentPage} af {totalPages} ({totalRepairs} resultater)
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          style={{
            backgroundColor: currentPage === totalPages ? "#ccc" : "#2166AC",
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Næste
        </button>

        {/* Gå til side */}
        <label htmlFor="pageJump" style={{ fontSize: "0.9rem" }}>
          Gå til side:
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const pageNum = parseInt(pageInput || "0", 10);
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
            onChange={(e) => setPageInput(e.target.value)}
            min={1}
            max={totalPages}
            style={{
              border: "1px solid #ccc",
              padding: "6px 8px",
              borderRadius: "6px",
              width: "60px",
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
              cursor: "pointer",
            }}
          >
            Gå
          </button>
        </form>

        {/* Pr. side */}
        <label htmlFor="perPage" style={{ fontSize: "0.9rem" }}>
          Vis pr. side:
        </label>
        <select
          id="perPage"
          value={repairsPerPage}
          onChange={(e) => {
            setRepairsPerPage(parseInt(e.target.value, 10));
            setCurrentPage(1);
          }}
          style={{
            border: "1px solid #ccc",
            padding: "6px 8px",
            borderRadius: "6px",
            maxWidth: "100px",
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
            zIndex: 1000,
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
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Global opdatering</h3>

            <Select
              options={repairTitleOptions.map((title) => ({ value: title, label: title }))}
              value={globalTitle ? { value: globalTitle, label: globalTitle } : null}
              onChange={(opt) => setGlobalTitle(opt?.value || "")}
              placeholder="Vælg reparationstitel..."
              isClearable
              styles={{
                container: (base) => ({ ...base, marginBottom: "1rem" }),
                control: (base) => ({ ...base, padding: "2px" }),
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
              <div
                style={{
                  marginTop: "0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {/* Alle */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "30px 120px 1fr",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={globalScope === "all"}
                    onChange={() => {
                      setGlobalScope("all");
                      setGlobalBrands([]);
                      setGlobalModels([]);
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#666" }}></span>
                  <span style={{ fontWeight: "500" }}>Alle forekomster</span>
                </div>

                {/* Enheder + modeller */}
                {data.map((b) => (
                  <div key={b.brand} style={{ marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "30px 120px 1fr",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={globalScope === "brands" && globalBrands.includes(b.brand)}
                        onChange={() => {
                          const checked = globalBrands.includes(b.brand);
                          setGlobalScope("brands");
                          setGlobalBrands((prev) =>
                            checked ? prev.filter((x) => x !== b.brand) : [...prev, b.brand]
                          );
                          setGlobalModels([]);
                        }}
                      />
                      <button
                        onClick={() =>
                          setExpandedBrands((prev) =>
                            prev.includes(b.brand) ? prev.filter((x) => x !== b.brand) : [...prev, b.brand]
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
                          whiteSpace: "nowrap",
                        }}
                      >
                        {expandedBrands.includes(b.brand) ? "Skjul modeller" : "Vis modeller"}
                      </button>
                      <span>{b.brand}</span>
                    </div>

                    {expandedBrands.includes(b.brand) && (
                      <div style={{ paddingLeft: "2.5rem", marginTop: "0.5rem" }}>
                        {b.models.map((m) => (
                          <div
                            key={m.model}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "30px 120px 1fr",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={globalScope === "models" && globalModels.includes(m.model)}
                              onChange={() => {
                                const checked = globalModels.includes(m.model);
                                setGlobalScope("models");
                                setGlobalModels((prev) =>
                                  checked ? prev.filter((x) => x !== m.model) : [...prev, m.model]
                                );
                                setGlobalBrands([]);
                              }}
                            />
                            <span></span>
                            <span style={{ fontSize: "0.9rem" }}>{m.model}</span>
                          </div>
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
                  border: "none",
                }}
              >
                Annuller
              </button>
              
              <button
                onClick={async () => {
                  if (!globalTitle) {
                    alert("Vælg en reparationstitel først.");
                    return;
                  }

                  const fields = {};
                  if (globalPrice !== "")
                    fields["_telegiganten_repair_repair_price"] = parseInt(globalPrice || "0", 10);
                  if (globalDuration !== "")
                    fields["_telegiganten_repair_repair_time"] = parseInt(globalDuration || "0", 10);

                  if (Object.keys(fields).length === 0) {
                    alert("Udfyld mindst ét felt (pris eller tid).");
                    return;
                  }

                  // find model_ids ud fra scope
                  let modelIds = [];
                  if (globalScope === "all") {
                    data.forEach((b) => {
                      b.models.forEach((m) => {
                        const mid = m.options?.[0]?.model_id;
                        if (mid) modelIds.push(mid);
                      });
                    });
                  } else if (globalScope === "brands") {
                    globalBrands.forEach((bn) => {
                      modelIds = modelIds.concat(getModelIdsForBrand(bn));
                    });
                  } else if (globalScope === "models") {
                    globalModels.forEach((mn) => {
                      const mid = getModelIdByModelName(mn);
                      if (mid) modelIds.push(mid);
                    });
                  }

                  // dedup
                  modelIds = Array.from(new Set(modelIds));
                  if (modelIds.length === 0) {
                    alert("Ingen modeller valgt.");
                    return;
                  }

                  try {
                    await api.applyRepairChanges({
                      title: globalTitle,
                      fields,
                      // vi sender kun models; serveren understøtter også brands, men det er ikke nødvendigt
                      models: modelIds,
                    });

                    // Optimistisk opdatering i UI
                    setData((prev) =>
                      prev.map((b) => ({
                        ...b,
                        models: b.models.map((m) => {
                          const mid = m.options?.[0]?.model_id;
                          if (!modelIds.includes(mid)) return m;
                          return {
                            ...m,
                            options: m.options.map((o) =>
                              (o.title || "") === globalTitle
                                ? {
                                    ...o,
                                    ...(fields["_telegiganten_repair_repair_price"] !== undefined && {
                                      price: fields["_telegiganten_repair_repair_price"],
                                    }),
                                    ...(fields["_telegiganten_repair_repair_time"] !== undefined && {
                                      duration: fields["_telegiganten_repair_repair_time"],
                                    }),
                                  }
                                : o
                            ),
                          };
                        }),
                      }))
                    );

                    handleModalClose();
                  } catch (err) {
                    console.error("Fejl ved global opdatering:", err);
                    alert("Global opdatering fejlede.");
                  }
                }}
                style={{
                  backgroundColor: "#2166AC",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
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
