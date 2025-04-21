// src/components/Step1_SelectDevice.jsx
import { useEffect, useState } from 'react';

export default function Step1_SelectDevice({ onSelect }) {
  const [devices, setDevices] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/mock/devices.json')
      .then(res => res.json())
      .then(setDevices);
  }, []);

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <h2>Vælg enhed</h2>
      <input
        type="text"
        placeholder="Søg fx iPhone 13"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <ul>
        {filtered.map(d => (
          <li key={d.id}>
            <button onClick={() => onSelect(d)}>{d.name}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
