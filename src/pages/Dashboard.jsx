import DashboardStats from "../components/DashboardStats";

const navBoxStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "2rem",
  textAlign: "center",
  fontSize: "1.1rem",
  fontWeight: "bold",
  flex: "1 1 180px",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
};

export default function Dashboard() {
  return (
    <div>
      {/* Top-knapper */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div style={navBoxStyle}>Opret reparation</div>
        <div style={navBoxStyle}>Bookinger</div>
        <div style={navBoxStyle}>Kunder</div>
        <div style={navBoxStyle}>Priser</div>
        <div style={navBoxStyle}>Reservedele</div>
      </div>

      {/* Reparationer */}
      <h2 style={{ fontFamily: "Archivo Black", textTransform: "uppercase", marginBottom: "1rem" }}>
        Seneste reparationer
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "2.5rem"
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            background: "white",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
          }}>
            <p style={{ margin: 0, fontWeight: "bold" }}>iPhone 13</p>
            <p style={{ margin: 0 }}>Jens Hansen</p>
            <span style={{
              display: "inline-block",
              marginTop: "0.5rem",
              backgroundColor: "#22b783",
              color: "white",
              padding: "0.3rem 0.8rem",
              borderRadius: "999px",
              fontSize: "0.8rem"
            }}>Modtaget</span>
            <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "0.5rem" }}>20. apr. 2024</p>
          </div>
        ))}
      </div>

      {/* Analysekomponent */}
      <DashboardStats />
    </div>
  );
}