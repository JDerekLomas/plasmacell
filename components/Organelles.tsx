
import React, { useRef, useMemo, useLayoutEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, DIMENSIONS } from '../constants';
import { OrganelleProps } from '../types';

// --- Shared Constants for Secretion Animation ---
// Define explicit tracks from Golgi to Membrane for Vesicles/Antibodies to follow
const SECRETION_PATHS = Array.from({ length: 8 }).map((_, i) => {
  // Spread out ends on the negative X hemisphere (the tail of the cell)
  // Golgi is at roughly [1.8, 0, 0]
  // Membrane tail surface is roughly x = -8 to -10
  const theta = (Math.PI * 2 * i) / 8 + (Math.random() * 0.5);
  const radius = 2.0 + Math.random() * 1.5; // Spread at the end
  const y = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  return {
    start: new THREE.Vector3(1.8, 0, 0), 
    end: new THREE.Vector3(-8.5 + Math.random(), y, z) 
  };
});

// --- Helper: Enhanced Ribosome Texture Generator ---
const useRibosomeTexture = () => {
  return useMemo(() => {
    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#404040';
      ctx.fillRect(0, 0, width, height);
      
      const count = 30000;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.random() * 1.5 + 1.0;
        const isBump = Math.random() > 0.2; 
        ctx.fillStyle = isBump ? '#ffffff' : '#000000';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 4); 
    
    return texture;
  }, []);
};

// --- Helper: Label Component ---
const OrganelleLabel: React.FC<{ text: string; position?: [number, number, number] }> = ({ text, position = [0, 0, 0] }) => (
  <Html position={position} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
    <div className="pointer-events-none select-none flex flex-col items-center">
       {/* Label Container */}
       <div className="bg-slate-900/95 backdrop-blur-xl text-teal-50 text-base font-bold px-4 py-2 rounded-xl border-2 border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.4)] animate-in fade-in zoom-in duration-300 whitespace-nowrap tracking-wide mb-1">
         {text}
       </div>
       {/* Leader Line */}
       <div className="w-0.5 h-8 bg-gradient-to-b from-teal-500 to-teal-500/0 origin-top"></div>
       {/* Anchor Point */}
       <div className="w-3 h-3 bg-teal-400 rounded-full shadow-[0_0_15px_rgba(20,184,166,1)] animate-pulse border-2 border-white/20"></div>
    </div>
  </Html>
);

// --- Shared Interaction Hook ---
const useInteraction = (name: string, onSelect: (n: string) => void) => {
  const [hovered, setHover] = useState(false);
  
  const handlers = {
    onClick: (e: THREE.Event) => {
      e.stopPropagation();
      onSelect(name);
    },
    onPointerOver: (e: THREE.Event) => {
      e.stopPropagation();
      setHover(true);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: (e: THREE.Event) => {
      setHover(false);
      document.body.style.cursor = 'auto';
    }
  };

  return { hovered, handlers };
};

// --- Logic for Ghost Mode Opacity ---
const useFadeLogic = (name: string, activeFeature: string | null, baseOpacity = 1.0, baseTransparent = false) => {
  const isSelected = activeFeature === name;
  const hasSelection = activeFeature !== null;
  
  if (!hasSelection) return { opacity: baseOpacity, transparent: baseTransparent };
  if (isSelected) return { opacity: baseOpacity, transparent: baseTransparent };
  return { opacity: baseOpacity * 0.1, transparent: true };
};

// --- Helper: Generate Y-Shape Geometry ---
const useAntibodyGeometry = () => {
    return useMemo(() => {
        const shape = new THREE.Shape();
        
        // Define a Y-shape profile
        // Coordinates relative to center [0,0]
        
        // Stem Bottom Right
        shape.moveTo(0.06, -0.2);
        // Stem Top Right (fork junction)
        shape.lineTo(0.06, 0.05);
        // Arm Right Tip
        shape.lineTo(0.25, 0.3);
        // Arm Right Inner Tip
        shape.lineTo(0.15, 0.35);
        // Crotch V
        shape.lineTo(0, 0.15);
        // Arm Left Inner Tip
        shape.lineTo(-0.15, 0.35);
        // Arm Left Outer Tip
        shape.lineTo(-0.25, 0.3);
        // Stem Top Left (fork junction)
        shape.lineTo(-0.06, 0.05);
        // Stem Bottom Left
        shape.lineTo(-0.06, -0.2);
        
        // Close shape
        shape.lineTo(0.06, -0.2);

        const extrudeSettings = { 
            depth: 0.05, 
            bevelEnabled: true, 
            bevelSegments: 2, 
            steps: 1, 
            bevelSize: 0.02, 
            bevelThickness: 0.02 
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center(); // Center the geometry for easier rotation
        return geometry;
    }, []);
};

// --- Nucleus (Enhanced with nucleolus and chromatin) ---
export const Nucleus: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { hovered, handlers } = useInteraction("Nucleus", onSelect);
  const isSelected = activeFeature === "Nucleus";
  const { opacity, transparent } = useFadeLogic("Nucleus", activeFeature);

  // Generate chromatin strand curves
  const chromatinCurves = useMemo(() => {
    const curves = [];
    for (let i = 0; i < 12; i++) {
      const points = [];
      for (let j = 0; j < 5; j++) {
        const r = 1.5 + Math.random() * 0.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        points.push(new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ));
      }
      curves.push(new THREE.CatmullRomCurve3(points));
    }
    return curves;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={DIMENSIONS.NUCLEUS_OFFSET} {...handlers}>
      {/* Nuclear Envelope (outer membrane) */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[DIMENSIONS.NUCLEUS_RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          color={hovered && !activeFeature ? '#3d255e' : COLORS.NUCLEUS}
          roughness={0.3}
          metalness={0.1}
          transparent={true}
          opacity={opacity * 0.7}
          clearcoat={0.3}
        />
      </mesh>

      {/* Nucleoplasm (inner material) */}
      <mesh>
        <sphereGeometry args={[DIMENSIONS.NUCLEUS_RADIUS * 0.95, 48, 48]} />
        <meshStandardMaterial
          color={'#3a2255'}
          roughness={0.5}
          emissive={'#1a0a30'}
          emissiveIntensity={0.4}
          transparent={transparent}
          opacity={opacity * 0.85}
        />
      </mesh>

      {/* Nucleolus (dense body where ribosomes are made) */}
      <mesh position={[0.5, 0.3, 0.4]} castShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color={'#1a0830'}
          roughness={0.6}
          emissive={'#0a0015'}
          emissiveIntensity={0.6}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Second smaller nucleolus */}
      <mesh position={[-0.4, -0.2, 0.5]} castShadow>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial
          color={'#1a0830'}
          roughness={0.6}
          emissive={'#0a0015'}
          emissiveIntensity={0.5}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Chromatin strands (DNA material) */}
      {chromatinCurves.map((curve, i) => (
        <mesh key={`chromatin-${i}`}>
          <tubeGeometry args={[curve, 20, 0.04, 8, false]} />
          <meshStandardMaterial
            color={'#5533aa'}
            roughness={0.5}
            emissive={'#220055'}
            emissiveIntensity={0.3}
            transparent={transparent}
            opacity={opacity * 0.8}
          />
        </mesh>
      ))}

      {isSelected && <OrganelleLabel text="Nucleus (The Boss)" position={[0, 3, 0]} />}
    </group>
  );
};

// --- Helper: Create curved Golgi cisterna geometry ---
const useGolgiCisternaGeometry = (radius: number, curvature: number) => {
  return useMemo(() => {
    const geometry = new THREE.TorusGeometry(radius, 0.08, 12, 48, Math.PI * 1.6);
    const positions = geometry.attributes.position;

    // Flatten and curve it
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      positions.setY(i, y * 0.4); // Flatten

      // Add organic waviness
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(i, positions.getY(i) + Math.sin(x * 3 + z * 2) * 0.02);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [radius, curvature]);
};

// --- Golgi Apparatus (Enhanced with curved cisternae and budding vesicles) ---
export const Golgi: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { hovered, handlers } = useInteraction("Golgi", onSelect);
  const isSelected = activeFeature === "Golgi";
  const { opacity, transparent } = useFadeLogic("Golgi", activeFeature);

  // Create cisterna geometries for the stack
  const cisternae = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      key: i,
      radius: 1.3 - Math.abs(i - 2.5) * 0.1,
      yOffset: (i - 2.5) * 0.18,
      xOffset: i * 0.06,
      rotation: (i - 2.5) * 0.08
    }));
  }, []);

  // Budding vesicles on cis and trans faces
  const buddingVesicles = useMemo(() => {
    const vesicles = [];
    // Trans face (output side) - more vesicles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 1.4 - Math.PI * 0.7;
      vesicles.push({
        position: [
          Math.cos(angle) * 1.5 + 0.3,
          (Math.random() - 0.5) * 0.8,
          Math.sin(angle) * 0.8
        ] as [number, number, number],
        scale: 0.06 + Math.random() * 0.04,
        side: 'trans'
      });
    }
    // Cis face (input side) - fewer vesicles
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 1.2 - Math.PI * 0.6;
      vesicles.push({
        position: [
          Math.cos(angle) * 1.4 - 0.4,
          (Math.random() - 0.5) * 0.6,
          Math.sin(angle) * 0.7
        ] as [number, number, number],
        scale: 0.05 + Math.random() * 0.03,
        side: 'cis'
      });
    }
    return vesicles;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.15;
      groupRef.current.rotation.z = 0.3 + Math.sin(t * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={DIMENSIONS.GOLGI_POS} rotation={[0.2, 0.5, 0.3]} {...handlers}>
      {/* Stacked cisternae */}
      {cisternae.map((c) => (
        <mesh
          key={c.key}
          position={[c.xOffset, c.yOffset, 0]}
          rotation={[Math.PI / 2, 0, c.rotation]}
          castShadow
          receiveShadow
        >
          <torusGeometry args={[c.radius, 0.07, 10, 40, Math.PI * 1.6]} />
          <meshStandardMaterial
            color={COLORS.GOLGI}
            emissive={hovered && !activeFeature ? '#403000' : '#201500'}
            emissiveIntensity={0.3}
            roughness={0.35}
            metalness={0.1}
            transparent={transparent}
            opacity={opacity * 0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Budding vesicles */}
      {buddingVesicles.map((v, i) => (
        <mesh key={`vesicle-${i}`} position={v.position} castShadow>
          <sphereGeometry args={[v.scale, 12, 12]} />
          <meshStandardMaterial
            color={v.side === 'trans' ? '#ffdd55' : '#eecc44'}
            emissive={hovered && !activeFeature ? '#302000' : '#151000'}
            emissiveIntensity={0.4}
            roughness={0.3}
            transparent={transparent}
            opacity={opacity * 0.85}
          />
        </mesh>
      ))}

      {isSelected && <OrganelleLabel text="Golgi (Packaging)" position={[0, 2, 0]} />}
    </group>
  );
};

// --- Centrioles (Enhanced with 9-triplet microtubule structure) ---
export const Centrioles: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { hovered, handlers } = useInteraction("Centrioles", onSelect);
  const isSelected = activeFeature === "Centrioles";
  const { opacity, transparent } = useFadeLogic("Centrioles", activeFeature);

  // Position near the Golgi (the Hof area)
  const position = [3.2, 0.5, 0.5] as [number, number, number];

  // Generate triplet positions for a centriole (9 triplets arranged in a cylinder)
  const triplets = useMemo(() => {
    const result = [];
    for (let i = 0; i < 9; i++) {
      const baseAngle = (i / 9) * Math.PI * 2;
      // Each triplet has 3 microtubules
      for (let t = 0; t < 3; t++) {
        const r = 0.06 + t * 0.018;
        const angle = baseAngle + t * 0.12;
        result.push({
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r
        });
      }
    }
    return result;
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} {...handlers}>
      {/* Centriole 1 - Vertical */}
      <group>
        {triplets.map((pos, i) => (
          <mesh key={`c1-${i}`} position={[pos.x, 0, pos.z]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
            <meshStandardMaterial
              color={COLORS.CENTRIOLE}
              emissive={hovered && !activeFeature ? '#602040' : '#200010'}
              emissiveIntensity={0.4}
              roughness={0.4}
              metalness={0.2}
              transparent={transparent}
              opacity={opacity}
            />
          </mesh>
        ))}
        {/* Central hub */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
          <meshStandardMaterial
            color={'#cc88aa'}
            emissive={'#401030'}
            emissiveIntensity={0.3}
            transparent={transparent}
            opacity={opacity * 0.7}
          />
        </mesh>
      </group>

      {/* Centriole 2 - Perpendicular */}
      <group position={[0.18, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {triplets.map((pos, i) => (
          <mesh key={`c2-${i}`} position={[pos.x, 0, pos.z]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
            <meshStandardMaterial
              color={COLORS.CENTRIOLE}
              emissive={hovered && !activeFeature ? '#602040' : '#200010'}
              emissiveIntensity={0.4}
              roughness={0.4}
              metalness={0.2}
              transparent={transparent}
              opacity={opacity}
            />
          </mesh>
        ))}
        {/* Central hub */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
          <meshStandardMaterial
            color={'#cc88aa'}
            emissive={'#401030'}
            emissiveIntensity={0.3}
            transparent={transparent}
            opacity={opacity * 0.7}
          />
        </mesh>
      </group>

      {/* Pericentriolar material (PCM) - fuzzy cloud around centrioles */}
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={'#ffaacc'}
          transparent={true}
          opacity={opacity * 0.15}
          roughness={1}
        />
      </mesh>

      {isSelected && <OrganelleLabel text="Centrioles" position={[0, 0.8, 0]} />}
    </group>
  );
};

// --- Helper: Create curved cisterna geometry ---
const useCisternaGeometry = (width: number, height: number, curvature: number, segments: number = 24) => {
  return useMemo(() => {
    const geometry = new THREE.PlaneGeometry(width, height, segments, Math.floor(segments * 0.6));
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Curve the sheet to wrap (like a taco shell)
      const curve = curvature * (1 - Math.pow((x / (width / 2)), 2));

      // Add organic waviness
      const wave = Math.sin(x * 3) * 0.08 + Math.sin(y * 4 + x) * 0.05;

      // Roll the edges (characteristic of ER sheets)
      const edgeDistX = Math.abs(x) / (width / 2);
      const edgeDistY = Math.abs(y) / (height / 2);
      const edgeDist = Math.max(edgeDistX, edgeDistY);
      let roll = 0;
      if (edgeDist > 0.7) {
        roll = ((edgeDist - 0.7) / 0.3) ** 2 * 0.15;
      }

      positions.setZ(i, curve + wave + roll);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [width, height, curvature, segments]);
};

// --- Rough Endoplasmic Reticulum (RER) - Improved with stacked cisternae ---
export const RER: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ribosomesRef = useRef<THREE.InstancedMesh>(null);
  const ribosomeTexture = useRibosomeTexture();
  const { hovered, handlers } = useInteraction("RER", onSelect);
  const isSelected = activeFeature === "RER";
  const { opacity, transparent } = useFadeLogic("RER", activeFeature);

  // Create cisterna geometries of varying sizes
  const largeGeom = useCisternaGeometry(5.0, 3.0, 0.8);
  const medGeom = useCisternaGeometry(4.0, 2.5, 0.6);
  const smallGeom = useCisternaGeometry(3.0, 2.0, 0.5);

  // Define stacks of cisternae in the tail region
  const cisternaStacks = useMemo(() => {
    const stacks = [];

    // Main stack 1 - Large, fills center-left of cell
    for (let i = 0; i < 6; i++) {
      stacks.push({
        geometry: 'large',
        position: [-3.0 + i * 0.15, i * 0.35 - 0.9, 0.5 + (Math.random() - 0.5) * 0.3],
        rotation: [0.1, 0.3 + i * 0.05, (Math.random() - 0.5) * 0.15],
        scale: 1.0 - i * 0.05
      });
    }

    // Stack 2 - Upper region
    for (let i = 0; i < 5; i++) {
      stacks.push({
        geometry: 'medium',
        position: [-5.0 + i * 0.12, 2.0 + i * 0.3, -0.5 + (Math.random() - 0.5) * 0.4],
        rotation: [0.2, -0.5 + i * 0.08, (Math.random() - 0.5) * 0.1],
        scale: 0.9 - i * 0.04
      });
    }

    // Stack 3 - Lower region
    for (let i = 0; i < 5; i++) {
      stacks.push({
        geometry: 'medium',
        position: [-4.5 + i * 0.1, -2.2 + i * 0.28, 0.8 + (Math.random() - 0.5) * 0.3],
        rotation: [-0.15, 0.8 + i * 0.06, (Math.random() - 0.5) * 0.12],
        scale: 0.85 - i * 0.03
      });
    }

    // Stack 4 - Far tail
    for (let i = 0; i < 4; i++) {
      stacks.push({
        geometry: 'small',
        position: [-7.0 + i * 0.08, 0.5 + i * 0.25, -1.0 + (Math.random() - 0.5) * 0.5],
        rotation: [0.3, 1.2 + i * 0.1, (Math.random() - 0.5) * 0.15],
        scale: 0.75 - i * 0.05
      });
    }

    // Stack 5 - Behind nucleus connection
    for (let i = 0; i < 4; i++) {
      stacks.push({
        geometry: 'small',
        position: [0.5 + i * 0.1, -0.5 + i * 0.22, 2.0 + (Math.random() - 0.5) * 0.3],
        rotation: [0.0, -1.0 + i * 0.05, (Math.random() - 0.5) * 0.1],
        scale: 0.7 - i * 0.04
      });
    }

    // Stack 6 - More tail coverage
    for (let i = 0; i < 5; i++) {
      stacks.push({
        geometry: 'medium',
        position: [-6.0 + i * 0.12, -0.8 + i * 0.3, -1.5 + (Math.random() - 0.5) * 0.4],
        rotation: [0.1, 2.0 + i * 0.07, (Math.random() - 0.5) * 0.1],
        scale: 0.8 - i * 0.03
      });
    }

    return stacks;
  }, []);

  // Generate ribosome positions on cisternae surfaces
  const ribosomeData = useMemo(() => {
    const ribosomes: { position: [number, number, number] }[] = [];
    const ribosomeCount = 800; // Dense ribosome coverage

    cisternaStacks.forEach((stack, stackIndex) => {
      // More ribosomes on larger cisternae
      const countForThis = stack.geometry === 'large' ? 35 : stack.geometry === 'medium' ? 25 : 18;

      for (let r = 0; r < countForThis; r++) {
        // Random position on the cisterna surface
        const localX = (Math.random() - 0.5) * (stack.geometry === 'large' ? 4.5 : stack.geometry === 'medium' ? 3.5 : 2.5);
        const localY = (Math.random() - 0.5) * (stack.geometry === 'large' ? 2.8 : stack.geometry === 'medium' ? 2.2 : 1.8);
        const localZ = 0.08 * (Math.random() > 0.5 ? 1 : -1); // Both sides

        // Transform to world position (approximate)
        const pos = stack.position;
        ribosomes.push({
          position: [
            pos[0] + localX * stack.scale * Math.cos(stack.rotation[1]) - localZ * Math.sin(stack.rotation[1]),
            pos[1] + localY * stack.scale,
            pos[2] + localX * stack.scale * Math.sin(stack.rotation[1]) + localZ * Math.cos(stack.rotation[1])
          ] as [number, number, number]
        });
      }
    });

    return ribosomes;
  }, [cisternaStacks]);

  // Set up instanced ribosomes
  useLayoutEffect(() => {
    if (!ribosomesRef.current) return;
    const tempObj = new THREE.Object3D();
    ribosomeData.forEach((data, i) => {
      tempObj.position.set(data.position[0], data.position[1], data.position[2]);
      tempObj.scale.setScalar(0.8 + Math.random() * 0.4);
      tempObj.updateMatrix();
      ribosomesRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    ribosomesRef.current.instanceMatrix.needsUpdate = true;
  }, [ribosomeData]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.02;
      groupRef.current.position.y = Math.sin(t * 0.15) * 0.05;
    }
  });

  const getGeometry = (type: string) => {
    switch (type) {
      case 'large': return largeGeom;
      case 'medium': return medGeom;
      case 'small': return smallGeom;
      default: return medGeom;
    }
  };

  return (
    <group ref={groupRef} {...handlers}>
      {/* Cisternae sheets */}
      {cisternaStacks.map((stack, i) => (
        <mesh
          key={`cisterna-${i}`}
          geometry={getGeometry(stack.geometry)}
          position={stack.position as [number, number, number]}
          rotation={stack.rotation as [number, number, number]}
          scale={stack.scale}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={COLORS.RER}
            emissive={hovered && !activeFeature ? '#003333' : '#001515'}
            emissiveIntensity={0.3}
            roughness={0.4}
            metalness={0.1}
            side={THREE.DoubleSide}
            transparent={transparent}
            opacity={opacity * 0.85}
            bumpMap={ribosomeTexture}
            bumpScale={0.08}
          />
        </mesh>
      ))}

      {/* Instanced ribosomes - small spheres on the cisternae */}
      <instancedMesh ref={ribosomesRef} args={[undefined, undefined, ribosomeData.length]} castShadow>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color={'#2aa8a8'}
          emissive={hovered && !activeFeature ? '#104040' : '#000000'}
          roughness={0.6}
          transparent={transparent}
          opacity={opacity}
        />
      </instancedMesh>

      {isSelected && <OrganelleLabel text="Rough ER (Factory Floor)" position={[-5, 5, 0]} />}
    </group>
  );
};

// --- Single Mitochondrion with Cristae ---
const Mitochondrion: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  hovered: boolean;
  activeFeature: string | null;
  opacity: number;
  transparent: boolean;
}> = ({ position, rotation, scale, hovered, activeFeature, opacity, transparent }) => {
  const length = 0.8 * scale;
  const radius = 0.2 * scale;

  // Generate cristae (inner membrane folds)
  const cristae = useMemo(() => {
    const folds = [];
    const numFolds = 4;
    for (let i = 0; i < numFolds; i++) {
      folds.push({
        yPos: (i - (numFolds - 1) / 2) * (length / (numFolds + 1)),
        rotZ: (Math.random() - 0.5) * 0.4
      });
    }
    return folds;
  }, [length]);

  return (
    <group position={position} rotation={rotation}>
      {/* Outer membrane */}
      <mesh castShadow>
        <capsuleGeometry args={[radius, length, 8, 16]} />
        <meshPhysicalMaterial
          color={COLORS.MITOCHONDRIA}
          emissive={hovered && !activeFeature ? '#401010' : '#150505'}
          emissiveIntensity={0.3}
          roughness={0.35}
          clearcoat={0.2}
          transparent={transparent}
          opacity={opacity * 0.85}
        />
      </mesh>

      {/* Inner membrane (slightly smaller) */}
      <mesh>
        <capsuleGeometry args={[radius * 0.85, length * 0.9, 8, 16]} />
        <meshStandardMaterial
          color={'#ff7766'}
          emissive={'#301008'}
          emissiveIntensity={0.4}
          roughness={0.5}
          transparent={transparent}
          opacity={opacity * 0.7}
        />
      </mesh>

      {/* Cristae - inner membrane folds */}
      {cristae.map((crista, i) => (
        <mesh key={i} position={[0, crista.yPos, 0]} rotation={[Math.PI / 2, 0, crista.rotZ]}>
          <torusGeometry args={[radius * 0.6, 0.02 * scale, 8, 16, Math.PI]} />
          <meshStandardMaterial
            color={'#ff8877'}
            emissive={'#401510'}
            emissiveIntensity={0.5}
            roughness={0.5}
            transparent={transparent}
            opacity={opacity * 0.9}
          />
        </mesh>
      ))}

      {/* Matrix (inner space) glow */}
      <mesh>
        <capsuleGeometry args={[radius * 0.5, length * 0.6, 6, 12]} />
        <meshStandardMaterial
          color={'#ffaa88'}
          emissive={'#ff6644'}
          emissiveIntensity={0.3}
          transparent={true}
          opacity={opacity * 0.3}
        />
      </mesh>
    </group>
  );
};

// --- Mitochondria (Enhanced with cristae detail) ---
export const Mitochondria: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const count = 25; // Fewer but more detailed
  const { hovered, handlers } = useInteraction("Mitochondria", onSelect);
  const isSelected = activeFeature === "Mitochondria";
  const { opacity, transparent } = useFadeLogic("Mitochondria", activeFeature);

  const instances = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Scatter in elongated volume (x from -8 to +6)
      const x = (Math.random() - 0.7) * 12; // Bias towards negative x
      const y = (Math.random() - 0.5) * 5;
      const z = (Math.random() - 0.5) * 5;

      // Simple bounding check - avoid nucleus area
      const distToNuc = Math.sqrt(
        Math.pow(x - DIMENSIONS.NUCLEUS_OFFSET[0], 2) +
        Math.pow(y - DIMENSIONS.NUCLEUS_OFFSET[1], 2) +
        Math.pow(z - DIMENSIONS.NUCLEUS_OFFSET[2], 2)
      );

      if (Math.sqrt(y * y + z * z) < 5 && distToNuc > DIMENSIONS.NUCLEUS_RADIUS + 0.5) {
        temp.push({
          position: [x, y, z] as [number, number, number],
          rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * 0.5] as [number, number, number],
          scale: 0.7 + Math.random() * 0.5
        });
      }
    }
    return temp;
  }, []);

  return (
    <group {...handlers}>
      {instances.map((data, i) => (
        <Mitochondrion
          key={i}
          position={data.position}
          rotation={data.rotation}
          scale={data.scale}
          hovered={hovered}
          activeFeature={activeFeature}
          opacity={opacity}
          transparent={transparent}
        />
      ))}
      {isSelected && <OrganelleLabel text="Mitochondria (Power)" position={[-4, -3, 3]} />}
    </group>
  );
};

// --- Lysosomes ---
export const Lysosomes: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
    const count = 15;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { hovered, handlers } = useInteraction("Lysosomes", onSelect);
    const isSelected = activeFeature === "Lysosomes";
    const { opacity, transparent } = useFadeLogic("Lysosomes", activeFeature);

    const instances = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 6;
            const z = (Math.random() - 0.5) * 6;
            temp.push({ position: [x, y, z] });
        }
        return temp;
    }, []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const tempObj = new THREE.Object3D();
        instances.forEach((data, i) => {
            tempObj.position.set(data.position[0], data.position[1], data.position[2]);
            tempObj.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObj.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [instances]);

    return (
        <group {...handlers}>
            <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshStandardMaterial 
                    color={COLORS.LYSOSOME} 
                    emissive={hovered && !activeFeature ? '#104010' : '#000000'}
                    roughness={0.5} 
                    transparent={transparent}
                    opacity={opacity}
                />
            </instancedMesh>
            {isSelected && <OrganelleLabel text="Lysosomes (Recycling)" position={[-3, 2, 4]} />}
        </group>
    );
};

// --- Free Ribosomes ---
export const FreeRibosomes: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
    const count = 400;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { hovered, handlers } = useInteraction("Ribosomes", onSelect);
    const isSelected = activeFeature === "Ribosomes";
    const { opacity, transparent } = useFadeLogic("Ribosomes", activeFeature, 0.6, true);

    const instances = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 14; 
            const y = (Math.random() - 0.5) * 8; 
            const z = (Math.random() - 0.5) * 8; 
            
            // Basic exclusion zone for nucleus
            const distToNuc = Math.sqrt(
                Math.pow(x - DIMENSIONS.NUCLEUS_OFFSET[0], 2) + 
                Math.pow(y - DIMENSIONS.NUCLEUS_OFFSET[1], 2) + 
                Math.pow(z - DIMENSIONS.NUCLEUS_OFFSET[2], 2)
            );
            
            if (distToNuc > DIMENSIONS.NUCLEUS_RADIUS + 0.2) {
                 temp.push({ position: [x, y, z] });
            }
        }
        return temp;
    }, []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const tempObj = new THREE.Object3D();
        instances.forEach((data, i) => {
            tempObj.position.set(data.position[0], data.position[1], data.position[2]);
            tempObj.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObj.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [instances]);

    return (
        <group {...handlers}>
            <instancedMesh ref={meshRef} args={[undefined, undefined, instances.length]}>
                <dodecahedronGeometry args={[0.05, 0]} />
                <meshBasicMaterial 
                    color={hovered && !activeFeature ? '#ffffff' : COLORS.FREE_RIBOSOME} 
                    transparent={transparent}
                    opacity={opacity}
                />
            </instancedMesh>
            {isSelected && <OrganelleLabel text="Free Ribosomes" position={[0, -5, 0]} />}
        </group>
    );
};

// --- Microtubules (Tracks) ---
export const Microtubules: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const { hovered, handlers } = useInteraction("Microtubules", onSelect);
  const isSelected = activeFeature === "Microtubules";
  const { opacity, transparent } = useFadeLogic("Microtubules", activeFeature, 0.5, true);

  return (
    <group {...handlers}>
      {SECRETION_PATHS.map((path, i) => {
        // Calculate length and orientation for cylinder placement
        const vec = new THREE.Vector3().subVectors(path.end, path.start);
        const length = vec.length();
        const midPoint = new THREE.Vector3().addVectors(path.start, path.end).multiplyScalar(0.5);
        
        // Quaternion for rotation
        const axis = new THREE.Vector3(0, 1, 0); // Cylinder default axis
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, vec.clone().normalize());

        return (
          <mesh key={i} position={midPoint} quaternion={quaternion}>
             <cylinderGeometry args={[0.03, 0.03, length, 6]} />
             <meshStandardMaterial 
                color={COLORS.MICROTUBULE} 
                transparent={true}
                opacity={opacity}
                emissive={hovered && !activeFeature ? COLORS.MICROTUBULE : '#000000'}
             />
          </mesh>
        )
      })}
      {isSelected && <OrganelleLabel text="Microtubules (Highways)" position={[-3, -1, 0]} />}
    </group>
  );
};

// --- Secretory Vesicles (Moving along Microtubules) ---
export const Vesicles: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
    // REDUCED COUNT (User requested 2x decrease from previous 4x, so 2x)
    const count = SECRETION_PATHS.length * 2; 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const antibodyRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { hovered, handlers } = useInteraction("Vesicles", onSelect);
    const isSelected = activeFeature === "Vesicles";
    const { opacity, transparent } = useFadeLogic("Vesicles", activeFeature, 0.8, true);
    
    const antibodyGeometry = useAntibodyGeometry();

    const particles = useMemo(() => {
        return new Array(count).fill(0).map((_, i) => ({
            pathIndex: i % SECRETION_PATHS.length,
            offset: Math.random() * 10.0
        }));
    }, []);

    useFrame(({ clock }) => {
        if (!meshRef.current || !antibodyRef.current) return;
        const t = clock.getElapsedTime();
        const cycleDuration = 6.0;
        const transitionPoint = 0.75; // 0 to 0.75 is inside (Vesicle)

        particles.forEach((p, i) => {
            const path = SECRETION_PATHS[p.pathIndex];
            const rawProgress = ((t + p.offset) % cycleDuration) / cycleDuration;
            
            // Normalize progress for the vesicle stage (0 to 1 over the 0->0.75 range)
            const stageProgress = rawProgress / transitionPoint;
            
            if (rawProgress < transitionPoint) {
                // ACTIVE VESICLE STAGE
                const currentPos = new THREE.Vector3().lerpVectors(path.start, path.end, stageProgress);
                
                // Scale Effect: Grow in beginning, Shrink at end (fusion)
                let s = 0.25; 
                if (stageProgress < 0.1) s = stageProgress * 2.5; 
                if (stageProgress > 0.9) s = (1 - stageProgress) * 2.5;

                // --- ATTACH TO TOP OF MICROTUBULE ---
                // Calculate direction vector of the path
                const dir = new THREE.Vector3().subVectors(path.end, path.start).normalize();
                // Create an arbitrary "Up" vector (World Up)
                const worldUp = new THREE.Vector3(0, 1, 0);
                // Calculate a perpendicular vector (Side)
                const perp = new THREE.Vector3().crossVectors(dir, worldUp).normalize();
                // If parallel to up, fallback (rare in this layout)
                if (perp.lengthSq() === 0) perp.set(1, 0, 0);
                // Calculate the local "Up" relative to the tube (Cross direction with side)
                const localUp = new THREE.Vector3().crossVectors(perp, dir).normalize();
                
                // Offset = Vesicle Radius (s) + Tube Radius (0.03)
                const offsetDistance = s + 0.03;
                currentPos.add(localUp.multiplyScalar(offsetDistance));

                // Update Vesicle
                dummy.position.copy(currentPos);
                dummy.scale.set(s, s, s);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);

                // Update Payload (Hidden Antibody inside)
                dummy.scale.set(s * 0.5, s * 0.5, s * 0.5); // Smaller cargo
                dummy.rotation.set(t * 2, t, 0);
                dummy.updateMatrix();
                antibodyRef.current!.setMatrixAt(i, dummy.matrix);
            } else {
                // HIDDEN (Turned into free antibody)
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
                antibodyRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        antibodyRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group {...handlers}>
            <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
                <sphereGeometry args={[1, 12, 12]} />
                <meshStandardMaterial 
                    color={COLORS.GOLGI} 
                    emissive={hovered && !activeFeature ? COLORS.GOLGI : COLORS.GOLGI} 
                    emissiveIntensity={0.5} 
                    transparent={transparent} 
                    opacity={opacity} 
                />
            </instancedMesh>
            
            <instancedMesh ref={antibodyRef} args={[antibodyGeometry, undefined, count]}>
                <meshBasicMaterial 
                    color={COLORS.ANTIBODY}
                    transparent={transparent}
                    opacity={opacity}
                />
            </instancedMesh>

            {isSelected && <OrganelleLabel text="Secretory Vesicles (Trucks)" position={[-2, 2, 3]} />}
        </group>
    );
};

// --- Antibody Stream (The Product) ---
export const AntibodyStream: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
    // INCREASED COUNT (User requested 2x)
    // Previous base was length * 4. Target is higher density.
    const count = SECRETION_PATHS.length * 8; 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { hovered, handlers } = useInteraction("Antibodies", onSelect);
    const isSelected = activeFeature === "Antibodies";
    const { opacity, transparent } = useFadeLogic("Antibodies", activeFeature, 1.0, true);
    
    const antibodyGeometry = useAntibodyGeometry();

    const particles = useMemo(() => {
        return new Array(count).fill(0).map((_, i) => ({
            pathIndex: i % SECRETION_PATHS.length,
            // Random offset for stream density
            offset: Math.random() * 10.0
        }));
    }, []);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const cycleDuration = 6.0;
        const transitionPoint = 0.75; 

        particles.forEach((p, i) => {
            const path = SECRETION_PATHS[p.pathIndex];
            
            // Note: Since we have more antibodies than vesicles, we can't 1:1 sync strictly with the vesicle array index anymore.
            // But we simulate the "burst" by having them all follow the same timing cycle relative to the transition point.
            
            const rawProgress = ((t + p.offset) % cycleDuration) / cycleDuration;
            
            if (rawProgress >= transitionPoint) {
                // ACTIVE ANTIBODY STAGE (Outside)
                // Normalize for this stage (0 to 1 over the 0.75->1.0 range)
                const stageProgress = (rawProgress - transitionPoint) / (1.0 - transitionPoint);
                
                // Movement: Continue outward from path.end
                const direction = new THREE.Vector3().subVectors(path.end, path.start).normalize();
                
                // Vesicle end point needs to account for the offset we added in Vesicles component? 
                // Visually, if the vesicle pops, the antibody should appear roughly there.
                // For simplicity at distance, the path.end is close enough, but let's add a tiny random spread.
                
                const startPos = path.end;
                
                // Move outward
                const travelDist = stageProgress * 6.0; // Fly away distance
                const currentPos = new THREE.Vector3().copy(startPos).add(direction.multiplyScalar(travelDist));
                
                // Add "drift"
                currentPos.y += Math.sin(t * 5 + i) * 0.2 * stageProgress;
                currentPos.z += Math.cos(t * 5 + i) * 0.2 * stageProgress;

                dummy.position.copy(currentPos);
                
                // Rotate tumbling
                dummy.rotation.set(t * 2, t * 1.5, i);
                
                // Scale: Pop in at start, Fade out at end
                let s = 0.25; // Small size (user requested much smaller than vesicles)
                if (stageProgress < 0.1) s = stageProgress * 2.5; 
                if (stageProgress > 0.8) s = (1 - stageProgress) * 1.25; // Fade out far away

                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            } else {
                // HIDDEN (Still inside vesicle / not born yet)
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group {...handlers}>
            <instancedMesh ref={meshRef} args={[antibodyGeometry, undefined, count]}>
                <meshStandardMaterial 
                    color={COLORS.ANTIBODY}
                    emissive={COLORS.ANTIBODY}
                    emissiveIntensity={0.8}
                    transparent={transparent}
                    opacity={opacity}
                />
            </instancedMesh>
            {isSelected && <OrganelleLabel text="Antibody Swarm" position={[-10, 0, 8]} />}
        </group>
    );
};
