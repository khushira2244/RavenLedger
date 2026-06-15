import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandCenter from "./pages/CommandCenter";
import InvestigationJourney from "./pages/InvestigationJourney";
import LandingPage from "./pages/LandingPage";
import CapabilityCenter from "./pages/CapabilityCenter";
import InvestigationSelect from "./pages/InvestigationSelect";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo/select" element={<InvestigationSelect />} />
        <Route path="/demo" element={<CommandCenter />} />
        <Route path="/demo/case" element={<InvestigationJourney />} />
        <Route path="/demo/capability" element={<CapabilityCenter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;