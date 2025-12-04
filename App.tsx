import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import PlasmaCell from './components/PlasmaCell';
import Lights from './components/Lights';
import UIOverlay from './components/UIOverlay';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const handleClose = () => {
      setActiveFeature(null);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950">
      <UIOverlay 
        activeFeature={activeFeature}
        onClose={handleClose}
      />

      <Canvas
        shadows
        camera={{ position: [0, 5, 20], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => setActiveFeature(null)}
      >
        <color attach="background" args={['#0f172a']} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Suspense fallback={null}>
            <Environment preset="city" />
            <Lights />

            <group rotation={[0, -Math.PI / 4, 0]}> 
               <PlasmaCell 
                  activeFeature={activeFeature} 
                  setActiveFeature={setActiveFeature} 
               />
            </group>

            <ContactShadows 
                position={[0, -9, 0]} 
                opacity={0.5} 
                scale={30} 
                blur={2.5} 
                far={10} 
                color="#000000"
            />
        </Suspense>

        <OrbitControls 
            enablePan={false} 
            minDistance={12} 
            maxDistance={40} 
            autoRotate={activeFeature === null} // Auto rotate only when idle
            autoRotateSpeed={0.5}
        />
      </Canvas>
      
      <div className="loader" /> 
    </div>
  );
};

export default App;