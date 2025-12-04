
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
  <Html position={position} distanceFactor={10} center zIndexRange={[100, 0]}>
    <div className="pointer-events-none select-none flex flex-col items-center">
       {/* Label Container */}
       <div className="bg-slate-900/95 backdrop-blur-xl text-teal-50 text-xl font-bold px-6 py-3 rounded-xl border-2 border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.4)] animate-in fade-in zoom-in duration-300 whitespace-nowrap tracking-wide mb-1">
         {text}
       </div>
       {/* Leader Line */}
       <div className="w-1 h-16 bg-gradient-to-b from-teal-500 to-teal-500/0 origin-top"></div>
       {/* Anchor Point */}
       <div className="w-4 h-4 bg-teal-400 rounded-full shadow-[0_0_15px_rgba(20,184,166,1)] animate-pulse border-2 border-white/20"></div>
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

// --- Nucleus (Simplified Sphere) ---
export const Nucleus: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const { hovered, handlers } = useInteraction("Nucleus", onSelect);
  const isSelected = activeFeature === "Nucleus";
  const { opacity, transparent } = useFadeLogic("Nucleus", activeFeature);

  return (
    <group position={DIMENSIONS.NUCLEUS_OFFSET} {...handlers}>
      {/* Main Nuclear Envelope */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[DIMENSIONS.NUCLEUS_RADIUS, 64, 64]} />
        <meshStandardMaterial 
          color={hovered && !activeFeature ? '#3d255e' : COLORS.NUCLEUS} 
          roughness={0.5} 
          metalness={0.2}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      {isSelected && <OrganelleLabel text="Nucleus (The Boss)" position={[0, 3, 0]} />}
    </group>
  );
};

// --- Golgi Apparatus ---
export const Golgi: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { hovered, handlers } = useInteraction("Golgi", onSelect);
  const isSelected = activeFeature === "Golgi";
  const { opacity, transparent } = useFadeLogic("Golgi", activeFeature);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;
    }
  });

  const discs = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      key: i,
      scale: 1 - Math.abs(i - 2) * 0.15,
      yOffset: (i - 2) * 0.25,
      curvature: (i - 2) * 0.1
    }));
  }, []);

  return (
    <group ref={groupRef} position={DIMENSIONS.GOLGI_POS} rotation={[0, 0, 0.3]} {...handlers}>
      {discs.map((disc) => (
        <mesh key={disc.key} position={[0, disc.yOffset, 0]} rotation={[0, 0, disc.curvature]} castShadow receiveShadow>
          <cylinderGeometry args={[1.4 * disc.scale, 1.4 * disc.scale, 0.1, 32]} />
          <meshStandardMaterial 
            color={COLORS.GOLGI} 
            emissive={hovered && !activeFeature ? '#403000' : '#000000'}
            roughness={0.3} 
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
      ))}
      {isSelected && <OrganelleLabel text="Golgi (Packaging)" position={[0, 2, 0]} />}
    </group>
  );
};

// --- Centrioles ---
export const Centrioles: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const { hovered, handlers } = useInteraction("Centrioles", onSelect);
  const isSelected = activeFeature === "Centrioles";
  const { opacity, transparent } = useFadeLogic("Centrioles", activeFeature);
  
  // Position near the Golgi (the Hof area)
  const position = [3.2, 0.5, 0.5] as [number, number, number];

  return (
    <group position={position} {...handlers} rotation={[0.5, 0.5, 0]}>
      {/* Centriole 1 */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
        <meshStandardMaterial 
          color={COLORS.CENTRIOLE} 
          emissive={hovered && !activeFeature ? '#602040' : '#000000'} 
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      {/* Centriole 2 (Perpendicular) */}
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
        <meshStandardMaterial 
          color={COLORS.CENTRIOLE} 
          emissive={hovered && !activeFeature ? '#602040' : '#000000'} 
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      {isSelected && <OrganelleLabel text="Centrioles" position={[0, 0.8, 0]} />}
    </group>
  );
};

// --- Rough Endoplasmic Reticulum (RER) ---
export const RER: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ribosomeTexture = useRibosomeTexture();
  const { hovered, handlers } = useInteraction("RER", onSelect);
  const isSelected = activeFeature === "RER";
  const { opacity, transparent } = useFadeLogic("RER", activeFeature);
  
  const rerLayers = useMemo(() => {
    const layers = [];
    // Concentrate RER in the negative X space (The "Tail" of the ovoid)
    for (let i = 0; i < 7; i++) {
       layers.push({
           radius: 3.5 + i * 0.5,
           tube: 0.2, 
           rot: [Math.random() * 0.5, Math.random() * 3, Math.random() * 0.5],
           // Shift position towards negative X to fill the ovoid shape
           pos: [-2.5 + (Math.random() * 1), (Math.random()-0.5), (Math.random()-0.5)]
       });
    }
    // Specific filler shapes for the elongated tail
    layers.push(
        { radius: 6.0, tube: 0.3, rot: [0, 1.6, 0.2], pos: [-2.0, 0, 0] },
        { radius: 5.0, tube: 0.25, rot: [0.2, 1.4, -0.2], pos: [-4.0, 0.5, 0] },
        { radius: 4.5, tube: 0.25, rot: [-0.2, 1.8, 0.1], pos: [-5.0, -0.5, 0.5] },
        { radius: 5.5, tube: 0.3, rot: [1.5, 0.2, 0], pos: [-3.5, 0, 0] },
        { radius: 4.0, tube: 0.2, rot: [1.8, 0.5, 0], pos: [-6.0, 1.0, -1.0] }
    );
    return layers;
  }, []);

  useFrame(({ clock }) => {
     if (groupRef.current) {
         const t = clock.getElapsedTime();
         groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.03;
     }
  });

  return (
    <group ref={groupRef} {...handlers}>
      {rerLayers.map((layer, i) => (
        <mesh 
          key={i} 
          position={layer.pos as [number, number, number]} 
          rotation={layer.rot as [number, number, number]}
          castShadow 
          receiveShadow
        >
          <torusGeometry args={[layer.radius, layer.tube, 20, 100, Math.PI * 1.8]} />
          <meshStandardMaterial 
            color={COLORS.RER} 
            emissive={hovered && !activeFeature ? '#003333' : '#000000'}
            roughness={0.5}
            bumpMap={ribosomeTexture}
            bumpScale={0.15} 
            transparent={transparent}
            opacity={opacity}
          />
        </mesh>
      ))}
      {isSelected && <OrganelleLabel text="Rough ER (Factory Floor)" position={[-5, 5, 0]} />}
    </group>
  );
};

// --- Mitochondria ---
export const Mitochondria: React.FC<OrganelleProps> = ({ onSelect, activeFeature }) => {
  const count = 35;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { hovered, handlers } = useInteraction("Mitochondria", onSelect);
  const isSelected = activeFeature === "Mitochondria";
  const { opacity, transparent } = useFadeLogic("Mitochondria", activeFeature);
  
  const instances = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
        // Scatter in elongated volume (x from -8 to +6)
        const x = (Math.random() - 0.7) * 12; // Bias towards negative x
        const y = (Math.random() - 0.5) * 6;
        const z = (Math.random() - 0.5) * 6;
        
        // Simple bounding check
        if (Math.sqrt(y*y + z*z) < 6) {
           temp.push({ 
               position: [x, y, z], 
               rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
               scale: 0.8 + Math.random() * 0.4 
           });
        }
    }
    return temp;
  }, []);

  useLayoutEffect(() => {
      if (!meshRef.current) return;
      const tempObj = new THREE.Object3D();
      instances.forEach((data, i) => {
          tempObj.position.set(data.position[0], data.position[1], data.position[2]);
          tempObj.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
          tempObj.scale.setScalar(data.scale);
          tempObj.updateMatrix();
          meshRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
  }, [instances]);

  return (
    <group {...handlers}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
          <capsuleGeometry args={[0.2, 0.8, 4, 8]} />
          <meshStandardMaterial 
            color={COLORS.MITOCHONDRIA} 
            emissive={hovered && !activeFeature ? '#401010' : '#000000'}
            roughness={0.4} 
            transparent={transparent}
            opacity={opacity}
          />
      </instancedMesh>
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
