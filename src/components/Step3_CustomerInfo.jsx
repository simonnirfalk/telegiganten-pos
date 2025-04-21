import { useState } from 'react';

export default function Step3_CustomerInfo({ onBack, onComplete }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    onComplete({ name, phone, email });
  };

  return (
    <div>
      <h2>Kundeoplysninger</h2>
      <button onClick={onBack}>⬅️ Tilbage</button>
      <input placeholder="Navn" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Telefon" value={phone} onChange={e => setPhone(e.target.value)} />
      <input placeholder="Email (valgfri)" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={handleContinue}>Fortsæt</button>
    </div>
  );
}
