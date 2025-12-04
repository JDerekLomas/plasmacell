
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, DIMENSIONS } from '../constants';
import { Nucleus, Golgi, RER, Mitochondria, Vesicles, Lysosomes, Centrioles, FreeRibosomes, AntibodyStream, Microtubules } from './Organelles';

interface PlasmaCellProps {
  activeFeature: string | null;
  setActiveFeature: (feature: string | null) => void;
}

const PlasmaCell: React.FC<PlasmaCellProps> = ({ activeFeature, setActiveFeature }) => {
  const cellGroup = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (cellGroup.current) {
      // Gentle floating rotation
      cellGroup.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.1;
      cellGroup.current.rotation.z = Math.cos(clock.getElapsedTime() * 0.05) * 0.05;
    }
  });

  const handleOrganelleSelect = (name: string) => {
      setActiveFeature(name);
  };

  // Determine Membrane Opacity
  const membraneOpacity = activeFeature !== null ? 0.02 : 0.15;

  return (
    <group ref={cellGroup}>
      {/* 1. The Membrane (Outer Shell) - Ovoid Shape */}
      {/* scaled to be elongated */}
      <mesh raycast={() => null} scale={DIMENSIONS.CELL_SCALE}>
        <sphereGeometry args={[DIMENSIONS.CELL_RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          color={COLORS.MEMBRANE}
          transparent
          opacity={membraneOpacity}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          thickness={1.5}
          clearcoat={1}
          side={THREE.DoubleSide}
          depthWrite={false} 
        />
      </mesh>

      {/* 2. Internal Organelles */}
      <group>
        <Nucleus onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <RER onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <Golgi onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <Mitochondria onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <Lysosomes onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <Centrioles onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <FreeRibosomes onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        
        {/* 3. The Transport System */}
        <Microtubules onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <Vesicles onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
        <AntibodyStream onSelect={handleOrganelleSelect} activeFeature={activeFeature} />
      </group>
    </group>
  );
};

export default PlasmaCell;
