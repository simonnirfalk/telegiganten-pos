import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NewRepair from "./pages/NewRepair";
import BookingsPage from "./pages/BookingsPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";

export default function App() {
  // Tilføj dummy data her:
  const customers = [
    {
      id: 1,
      name: "Mads Andersen",
      phone: "22223333",
      extraPhone: "",
      email: "mads@eksempel.dk",
      repairs: [
        { device: "iPhone 13", repair: "Skærmskift", date: "2024-06-01" },
        { device: "iPhone 13", repair: "Batteriskift", date: "2024-06-10" }
      ]
    },
    {
      id: 2,
      name: "Laura Jensen",
      phone: "44445555",
      extraPhone: "50505050",
      email: "laura@eksempel.dk",
      repairs: [
        { device: "Samsung S22", repair: "Batteriskift", date: "2024-06-07" }
      ]
    }
  ];

  const bookings = [
    {
      id: 1,
      createdAt: "2024-06-01T10:00",
      bookedTime: "2024-06-05T15:00",
      name: "Mads Andersen",
      repairs: [{ device: "iPhone 13", repair: "Skærmskift" }],
      price: 899,
      time: 60,
      phone: "22223333",
      email: "mads@eksempel.dk",
      comment: "Kommer lidt før tid",
      status: "booket"
    },
    {
      id: 2,
      createdAt: "2024-06-02T12:30",
      bookedTime: "2024-06-07T12:00",
      name: "Laura Jensen",
      repairs: [{ device: "Samsung S22", repair: "Batteriskift" }],
      price: 699,
      time: 45,
      phone: "44445555",
      email: "laura@eksempel.dk",
      comment: "",
      status: "afventer"
    }
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#f8f8f8", minHeight: "100vh" }}>
      <header style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "1rem 2rem",
        backgroundColor: "white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/logo.png" alt="Telegiganten" style={{ height: 40 }} />
        </div>
      </header>

      <main style={{ padding: "2rem" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opret" element={<NewRepair />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/customers" element={<CustomersPage customers={customers} />} />
          <Route path="/customers/:id" element={<CustomerDetailPage customers={customers} bookings={bookings} />} />
        </Routes>
      </main>
    </div>
  );
}
