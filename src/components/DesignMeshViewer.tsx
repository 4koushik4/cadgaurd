import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface DesignMeshViewerProps {
  meshUrl: string;
}

export function DesignMeshViewer({ meshUrl }: DesignMeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const cameraDistanceRef = useRef(150);
  const autoRotateRef = useRef(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const mount = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 5000);
    camera.position.set(120, 90, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xe2f2ff, 1.1);
    keyLight.position.set(140, 180, 60);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x60a5fa, 0.7, 800);
    fillLight.position.set(-120, 60, -80);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(600, 60, 0x1e3a8a, 0x1f2937);
    scene.add(grid);
    gridRef.current = grid;

    const loader = new STLLoader();
    loader.load(
      meshUrl,
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.35,
          metalness: 0.15,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshRef.current = mesh;

        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        cameraDistanceRef.current = maxDim * 1.4;

        camera.position.set(cameraDistanceRef.current, maxDim * 1.2, cameraDistanceRef.current);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      () => {
        // Keep viewer alive even if mesh fails to load.
      }
    );

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', onResize);

    let active = true;
    const animate = () => {
      if (!active) return;
      requestAnimationFrame(animate);

      if (autoRotateRef.current && meshRef.current) {
        meshRef.current.rotation.y += 0.01;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      active = false;
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      meshRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      gridRef.current = null;
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [meshUrl]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.wireframe = wireframe;
      material.needsUpdate = true;
    }
  }, [wireframe]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  const setPresetView = (preset: 'iso' | 'top' | 'front') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const d = cameraDistanceRef.current;
    if (!camera || !controls) return;

    if (preset === 'top') {
      camera.position.set(0, d * 1.5, 0.01);
    } else if (preset === 'front') {
      camera.position.set(0, d * 0.35, d * 1.5);
    } else {
      camera.position.set(d, d * 0.8, d);
    }
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className={`px-3 py-1.5 rounded border text-xs transition ${
            autoRotate
              ? 'border-cyan-400/60 text-cyan-100 bg-cyan-500/10'
              : 'border-slate-700 text-slate-300 hover:border-cyan-400/40'
          }`}
        >
          360 Auto Rotate
        </button>
        <button
          onClick={() => setWireframe((v) => !v)}
          className={`px-3 py-1.5 rounded border text-xs transition ${
            wireframe
              ? 'border-cyan-400/60 text-cyan-100 bg-cyan-500/10'
              : 'border-slate-700 text-slate-300 hover:border-cyan-400/40'
          }`}
        >
          Wireframe
        </button>
        <button
          onClick={() => setShowGrid((v) => !v)}
          className={`px-3 py-1.5 rounded border text-xs transition ${
            showGrid
              ? 'border-cyan-400/60 text-cyan-100 bg-cyan-500/10'
              : 'border-slate-700 text-slate-300 hover:border-cyan-400/40'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setPresetView('iso')}
          className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 text-xs hover:border-cyan-400/40"
        >
          Isometric
        </button>
        <button
          onClick={() => setPresetView('top')}
          className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 text-xs hover:border-cyan-400/40"
        >
          Top
        </button>
        <button
          onClick={() => setPresetView('front')}
          className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 text-xs hover:border-cyan-400/40"
        >
          Front
        </button>
      </div>
      <div ref={containerRef} className="h-96 w-full rounded-lg border border-slate-700 bg-slate-950/80" />
    </div>
  );
}
