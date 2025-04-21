export default function Step4_Confirm({ device, repair, customer, onBack }) {
  const handleFinish = () => {
    alert("Reparation oprettet!");
  };

  return (
    <div>
      <h2>Bekræft reparation</h2>
      <button onClick={onBack}>⬅️ Tilbage</button>
      <p><strong>Enhed:</strong> {device.name}</p>
      <p><strong>Reparation:</strong> {repair.name} – {repair.price} kr</p>
      <p><strong>Kunde:</strong> {customer.name} ({customer.phone})</p>
      <button onClick={handleFinish}>Opret & Print</button>
    </div>
  );
}
