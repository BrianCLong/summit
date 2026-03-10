import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import CognitiveBattlespacePage from "../pages/CognitiveBattlespacePage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cognitive-battlespace" replace />} />
        <Route path="/cognitive-battlespace" element={<CognitiveBattlespacePage />} />
      </Routes>
    </BrowserRouter>
  );
}
