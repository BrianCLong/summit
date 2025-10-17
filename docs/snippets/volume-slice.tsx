import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type VolumeSliceProps = {
  texture: THREE.DataTexture3D;
  planeZ: number;
};

export function VolumeSlice({ texture, planeZ }: VolumeSliceProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        tex3D: { value: texture },
        sliceZ: { value: planeZ }
      },
      vertexShader:
        'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler3D tex3D;
        uniform float sliceZ;
        void main() {
          vec3 samplePos = vec3(vUv, sliceZ);
          vec4 voxel = texture(tex3D, samplePos);
          float uncertainty = voxel.a;
          gl_FragColor = vec4(voxel.rgb, 1.0 - uncertainty);
        }
      `,
      transparent: true
    });
  }, [texture, planeZ]);

  useFrame(() => {
    material.uniforms.sliceZ.value = planeZ;
  });

  return (
    <mesh>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
