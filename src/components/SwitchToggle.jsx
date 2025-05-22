import React from "react";

export default function SwitchToggle({ isOn, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: "40px",
        height: "20px",
        borderRadius: "20px",
        backgroundColor: isOn ? "#22b783" : "#ccc",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 0.2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "2px",
          left: isOn ? "22px" : "2px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "white",
          transition: "left 0.2s",
        }}
      ></div>
    </div>
  );
}
