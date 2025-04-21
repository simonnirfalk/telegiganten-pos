// src/pages/NewRepair.jsx
import { useState } from "react";
import Step1_SelectDevice from "../components/Step1_SelectDevice";
import Step2_SelectRepair from "../components/Step2_SelectRepair";
import Step3_SelectCustomer from "../components/Step3_SelectCustomer";
import Step4_Confirm from "../components/Step4_Confirm";

const allDevices = [
  { id: 1, name: "iPhone 13", brand: "Apple" },
  { id: 2, name: "iPhone 12", brand: "Apple" },
  { id: 3, name: "iPhone SE 2022", brand: "Apple" },
  { id: 4, name: "iPad Pro 12.9", brand: "Apple" },
  { id: 5, name: "MacBook Air M1", brand: "Apple" },
  { id: 6, name: "Galaxy S22", brand: "Samsung" },
  { id: 7, name: "Galaxy S21 FE", brand: "Samsung" },
  { id: 8, name: "Galaxy A52", brand: "Samsung" },
  { id: 9, name: "Galaxy Tab S8", brand: "Samsung" },
];

const allRepairs = {
  "iPhone 13": [
    { name: "Skærmskift", price: 1699, time: "1 time" },
    { name: "Batteriskift", price: 599, time: "30 min" },
    { name: "Bagglas", price: 799, time: "1-2 timer" }
  ],
  "Galaxy S22": [
    { name: "Skærm", price: 1799, time: "1 time" },
    { name: "Batteri", price: 499, time: "30 min" },
    { name: "Kamera", price: 699, time: "1 time" }
  ],
  "MacBook Air M1": [
    { name: "Tastatur", price: 2199, time: "2 timer" },
    { name: "Skærm", price: 3499, time: "3 timer" },
    { name: "SSD", price: 1199, time: "1 time" }
  ]
};

const mockCustomers = [
  { name: "Jonas Jensen", phone: "22223333", email: "jonas@example.com", password: "1234", notes: "" },
  { name: "Emma Hansen", phone: "44445555", email: "emma@kunde.dk", password: "", notes: "iPhone låst" }
];

export default function NewRepair() {
  const [step, setStep] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", password: "", notes: "" });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");

  const repairOptions = selectedDevice?.name ? allRepairs[selectedDevice.name] || [] : [];

  const handleCustomerSearch = () => {
    const results = mockCustomers.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
    setSearchResults(results);
  };

  const handleCreateCustomer = () => {
    const exists = mockCustomers.some(c => c.phone === customerForm.phone);
    if (exists) {
      setError("Telefonnummeret er allerede registreret.");
    } else {
      setSelectedCustomer({ ...customerForm });
      setCustomerForm({ name: "", phone: "", email: "", password: "", notes: "" });
      setError("");
    }
  };

  const handleSubmit = () => {
    console.log("Opretter reparation:", {
      device: selectedDevice,
      repair: selectedRepair,
      customer: selectedCustomer
    });
    // Her skal vi sende data til backend i næste trin
  };

  return (
    <div style={{ paddingBottom: "4rem" }}>
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", marginBottom: "1rem" }}>Opret reparation</h2>

      {step === 1 && (
        <Step1_SelectDevice
          devices={allDevices}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2_SelectRepair
          repairs={repairOptions}
          selectedRepair={selectedRepair}
          setSelectedRepair={setSelectedRepair}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3_SelectCustomer
          customerForm={customerForm}
          setCustomerForm={setCustomerForm}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          error={error}
          setError={setError}
          onSearch={handleCustomerSearch}
          onCreateCustomer={handleCreateCustomer}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <Step4_Confirm
          selectedDevice={selectedDevice}
          selectedRepair={selectedRepair}
          selectedCustomer={selectedCustomer}
          onBack={() => setStep(3)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}