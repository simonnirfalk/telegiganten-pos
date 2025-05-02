// context/RepairContext.js
import { createContext, useContext } from "react";
import useRepairData from "../hooks/useRepairData";

const RepairContext = createContext();

export function RepairProvider({ children }) {
  const { data, loading, error } = useRepairData();

  return (
    <RepairContext.Provider value={{ data, loading, error }}>
      {children}
    </RepairContext.Provider>
  );
}

export function useRepairContext() {
  return useContext(RepairContext);
}
