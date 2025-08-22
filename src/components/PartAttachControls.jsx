import React, { useState } from "react";
import PartsPicker from "./PartsPicker";
import PartBadge from "./PartBadge";

export default function PartAttachControls({
  deviceName,
  repairTitle,     // fx "Skærm (OEM)" — bruges kun til log/visning
  defaultRepairType, // fx "Skærm" (brug baseRepairType hvis du vil udlede det)
  value,           // current part (eller null)
  onChange,        // (part|null) => void
}) {
  const [open, setOpen] = useState(false);
  const [repairType] = useState(defaultRepairType);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PartBadge part={value} onClear={() => onChange?.(null)} />
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white"
          onClick={() => setOpen(true)}
        >
          {value ? "Skift reservedel" : "Vælg reservedel"}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-3xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">
                Vælg reservedel · {repairType} · {deviceName}
              </div>
              <button className="px-2 py-1 border rounded" onClick={() => setOpen(false)}>
                Luk
              </button>
            </div>
            <PartsPicker
              deviceName={deviceName}
              repairType={repairType}
              onPick={(part) => {
                onChange?.(part);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
