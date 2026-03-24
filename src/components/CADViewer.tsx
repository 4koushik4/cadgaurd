import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Maximize2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface CADViewerProps {
  fileUrl: string;
  fileFormat: string;
}

export function CADViewer({ fileUrl, fileFormat }: CADViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    camera.position.y = 2;
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const geometry = new THREE.BoxGeometry(2, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x2563eb,
      shininess: 100,
      specular: 0x444444,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    const animate = () => {
      requestAnimationFrame(animate);
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [fileUrl]);

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
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <Maximize2 className="w-5 h-5" />
          <p className="text-sm">
            <strong>3D Viewer:</strong> Viewing {fileFormat.toUpperCase()} model.
            In production, this would load actual CAD geometry from the file.
          </p>
        </div>
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

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Model:</span> {fileFormat.toUpperCase()} format
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Viewer Controls</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 p-2 rounded">
              <RotateCw className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-slate-700">Auto-rotate enabled</span>
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
      </div>
    </div>
  );
}
