import React, { useState } from "react";
import Step1_AddRepairToOrder from "../components/Step1_AddRepairToOrder";
import Step2_ReviewAndPayment from "../components/Step2_ReviewAndPayment";

export default function NewRepair() {
  const [step, setStep] = useState(1);

  const availableDevices = [
    { name: "iPhone 13" },
    { name: "Samsung Galaxy A55" }
  ];

  const availableRepairs = [
    { device: "iPhone 13", name: "Skærmskift", price: 1399, time: 60 },
    { device: "iPhone 13", name: "Beskyttelsesglas", price: 199, time: 10 },
    { device: "Samsung Galaxy A55", name: "Skærmskift", price: 1199, time: 50 }
  ];

  const [order, setOrder] = useState({
    repairs: [],
    customer: null,
    password: "",
    note: "",
    payment: {
      method: "efter", // "efter", "betalt", "delvis", "garanti"
      upfront: 0
    }
  });

  const [customers, setCustomers] = useState([]);

  const handleFinish = () => {
    console.log("Reparation oprettet:", order);
    alert("Reparation oprettet!");
    setStep(1);
    setOrder({
      repairs: [],
      customer: null,
      password: "",
      note: "",
      payment: {
        method: "efter",
        upfront: 0
      }
    });
  };

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
      {step === 1 && (
        <Step1_AddRepairToOrder
          devices={availableDevices}
          repairs={availableRepairs}
          order={order}
          setOrder={setOrder}
          customers={customers}
          setCustomers={setCustomers}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2_ReviewAndPayment
          order={order}
          setOrder={setOrder}
          onSubmit={handleFinish}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  );
}
