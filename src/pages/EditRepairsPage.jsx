// src/pages/EditRepairsPage.jsx
import { useLocation } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import SwitchToggle from "../components/SwitchToggle";
import { api, proxyFetch } from "../data/apiClient";
import { sortBrands, makeModelSorter, sortRepairs } from "../helpers/sorting";

// Fallback hvis getModelSorter ikke (endnu) er eksporteret korrekt
const defaultModelSort = (a, b) =>
  String(a?.model ?? a?.title ?? a ?? "").localeCompare(
    String(b?.model ?? b?.title ?? b ?? ""),
    "da"
  );

const safeModelSorter = (brandName) => {
  try {
    if (typeof getModelSorter === "function") {
      const cmp = getModelSorter(brandName);
      return typeof cmp === "function" ? cmp : defaultModelSort;
    }
  } catch (_) {}
  return defaultModelSort;
};

/* --------------------- Søgning helpers --------------------- */
const norm = (str = "") =>
  (str + "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const makeModelHaystack = (brand, model) => norm(`${brand} ${model}`);

/* --------------------- Gemmehjælper --------------------- */
const normalizeId = (id) => {
  if (typeof id === "number") return id;
  const n = Number(id);
  return Number.isNaN(n) ? id : n; // prøv tal, ellers behold original
};

/* --------------------- Komponent --------------------- */
export default function EditRepairsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // debug for mount/unmount
  useEffect(() => {
    console.log("%c[EditRepairsPage] mounted on route:", "color:#2166AC;font-weight:bold;", pathname);
    console.trace();
    return () => console.log("%c[EditRepairsPage] unmounted", "color:#999;");
  }, [pathname]);

  if (pathname !== "/edit-repairs") return null; // vis KUN på /edit-repairs

  /* ---------- Data & UI state ---------- */
  const [data, setData] = useState([]);
  const [editedRepairs, setEditedRepairs] = useState({});
  const [savingStatus, setSavingStatus] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRepair, setNewRepair] = useState({ brand: "", model: "", title: "", price: "", duration: "" });

  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [globalTitle, setGlobalTitle] = useState("");
  const [globalPrice, setGlobalPrice] = useState("");
  const [globalDuration, setGlobalDuration] = useState("");
  const [globalScope, setGlobalScope] = useState("all"); // 'all' | 'brands' | 'models'
  const [globalBrands, setGlobalBrands] = useState([]);
  const [globalModels, setGlobalModels] = useState([]);
  const [repairTitleOptions, setRepairTitleOptions] = useState([]);
  const [expandedBrands, setExpandedBrands] = useState([]);
  const [modelsPerPage, setModelsPerPage] = useState(50); // 50 | 100 | 200
  const [currentPage, setCurrentPage] = useState(1);

  // Accordion
  const [openModels, setOpenModels] = useState(new Set());
  const modelKey = (brand, model) => `${brand}||${model}`;
  const isOpen = (brand, model) => openModels.has(modelKey(brand, model));
  const toggleOpen = (brand, model) =>
    setOpenModels(prev => {
      const k = modelKey(brand, model);
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  /* ---------- Hjælpere der bruger data ---------- */
  const getModelIdsForBrand = (brandName) => {
    const b = data.find((x) => x.brand === brandName);
    if (!b) return [];
    const ids = [];
    (b.models || []).forEach((m) => {
      const mid = m.options?.[0]?.model_id;
      if (mid) ids.push(mid);
    });
    return ids;
  };
  const getModelIdByModelName = (modelName) => {
    for (const b of data) {
      const m = b.models.find((mm) => mm.model === modelName);
      if (m?.options?.[0]?.model_id) return m.options[0].model_id;
    }
    return null;
  };

  /* ---------- Toggle aktiv / slet / gem ---------- */
  const toggleRepairActive = async (repairId, isActive) => {
    try {
      await api.updateRepair({ repair_id: normalizeId(repairId), fields: { repair_option_active: isActive ? 1 : 0 } });
      setData(prev =>
        prev.map(brand => ({
          ...brand,
          models: brand.models.map(model => ({
            ...model,
            options: model.options.map(opt =>
              opt.id == repairId ? { ...opt, repair_option_active: isActive ? 1 : 0 } : opt
            )
          }))
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
      await api.deleteRepairTemplate(normalizeId(repairId));
      setData(prev =>
        prev.map(brand => ({
          ...brand,
          models: brand.models.map(model => ({
            ...model,
            options: model.options.filter(opt => opt.id != repairId)
          }))
        }))
      );
    } catch (err) {
      console.error("Fejl ved sletning:", err);
      alert("Kunne ikke slette skabelonen.");
    }
  };

  const handleEdit = (repairId, field, value) => {
    const rid = normalizeId(repairId);
    setEditedRepairs(prev => ({
      ...prev,
      [String(rid)]: { ...prev[String(rid)], [field]: value }
    }));
  };

  const handleSave = async (repairId) => {
    const rid = normalizeId(repairId);

    // robust opslag – keys er strings i state-objekter
    const rowEdit = editedRepairs[rid] ?? editedRepairs[String(rid)];
    if (!rowEdit) return;

    setSavingStatus((p) => ({ ...p, [rid]: "saving" }));

    try {
      const patch = {
        ...(rowEdit.title    !== undefined && { title: rowEdit.title }),
        ...(rowEdit.price    !== undefined && { _telegiganten_repair_repair_price: rowEdit.price }),
        ...(rowEdit.duration !== undefined && { _telegiganten_repair_repair_time:  rowEdit.duration }),
      };

      await api.updateRepair({ repair_id: rid, fields: patch });

      // UI-opdatering – brug løs sammenligning for tal/string-keys
      setData((prev) =>
        prev.map((brand) => ({
          ...brand,
          models: brand.models.map((model) => {
            const nextOpts = model.options.map((opt) =>
              opt.id == rid
                ? {
                    ...opt,
                    ...(rowEdit.title    !== undefined && { title: rowEdit.title }),
                    ...(rowEdit.price    !== undefined && { price: rowEdit.price }),
                    ...(rowEdit.duration !== undefined && { duration: rowEdit.duration }),
                  }
                : opt
            );

            return {
              ...model,
              // re-sortér kun hvis titlen blev ændret (påvirker prioritet/alfabetik)
              options: rowEdit.title !== undefined
                ? nextOpts.slice().sort(sortRepairs)
                : nextOpts,
            };
          }),
        }))
      );

      setSavingStatus((p) => ({ ...p, [rid]: "success" }));
      setEditedRepairs((prev) => {
        const n = { ...prev };
        delete n[String(rid)];
        return n;
      });
    } catch (e) {
      console.error("Fejl ved gem:", e);
      setSavingStatus((p) => ({ ...p, [rid]: "error" }));
    }
  };

  const handleSaveAll = async () => {
    // Stabil snapshot af ids (keys kan være strings, normaliser dem)
    const allIds = Object.keys(editedRepairs).map(normalizeId);
    if (allIds.length === 0) return;

    setSavingAll(true);
    try {
      for (const id of allIds) {
        // Kør sekventielt for at undgå backend race conditions
        // eslint-disable-next-line no-await-in-loop
        await handleSave(id);
      }
    } finally {
      setSavingAll(false);
    }
  };

  /* ---------- Opret ny template ---------- */
  const handleCreateRepair = async () => {
    const brand = data.find((b) => b.brand === newRepair.brand);
    const model = brand?.models.find((m) => m.model === newRepair.model);
    if (!model) return alert("Ugyldig model.");

    const model_id = model.options?.[0]?.model_id;
    if (!model_id) return alert("Kunne ikke finde model_id.");

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
          repair_option_active: 1,
        };

        setData(prev =>
          prev.map(b =>
            b.brand !== newRepair.brand
              ? b
              : {
                  ...b,
                  models: b.models.map(m =>
                    m.model !== newRepair.model ? m : { ...m, options: [...m.options, newOption].sort(sortRepairs) }
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

  /* ---------- Load data ---------- */
  useEffect(() => {
    let mounted = true;

    console.groupCollapsed("%c[EditRepairsPage] load data", "color:#2166AC");
    console.time("[EditRepairsPage] load time");

    (async () => {
      try {
        const raw = await proxyFetch({ path: "/wp-json/telegiganten/v1/all-repairs" });

        const normalized = (Array.isArray(raw) ? raw : []).map((brand) => ({
          ...brand,
          models: (brand.models || [])
            .map((model) => ({
              ...model,
              options: (model.options || [])
                .map((opt) => ({
                  ...opt,
                  repair_option_active:
                    String(opt.repair_option_active ?? "1") === "1" ? 1 : 0,
                }))
                .sort(sortRepairs),
            }))
            .sort(makeModelSorter(brand.brand)),

        }));

        const sorted = normalized.sort(sortBrands);

        if (mounted) {
          setData(sorted);

          const titlesSet = new Set();
          sorted.forEach((b) =>
            b.models.forEach((m) =>
              m.options.forEach((o) => o?.title && titlesSet.add(o.title))
            )
          );
          setRepairTitleOptions(
            Array.from(titlesSet).sort((a, b) => a.localeCompare(b, "da"))
          );
        }

        console.log("Brands:", (normalized || []).map((b) => b.brand));
        console.log(
          "Total models:",
          normalized.reduce((n, b) => n + (b.models?.length || 0), 0)
        );
      } catch (err) {
        console.error("[EditRepairsPage] Fejl ved hentning:", err);
      } finally {
        console.timeEnd("[EditRepairsPage] load time");
        console.groupEnd();
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Filtrering + accordion-data ---------- */

  // Søgning – model + reparation
  const searchTokens = useMemo(() => norm(searchTerm).split(" ").filter(Boolean), [searchTerm]);
  const repairWordset = useMemo(() => {
    const set = new Set();
    (repairTitleOptions || []).forEach((t) => {
      norm(t).split(" ").forEach((w) => w && set.add(w));
    });
    return set;
  }, [repairTitleOptions]);
  const { repairTokens, modelTokens } = useMemo(() => {
    const rep = []; const mod = [];
    for (const tok of searchTokens) (repairWordset.has(tok) ? rep : mod).push(tok);
    return { repairTokens: rep, modelTokens: mod };
  }, [searchTokens, repairWordset]);

  const baseFiltered = useMemo(() => {
    return (data || [])
      .filter(b => !selectedBrand || b.brand === selectedBrand)
      .map(b => ({
        ...b,
        models: (b.models || []).filter(m => !selectedModel || m.model === selectedModel)
      }))
      .filter(b => (b.models || []).length > 0);
  }, [data, selectedBrand, selectedModel]);

  const accordionData = useMemo(() => {
    if (searchTokens.length === 0) return baseFiltered;

    return baseFiltered
      .map((b) => {
        const filteredModels = (b.models || []).map((m) => {
          const modelHay = makeModelHaystack(b.brand, m.model);

          const modelMatch = modelTokens.length === 0
            ? true
            : modelTokens.every((t) => modelHay.includes(t));

          const optionsFiltered = (m.options || []).filter((o) => {
            const titleNorm = norm(o.title || "");

            if (repairTokens.length > 0) {
              return repairTokens.every((t) => titleNorm.includes(t));
            }
            if (modelTokens.length > 0) return true;
            return searchTokens.some((t) => titleNorm.includes(t));
          });

          const hasRepairMatch = optionsFiltered.length > 0;
          const includeModel =
            (repairTokens.length > 0 && modelTokens.length === 0 && hasRepairMatch) ||
            (modelTokens.length > 0 && repairTokens.length === 0 && modelMatch) ||
            (modelTokens.length > 0 && repairTokens.length > 0 && modelMatch && hasRepairMatch);

          if (!includeModel) return null;

          const optionsToShow =
            repairTokens.length > 0 ? optionsFiltered : (m.options || []);

          return { ...m, options: optionsToShow };
        }).filter(Boolean);

        return { ...b, models: filteredModels };
      })
      .filter((b) => (b.models || []).length > 0);
  }, [baseFiltered, searchTokens, modelTokens, repairTokens]);

  // auto-åbn ved søgning
  useEffect(() => {
    if (searchTokens.length === 0) return;
    const next = new Set();
    accordionData.forEach(b => b.models.forEach(m => (m.options?.length > 0) && next.add(modelKey(b.brand, m.model))));
    setOpenModels(next);
  }, [accordionData, searchTokens]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flad/paging
  const flatModels = useMemo(() => {
    const out = [];
    (accordionData || []).forEach((b) => (b.models || []).forEach((m) => out.push({ brand: b.brand, model: m.model, options: m.options || [] })));
    return out;
  }, [accordionData]);

  const totalModels = flatModels.length;
  const totalPages  = Math.max(1, Math.ceil(totalModels / modelsPerPage));
  const safePage    = Math.min(currentPage, totalPages);
  const pageStart   = (safePage - 1) * modelsPerPage;
  const pageEnd     = pageStart + modelsPerPage;
  const pageSlice   = flatModels.slice(pageStart, pageEnd);

  const paginatedBrands = useMemo(() => {
    const byBrand = new Map();
    pageSlice.forEach((m) => {
      if (!byBrand.has(m.brand)) byBrand.set(m.brand, []);
      byBrand.get(m.brand).push(m);
    });
    return Array.from(byBrand.entries()).map(([brand, models]) => ({ brand, models }));
  }, [pageSlice]);

  useEffect(() => setCurrentPage(1), [searchTerm, selectedBrand, selectedModel, data]);

  useEffect(() => { if (searchTerm.trim() === "") setOpenModels(new Set()); }, [searchTerm]);
  useEffect(() => { setOpenModels(new Set()); }, [selectedBrand, selectedModel]);

  /* ---------- Opret MODEL FRA SKABELON ---------- */
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [cmBrand, setCmBrand] = useState("");
  const [cmModel, setCmModel] = useState("");
  const [creatingModel, setCreatingModel] = useState(false);

  // Skabelon for valgt brand = unikke reparationstitler på tværs af brandets modeller
  const brandTemplateTitles = useMemo(() => {
    const b = data.find((x) => x.brand === cmBrand);
    if (!b) return [];
    const set = new Set();
    (b.models || []).forEach((m) => (m.options || []).forEach((o) => o?.title && set.add(o.title)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [data, cmBrand]);

  const handleCreateModelFromTemplate = async () => {
    const brand = (cmBrand || "").trim();
    const modelName = (cmModel || "").trim();
    if (!brand) return alert("Vælg enhed (brand).");
    if (!modelName) return alert("Angiv modelnavn (fx 'iPhone 17').");

    const brandObj = data.find((b) => b.brand === brand);
    if (!brandObj) return alert("Ugyldigt brand.");
    if ((brandObj.models || []).some((m) => (m.model || "").toLowerCase() === modelName.toLowerCase())) {
      return alert("Modellen findes allerede under denne enhed.");
    }

    if (brandTemplateTitles.length === 0) {
      return alert("Denne enhed har ingen skabelon (ingen eksisterende reparationstitler).");
    }

    setCreatingModel(true);
    try {
      // 1) Opret selve modellen og få model_id
      const res = await api.createModel({ brand, model: modelName });
      if (!res || res.status === "error") {
        setCreatingModel(false);
        return alert(res?.message || "Kunne ikke oprette model.");
      }
      if (res.status === "exists" && res.model_id) {
        console.warn("[createModel] model fandtes allerede – bruger eksisterende id");
      } else if (res.status !== "created") {
        setCreatingModel(false);
        return alert("Kunne ikke oprette model.");
      }
      const model_id = res.model_id;

      // 2) Opret ALLE reparationer i ét kald – pris=0, tid=0, aktiv=0
      const bulk = await api.bulkCreateRepairTemplates({
        model_id,
        titles: brandTemplateTitles,
        price: 0,
        time: 0,
        active: 0,
      });

      const createdIds = Array.isArray(bulk?.repair_ids) ? bulk.repair_ids : [];
      const createdOptions = brandTemplateTitles.map((title, idx) => ({
        id: createdIds[idx] ?? `${model_id}_${idx}`,
        title,
        price: 0,
        duration: 0,
        model_id,
        repair_option_active: 0,
      }));

      // 3) Opdater UI
      setData((prev) => {
        const next = prev.map((b) => {
          if (b.brand !== brand) return b;
          const newModel = {
            model: modelName,
            options: createdOptions.sort(sortRepairs),
          };
          const models = [...(b.models || []), newModel].sort(makeModelSorter(b.brand));
          return { ...b, models };
        });
        return next;
      });

      // Fold modellen ud og scroll til top
      setSelectedBrand(brand);
      setSelectedModel("");
      setSearchTerm(modelName);
      setTimeout(() => {
        setOpenModels((prev) => new Set([...prev, modelKey(brand, modelName)]));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);

      // Luk modal og nulstil
      setShowCreateModel(false);
      setCmBrand("");
      setCmModel("");
    } catch (err) {
      console.error("Fejl ved oprettelse af model:", err);
      alert("Der opstod en fejl ved oprettelse af model.");
    } finally {
      setCreatingModel(false);
    }
  };

  /* ---------- Render ---------- */
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

      <h2 style={{ textTransform: "uppercase", fontWeight: "bold", marginBottom: "1rem" }}>
        Redigér reparationer
      </h2>

      {/* Handling-knapper */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={() => setShowGlobalModal(true)}
          style={{ backgroundColor: "#2166AC", color: "white", padding: "10px 16px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Global opdatering
        </button>

        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          style={{ backgroundColor: "#2166AC", color: "white", padding: "10px 16px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          {showCreateForm ? "Skjul opretformular" : "Opret reparation"}
        </button>

        {/* NY: Opret model fra skabelon */}
        <button
          onClick={() => setShowCreateModel(true)}
          style={{ backgroundColor: "#2166AC", color: "white", padding: "10px 16px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Opret model
        </button>
      </div>

      {/* Opret reparation (eksisterende) */}
      {showCreateForm && (
        <div style={{ marginBottom: "2rem", border: "1px solid #ddd", padding: "1rem", borderRadius: "6px" }}>
          <h4 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontWeight: "bold" }}>Opret ny reparation</h4>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <select
              value={newRepair.brand}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, brand: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "200px" }}
            >
              <option value="">Vælg enhed</option>
              {data.map((b) => (<option key={b.brand} value={b.brand}>{b.brand}</option>))}
            </select>

            <select
              value={newRepair.model}
              onChange={(e) => setNewRepair((prev) => ({ ...prev, model: e.target.value }))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "200px" }}
            >
              <option value="">Vælg model</option>
              {(data.find((b) => b.brand === newRepair.brand)?.models || []).map((m) => (
                <option key={m.model} value={m.model}>{m.model}</option>
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
              style={{ backgroundColor: "#22b783", color: "white", padding: "10px 16px", border: "none", borderRadius: "6px", cursor: "pointer" }}
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
          placeholder="Søg model og/eller reparation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "280px" }}
        />

        <select
          value={selectedBrand}
          onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(""); }}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
        >
          <option value="">Alle enheder</option>
          {data.map((b) => (<option key={b.brand} value={b.brand}>{b.brand}</option>))}
        </select>

        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "180px" }}
        >
          <option value="">Alle modeller</option>
          {(data.find((b) => b.brand === selectedBrand)?.models || []).map((m) => (
            <option key={m.model} value={m.model}>{m.model}</option>
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

      {/* ACCORDION */}
      <div style={{ marginTop: "1rem" }}>
        {totalModels === 0 ? (
          <p>Ingen resultater.</p>
        ) : (
          paginatedBrands.map((brand) => (
            <div key={brand.brand} style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0.5rem 0" }}>
                {brand.brand}
              </div>

              {brand.models.map((m) => {
                const open = isOpen(brand.brand, m.model);
                return (
                  <div
                    key={m.model}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      marginBottom: "0.6rem",
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <button
                      onClick={() => toggleOpen(brand.brand, m.model)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: open ? "#f1f5f9" : "#f8fafc",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                      title="Klik for at folde ud"
                    >
                      <span>{m.model}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {m.options?.length || 0} reparationer
                      </span>
                    </button>

                    {open && (
                      <div style={{ padding: 12 }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 120px 120px 220px",
                            gap: 8,
                            alignItems: "center",
                            padding: "6px 0",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          <div>Titel</div>
                          <div>Pris</div>
                          <div>Tid</div>
                          <div style={{ textAlign: "right" }}>Handling</div>
                        </div>

                        {(m.options || []).map((opt) => {
                          const edited = editedRepairs[String(opt.id)] || {};
                          const status = savingStatus[normalizeId(opt.id)];
                          const isActive = String(opt.repair_option_active ?? "1") === "1";

                          return (
                            <div
                              key={opt.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 120px 120px 220px",
                                gap: 8,
                                alignItems: "center",
                                borderTop: "1px dashed #e5e7eb",
                                padding: "8px 0",
                                opacity: isActive ? 1 : 0.5,
                              }}
                            >
                              <input
                                className="border p-1 w-full"
                                value={edited.title ?? opt.title ?? ""}
                                onChange={(e) => handleEdit(opt.id, "title", e.target.value)}
                              />
                              <input
                                className="border p-1 w-full"
                                value={edited.price ?? opt.price ?? ""}
                                onChange={(e) => handleEdit(opt.id, "price", e.target.value)}
                              />
                              <input
                                className="border p-1 w-full"
                                value={edited.duration ?? opt.duration ?? ""}
                                onChange={(e) => handleEdit(opt.id, "duration", e.target.value)}
                              />
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, color: "#64748b" }}>Aktiv</span>
                                  <SwitchToggle
                                    checked={isActive}
                                    onChange={(checked) => toggleRepairActive(opt.id, checked)}
                                  />
                                </label>

                                <button
                                  onClick={() => handleSave(opt.id)}
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
                                  onClick={() => handleDeleteTemplate(opt.id)}
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
                                  <span className="text-green-600 text-sm" style={{ alignSelf: "center" }}>
                                    ✔ Gemt
                                  </span>
                                )}
                                {status === "error" && (
                                  <span className="text-red-600 text-sm" style={{ alignSelf: "center" }}>
                                    Fejl!
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginTop: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
          style={{
            backgroundColor: safePage === 1 ? "#ccc" : "#2166AC",
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: safePage === 1 ? "not-allowed" : "pointer",
          }}
        >
          Forrige
        </button>

        <span style={{ fontSize: "0.95rem" }}>
          Side {safePage} af {totalPages}{" "}
          <span style={{ color: "#64748b" }}>({totalModels} modeller)</span>
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
          style={{
            backgroundColor: safePage === totalPages ? "#ccc" : "#2166AC",
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: safePage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Næste
        </button>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="perPage" style={{ fontSize: "0.9rem" }}>Vis pr. side:</label>
          <select
            id="perPage"
            value={modelsPerPage}
            onChange={(e) => {
              setModelsPerPage(parseInt(e.target.value, 10));
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
      </div>

      {/* Global opdatering modal */}
      {showGlobalModal && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowGlobalModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "600px", maxWidth: "90%", maxHeight: "80vh", overflowY: "auto" }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Global opdatering</h3>

            <Select
              options={repairTitleOptions.map((title) => ({ value: title, label: title }))}
              value={globalTitle ? { value: globalTitle, label: globalTitle } : null}
              onChange={(opt) => setGlobalTitle(opt?.value || "")}
              placeholder="Vælg reparationstitel..."
              isClearable
              styles={{ container: (b) => ({ ...b, marginBottom: "1rem" }), control: (b) => ({ ...b, padding: "2px" }) }}
            />

            <input
              type="number" placeholder="Ny pris" value={globalPrice}
              onChange={(e) => setGlobalPrice(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />
            <input
              type="number" placeholder="Ny tid (min)" value={globalDuration}
              onChange={(e) => setGlobalDuration(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
            />

            <div style={{ marginBottom: "1rem" }}>
              <strong>Vælg forekomster:</strong>
              <div
                style={{ marginTop: "0.5rem", border: "1px solid #ddd", borderRadius: "6px", padding: "0.75rem", maxHeight: "300px", overflowY: "auto" }}
              >
                {/* Alle */}
                <div style={{ display: "grid", gridTemplateColumns: "30px 120px 1fr", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={globalScope === "all"}
                    onChange={() => { setGlobalScope("all"); setGlobalBrands([]); setGlobalModels([]); }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#666" }}></span>
                  <span style={{ fontWeight: 500 }}>Alle forekomster</span>
                </div>

                {/* Enheder + modeller */}
                {data.map((b) => (
                  <div key={b.brand} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "30px 120px 1fr", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={globalScope === "brands" && globalBrands.includes(b.brand)}
                        onChange={() => {
                          const checked = globalBrands.includes(b.brand);
                          setGlobalScope("brands");
                          setGlobalBrands(prev => checked ? prev.filter(x => x !== b.brand) : [...prev, b.brand]);
                          setGlobalModels([]);
                        }}
                      />
                      <button
                        onClick={() =>
                          setExpandedBrands(prev => prev.includes(b.brand) ? prev.filter(x => x !== b.brand) : [...prev, b.brand])
                        }
                        style={{
                          fontSize: "0.75rem", background: "none", border: "1px solid #ccc",
                          padding: "2px 6px", borderRadius: "4px", color: "#2166AC", cursor: "pointer", whiteSpace: "nowrap"
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
                            style={{ display: "grid", gridTemplateColumns: "30px 120px 1fr", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}
                          >
                            <input
                              type="checkbox"
                              checked={globalScope === "models" && globalModels.includes(m.model)}
                              onChange={() => {
                                const checked = globalModels.includes(m.model);
                                setGlobalScope("models");
                                setGlobalModels(prev => checked ? prev.filter(x => x !== m.model) : [...prev, m.model]);
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
                style={{ backgroundColor: "#ccc", color: "#000", padding: "0.5rem 1rem", borderRadius: "6px", border: "none" }}
              >
                Annuller
              </button>

              <button
                onClick={async () => {
                  if (!globalTitle) return alert("Vælg en reparationstitel først.");

                  const fields = {};
                  if (globalPrice !== "") fields["_telegiganten_repair_repair_price"] = parseInt(globalPrice || "0", 10);
                  if (globalDuration !== "") fields["_telegiganten_repair_repair_time"] = parseInt(globalDuration || "0", 10);
                  if (Object.keys(fields).length === 0) return alert("Udfyld mindst ét felt (pris eller tid).");

                  // find model_ids ud fra scope
                  let modelIds = [];
                  if (globalScope === "all") {
                    data.forEach((b) => b.models.forEach((m) => {
                      const mid = m.options?.[0]?.model_id;
                      if (mid) modelIds.push(mid);
                    }));
                  } else if (globalScope === "brands") {
                    globalBrands.forEach((bn) => { modelIds = modelIds.concat(getModelIdsForBrand(bn)); });
                  } else if (globalScope === "models") {
                    globalModels.forEach((mn) => {
                      const mid = getModelIdByModelName(mn);
                      if (mid) modelIds.push(mid);
                    });
                  }
                  modelIds = Array.from(new Set(modelIds));
                  if (modelIds.length === 0) return alert("Ingen modeller valgt.");

                  try {
                    await api.applyRepairChanges({ title: globalTitle, fields, models: modelIds });

                    // Optimistisk UI
                    setData(prev =>
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
                                    ...(fields["_telegiganten_repair_repair_price"] !== undefined && { price: fields["_telegiganten_repair_repair_price"] }),
                                    ...(fields["_telegiganten_repair_repair_time"] !== undefined && { duration: fields["_telegiganten_repair_repair_time"] }),
                                  }
                                : o
                            ),
                          };
                        }),
                      }))
                    );

                    setShowGlobalModal(false);
                    setGlobalTitle(""); setGlobalPrice(""); setGlobalDuration("");
                    setGlobalScope("all"); setGlobalBrands([]); setGlobalModels([]);
                  } catch (err) {
                    console.error("Fejl ved global opdatering:", err);
                    alert("Global opdatering fejlede.");
                  }
                }}
                style={{ backgroundColor: "#2166AC", color: "white", padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
              >
                Opdater globalt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NY: Opret model fra skabelon – modal */}
      {showCreateModel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
          onClick={() => !creatingModel && setShowCreateModel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", padding: "1.5rem", borderRadius: 8, width: 520, maxWidth: "92%" }}
          >
            <h3 style={{ marginBottom: 12, fontWeight: 700 }}>Opret model fra skabelon</h3>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Enhed (brand)</label>
                <select
                  value={cmBrand}
                  onChange={(e) => setCmBrand(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  disabled={creatingModel}
                >
                  <option value="">Vælg enhed</option>
                  {data.map((b) => (<option key={b.brand} value={b.brand}>{b.brand}</option>))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Modelnavn</label>
                <input
                  type="text"
                  placeholder='Fx "iPhone 17"'
                  value={cmModel}
                  onChange={(e) => setCmModel(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  disabled={creatingModel}
                />
              </div>

              <div style={{ fontSize: 13, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 10 }}>
                {cmBrand
                  ? <>Skabelonen for <strong>{cmBrand}</strong> indeholder <strong>{brandTemplateTitles.length}</strong> unikke reparationstitler. De oprettes alle med <em>pris = 0</em>, <em>tid = 0</em> og <em>aktiv = inaktiv</em>.</>
                  : <>Vælg enhed for at se hvor mange reparationer der oprettes som skabelon.</>}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setShowCreateModel(false)}
                disabled={creatingModel}
                style={{ background: "#e5e7eb", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer" }}
              >
                Annuller
              </button>
              <button
                onClick={handleCreateModelFromTemplate}
                disabled={creatingModel || !cmBrand || !cmModel}
                style={{ background: "#22b783", color: "white", border: "none", borderRadius: 6, padding: "8px 12px", cursor: creatingModel ? "wait" : "pointer" }}
              >
                {creatingModel ? "Opretter…" : "Opret model"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
