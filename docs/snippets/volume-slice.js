"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeSlice = VolumeSlice;
const react_1 = require("react");
const fiber_1 = require("@react-three/fiber");
const THREE = __importStar(require("three"));
function VolumeSlice({ texture, planeZ }) {
    const material = (0, react_1.useMemo)(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                tex3D: { value: texture },
                sliceZ: { value: planeZ }
            },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
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
    (0, fiber_1.useFrame)(() => {
        material.uniforms.sliceZ.value = planeZ;
    });
    return (<mesh>
      <planeGeometry args={[1, 1]}/>
      <primitive object={material} attach="material"/>
    </mesh>);
}
