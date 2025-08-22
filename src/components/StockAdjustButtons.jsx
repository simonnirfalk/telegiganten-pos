import React, { useState } from "react";
import { adjustStock } from "../data/sparePartsApi";

export default function StockAdjustButtons({ part, onChanged }) {
  const [busy, setBusy] = useState(false);

  const doDelta = async (delta) => {
    if (!part?.id || busy) return;
    try {
      setBusy(true);
      const updated = await adjustStock(part.id, delta);
      onChanged?.(updated); // giver hele item tilbage (inkl. ny stock)
    } catch (e) {
      alert(e.message || "Fejl ved lagerjustering");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
        onClick={() => doDelta(-1)}
        disabled={!part?.id || busy}
        title="Træk 1 fra lager"
      >
        −1
      </button>
      <button
        className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
        onClick={() => doDelta(+1)}
        disabled={!part?.id || busy}
        title="Fortryd (+1)"
      >
        +1
      </button>
      {busy && <span className="text-xs text-gray-500">Opdaterer…</span>}
    </div>
  );
}
