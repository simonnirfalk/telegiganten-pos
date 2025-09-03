// src/pages/NewRepair.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Step1_AddRepairToOrder from "../components/Step1_AddRepairToOrder";
import Step2_ReviewAndPayment from "../components/Step2_ReviewAndPayment";

export default function NewRepair() {
  const [step, setStep] = useState(1);
  const [order, setOrder] = useState({
    id: undefined,
    repairs: [],
    customer: null,
    password: "",
    contact: "",
    note: "",
    source: null, // { type: "booking", booking_id }
    payment: { method: "efter", upfront: 0 },
  });

  const { state } = useLocation();
  const prefill = state?.prefillFromBooking;
  const prefillApplied = useRef(false);

  // Anvend prefill én gang når vi kommer fra booking
  useEffect(() => {
    if (!prefill || prefillApplied.current) return;
    prefillApplied.current = true;

    const mappedRepairs = (prefill.repairs || []).map((r) => ({
      device: prefill.model_title || "", // visningen i sidebaren
      repair: r.title || "",
      price: Number(r.price || 0) || 0,
      time: Number(r.time || 0) || 0,
      model_id: prefill.model_id || 0,
      part: null,
    }));

    setOrder((prev) => ({
      ...prev,
      repairs: mappedRepairs,
      customer: prefill.customer
        ? {
            id: prefill.customer.id || "booking-customer",
            name: prefill.customer.name || "",
            phone: prefill.customer.phone || "",
            email: prefill.customer.email || "",
          }
        : prev.customer,
      note: prefill.note || prev.note,
      source: { type: "booking", booking_id: prefill.booking_id },
    }));

    // sørg for, at vi står på Step1
    setStep(1);
  }, [prefill]);

  const handleFinish = () => {
    console.log("Reparation oprettet:", order);
    alert("Reparation oprettet!<br>فلسطين حرة");
    setStep(1);
    setOrder({
      repairs: [],
      customer: null,
      password: "",
      contact: "",
      note: "",
      source: null,
      payment: { method: "efter", upfront: 0 },
    });
  };

  return (
    // VIGTIGT: ingen overflow:hidden og ingen fast 100vh-højde
    <div style={{ width: "100%", minHeight: "100vh" }}>
      {step === 1 && (
        <Step1_AddRepairToOrder
          order={order}
          setOrder={setOrder}
          onNext={() => setStep(2)}
          customers={[]} // kunderne hentes i Step1 via api.getCustomers()
          setCustomers={() => {}}
          prefillFromBooking={prefill} // valgfrit; Step1 bruger den ikke nødvendigvis, men fint at have
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
