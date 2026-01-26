import { CompanyProfile, TechCategory, ExistingProduct } from './types';

// Extracted from the provided "方案应用V2.PDF" OCR data
const EXISTING_PRODUCTS: ExistingProduct[] = [
  { name: 'Heat Stroke Warning Device', category: 'Health', techStack: ['Temp/Humidity Sensor', 'LCD', 'Algorithm'] },
  { name: 'Tuya WiFi Weather Clock', category: 'Smart Home', techStack: ['WiFi (Tuya)', 'LCD Driver', 'App Integration'] },
  { name: 'Bluetooth Sync Clock', category: 'Smart Home', techStack: ['BLE', 'RTC'] },
  { name: 'RGB Gaming Clock', category: 'Consumer', techStack: ['LED PWM', 'Touch', 'Power Mgmt'] },
  { name: 'TDS/EC Water Tester', category: 'Health', techStack: ['RFC Detection', 'Temp Compensation'] },
  { name: 'High Precision Salt Meter', category: 'Kitchen', techStack: ['RFC Detection', 'Platinum Probe'] },
  { name: 'Bike Computer', category: 'Outdoor', techStack: ['Hall Sensor', 'Low Power LCD'] },
  { name: 'Instant Read Food Thermometer', category: 'Kitchen', techStack: ['NTC', 'Low Power'] },
  { name: 'Indoor Hydroponics System', category: 'Home', techStack: ['LED Grow Light', 'Pump Control', 'RFC (Nutrient)'] },
  { name: 'Smart Body Fat Scale', category: 'Health', techStack: ['Bio-impedance (RFC)', 'BLE', 'App', 'Load Cell'] },
  { name: 'TENS Pulse Massager', category: 'Health', techStack: ['High Voltage Low Freq', 'Battery'] },
  { name: 'Cat Laser Toy', category: 'Pet', techStack: ['Servo/Motor', 'Timer'] },
  { name: 'Bluetooth Tracker', category: 'Consumer', techStack: ['BLE', 'Buzzer'] },
  { name: 'Laser Rangefinder', category: 'Tools', techStack: ['Laser Measure', 'Display', 'Power'] },
  { name: 'Pet Water Dispenser', category: 'Pet', techStack: ['Pump', 'Water Level (RFC)', 'LED'] },
  { name: 'Posture Corrector', category: 'Health', techStack: ['MEMS (Angle)', 'Vibration Motor'] },
  { name: 'Hand Warmer', category: 'Consumer', techStack: ['Heating Control (PWM)', 'NTC', 'Battery'] },
  { name: 'Wood Moisture Meter', category: 'Tools', techStack: ['Resistance/RFC'] },
  { name: 'Neck Fan', category: 'Consumer', techStack: ['BLDC Motor', 'Battery'] },
];

export const COMPANY_PROFILE: CompanyProfile = {
  name: 'IcyFire Tech Solutions',
  description: 'Specialized in consumer electronics, smart home (IoT), health monitoring, and pet tech devices using mature sensor and connectivity stacks.',
  techStack: [
    {
      category: TechCategory.SENSORS,
      items: [
        'Temp/Humidity (SHT/NTC)',
        'RFC Detection (Conductivity/Bio-impedance)',
        'MEMS (3D Accel/Gyro/Angle)',
        'Hall Effect',
        'Light/Photoelectric',
        'Touch/Capacitive',
        'GPS',
        'Laser Ranging'
      ]
    },
    {
      category: TechCategory.CONNECTIVITY,
      items: [
        'BLE (Bluetooth Low Energy)',
        'WiFi (ESP/Tuya Module)',
        'SubG (433MHz/RF433)',
        '2.4G Direct',
        'Tuya Ecosystem'
      ]
    },
    {
      category: TechCategory.OUTPUT,
      items: [
        'LCD/LED Display',
        'RGB LED Effects (PWM)',
        'Motor/Servo Control (PID)',
        'BLDC Fan Control',
        'Pumps/Valves',
        'Audio/Buzzer/Voice Playback',
        'High Voltage Pulse (TENS)'
      ]
    },
    {
      category: TechCategory.ALGORITHMS,
      items: [
        'PID Control',
        'Temperature Compensation',
        'Pedometer/Activity Tracking',
        'Bio-impedance Analysis'
      ]
    }
  ],
  existingProducts: EXISTING_PRODUCTS
};
