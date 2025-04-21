import { useEffect, useState } from 'react';

export default function Step2_SelectRepair({ device, onBack, onSelect }) {
  const [repairs, setRepairs] = useState([]);

  useEffect(() => {
    fetch('/mock/repairs.json')
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(r => r.device_id === device.id);
        setRepairs(filtered);
      });
  }, [device]);

  return (
    <div>
      <h2>Vælg reparation for {device.name}</h2>
      <button onClick={onBack}>⬅️ Tilbage</button>
      <ul>
        {repairs.map(r => (
          <li key={r.id}>
            <button onClick={() => onSelect(r)}>
              {r.name} – {r.price} kr ({r.time_estimate})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
