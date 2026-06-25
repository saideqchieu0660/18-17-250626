import { useState } from 'react';
import VibeApiHealthMonitor from './vibe-sandbox/VibeApiHealthMonitor';

export default function App() {
  const [useVibeFeature] = useState(true); // Feature Flag (vibe-api-rotator)

  return (
    <>
      {useVibeFeature ? <VibeApiHealthMonitor /> : <div className="p-8">Legacy View</div>}
    </>
  );
}

