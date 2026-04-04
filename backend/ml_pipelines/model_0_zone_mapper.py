"""
ml_pipelines/model_0_zone_mapper.py
Classifies a rider's GPS location into the closest Dark Store Hub.
"""
import logging
from typing import Optional

from core.geospatial import haversine
from database.models import DarkStore

logger = logging.getLogger(__name__)

def predict_dark_store(lat: float, lon: float, active_stores: list[DarkStore]) -> Optional[DarkStore]:
    """
    Given a rider's current latitude and longitude, finds the closest active Dark Store Hub
    within its serving radius using the Haversine formula.

    Returns the closest DarkStore object or None if outside all radii.
    """
    if not active_stores:
        return None

    closest_store = None
    min_distance = float('inf')

    for store in active_stores:
        distance_km = haversine(lat, lon, store.lat, store.lon)
        if distance_km < min_distance:
            closest_store = store
            min_distance = distance_km

    if closest_store:
        logger.info(f"Mapped coordinates {lat}, {lon} to {closest_store.name} (Dist: {min_distance:.2f}km)")

    return closest_store
