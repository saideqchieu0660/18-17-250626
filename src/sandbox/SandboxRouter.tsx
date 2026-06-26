import React from "react";
import { Routes, Route } from "react-router-dom";
import { MaintenanceStub } from "../components/MaintenanceStub";
import { isFeatureEnabled } from "../features.config";

export default function SandboxRouter() {
  if (!isFeatureEnabled("PRIMITIVE_MODE")) {
    return <MaintenanceStub featureName="Sandbox is only available in Primitive Mode" />;
  }

  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center text-zinc-500">Sandbox Root - Add your vibe components here</div>} />
      <Route path="*" element={<MaintenanceStub featureName="Sandbox Route Not Found" />} />
    </Routes>
  );
}
