import React, { useState } from "react";
import Step1_SelectDevice from "../components/Step1_SelectDevice";
import Step2_SelectRepair from "../components/Step2_SelectRepair";
import Step3_SelectCustomer from "../components/Step3_SelectCustomer";
import Step4_Confirm from "../components/Step4_Confirm";
import { useNavigate } from "react-router-dom";

export default function NewRepair() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1
  const [devices] = useState([
    { name: "iPhone 13" },
    { name: "iPhone 14" },
    { name: "Samsung Galaxy S22" }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Step 2
  const [selectedRepair, setSelectedRepair] = useState(null);

  // Step 3
  const [customers, setCustomers] = useState([
    {
      id: 1,
      name: "Mads Andersen",
      phone: "22223333",
      email: "mads@eksempel.dk",
      password: "kode123",
      notes: "Foretrækker afhentning før kl. 16"
    },
    {
      id: 2,
      name: "Laura Jensen",
      phone: "44445555",
      email: "laura@eksempel.dk",
      password: "hemmelig",
      notes: ""
    }
  ]);
  
  const [customerForm, setCustomerForm] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");

  const handleReset = () => {
    setStep(1);
    setSelectedDevice(null);
    setSelectedRepair(null);
    setSelectedCustomer(null);
    setCustomerForm({});
    setSearchTerm("");
    setSearchResults([]);
    setError("");
  };
  
  const handleCreateOrUpdateCustomer = () => {
    const isEditing =
      selectedCustomer && customerForm.phone === selectedCustomer.phone;
  
    if (!customerForm.name || !customerForm.phone) {
      setError("Navn og telefonnummer skal udfyldes.");
      return;
    }
  
    if (isEditing) {
      // Opdater eksisterende kunde
      const updatedList = customers.map((c) =>
        c.phone === selectedCustomer.phone ? { ...c, ...customerForm } : c
      );
      setCustomers(updatedList);
      setSelectedCustomer({ ...selectedCustomer, ...customerForm });
      setCustomerForm({});
      setError("");
    } else {
      const exists = customers.find((c) => c.phone === customerForm.phone);
      if (exists) {
        setError("Der findes allerede en kunde med det telefonnummer.");
        return;
      }
  
      const newCustomer = {
        ...customerForm,
        id: Date.now()
      };
      setCustomers([...customers, newCustomer]);
      setSelectedCustomer(newCustomer);
      setCustomerForm({});
      setError("");
    }
  };
  
  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem" }}>
      {step === 1 && (
        <Step1_SelectDevice
          devices={devices}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2_SelectRepair
          selectedDevice={selectedDevice}
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
          customers={customers}
          setCustomers={setCustomers}
          error={error}
          setError={setError}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          onCreateCustomer={handleCreateOrUpdateCustomer}
        />
      )}

      {step === 4 && (
        <Step4_Confirm
          device={selectedDevice}
          repair={selectedRepair}
          customer={selectedCustomer}
          onBack={() => setStep(3)}
          onFinish={() => {
            alert("Reparation oprettet!");
            handleReset();
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
