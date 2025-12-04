import React, { useState, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import PlasmaCell from './components/PlasmaCell';
import Lights from './components/Lights';
import UIOverlay from './components/UIOverlay';
import * as THREE from 'three';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);

  const handleClose = () => {
      setActiveFeature(null);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      const camera = controls.object;
      const zoomFactor = direction === 'in' ? 0.8 : 1.25;

      const newDistance = camera.position.length() * zoomFactor;
      const clampedDistance = Math.max(controls.minDistance, Math.min(controls.maxDistance, newDistance));

      camera.position.normalize().multiplyScalar(clampedDistance);
      controls.update();
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-950">
      <UIOverlay
        activeFeature={activeFeature}
        onClose={handleClose}
        onZoom={handleZoom}
      />

      <Canvas
        shadows
        camera={{ position: [0, 8, 35], fov: 45 }}
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
            ref={controlsRef}
            enablePan={false}
            minDistance={12}
            maxDistance={50}
            autoRotate={activeFeature === null}
            autoRotateSpeed={0.5}
        />
      </Canvas>
      
      <div className="loader" /> 
    </div>
  );
};

export default App;