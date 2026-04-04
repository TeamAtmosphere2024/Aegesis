"""
core/geospatial.py
Haversine distance calculator — the geospatial backbone of Aegesis.
"""
from math import radians, sin, cos, sqrt, atan2


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS coordinates.

    Parameters
    ----------
    lat1, lon1 : origin  (rider GPS ping)
    lat2, lon2 : target  (trigger epicenter)

    Returns
    -------
    float — distance in kilometres
    """
    R = 6371.0  # Earth radius km
    φ1, φ2    = radians(lat1), radians(lat2)
    Δφ        = radians(lat2 - lat1)
    Δλ        = radians(lon2 - lon1)

    a = sin(Δφ / 2) ** 2 + cos(φ1) * cos(φ2) * sin(Δλ / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c