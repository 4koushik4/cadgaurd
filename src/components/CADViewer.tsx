import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, RotateCw, ZoomIn, ZoomOut, Orbit, Sparkles } from 'lucide-react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface CADViewerProps {
  fileUrl: string;
  fileFormat: string;
  issues?: Array<{
    id: string;
    title: string;
    severity: string;
    location?: Record<string, unknown>;
  }>;
  stressMap?: Array<{ x: number; y: number; z: number; stress: number }>;
}

export function CADViewer({ fileUrl, fileFormat, issues = [], stressMap = [] }: CADViewerProps) {
  const [loadStatus, setLoadStatus] = useState('Loading CAD geometry...');
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe'>('solid');
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState<{
    issueId: string;
    title: string;
    severity: string;
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const clippingPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000));
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const stressGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const mountNode = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b14);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    camera.position.y = 2;
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    mountNode.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const ambientLight = new THREE.AmbientLight(0xaad8ff, 0.45);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xe6f8ff, 1.25);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const magentaFill = new THREE.PointLight(0xff4dd2, 1.2, 25);
    magentaFill.position.set(-6, 3, -4);
    scene.add(magentaFill);

    const gridHelper = new THREE.GridHelper(10, 10, 0x24445a, 0x102030);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    const fitCameraToObject = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.5;

      camera.position.set(center.x + cameraDistance * 0.7, center.y + cameraDistance * 0.5, center.z + cameraDistance);
      camera.near = Math.max(0.1, cameraDistance / 100);
      camera.far = cameraDistance * 20;
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    };

    const applyMeshMaterial = (mesh: THREE.Mesh, color: number) => {
      mesh.material = new THREE.MeshPhongMaterial({
        color,
        shininess: 70,
        specular: 0x333333,
        clippingPlanes: [clippingPlaneRef.current],
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    };

    const normalizedFormat = fileFormat.toLowerCase();
    if (normalizedFormat === 'stl') {
      const loader = new STLLoader();
      loader.load(
        fileUrl,
        (geometry) => {
          geometry.computeVertexNormals();
          geometry.center();
          const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());
          applyMeshMaterial(mesh, 0x2563eb);
          modelGroup.add(mesh);
          meshRef.current = mesh;
          fitCameraToObject(modelGroup);
          setLoadStatus('STL model loaded');
        },
        undefined,
        () => {
          setLoadStatus('Could not load STL model. Showing placeholder geometry.');
        }
      );
    } else if (normalizedFormat === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        fileUrl,
        (object) => {
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              applyMeshMaterial(child, 0x2563eb);
            }
          });
          modelGroup.add(object);
          fitCameraToObject(modelGroup);
          setLoadStatus('OBJ model loaded');
        },
        undefined,
        () => {
          setLoadStatus('Could not load OBJ model. Showing placeholder geometry.');
        }
      );
    } else {
      const geometry = new THREE.BoxGeometry(2, 1, 1);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());
      applyMeshMaterial(mesh, 0x2563eb);
      modelGroup.add(mesh);
      meshRef.current = mesh;
      fitCameraToObject(modelGroup);
      setLoadStatus('STEP/STP preview uses fallback mesh in browser. Validation rules still run server-side.');
    }

    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    markerGroupRef.current = markerGroup;

    const stressGroup = new THREE.Group();
    scene.add(stressGroup);
    stressGroupRef.current = stressGroup;

    const animate = () => {
      requestAnimationFrame(animate);
      if (meshRef.current) {
        if (autoRotate) {
          meshRef.current.rotation.y += 0.0025;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current || !markerGroupRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);

      const intersects = raycaster.intersectObjects(markerGroupRef.current.children, false);
      if (intersects.length === 0) {
        setSelectedAnnotation(null);
        return;
      }

      const hit = intersects[0];
      const issue = hit.object.userData.issue as { id: string; title: string; severity: string } | undefined;
      if (!issue) return;

      setSelectedAnnotation({
        issueId: issue.id,
        title: issue.title,
        severity: issue.severity,
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z,
      });
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const handleResize = () => {
      if (!mountNode || !camera || !renderer) return;
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      pmrem.dispose();
      if (mountNode && renderer.domElement.parentNode === mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [fileUrl, fileFormat, autoRotate]);

  useEffect(() => {
    if (!modelGroupRef.current) return;

    modelGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
        child.material.wireframe = renderMode === 'wireframe';
        child.material.needsUpdate = true;
      }
    });
  }, [renderMode]);

  useEffect(() => {
    if (!markerGroupRef.current) return;

    markerGroupRef.current.clear();

    issues.slice(0, 12).forEach((issue, index) => {
      const location = issue.location || {};
      const x = Number(location.x || ((index % 4) - 1.5) * 0.6);
      const y = Number(location.y || 0.35 + ((index % 3) * 0.2));
      const z = Number(location.z || (Math.floor(index / 4) - 1) * 0.8);

      const color =
        issue.severity === 'critical'
          ? 0xdc2626
          : issue.severity === 'high'
            ? 0xea580c
            : issue.severity === 'medium'
              ? 0xca8a04
              : 0x0284c7;

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 18, 18),
        new THREE.MeshBasicMaterial({ color })
      );
      sphere.position.set(x, y, z);
      sphere.userData.issue = {
        id: issue.id,
        title: issue.title,
        severity: issue.severity,
      };
      markerGroupRef.current?.add(sphere);
    });
  }, [issues]);

  useEffect(() => {
    if (!stressGroupRef.current) return;

    stressGroupRef.current.clear();

    stressMap.slice(0, 3000).forEach((point, index) => {
      const color = new THREE.Color();
      color.setHSL((1 - Math.max(0, Math.min(1, point.stress))) * 0.66, 1, 0.5);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + point.stress * 0.06, 10, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.45 + point.stress * 0.45,
        })
      );

      const scatterOffset = (index % 3) * 0.005;
      mesh.position.set(point.x + scatterOffset, point.y, point.z);
      stressGroupRef.current?.add(mesh);
    });
  }, [stressMap]);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.max(1, cameraRef.current.position.z - 1);
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.min(20, cameraRef.current.position.z + 1);
    }
  };

  const handleReset = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 2, 5);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    clippingPlaneRef.current.constant = 1000;
  };

  const handleSectionView = (value: string) => {
    clippingPlaneRef.current.constant = Number(value);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <Maximize2 className="w-5 h-5" />
          <p className="text-sm">
            <strong>3D Viewer:</strong> Viewing {fileFormat.toUpperCase()} model.
          </p>
        </div>
        <p className="text-xs text-blue-700 mt-2">{loadStatus}</p>
        <p className="text-xs text-blue-700 mt-1">
          Stress map points: {stressMap.length}. Color scale blue (low) to red (high).
        </p>
      </div>

      <div className="relative bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: '600px' }}
        />

        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button
            onClick={handleZoomIn}
            className="bg-white hover:bg-slate-100 p-3 rounded-lg shadow-lg border border-slate-200 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white hover:bg-slate-100 p-3 rounded-lg shadow-lg border border-slate-200 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={handleReset}
            className="bg-white hover:bg-slate-100 p-3 rounded-lg shadow-lg border border-slate-200 transition"
            title="Reset View"
          >
            <RotateCw className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="absolute right-4 bottom-4 bg-slate-900/80 text-slate-100 px-3 py-3 rounded-lg border border-cyan-400/25 shadow-xl w-56">
          <p className="text-xs font-semibold mb-2 text-cyan-200">Render Controls</p>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Mode</span>
            <button
              onClick={() => setRenderMode(renderMode === 'solid' ? 'wireframe' : 'solid')}
              className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-300/40"
            >
              {renderMode === 'solid' ? 'Solid' : 'Wireframe'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1"><Orbit className="w-3 h-3" /> Auto Rotate</span>
            <button
              onClick={() => setAutoRotate((v) => !v)}
              className="px-2 py-1 rounded bg-fuchsia-500/20 border border-fuchsia-300/40"
            >
              {autoRotate ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-slate-200 w-64">
          <p className="text-xs font-semibold text-slate-800 mb-2">Section View</p>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.1"
            defaultValue="3"
            onChange={(e) => handleSectionView(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-slate-600 mt-1">Drag to clip model and inspect interior regions.</p>
        </div>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Model:</span> {fileFormat.toUpperCase()} format
          </p>
        </div>

        {selectedAnnotation && (
          <div className="absolute left-4 top-24 w-72 bg-slate-950/90 border border-cyan-400/35 text-slate-100 rounded-lg p-3 shadow-2xl backdrop-blur-xl">
            <p className="text-xs uppercase tracking-wide text-cyan-300 mb-1">3D Annotation</p>
            <p className="text-sm font-semibold mb-1">{selectedAnnotation.title}</p>
            <p className="text-xs text-slate-300 mb-2">Severity: {selectedAnnotation.severity}</p>
            <p className="text-xs text-slate-400">
              Location: X {selectedAnnotation.x.toFixed(2)}, Y {selectedAnnotation.y.toFixed(2)}, Z {selectedAnnotation.z.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Viewer Controls</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 p-2 rounded">
              <RotateCw className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-slate-700">Drag to rotate model</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 p-2 rounded">
              <ZoomIn className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-slate-700">Use buttons to zoom</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-purple-100 p-2 rounded">
              <Maximize2 className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-slate-700">Reset to default view</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          Issue markers shown: {issues.length}. Critical and high-risk regions are color-coded directly on the model.
        </p>
      </div>
    </div>
  );
}
