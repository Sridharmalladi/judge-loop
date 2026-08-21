import { BrowserRouter, Route, Routes } from "react-router-dom";
import ParallaxBackground from "./components/ParallaxBackground";
import TopBar from "./components/TopBar";
import StartScreen from "./pages/StartScreen";
import PipelineRunPage from "./pages/PipelineRunPage";
import ArenaPage from "./pages/ArenaPage";
import { useTheme } from "./hooks/useTheme";
import { useAmbientMelody } from "./hooks/useAmbientMelody";

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { on: soundOn, toggle: toggleSound } = useAmbientMelody();

  return (
    <BrowserRouter>
      <ParallaxBackground />
      <div className="scanline-overlay" aria-hidden="true" />
      <div className="relative z-10 min-h-screen">
        <TopBar soundOn={soundOn} onToggleSound={toggleSound} theme={theme} onToggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/run/self-refine" element={<PipelineRunPage variant="self_refine" />} />
          <Route path="/run/prompt-opt" element={<PipelineRunPage variant="prompt_optimization" />} />
          <Route path="/run/arena" element={<ArenaPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
