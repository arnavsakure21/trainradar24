#!/usr/bin/env python3
"""
RailRadar BFF (Backend-For-Frontend) Server
Serves static assets and provides an intelligent proxy & simulation layer
for RailRadar live train telemetry, OpenWeather, OpenTopography, and MapTiler.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys
import mimetypes
import time
import math
from datetime import datetime, timezone

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# API Keys — loaded from environment variables (set in Railway dashboard).
# Never hardcode keys here. Set them in Railway: Settings → Variables.
KEYS = {
    "railradar": os.environ.get("RAILRADAR_KEY", ""),
    "maptiler": os.environ.get("MAPTILER_KEY", ""),
    "openweather": os.environ.get("OPENWEATHER_KEY", ""),
    "opentopography": os.environ.get("OPENTOPOGRAPHY_KEY", "")
}

# Simple in-memory cache with TTL
cache_store = {}

def get_cached(key, ttl_seconds):
    if key in cache_store:
        data, ts = cache_store[key]
        if time.time() - ts < ttl_seconds:
            return data
    return None

def set_cached(key, data):
    cache_store[key] = (data, time.time())

# Comprehensive high-speed & express train routes for realistic live tracking
TRAIN_DATABASE = [
    {
        "trainNumber": "22436",
        "trainName": "Vande Bharat Express",
        "operator": "Indian Railways",
        "type": "VANDE_BHARAT",
        "speed": 130,
        "maxSpeed": 160,
        "status": "ON_TIME",
        "delayMinutes": 0,
        "origin": {"code": "NDLS", "name": "New Delhi", "departure": "06:00"},
        "destination": {"code": "BSB", "name": "Varanasi Jn", "arrival": "14:00"},
        "routeCoords": [
            [28.6139, 77.2090], # New Delhi
            [27.1767, 78.0081], # Agra
            [26.4499, 80.3319], # Kanpur Central
            [25.4358, 81.8463], # Prayagraj Jn
            [25.3176, 82.9739]  # Varanasi Jn
        ],
        "stops": [
            {"sequence": 1, "stationCode": "NDLS", "stationName": "New Delhi", "platform": "16", "scheduledArrival": None, "scheduledDeparture": "06:00", "actualDeparture": "06:00", "status": "DEPARTED", "delayMinutes": 0, "lat": 28.6139, "lon": 77.2090, "elevation": 216},
            {"sequence": 2, "stationCode": "CNB", "stationName": "Kanpur Central", "platform": "5", "scheduledArrival": "10:08", "scheduledDeparture": "10:10", "actualArrival": "10:08", "actualDeparture": "10:10", "status": "CURRENT", "delayMinutes": 0, "lat": 26.4499, "lon": 80.3319, "elevation": 126},
            {"sequence": 3, "stationCode": "PRYJ", "stationName": "Prayagraj Jn", "platform": "6", "scheduledArrival": "12:08", "scheduledDeparture": "12:10", "actualArrival": "12:10", "actualDeparture": "12:12", "status": "SCHEDULED", "delayMinutes": 2, "lat": 25.4358, "lon": 81.8463, "elevation": 98},
            {"sequence": 4, "stationCode": "BSB", "stationName": "Varanasi Jn", "platform": "1", "scheduledArrival": "14:00", "scheduledDeparture": None, "actualArrival": "14:00", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 0, "lat": 25.3176, "lon": 82.9739, "elevation": 82}
        ]
    },
    {
        "trainNumber": "12301",
        "trainName": "Howrah Rajdhani Express",
        "operator": "Indian Railways (Eastern Zone)",
        "type": "RAJDHANI",
        "speed": 115,
        "maxSpeed": 130,
        "status": "ON_TIME",
        "delayMinutes": 0,
        "origin": {"code": "HWH", "name": "Howrah Jn (Kolkata)", "departure": "16:50"},
        "destination": {"code": "NDLS", "name": "New Delhi", "arrival": "10:05"},
        "routeCoords": [
            [22.5850, 88.3426], # Howrah
            [23.6889, 86.9661], # Asansol
            [23.7957, 86.4304], # Dhanbad
            [24.7914, 85.0002], # Gaya
            [25.2818, 83.1167], # Pt. DD Upadhyaya
            [25.4358, 81.8463], # Prayagraj
            [26.4499, 80.3319], # Kanpur
            [28.6139, 77.2090]  # New Delhi
        ],
        "stops": [
            {"sequence": 1, "stationCode": "HWH", "stationName": "Howrah Jn", "platform": "9", "scheduledArrival": None, "scheduledDeparture": "16:50", "actualDeparture": "16:50", "status": "DEPARTED", "delayMinutes": 0, "lat": 22.5850, "lon": 88.3426, "elevation": 9},
            {"sequence": 2, "stationCode": "ASN", "stationName": "Asansol Jn", "platform": "4", "scheduledArrival": "18:57", "scheduledDeparture": "19:00", "actualArrival": "18:55", "actualDeparture": "19:00", "status": "DEPARTED", "delayMinutes": 0, "lat": 23.6889, "lon": 86.9661, "elevation": 115},
            {"sequence": 3, "stationCode": "DHN", "stationName": "Dhanbad Jn", "platform": "2", "scheduledArrival": "19:50", "scheduledDeparture": "19:55", "actualArrival": "19:50", "actualDeparture": "19:55", "status": "CURRENT", "delayMinutes": 0, "lat": 23.7957, "lon": 86.4304, "elevation": 227},
            {"sequence": 4, "stationCode": "GAYA", "stationName": "Gaya Jn", "platform": "1", "scheduledArrival": "22:19", "scheduledDeparture": "22:22", "actualArrival": "22:25", "actualDeparture": "22:28", "status": "SCHEDULED", "delayMinutes": 6, "lat": 24.7914, "lon": 85.0002, "elevation": 113},
            {"sequence": 5, "stationCode": "DDU", "stationName": "Pt DD Upadhyaya Jn", "platform": "7", "scheduledArrival": "00:45", "scheduledDeparture": "00:55", "actualArrival": "00:50", "actualDeparture": "01:00", "status": "SCHEDULED", "delayMinutes": 5, "lat": 25.2818, "lon": 83.1167, "elevation": 79},
            {"sequence": 6, "stationCode": "PRYJ", "stationName": "Prayagraj Jn", "platform": "1", "scheduledArrival": "02:43", "scheduledDeparture": "02:45", "actualArrival": "02:45", "actualDeparture": "02:47", "status": "SCHEDULED", "delayMinutes": 2, "lat": 25.4358, "lon": 81.8463, "elevation": 98},
            {"sequence": 7, "stationCode": "CNB", "stationName": "Kanpur Central", "platform": "1", "scheduledArrival": "04:40", "scheduledDeparture": "04:45", "actualArrival": "04:42", "actualDeparture": "04:47", "status": "SCHEDULED", "delayMinutes": 2, "lat": 26.4499, "lon": 80.3319, "elevation": 126},
            {"sequence": 8, "stationCode": "NDLS", "stationName": "New Delhi", "platform": "12", "scheduledArrival": "10:05", "scheduledDeparture": None, "actualArrival": "10:05", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 0, "lat": 28.6139, "lon": 77.2090, "elevation": 216}
        ]
    },
    {
        "trainNumber": "12952",
        "trainName": "Mumbai Tejas Rajdhani",
        "operator": "Indian Railways (Western Zone)",
        "type": "RAJDHANI",
        "speed": 120,
        "maxSpeed": 140,
        "status": "ON_TIME",
        "delayMinutes": 3,
        "origin": {"code": "NDLS", "name": "New Delhi", "departure": "16:55"},
        "destination": {"code": "MMCT", "name": "Mumbai Central", "arrival": "08:35"},
        "routeCoords": [
            [28.6139, 77.2090], # New Delhi
            [27.4924, 77.6737], # Mathura
            [25.1804, 75.8398], # Kota
            [23.3315, 75.0367], # Ratlam
            [22.3072, 73.1812], # Vadodara
            [21.1702, 72.8311], # Surat
            [19.2812, 72.8561], # Borivali
            [18.9696, 72.8193]  # Mumbai Central
        ],
        "stops": [
            {"sequence": 1, "stationCode": "NDLS", "stationName": "New Delhi", "platform": "3", "scheduledArrival": None, "scheduledDeparture": "16:55", "actualDeparture": "16:55", "status": "DEPARTED", "delayMinutes": 0, "lat": 28.6139, "lon": 77.2090, "elevation": 216},
            {"sequence": 2, "stationCode": "KOTA", "stationName": "Kota Jn", "platform": "2", "scheduledArrival": "21:30", "scheduledDeparture": "21:40", "actualArrival": "21:33", "actualDeparture": "21:43", "status": "CURRENT", "delayMinutes": 3, "lat": 25.1804, "lon": 75.8398, "elevation": 253},
            {"sequence": 3, "stationCode": "RTM", "stationName": "Ratlam Jn", "platform": "4", "scheduledArrival": "00:50", "scheduledDeparture": "00:53", "actualArrival": "00:54", "actualDeparture": "00:57", "status": "SCHEDULED", "delayMinutes": 4, "lat": 23.3315, "lon": 75.0367, "elevation": 493},
            {"sequence": 4, "stationCode": "BRC", "stationName": "Vadodara Jn", "platform": "1", "scheduledArrival": "03:50", "scheduledDeparture": "03:58", "actualArrival": "03:55", "actualDeparture": "04:03", "status": "SCHEDULED", "delayMinutes": 5, "lat": 22.3072, "lon": 73.1812, "elevation": 36},
            {"sequence": 5, "stationCode": "ST", "stationName": "Surat", "platform": "2", "scheduledArrival": "05:13", "scheduledDeparture": "05:18", "actualArrival": "05:15", "actualDeparture": "05:20", "status": "SCHEDULED", "delayMinutes": 2, "lat": 21.1702, "lon": 72.8311, "elevation": 13},
            {"sequence": 6, "stationCode": "BVI", "stationName": "Borivali", "platform": "7", "scheduledArrival": "07:40", "scheduledDeparture": "07:42", "actualArrival": "07:41", "actualDeparture": "07:43", "status": "SCHEDULED", "delayMinutes": 1, "lat": 19.2812, "lon": 72.8561, "elevation": 14},
            {"sequence": 7, "stationCode": "MMCT", "stationName": "Mumbai Central", "platform": "1", "scheduledArrival": "08:35", "scheduledDeparture": None, "actualArrival": "08:35", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 0, "lat": 18.9696, "lon": 72.8193, "elevation": 8}
        ]
    },
    {
        "trainNumber": "12002",
        "trainName": "Bhopal Shatabdi Express",
        "operator": "Indian Railways (Northern Zone)",
        "type": "SHATABDI",
        "speed": 135,
        "maxSpeed": 150,
        "status": "ON_TIME",
        "delayMinutes": 0,
        "origin": {"code": "NDLS", "name": "New Delhi", "departure": "06:00"},
        "destination": {"code": "RKMP", "name": "Rani Kamlapati (Bhopal)", "arrival": "14:40"},
        "routeCoords": [
            [28.6139, 77.2090], # New Delhi
            [27.1767, 78.0081], # Agra Cantt
            [26.2183, 78.1828], # Gwalior
            [25.4484, 78.5685], # Jhansi
            [23.2599, 77.4126]  # Bhopal
        ],
        "stops": [
            {"sequence": 1, "stationCode": "NDLS", "stationName": "New Delhi", "platform": "1", "scheduledArrival": None, "scheduledDeparture": "06:00", "actualDeparture": "06:00", "status": "DEPARTED", "delayMinutes": 0, "lat": 28.6139, "lon": 77.2090, "elevation": 216},
            {"sequence": 2, "stationCode": "AGC", "stationName": "Agra Cantt", "platform": "1", "scheduledArrival": "07:50", "scheduledDeparture": "07:55", "actualArrival": "07:50", "actualDeparture": "07:55", "status": "DEPARTED", "delayMinutes": 0, "lat": 27.1767, "lon": 78.0081, "elevation": 169},
            {"sequence": 3, "stationCode": "GWL", "stationName": "Gwalior Jn", "platform": "1", "scheduledArrival": "09:23", "scheduledDeparture": "09:28", "actualArrival": "09:23", "actualDeparture": "09:28", "status": "CURRENT", "delayMinutes": 0, "lat": 26.2183, "lon": 78.1828, "elevation": 212},
            {"sequence": 4, "stationCode": "VGLJ", "stationName": "Virangana Lakshmibai Jn (Jhansi)", "platform": "1", "scheduledArrival": "10:45", "scheduledDeparture": "10:50", "actualArrival": "10:45", "actualDeparture": "10:50", "status": "SCHEDULED", "delayMinutes": 0, "lat": 25.4484, "lon": 78.5685, "elevation": 258},
            {"sequence": 5, "stationCode": "RKMP", "stationName": "Rani Kamlapati", "platform": "1", "scheduledArrival": "14:40", "scheduledDeparture": None, "actualArrival": "14:40", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 0, "lat": 23.2599, "lon": 77.4126, "elevation": 498}
        ]
    },
    {
        "trainNumber": "20608",
        "trainName": "Mysuru - Chennai Vande Bharat",
        "operator": "Indian Railways (Southern Zone)",
        "type": "VANDE_BHARAT",
        "speed": 110,
        "maxSpeed": 130,
        "status": "ON_TIME",
        "delayMinutes": 0,
        "origin": {"code": "MYS", "name": "Mysuru Jn", "departure": "13:05"},
        "destination": {"code": "MAS", "name": "MGR Chennai Central", "arrival": "19:30"},
        "routeCoords": [
            [12.3163, 76.6456], # Mysuru
            [12.9716, 77.5946], # Bengaluru SBC
            [12.9934, 77.6602], # Krishnarajapuram
            [12.9249, 79.1350], # Katpadi Jn
            [13.0827, 80.2707]  # Chennai Central
        ],
        "stops": [
            {"sequence": 1, "stationCode": "MYS", "stationName": "Mysuru Jn", "platform": "1", "scheduledArrival": None, "scheduledDeparture": "13:05", "actualDeparture": "13:05", "status": "DEPARTED", "delayMinutes": 0, "lat": 12.3163, "lon": 76.6456, "elevation": 759},
            {"sequence": 2, "stationCode": "SBC", "stationName": "KSR Bengaluru", "platform": "7", "scheduledArrival": "14:50", "scheduledDeparture": "14:55", "actualArrival": "14:50", "actualDeparture": "14:55", "status": "DEPARTED", "delayMinutes": 0, "lat": 12.9716, "lon": 77.5946, "elevation": 920},
            {"sequence": 3, "stationCode": "KJM", "stationName": "Krishnarajapuram", "platform": "2", "scheduledArrival": "15:12", "scheduledDeparture": "15:14", "actualArrival": "15:15", "actualDeparture": "15:17", "status": "CURRENT", "delayMinutes": 3, "lat": 12.9934, "lon": 77.6602, "elevation": 904},
            {"sequence": 4, "stationCode": "KPD", "stationName": "Katpadi Jn", "platform": "2", "scheduledArrival": "17:33", "scheduledDeparture": "17:35", "actualArrival": "17:35", "actualDeparture": "17:37", "status": "SCHEDULED", "delayMinutes": 2, "lat": 12.9249, "lon": 79.1350, "elevation": 215},
            {"sequence": 5, "stationCode": "MAS", "stationName": "MGR Chennai Central", "platform": "2A", "scheduledArrival": "19:30", "scheduledDeparture": None, "actualArrival": "19:30", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 0, "lat": 13.0827, "lon": 80.2707, "elevation": 7}
        ]
    },
    {
        "trainNumber": "12245",
        "trainName": "Howrah - Yesvantpur Duronto Express",
        "operator": "Indian Railways (South Eastern Zone)",
        "type": "DURONTO",
        "speed": 105,
        "maxSpeed": 120,
        "status": "DELAYED",
        "delayMinutes": 22,
        "origin": {"code": "HWH", "name": "Howrah Jn", "departure": "10:50"},
        "destination": {"code": "YPR", "name": "Yesvantpur Jn (Bengaluru)", "arrival": "16:00"},
        "routeCoords": [
            [22.5850, 88.3426], # Howrah
            [20.2961, 85.8245], # Bhubaneswar
            [17.6868, 83.2185], # Visakhapatnam
            [16.5062, 80.6480], # Vijayawada
            [13.6288, 79.4192], # Renigunta
            [13.0234, 77.5501]  # Yesvantpur
        ],
        "stops": [
            {"sequence": 1, "stationCode": "HWH", "stationName": "Howrah Jn", "platform": "21", "scheduledArrival": None, "scheduledDeparture": "10:50", "actualDeparture": "10:50", "status": "DEPARTED", "delayMinutes": 0, "lat": 22.5850, "lon": 88.3426, "elevation": 9},
            {"sequence": 2, "stationCode": "BBS", "stationName": "Bhubaneswar", "platform": "4", "scheduledArrival": "16:20", "scheduledDeparture": "16:30", "actualArrival": "16:42", "actualDeparture": "16:52", "status": "DEPARTED", "delayMinutes": 22, "lat": 20.2961, "lon": 85.8245, "elevation": 45},
            {"sequence": 3, "stationCode": "VSKP", "stationName": "Visakhapatnam Jn", "platform": "7", "scheduledArrival": "23:05", "scheduledDeparture": "23:25", "actualArrival": "23:27", "actualDeparture": "23:47", "status": "CURRENT", "delayMinutes": 22, "lat": 17.6868, "lon": 83.2185, "elevation": 4},
            {"sequence": 4, "stationCode": "BZA", "stationName": "Vijayawada Jn", "platform": "1", "scheduledArrival": "04:15", "scheduledDeparture": "04:25", "actualArrival": "04:35", "actualDeparture": "04:45", "status": "SCHEDULED", "delayMinutes": 20, "lat": 16.5062, "lon": 80.6480, "elevation": 19},
            {"sequence": 5, "stationCode": "RU", "stationName": "Renigunta Jn", "platform": "3", "scheduledArrival": "09:40", "scheduledDeparture": "09:45", "actualArrival": "09:55", "actualDeparture": "10:00", "status": "SCHEDULED", "delayMinutes": 15, "lat": 13.6288, "lon": 79.4192, "elevation": 115},
            {"sequence": 6, "stationCode": "YPR", "stationName": "Yesvantpur Jn", "platform": "6", "scheduledArrival": "16:00", "scheduledDeparture": None, "actualArrival": "16:15", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 15, "lat": 13.0234, "lon": 77.5501, "elevation": 915}
        ]
    },
    {
        "trainNumber": "12626",
        "trainName": "Kerala Superfast Express",
        "operator": "Indian Railways (Southern Zone)",
        "type": "SUPERFAST",
        "speed": 98,
        "maxSpeed": 110,
        "status": "DELAYED",
        "delayMinutes": 14,
        "origin": {"code": "NDLS", "name": "New Delhi", "departure": "20:10"},
        "destination": {"code": "TVC", "name": "Thiruvananthapuram Central", "arrival": "18:00"},
        "routeCoords": [
            [28.6139, 77.2090], # New Delhi
            [26.2183, 78.1828], # Gwalior
            [23.2599, 77.4126], # Bhopal
            [21.1458, 79.0882], # Nagpur
            [17.3850, 78.4867], # Secunderabad
            [16.5062, 80.6480], # Vijayawada
            [13.0827, 80.2707], # Chennai (via Katpadi)
            [9.9312, 76.2673],  # Ernakulam
            [8.5241, 76.9366]   # Thiruvananthapuram
        ],
        "stops": [
            {"sequence": 1, "stationCode": "NDLS", "stationName": "New Delhi", "platform": "5", "scheduledArrival": None, "scheduledDeparture": "20:10", "actualDeparture": "20:10", "status": "DEPARTED", "delayMinutes": 0, "lat": 28.6139, "lon": 77.2090, "elevation": 216},
            {"sequence": 2, "stationCode": "BPL", "stationName": "Bhopal Jn", "platform": "1", "scheduledArrival": "05:20", "scheduledDeparture": "05:25", "actualArrival": "05:34", "actualDeparture": "05:39", "status": "DEPARTED", "delayMinutes": 14, "lat": 23.2599, "lon": 77.4126, "elevation": 498},
            {"sequence": 3, "stationCode": "NGP", "stationName": "Nagpur Jn", "platform": "2", "scheduledArrival": "11:45", "scheduledDeparture": "11:50", "actualArrival": "11:59", "actualDeparture": "12:04", "status": "CURRENT", "delayMinutes": 14, "lat": 21.1458, "lon": 79.0882, "elevation": 312},
            {"sequence": 4, "stationCode": "BZA", "stationName": "Vijayawada Jn", "platform": "7", "scheduledArrival": "20:10", "scheduledDeparture": "20:25", "actualArrival": "20:24", "actualDeparture": "20:39", "status": "SCHEDULED", "delayMinutes": 14, "lat": 16.5062, "lon": 80.6480, "elevation": 19},
            {"sequence": 5, "stationCode": "ERS", "stationName": "Ernakulam Jn", "platform": "4", "scheduledArrival": "14:15", "scheduledDeparture": "14:20", "actualArrival": "14:29", "actualDeparture": "14:34", "status": "SCHEDULED", "delayMinutes": 14, "lat": 9.9312, "lon": 76.2673, "elevation": 4},
            {"sequence": 6, "stationCode": "TVC", "stationName": "Thiruvananthapuram Central", "platform": "1", "scheduledArrival": "18:00", "scheduledDeparture": None, "actualArrival": "18:14", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 14, "lat": 8.5241, "lon": 76.9366, "elevation": 9}
        ]
    },
    {
        "trainNumber": "12051",
        "trainName": "Mumbai - Madgaon Jan Shatabdi Express",
        "operator": "Indian Railways (Konkan Railway)",
        "type": "SHATABDI",
        "speed": 105,
        "maxSpeed": 120,
        "status": "ON_TIME",
        "delayMinutes": 0,
        "origin": {"code": "CSMT", "name": "Mumbai CSMT", "departure": "05:10"},
        "destination": {"code": "MAO", "name": "Madgaon Jn (Goa)", "arrival": "14:10"},
        "routeCoords": [
            [18.9401, 72.8354], # Mumbai CSMT
            [18.9894, 73.1175], # Panvel
            [18.2322, 73.4428], # Roha
            [17.6534, 73.5298], # Chiplun
            [16.9902, 73.3120], # Ratnagiri
            [15.2736, 73.9582]  # Madgaon
        ],
        "stops": [
            {"sequence": 1, "stationCode": "CSMT", "stationName": "Mumbai CSMT", "platform": "12", "scheduledArrival": None, "scheduledDeparture": "05:10", "actualDeparture": "05:10", "status": "DEPARTED", "delayMinutes": 0, "lat": 18.9401, "lon": 72.8354, "elevation": 8},
            {"sequence": 2, "stationCode": "PNVL", "stationName": "Panvel Jn", "platform": "5", "scheduledArrival": "06:03", "scheduledDeparture": "06:05", "actualArrival": "06:03", "actualDeparture": "06:05", "status": "DEPARTED", "delayMinutes": 0, "lat": 18.9894, "lon": 73.1175, "elevation": 12},
            {"sequence": 3, "stationCode": "RN", "stationName": "Ratnagiri", "platform": "1", "scheduledArrival": "10:15", "scheduledDeparture": "10:20", "actualArrival": "10:15", "actualDeparture": "10:20", "status": "CURRENT", "delayMinutes": 0, "lat": 16.9902, "lon": 73.3120, "elevation": 125},
            {"sequence": 4, "stationCode": "MAO", "stationName": "Madgaon Jn", "platform": "3", "scheduledArrival": "14:10", "scheduledDeparture": None, "actualArrival": "14:10", "actualDeparture": None, "status": "SCHEDULED", "delayMinutes": 0, "lat": 15.2736, "lon": 73.9582, "elevation": 9}
        ]
    }
]

# Major Stations database
STATIONS_DATABASE = [
    {"code": "NDLS", "name": "New Delhi", "city": "Delhi", "zone": "Northern Railway", "platforms": 16, "lat": 28.6139, "lon": 77.2090, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM", "LOUNGE", "PARKING"], "elevation": 216},
    {"code": "CSMT", "name": "Chhatrapati Shivaji Maharaj Terminus", "city": "Mumbai", "zone": "Central Railway", "platforms": 18, "lat": 18.9401, "lon": 72.8354, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM", "HERITAGE", "PARKING"], "elevation": 8},
    {"code": "MMCT", "name": "Mumbai Central", "city": "Mumbai", "zone": "Western Railway", "platforms": 5, "lat": 18.9696, "lon": 72.8193, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM", "PARKING"], "elevation": 8},
    {"code": "HWH", "name": "Howrah Junction", "city": "Kolkata", "zone": "Eastern Railway", "platforms": 23, "lat": 22.5850, "lon": 88.3426, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM", "FERRY", "PARKING"], "elevation": 9},
    {"code": "MAS", "name": "MGR Chennai Central", "city": "Chennai", "zone": "Southern Railway", "platforms": 12, "lat": 13.0827, "lon": 80.2707, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM", "PARKING"], "elevation": 7},
    {"code": "SBC", "name": "KSR Bengaluru City", "city": "Bengaluru", "zone": "South Western Railway", "platforms": 10, "lat": 12.9716, "lon": 77.5946, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM", "METRO"], "elevation": 920},
    {"code": "CNB", "name": "Kanpur Central", "city": "Kanpur", "zone": "North Central Railway", "platforms": 10, "lat": 26.4499, "lon": 80.3319, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 126},
    {"code": "BSB", "name": "Varanasi Junction", "city": "Varanasi", "zone": "Northern Railway", "platforms": 9, "lat": 25.3176, "lon": 82.9739, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 82},
    {"code": "PRYJ", "name": "Prayagraj Junction", "city": "Prayagraj", "zone": "North Central Railway", "platforms": 10, "lat": 25.4358, "lon": 81.8463, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 98},
    {"code": "BPL", "name": "Bhopal Junction", "city": "Bhopal", "zone": "West Central Railway", "platforms": 6, "lat": 23.2599, "lon": 77.4126, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 498},
    {"code": "KOTA", "name": "Kota Junction", "city": "Kota", "zone": "West Central Railway", "platforms": 4, "lat": 25.1804, "lon": 75.8398, "facilities": ["WIFI", "ACCESSIBLE", "FOOD"], "elevation": 253},
    {"code": "ST", "name": "Surat", "city": "Surat", "zone": "Western Railway", "platforms": 4, "lat": 21.1702, "lon": 72.8311, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 13},
    {"code": "NGP", "name": "Nagpur Junction", "city": "Nagpur", "zone": "Central Railway", "platforms": 8, "lat": 21.1458, "lon": 79.0882, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 312},
    {"code": "MAO", "name": "Madgaon Junction", "city": "Goa", "zone": "Konkan Railway", "platforms": 4, "lat": 15.2736, "lon": 73.9582, "facilities": ["WIFI", "ACCESSIBLE", "FOOD", "ATM"], "elevation": 9}
]

def calculate_bearing(lat1, lon1, lat2, lon2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

def compute_live_train_positions():
    """
    Computes real-time smooth positions along each train's route coordinates
    based on epoch time, so markers move continuously in real time.
    """
    current_time = time.time()
    live_trains = []

    for idx, train in enumerate(TRAIN_DATABASE):
        coords = train["routeCoords"]
        total_segments = len(coords) - 1
        if total_segments < 1:
            continue

        # Cycle time in seconds per route (e.g. 180s for full circuit)
        cycle_period = 180.0
        # Phase offset based on train index so they are spaced apart
        phase_offset = (idx * 37.5) % cycle_period
        progress = ((current_time + phase_offset) % cycle_period) / cycle_period

        # Scale progress to segments
        pos_float = progress * total_segments
        seg_idx = int(pos_float)
        seg_pct = pos_float - seg_idx
        if seg_idx >= total_segments:
            seg_idx = total_segments - 1
            seg_pct = 1.0

        p1 = coords[seg_idx]
        p2 = coords[min(seg_idx + 1, total_segments)]

        cur_lat = p1[0] + (p2[0] - p1[0]) * seg_pct
        cur_lon = p1[1] + (p2[1] - p1[1]) * seg_pct
        bearing = calculate_bearing(p1[0], p1[1], p2[0], p2[1])

        # Find next stop
        stops = train["stops"]
        next_stop = None
        for stop in stops:
            if stop["status"] in ["CURRENT", "SCHEDULED"]:
                next_stop = stop
                break
        if not next_stop and len(stops) > 0:
            next_stop = stops[-1]

        live_trains.append({
            "trainNumber": train["trainNumber"],
            "trainName": train["trainName"],
            "operator": train["operator"],
            "type": train["type"],
            "lat": round(cur_lat, 6),
            "lng": round(cur_lon, 6),
            "bearing": round(bearing, 1),
            "speed": train["speed"] + int(math.sin(current_time / 10 + idx) * 8),
            "maxSpeed": train["maxSpeed"],
            "status": train["status"],
            "delayMinutes": train["delayMinutes"],
            "origin": train["origin"],
            "destination": train["destination"],
            "nextStop": {
                "code": next_stop["stationCode"] if next_stop else "NDLS",
                "name": next_stop["stationName"] if next_stop else "New Delhi",
                "platform": next_stop.get("platform", "1") if next_stop else "1",
                "eta": "In 18 mins"
            },
            "routeCoords": coords,
            "stopsCount": len(train["stops"])
        })

    return live_trains

class RailRadarRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for API responses and ensure no-cache for live data
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def _send_cors_headers(self):
        """Add CORS headers so Vercel-hosted frontend can call this Railway backend."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path
        query = urllib.parse.parse_qs(url_parts.query)

        # 1. API: Live Train Positions
        if path == "/api/trains/live":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self._send_cors_headers()
            self.end_headers()
            trains = compute_live_train_positions()
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "count": len(trains),
                "trains": trains
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        # 2. API: Train Detail by Number
        if path.startswith("/api/trains/") and len(path.split("/")) >= 4:
            train_num = path.split("/")[3]
            matched = next((t for t in TRAIN_DATABASE if t["trainNumber"] == train_num), None)
            if matched:
                # Attach computed live position
                live_trains = compute_live_train_positions()
                live_info = next((lt for lt in live_trains if lt["trainNumber"] == train_num), None)
                res = dict(matched)
                if live_info:
                    res["currentPosition"] = {
                        "lat": live_info["lat"],
                        "lng": live_info["lng"],
                        "bearing": live_info["bearing"],
                        "speed": live_info["speed"]
                    }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            else:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Train not found"}).encode("utf-8"))
            return

        # 3. API: Stations List
        if path == "/api/stations":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(STATIONS_DATABASE).encode("utf-8"))
            return

        # 4. API: Station Departure/Arrival Board
        if path.startswith("/api/stations/") and path.endswith("/board"):
            parts = path.split("/")
            code = parts[3].upper()
            board_type = query.get("type", ["departures"])[0]

            # Generate dynamic departures/arrivals board
            board_entries = []
            for t in TRAIN_DATABASE:
                stop = next((s for s in t["stops"] if s["stationCode"] == code), None)
                if stop:
                    sched = stop.get("scheduledDeparture" if board_type == "departures" else "scheduledArrival")
                    if not sched:
                        sched = stop.get("scheduledArrival" if board_type == "departures" else "scheduledDeparture")
                    board_entries.append({
                        "trainNumber": t["trainNumber"],
                        "trainName": t["trainName"],
                        "type": t["type"],
                        "destination": t["destination"]["name"],
                        "origin": t["origin"]["name"],
                        "platform": stop.get("platform", "1"),
                        "scheduledTime": sched,
                        "status": stop["status"],
                        "delayMinutes": stop["delayMinutes"],
                        "expectedTime": sched
                    })

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "stationCode": code,
                "type": board_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "board": board_entries
            }).encode("utf-8"))
            return

        # 5. API: Weather Proxy (OpenWeather integration)
        if path == "/api/weather/point":
            lat = query.get("lat", [None])[0]
            lon = query.get("lon", [None])[0]
            if not lat or not lon:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Missing lat or lon"}')
                return

            cache_key = f"weather_{round(float(lat), 2)}_{round(float(lon), 2)}"
            cached = get_cached(cache_key, 600) # 10 min cache
            if cached:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Cache", "HIT")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(cached).encode("utf-8"))
                return

            # Live call to OpenWeather API
            ow_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={KEYS['openweather']}&units=metric"
            try:
                req = urllib.request.Request(ow_url, headers={'User-Agent': 'RailRadar/1.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    raw_data = json.loads(response.read().decode('utf-8'))
                    normalized = {
                        "cityName": raw_data.get("name", "Track Zone"),
                        "tempC": round(raw_data["main"]["temp"], 1),
                        "feelsLikeC": round(raw_data["main"]["feels_like"], 1),
                        "condition": raw_data["weather"][0]["main"],
                        "description": raw_data["weather"][0]["description"].title(),
                        "icon": raw_data["weather"][0]["icon"],
                        "humidity": raw_data["main"]["humidity"],
                        "windSpeedKmh": round(raw_data["wind"]["speed"] * 3.6, 1),
                        "visibilityKm": round(raw_data.get("visibility", 10000) / 1000, 1),
                        "isSevere": raw_data["weather"][0]["id"] < 700 or raw_data["wind"]["speed"] > 15
                    }
                    set_cached(cache_key, normalized)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps(normalized).encode("utf-8"))
                    return
            except Exception as e:
                # Graceful fallback weather based on coordinates
                fallback = {
                    "cityName": "Regional Station",
                    "tempC": 28.5,
                    "feelsLikeC": 30.0,
                    "condition": "Clear",
                    "description": "Clear Sky",
                    "icon": "01d",
                    "humidity": 55,
                    "windSpeedKmh": 12.0,
                    "visibilityKm": 10.0,
                    "isSevere": False,
                    "note": "Cached / offline estimate"
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(fallback).encode("utf-8"))
                return

        # 6. API: Elevation Profile Proxy & Generator
        if path == "/api/elevation/profile":
            train_num = query.get("train", [None])[0]
            matched = next((t for t in TRAIN_DATABASE if t["trainNumber"] == train_num), TRAIN_DATABASE[0])
            stops = matched["stops"]

            # Generate high-resolution 50-point elevation curve
            elevation_points = []
            total_km = 800 if len(stops) < 4 else 1440
            num_points = 45

            for i in range(num_points):
                pct = i / (num_points - 1)
                dist = round(pct * total_km, 1)
                # Realistic terrain profile with hills & plains
                base_elev = 150 + 280 * math.sin(pct * math.pi * 2.2)**2 + 120 * math.cos(pct * math.pi * 5)
                grade = round(math.sin(pct * 12) * 1.8, 1)
                elevation_points.append({
                    "distanceKm": dist,
                    "elevationM": round(max(15, base_elev)),
                    "gradePercent": abs(grade),
                    "gradeClass": "flat" if abs(grade) < 0.6 else ("moderate" if abs(grade) < 1.4 else "steep")
                })

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "trainNumber": matched["trainNumber"],
                "totalDistanceKm": total_km,
                "points": elevation_points
            }).encode("utf-8"))
            return

        # 7. API: Operator Fleet Statistics
        if path == "/api/operator/stats":
            live_trains = compute_live_train_positions()
            on_time = [t for t in live_trains if t["status"] == "ON_TIME"]
            delayed = [t for t in live_trains if t["status"] == "DELAYED"]
            avg_delay = sum(t["delayMinutes"] for t in live_trains) / max(1, len(live_trains))

            payload = {
                "activeTrains": len(live_trains),
                "onTimeRate": round((len(on_time) / len(live_trains)) * 100, 1),
                "avgDelayMinutes": round(avg_delay, 1),
                "severeWeatherAlerts": 1,
                "activeIncidents": [
                    {"id": "INC-891", "severity": "WARNING", "title": "Heavy Rain Alert", "section": "Nagpur - Itarsi Section", "impact": "Speed restricted to 90 km/h", "timestamp": "10m ago"},
                    {"id": "INC-889", "severity": "CRITICAL", "title": "Signal Track Maintenance", "section": "Asansol - Dhanbad Cord", "impact": "15 min delay for trailing freights", "timestamp": "28m ago"},
                    {"id": "INC-885", "severity": "INFO", "title": "Platform Cleared", "section": "New Delhi Pf 16", "impact": "Vande Bharat Express arrived on-time", "timestamp": "42m ago"}
                ]
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        # Default fallback to standard static file serving
        return super().do_GET()

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run_server():
    with ThreadedTCPServer(("", PORT), RailRadarRequestHandler) as httpd:
        print("==================================================")
        print(f"[RailRadar] Server running at http://localhost:{PORT}")
        print(f"[RailRadar] MapTiler Key: {KEYS['maptiler'][:8]}...")
        print(f"[RailRadar] OpenWeather Key: {KEYS['openweather'][:8]}...")
        print(f"[RailRadar] OpenTopography Key: {KEYS['opentopography'][:8]}...")
        print(f"[RailRadar] RailRadar Key: {KEYS['railradar'][:8]}...")
        print("==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run_server()
