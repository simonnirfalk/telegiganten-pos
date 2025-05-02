// Step1_AddRepairToOrder.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaTrashAlt, FaPhone, FaEnvelope, FaUserPlus, FaUser, FaHome, FaLock } from "react-icons/fa";
import RepairModal from "../components/RepairModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import SelectCustomerModal from "../components/SelectCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import { useRepairContext } from "../context/RepairContext";

function generateOrderId() {
  const last = Number(localStorage.getItem("lastOrderId") || 0) + 1;
  localStorage.setItem("lastOrderId", last);
  return `40${String(last).padStart(3, "0")}`;
}

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

  const { data: repairStructure, loading } = useRepairContext();

  useEffect(() => {
    if (!order.id) {
      setOrder((prev) => ({ ...prev, id: generateOrderId() }));
    }
  }, [order.id, setOrder]);

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

  const popularModelNames = [
    "iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15",
    "iPhone 11 Pro", "iPhone 12 Mini", "iPhone 13 Pro Max", "iPhone 14 Plus", "iPhone 15 Pro",
    "Samsung Galaxy S20 FE", "Samsung Galaxy S21+", "Samsung Galaxy S22", "Samsung Galaxy S23 Ultra", "Samsung Galaxy S24",
    "Samsung Galaxy A55", "Samsung Galaxy A34", "Samsung Galaxy A14", "Samsung Galaxy A54", "Samsung Galaxy A72",
    "iPad 10.2 (2021)", "iPad Pro 11 (2018)",
    "MacBook Pro 13 inch A1708", "MacBook Air 13 inch, A2179",
    "Motorola Moto G54"
  ];

  const customCategoryOrder = [
    "Alle", "iPhone", "Samsung", "iPad", "MacBook", "iMac", "Samsung Galaxy Tab", "Motorola",
    "OnePlus", "Nokia", "Huawei", "Xiaomi", "Sony Xperia", "Oppo", "Microsoft", "Honor",
    "Google Pixel", "Apple Watch", "Samsung Book", "Huawei tablet"
  ];

  const allCategories = customCategoryOrder.filter(cat =>
    cat === "Alle" || repairStructure.some(b => b.title === cat)
  );

  const brandsFiltered = selectedCategory === "Alle"
    ? repairStructure.filter(b => b.models.some(m => popularModelNames.includes(m.title)))
    : repairStructure.filter(b => b.title === selectedCategory);

  const filteredModels = brandsFiltered.flatMap(b => b.models)
    .filter(m => selectedCategory !== "Alle" || popularModelNames.includes(m.title))
    .filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (selectedCategory === "Alle") {
        return popularModelNames.indexOf(a.title) - popularModelNames.indexOf(b.title);
      }
      return 0;
    });

  const handleAddRepair = (deviceName, repair) => {
    if (repair.model_id) {
      fetch("https://telegiganten.dk/wp-json/telegiganten/v1/increment-model-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model_id: repair.model_id })
      }).catch(err => console.error("Fejl ved opdatering af model-usage:", err));
    }

    setOrder({
      ...order,
      repairs: [...order.repairs, {
        device: deviceName,
        repair: repair.title,
        price: repair.price,
        time: repair.time
      }]
    });
  };

  // ... resten af koden er uændret (modalkald, kunde-håndtering, sidebar mv.)

  return (
    // ... eksisterende render return statement (ikke ændret her for overskuelighed)
  );
}
