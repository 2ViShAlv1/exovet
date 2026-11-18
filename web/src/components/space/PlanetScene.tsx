import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { scene as tokens } from "../../design/tokens";

/**
 * The WebGL hero planet. Loaded lazily (see PlanetHero) so three.js never blocks the first paint.
 *  - surface: procedural fbm bands + storms in a fragment shader, lit by one "sun" direction
 *  - atmosphere: a slightly larger back-face sphere with a fresnel glow, additive blending
 *  - ring: a flat annulus with procedural bands; moon: a small lit sphere on a tilted orbit
 */

const LIGHT_DIRECTION = new THREE.Vector3(-0.8, 0.45, 0.6).normalize();
const PLANET_RADIUS = 1;
const ATMOSPHERE_SCALE = 1.12;
const RING_INNER = 1.45;
const RING_OUTER = 2.2;
const RING_TILT = new THREE.Euler(1.22, 0.18, 0.32);
const MOON_RADIUS = 0.11;
const MOON_ORBIT = 2.75;
// Far enough that the ring (outer radius 2.2) and the moon's orbit fit inside the square canvas
const CAMERA_DISTANCE = 7.4;
const CAMERA_FOV = 38;

// --- GLSL ------------------------------------------------------------------------------------------
const NOISE = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      amplitude *= 0.5;
    }
    return value;
  }
`;

const surfaceVertex = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormalWorld;
  varying vec3 vViewDirection;
  void main() {
    vPosition = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vViewDirection = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLight;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uLight2;
  uniform vec3 uSand;
  uniform vec3 uAtmosphere;
  varying vec3 vPosition;
  varying vec3 vNormalWorld;
  varying vec3 vViewDirection;
  ${NOISE}
  void main() {
    vec3 p = normalize(vPosition);
    // Turbulent latitude bands, like a gas giant with slow-moving storms
    float warp = fbm(p * 2.4 + vec3(uTime * 0.015, 0.0, uTime * 0.01));
    float bands = sin((p.y + warp * 0.45) * 13.0) * 0.5 + 0.5;
    float detail = fbm(p * 7.0 + warp);
    vec3 color = mix(uDeep, uMid, smoothstep(0.15, 0.85, bands));
    color = mix(color, uLight2, smoothstep(0.62, 0.95, detail) * 0.55);
    // A few warm storm patches
    float storm = smoothstep(0.66, 0.78, fbm(p * 3.2 + vec3(5.0, uTime * 0.02, 2.0)));
    color = mix(color, uSand, storm * 0.6);

    // Soft terminator lighting
    float light = dot(normalize(vNormalWorld), uLight);
    float diffuse = smoothstep(-0.25, 0.9, light);
    color *= 0.08 + 0.95 * diffuse;

    // Thin atmospheric rim on the lit side
    float fresnel = pow(1.0 - max(dot(normalize(vNormalWorld), vViewDirection), 0.0), 3.0);
    color += uAtmosphere * fresnel * (0.25 + 0.75 * max(light + 0.3, 0.0)) * 0.9;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vNormalWorld;
  void main() {
    vNormalView = normalize(normalMatrix * normal);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  varying vec3 vNormalView;
  varying vec3 vNormalWorld;
  void main() {
    float intensity = pow(0.72 - dot(vNormalView, vec3(0.0, 0.0, 1.0)), 4.0);
    float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.6, dot(vNormalWorld, uLight));
    gl_FragColor = vec4(uColor, 1.0) * intensity * lit * 1.6;
  }
`;

const ringVertex = /* glsl */ `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uInner;
  uniform float uOuter;
  varying vec3 vPosition;
  void main() {
    float r = (length(vPosition.xy) - uInner) / (uOuter - uInner); // 0 inner .. 1 outer
    float bands = 0.55 + 0.45 * sin(r * 70.0) * sin(r * 23.0 + 1.3);
    float edge = smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.82, r);
    float gap = 1.0 - 0.85 * smoothstep(0.015, 0.0, abs(r - 0.62)); // a thin Cassini-like gap
    float alpha = edge * bands * gap * 0.42;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// --- Scene objects ---------------------------------------------------------------------------------
interface SceneProps {
  animate: boolean;
}

function Planet({ animate }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);

  const surfaceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLight: { value: LIGHT_DIRECTION },
      uDeep: { value: new THREE.Color(tokens.planet.deep) },
      uMid: { value: new THREE.Color(tokens.planet.mid) },
      uLight2: { value: new THREE.Color(tokens.planet.light) },
      uSand: { value: new THREE.Color(tokens.planet.sand) },
      uAtmosphere: { value: new THREE.Color(tokens.planet.atmosphere) },
    }),
    [],
  );
  const atmosphereUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(tokens.planet.atmosphere) }, uLight: { value: LIGHT_DIRECTION } }),
    [],
  );
  const ringUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(tokens.planet.ring) }, uInner: { value: RING_INNER }, uOuter: { value: RING_OUTER } }),
    [],
  );

  useFrame((state, delta) => {
    if (!animate) return;
    surfaceUniforms.uTime.value += delta;
    if (planet.current) planet.current.rotation.y += delta * tokens.planetRotationSpeed * 2;
    if (moon.current) {
      const t = state.clock.elapsedTime * tokens.moonOrbitSpeed;
      moon.current.position.set(Math.cos(t) * MOON_ORBIT, Math.sin(t) * 0.55, Math.sin(t) * MOON_ORBIT * 0.55);
    }
    // Parallax tilt toward the pointer, eased
    if (group.current) {
      const targetX = -state.pointer.y * tokens.tiltStrength;
      const targetY = state.pointer.x * tokens.tiltStrength;
      group.current.rotation.x += (targetX - group.current.rotation.x) * Math.min(1, delta * 2.5);
      group.current.rotation.y += (targetY - group.current.rotation.y) * Math.min(1, delta * 2.5);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={planet}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 96]} />
        <shaderMaterial vertexShader={surfaceVertex} fragmentShader={surfaceFragment} uniforms={surfaceUniforms} />
      </mesh>
      <mesh scale={ATMOSPHERE_SCALE}>
        <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={atmosphereUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={RING_TILT}>
        <ringGeometry args={[RING_INNER, RING_OUTER, 160, 1]} />
        <shaderMaterial
          vertexShader={ringVertex}
          fragmentShader={ringFragment}
          uniforms={ringUniforms}
          side={THREE.DoubleSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh ref={moon} position={[MOON_ORBIT, 0.3, 0.8]}>
        <sphereGeometry args={[MOON_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#BFC6D6" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

interface PlanetSceneProps {
  /** false → render a still frame and stop (reduced motion, hidden tab, off-screen) */
  animate: boolean;
  running: boolean;
}

export default function PlanetScene({ animate, running }: PlanetSceneProps) {
  return (
    <Canvas
      dpr={[1, tokens.maxPixelRatio]}
      camera={{ position: [0, 0.15, CAMERA_DISTANCE], fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={running ? "always" : "demand"}
      aria-hidden="true"
    >
      <PerformanceMonitor>
        <AdaptiveDpr pixelated={false} />
      </PerformanceMonitor>
      <ambientLight intensity={0.08} />
      <directionalLight position={LIGHT_DIRECTION.clone().multiplyScalar(10)} intensity={2.2} />
      <Planet animate={animate && running} />
    </Canvas>
  );
}
