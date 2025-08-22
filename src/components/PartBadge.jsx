import React from "react";

export default function PartBadge({ part, onClear }) {
  if (!part) {
    return <span className="text-sm text-gray-500">(ingen reservedel valgt)</span>;
  }
  const n = Number(part.stock ?? 0);
  let cls = "bg-red-100 text-red-800";
  if (n > 5) cls = "bg-green-100 text-green-800";
  else if (n > 0) cls = "bg-yellow-100 text-yellow-800";

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="font-medium">{part.model}</span>
      <span className={`px-2 py-0.5 rounded ${cls}`}>Lager: {isNaN(n) ? "-" : n}</span>
      {part.location && (
        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800">
          {part.location}
        </span>
      )}
      {onClear && (
        <button
          onClick={() => onClear()}
          className="px-2 py-0.5 border rounded text-gray-700 hover:bg-gray-50"
          title="Fjern reservedel fra reparation"
        >
          Fjern
        </button>
      )}
    </div>
  );
}
