import React from 'react';

const Lights: React.FC = () => {
  return (
    <group>
      {/* Key Light: Warm, strong, from top-left */}
      <spotLight
        position={[-10, 10, 10]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
        color="#fff5e6" // Warm white
      />
      
      {/* Fill Light: Soft, from front */}
      <pointLight position={[0, 0, 10]} intensity={0.5} color="#ffffff" />
      
      {/* Rim Light: Teal, from back-right to accentuate the membrane edge */}
      <spotLight
        position={[10, -5, -10]}
        angle={0.5}
        penumbra={1}
        intensity={3}
        color="#40E0D0" // Teal
      />
      
      {/* Ambient base */}
      <ambientLight intensity={0.2} />
    </group>
  );
};

export default Lights;