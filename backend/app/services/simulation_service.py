from __future__ import annotations

import numpy as np
import trimesh
from scipy.stats import zscore

from app.schemas.models import GeometryStats, SimulationResult, StressPoint, StressWeakRegion


class SimulationService:
    MATERIAL_YIELD_STRENGTH_MPA = {
        "aluminum_6061": 276.0,
        "steel_a36": 250.0,
        "titanium_ti6al4v": 880.0,
        "abs": 40.0,
        "pla": 60.0,
    }

    def run_simulation(
        self,
        mesh: trimesh.Trimesh,
        geometry: GeometryStats,
        material: str = "aluminum_6061",
    ) -> SimulationResult:
        centroids = mesh.triangles_center
        normals = mesh.face_normals
        areas = mesh.area_faces

        bbox_min = np.array(geometry.bounding_box_min)
        bbox_max = np.array(geometry.bounding_box_max)
        load_point = (bbox_min + bbox_max) / 2
        load_point[2] = bbox_max[2]

        distance = np.linalg.norm(centroids - load_point, axis=1)
        distance_factor = 1.0 / np.maximum(distance, 1e-6)

        normal_factor = np.abs(normals[:, 2]) + 0.2
        area_factor = 1.0 / np.maximum(np.sqrt(areas), 1e-6)

        thinness_factor = max(1.0, 2.0 / max(geometry.estimated_wall_thickness_mm, 1e-6))
        watertight_penalty = 1.2 if not geometry.is_watertight else 1.0

        stress = distance_factor * normal_factor * area_factor * thinness_factor * watertight_penalty
        stress = stress / np.max(stress)

        selected_material = material if material in self.MATERIAL_YIELD_STRENGTH_MPA else "aluminum_6061"
        yield_strength = self.MATERIAL_YIELD_STRENGTH_MPA[selected_material]
        stress_mpa = stress * yield_strength

        max_stress = float(np.max(stress_mpa))
        avg_stress = float(np.mean(stress_mpa))

        z = zscore(stress_mpa)
        if np.isnan(z).all():
            z = np.zeros_like(stress_mpa)

        weak_indices = np.where(z > 1.5)[0]
        top_indices = weak_indices[np.argsort(stress_mpa[weak_indices])[-8:]] if weak_indices.size else np.array([], dtype=int)

        weak_regions = [
            StressWeakRegion(face_index=int(idx), risk_score=float(stress_mpa[idx]))
            for idx in top_indices[::-1]
        ]

        stress_map_indices = np.linspace(0, len(centroids) - 1, num=min(2000, len(centroids)), dtype=int)
        stress_map = [
            StressPoint(
                x=float(centroids[idx][0]),
                y=float(centroids[idx][1]),
                z=float(centroids[idx][2]),
                stress=float(np.clip(stress[idx], 0.0, 1.0)),
            )
            for idx in stress_map_indices
        ]

        if max_stress >= 200:
            risk_level = "high"
        elif max_stress >= 120:
            risk_level = "medium"
        else:
            risk_level = "low"

        summary = (
            f"Digital twin approximation indicates {risk_level} risk for {selected_material}. "
            f"Peak stress {max_stress:.2f} MPa, mean stress {avg_stress:.2f} MPa, "
            f"with {len(weak_regions)} local weak regions."
        )

        return SimulationResult(
            material=selected_material,
            max_stress=max_stress,
            avg_stress=avg_stress,
            risk_level=risk_level,
            weak_regions=weak_regions,
            stress_map=stress_map,
            digital_twin_summary=summary,
        )
