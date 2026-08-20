import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LiveRunPage from "./pages/LiveRunPage";
import PastRunsPage from "./pages/PastRunsPage";
import RunDetailPage from "./pages/RunDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LiveRunPage />} />
          <Route path="/runs" element={<PastRunsPage />} />
          <Route path="/runs/:id" element={<RunDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
