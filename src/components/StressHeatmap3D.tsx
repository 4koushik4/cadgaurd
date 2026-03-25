import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface StressPoint {
  x: number;
  y: number;
  z: number;
  stress: number;
}

interface StressHeatmap3DProps {
  points: StressPoint[];
}

export function StressHeatmap3D({ points }: StressHeatmap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const mountNode = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a14);

    const camera = new THREE.PerspectiveCamera(65, mountNode.clientWidth / mountNode.clientHeight, 0.1, 1500);
    camera.position.set(2.5, 2.2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(3, 5, 4);
    scene.add(light);

    const axes = new THREE.AxesHelper(1.8);
    scene.add(axes);

    const group = new THREE.Group();
    scene.add(group);

    if (points.length > 0) {
      points.slice(0, 3500).forEach((point) => {
        const color = new THREE.Color();
        color.setHSL((1 - point.stress) * 0.66, 1, 0.5);
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.015 + point.stress * 0.05, 8, 8),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.5 + point.stress * 0.45,
          })
        );
        marker.position.set(point.x, point.y, point.z);
        group.add(marker);
      });

      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      camera.position.set(center.x + maxDim * 1.6, center.y + maxDim * 1.1, center.z + maxDim * 1.7);
      controls.target.copy(center);
      controls.update();
    }

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      controls.dispose();
      if (renderer.domElement.parentNode === mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [points]);

  return <div ref={containerRef} className="w-full h-[360px] rounded-lg overflow-hidden border border-cyan-400/20" />;
}
