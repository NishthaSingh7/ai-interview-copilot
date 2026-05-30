import { BrowserRouter, Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import Feedback from "./pages/Feedback";

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        <Sidebar />

        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/feedback" element={<Feedback />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
