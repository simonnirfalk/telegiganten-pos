import React, { useState } from "react";
import Step1_AddRepairToOrder from "../components/Step1_AddRepairToOrder";
import Step2_SelectCustomer from "../components/Step2_SelectCustomer";
import Step3_Confirm from "../components/Step3_Confirm";

export default function NewRepair() {
  const [step, setStep] = useState(1);

  // Dummy data
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
    customer: null,
    repairs: []
  });

  const [customers, setCustomers] = useState([]);

  return (
    <div style={{ padding: "2rem", width: "100%", boxSizing: "border-box" }}>
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
        <Step2_SelectCustomer
          customers={customers}
          setCustomers={setCustomers}
          order={order}
          setOrder={setOrder}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3_Confirm
          order={order}
          onBack={() => setStep(2)}
          onFinish={() => {
            alert("Reparation oprettet!");
            setStep(1);
            setOrder({ customer: null, repairs: [] });
          }}
        />
      )}
    </div>
  );
}
