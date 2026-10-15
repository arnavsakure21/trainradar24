export const FALLBACK_STATIONS = [
  {
    "code": "NDLS",
    "name": "New Delhi",
    "city": "Delhi",
    "zone": "Northern Railway",
    "platforms": 16,
    "lat": 28.6139,
    "lon": 77.209,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM",
      "LOUNGE",
      "PARKING"
    ],
    "elevation": 216
  },
  {
    "code": "CSMT",
    "name": "Chhatrapati Shivaji Maharaj Terminus",
    "city": "Mumbai",
    "zone": "Central Railway",
    "platforms": 18,
    "lat": 18.9401,
    "lon": 72.8354,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM",
      "HERITAGE",
      "PARKING"
    ],
    "elevation": 8
  },
  {
    "code": "MMCT",
    "name": "Mumbai Central",
    "city": "Mumbai",
    "zone": "Western Railway",
    "platforms": 5,
    "lat": 18.9696,
    "lon": 72.8193,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM",
      "PARKING"
    ],
    "elevation": 8
  },
  {
    "code": "HWH",
    "name": "Howrah Junction",
    "city": "Kolkata",
    "zone": "Eastern Railway",
    "platforms": 23,
    "lat": 22.585,
    "lon": 88.3426,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM",
      "FERRY",
      "PARKING"
    ],
    "elevation": 9
  },
  {
    "code": "MAS",
    "name": "MGR Chennai Central",
    "city": "Chennai",
    "zone": "Southern Railway",
    "platforms": 12,
    "lat": 13.0827,
    "lon": 80.2707,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM",
      "PARKING"
    ],
    "elevation": 7
  },
  {
    "code": "SBC",
    "name": "KSR Bengaluru City",
    "city": "Bengaluru",
    "zone": "South Western Railway",
    "platforms": 10,
    "lat": 12.9716,
    "lon": 77.5946,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM",
      "METRO"
    ],
    "elevation": 920
  },
  {
    "code": "CNB",
    "name": "Kanpur Central",
    "city": "Kanpur",
    "zone": "North Central Railway",
    "platforms": 10,
    "lat": 26.4499,
    "lon": 80.3319,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 126
  },
  {
    "code": "BSB",
    "name": "Varanasi Junction",
    "city": "Varanasi",
    "zone": "Northern Railway",
    "platforms": 9,
    "lat": 25.3176,
    "lon": 82.9739,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 82
  },
  {
    "code": "PRYJ",
    "name": "Prayagraj Junction",
    "city": "Prayagraj",
    "zone": "North Central Railway",
    "platforms": 10,
    "lat": 25.4358,
    "lon": 81.8463,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 98
  },
  {
    "code": "BPL",
    "name": "Bhopal Junction",
    "city": "Bhopal",
    "zone": "West Central Railway",
    "platforms": 6,
    "lat": 23.2599,
    "lon": 77.4126,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 498
  },
  {
    "code": "KOTA",
    "name": "Kota Junction",
    "city": "Kota",
    "zone": "West Central Railway",
    "platforms": 4,
    "lat": 25.1804,
    "lon": 75.8398,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD"
    ],
    "elevation": 253
  },
  {
    "code": "ST",
    "name": "Surat",
    "city": "Surat",
    "zone": "Western Railway",
    "platforms": 4,
    "lat": 21.1702,
    "lon": 72.8311,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 13
  },
  {
    "code": "NGP",
    "name": "Nagpur Junction",
    "city": "Nagpur",
    "zone": "Central Railway",
    "platforms": 8,
    "lat": 21.1458,
    "lon": 79.0882,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 312
  },
  {
    "code": "MAO",
    "name": "Madgaon Junction",
    "city": "Goa",
    "zone": "Konkan Railway",
    "platforms": 4,
    "lat": 15.2736,
    "lon": 73.9582,
    "facilities": [
      "WIFI",
      "ACCESSIBLE",
      "FOOD",
      "ATM"
    ],
    "elevation": 9
  }
];

export const FALLBACK_TRAINS = [
  {
    "trainNumber": "22436",
    "trainName": "Vande Bharat Express",
    "operator": "Indian Railways",
    "type": "VANDE_BHARAT",
    "lat": 25.343694,
    "lng": 82.724966,
    "bearing": 96.4,
    "speed": 123,
    "maxSpeed": 160,
    "status": "ON_TIME",
    "delayMinutes": 0,
    "origin": {
      "code": "NDLS",
      "name": "New Delhi",
      "departure": "06:00"
    },
    "destination": {
      "code": "BSB",
      "name": "Varanasi Jn",
      "arrival": "14:00"
    },
    "nextStop": {
      "code": "CNB",
      "name": "Kanpur Central",
      "platform": "5",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        28.6139,
        77.209
      ],
      [
        27.1767,
        78.0081
      ],
      [
        26.4499,
        80.3319
      ],
      [
        25.4358,
        81.8463
      ],
      [
        25.3176,
        82.9739
      ]
    ],
    "stopsCount": 4
  },
  {
    "trainNumber": "12301",
    "trainName": "Howrah Rajdhani Express",
    "operator": "Indian Railways (Eastern Zone)",
    "type": "RAJDHANI",
    "lat": 23.696589,
    "lng": 86.927532,
    "bearing": 282.4,
    "speed": 109,
    "maxSpeed": 130,
    "status": "ON_TIME",
    "delayMinutes": 0,
    "origin": {
      "code": "HWH",
      "name": "Howrah Jn (Kolkata)",
      "departure": "16:50"
    },
    "destination": {
      "code": "NDLS",
      "name": "New Delhi",
      "arrival": "10:05"
    },
    "nextStop": {
      "code": "DHN",
      "name": "Dhanbad Jn",
      "platform": "2",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        22.585,
        88.3426
      ],
      [
        23.6889,
        86.9661
      ],
      [
        23.7957,
        86.4304
      ],
      [
        24.7914,
        85.0002
      ],
      [
        25.2818,
        83.1167
      ],
      [
        25.4358,
        81.8463
      ],
      [
        26.4499,
        80.3319
      ],
      [
        28.6139,
        77.209
      ]
    ],
    "stopsCount": 8
  },
  {
    "trainNumber": "12952",
    "trainName": "Mumbai Tejas Rajdhani",
    "operator": "Indian Railways (Western Zone)",
    "type": "RAJDHANI",
    "lat": 24.199875,
    "lng": 75.413893,
    "bearing": 201.8,
    "speed": 120,
    "maxSpeed": 140,
    "status": "ON_TIME",
    "delayMinutes": 3,
    "origin": {
      "code": "NDLS",
      "name": "New Delhi",
      "departure": "16:55"
    },
    "destination": {
      "code": "MMCT",
      "name": "Mumbai Central",
      "arrival": "08:35"
    },
    "nextStop": {
      "code": "KOTA",
      "name": "Kota Jn",
      "platform": "2",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        28.6139,
        77.209
      ],
      [
        27.4924,
        77.6737
      ],
      [
        25.1804,
        75.8398
      ],
      [
        23.3315,
        75.0367
      ],
      [
        22.3072,
        73.1812
      ],
      [
        21.1702,
        72.8311
      ],
      [
        19.2812,
        72.8561
      ],
      [
        18.9696,
        72.8193
      ]
    ],
    "stopsCount": 7
  },
  {
    "trainNumber": "12002",
    "trainName": "Bhopal Shatabdi Express",
    "operator": "Indian Railways (Northern Zone)",
    "type": "SHATABDI",
    "lat": 26.003317,
    "lng": 78.290501,
    "bearing": 155.6,
    "speed": 141,
    "maxSpeed": 150,
    "status": "ON_TIME",
    "delayMinutes": 0,
    "origin": {
      "code": "NDLS",
      "name": "New Delhi",
      "departure": "06:00"
    },
    "destination": {
      "code": "RKMP",
      "name": "Rani Kamlapati (Bhopal)",
      "arrival": "14:40"
    },
    "nextStop": {
      "code": "GWL",
      "name": "Gwalior Jn",
      "platform": "1",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        28.6139,
        77.209
      ],
      [
        27.1767,
        78.0081
      ],
      [
        26.2183,
        78.1828
      ],
      [
        25.4484,
        78.5685
      ],
      [
        23.2599,
        77.4126
      ]
    ],
    "stopsCount": 5
  },
  {
    "trainNumber": "20608",
    "trainName": "Mysuru - Chennai Vande Bharat",
    "operator": "Indian Railways (Southern Zone)",
    "type": "VANDE_BHARAT",
    "lat": 12.942663,
    "lng": 79.262844,
    "bearing": 81.8,
    "speed": 117,
    "maxSpeed": 130,
    "status": "ON_TIME",
    "delayMinutes": 0,
    "origin": {
      "code": "MYS",
      "name": "Mysuru Jn",
      "departure": "13:05"
    },
    "destination": {
      "code": "MAS",
      "name": "MGR Chennai Central",
      "arrival": "19:30"
    },
    "nextStop": {
      "code": "KJM",
      "name": "Krishnarajapuram",
      "platform": "2",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        12.3163,
        76.6456
      ],
      [
        12.9716,
        77.5946
      ],
      [
        12.9934,
        77.6602
      ],
      [
        12.9249,
        79.135
      ],
      [
        13.0827,
        80.2707
      ]
    ],
    "stopsCount": 5
  },
  {
    "trainNumber": "12245",
    "trainName": "Howrah - Yesvantpur Duronto Express",
    "operator": "Indian Railways (South Eastern Zone)",
    "type": "DURONTO",
    "lat": 13.064339,
    "lng": 77.676493,
    "bearing": 251.8,
    "speed": 105,
    "maxSpeed": 120,
    "status": "DELAYED",
    "delayMinutes": 22,
    "origin": {
      "code": "HWH",
      "name": "Howrah Jn",
      "departure": "10:50"
    },
    "destination": {
      "code": "YPR",
      "name": "Yesvantpur Jn (Bengaluru)",
      "arrival": "16:00"
    },
    "nextStop": {
      "code": "VSKP",
      "name": "Visakhapatnam Jn",
      "platform": "7",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        22.585,
        88.3426
      ],
      [
        20.2961,
        85.8245
      ],
      [
        17.6868,
        83.2185
      ],
      [
        16.5062,
        80.648
      ],
      [
        13.6288,
        79.4192
      ],
      [
        13.0234,
        77.5501
      ]
    ],
    "stopsCount": 6
  },
  {
    "trainNumber": "12626",
    "trainName": "Kerala Superfast Express",
    "operator": "Indian Railways (Southern Zone)",
    "type": "SUPERFAST",
    "lat": 24.566119,
    "lng": 77.752666,
    "bearing": 193.5,
    "speed": 92,
    "maxSpeed": 110,
    "status": "DELAYED",
    "delayMinutes": 14,
    "origin": {
      "code": "NDLS",
      "name": "New Delhi",
      "departure": "20:10"
    },
    "destination": {
      "code": "TVC",
      "name": "Thiruvananthapuram Central",
      "arrival": "18:00"
    },
    "nextStop": {
      "code": "NGP",
      "name": "Nagpur Jn",
      "platform": "2",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        28.6139,
        77.209
      ],
      [
        26.2183,
        78.1828
      ],
      [
        23.2599,
        77.4126
      ],
      [
        21.1458,
        79.0882
      ],
      [
        17.385,
        78.4867
      ],
      [
        16.5062,
        80.648
      ],
      [
        13.0827,
        80.2707
      ],
      [
        9.9312,
        76.2673
      ],
      [
        8.5241,
        76.9366
      ]
    ],
    "stopsCount": 6
  },
  {
    "trainNumber": "12051",
    "trainName": "Mumbai - Madgaon Jan Shatabdi Express",
    "operator": "Indian Railways (Konkan Railway)",
    "type": "SHATABDI",
    "lat": 18.223106,
    "lng": 73.444167,
    "bearing": 171.8,
    "speed": 98,
    "maxSpeed": 120,
    "status": "ON_TIME",
    "delayMinutes": 0,
    "origin": {
      "code": "CSMT",
      "name": "Mumbai CSMT",
      "departure": "05:10"
    },
    "destination": {
      "code": "MAO",
      "name": "Madgaon Jn (Goa)",
      "arrival": "14:10"
    },
    "nextStop": {
      "code": "RN",
      "name": "Ratnagiri",
      "platform": "1",
      "eta": "In 18 mins"
    },
    "routeCoords": [
      [
        18.9401,
        72.8354
      ],
      [
        18.9894,
        73.1175
      ],
      [
        18.2322,
        73.4428
      ],
      [
        17.6534,
        73.5298
      ],
      [
        16.9902,
        73.312
      ],
      [
        15.2736,
        73.9582
      ]
    ],
    "stopsCount": 4
  }
];
