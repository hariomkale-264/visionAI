import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK with server-side API key and User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!ai,
    timestamp: new Date().toISOString(),
  });
});

// Haversine formula for distance calculation in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 1. PLACE SEARCH (Geocoding / Nominatim with proximity weighting)
app.get('/api/navigation/search', async (req, res) => {
  try {
    const q = req.query.q as string;
    const userLat = parseFloat(req.query.lat as string);
    const userLon = parseFloat(req.query.lon as string);

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Proximity viewbox if user coordinates provided
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q.trim()
    )}&addressdetails=1&limit=5`;

    if (!isNaN(userLat) && !isNaN(userLon)) {
      // 0.25 deg viewbox ~ 25km radius
      const viewbox = `${userLon - 0.25},${userLat + 0.25},${userLon + 0.25},${userLat - 0.25}`;
      url += `&viewbox=${viewbox}`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VisionGuideApp/1.0 (contact: kaleom582@gmail.com)',
        Accept: 'application/json',
      },
    });

    let results: any[] = [];

    if (response.ok) {
      const data = await response.json();
      results = (data || []).map((item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const dist = !isNaN(userLat) && !isNaN(userLon) ? haversineDistance(userLat, userLon, lat, lon) : null;
        const name = item.name || item.display_name.split(',')[0];
        return {
          id: item.place_id,
          name: name,
          displayName: item.display_name,
          lat,
          lon,
          distanceMeters: dist,
          type: item.type,
          category: item.class,
        };
      });
    }

    // Fallback to Photon OpenStreetMap API if Nominatim returns nothing or fails
    if (results.length === 0) {
      try {
        let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=5`;
        if (!isNaN(userLat) && !isNaN(userLon)) {
          photonUrl += `&lat=${userLat}&lon=${userLon}`;
        }
        const photonRes = await fetch(photonUrl);
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          results = (photonData.features || []).map((feat: any) => {
            const coords = feat.geometry?.coordinates || [0, 0];
            const lon = coords[0];
            const lat = coords[1];
            const props = feat.properties || {};
            const dist = !isNaN(userLat) && !isNaN(userLon) ? haversineDistance(userLat, userLon, lat, lon) : null;
            const name = props.name || props.street || q;
            const display = [props.name, props.street, props.city, props.state, props.country]
              .filter(Boolean)
              .join(', ');
            return {
              id: props.osm_id || Math.random(),
              name,
              displayName: display || name,
              lat,
              lon,
              distanceMeters: dist,
              type: props.osm_value,
              category: props.osm_key,
            };
          });
        }
      } catch (pe) {
        console.warn('Photon fallback error:', pe);
      }
    }

    // Sort by distance if user coords available
    if (!isNaN(userLat) && !isNaN(userLon)) {
      results.sort((a: any, b: any) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    res.json({ results });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search places: ' + err.message });
  }
});

// 2. WALKING ROUTE (OSRM Foot Routing)
app.get('/api/navigation/route', async (req, res) => {
  try {
    const startLat = parseFloat(req.query.startLat as string);
    const startLon = parseFloat(req.query.startLon as string);
    const endLat = parseFloat(req.query.endLat as string);
    const endLon = parseFloat(req.query.endLon as string);

    if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
      return res.status(400).json({ error: 'Valid start and end coordinates required' });
    }

    // Call OSRM public foot router
    const url = `https://router.project-osrm.org/route/v1/foot/${startLon},${startLat};${endLon},${endLat}?overview=full&steps=true&geometries=geojson`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VisionGuide-PWA/1.0 (accessible-mobility-assistant)',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Route calculation service unavailable' });
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No walking route found between these locations' });
    }

    const route = data.routes[0];
    const steps: any[] = [];

    // Format turn-by-turn steps into accessible natural instructions
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      for (const step of route.legs[0].steps) {
        const maneuver = step.maneuver || {};
        const dist = Math.round(step.distance);
        const name = step.name || 'path';

        let speech = '';
        if (maneuver.type === 'depart') {
          speech = `Head ${maneuver.modifier || 'straight'} on ${name} for ${dist} meters.`;
        } else if (maneuver.type === 'arrive') {
          speech = `You have arrived at your destination.`;
        } else if (maneuver.type === 'turn') {
          speech = `Turn ${maneuver.modifier || 'ahead'} onto ${name} in ${dist} meters.`;
        } else if (maneuver.type === 'new name' || maneuver.type === 'continue') {
          speech = `Continue straight onto ${name} for ${dist} meters.`;
        } else {
          speech = `${maneuver.type || 'Proceed'} ${maneuver.modifier ? maneuver.modifier : ''} onto ${name} for ${dist} meters.`;
        }

        steps.push({
          instruction: speech,
          distanceMeters: dist,
          durationSeconds: Math.round(step.duration),
          maneuverType: maneuver.type,
          modifier: maneuver.modifier,
          streetName: name,
          location: maneuver.location, // [lon, lat]
        });
      }
    }

    res.json({
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      geometry: route.geometry, // GeoJSON LineString coordinates
      steps,
    });
  } catch (err: any) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Failed to calculate walking route: ' + err.message });
  }
});

// 3. AI VISION ANALYSIS (Obstacle Detection, OCR, Scene Description, Ask AI)
app.post('/api/vision/analyze', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI API key is not configured. Please ensure GEMINI_API_KEY is available.',
      });
    }

    const { image, mode = 'assist', userQuestion = '', walkingContext = '', language = 'en-US' } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image frame base64 is required' });
    }

    const languageNames: Record<string, string> = {
      'en-US': 'English',
      'en-IN': 'Indian English',
      'hi-IN': 'Hindi (हिन्दी)',
      'mr-IN': 'Marathi (मराठी)',
      'es-ES': 'Spanish (Español)',
      'fr-FR': 'French (Français)',
      'de-DE': 'German (Deutsch)',
      'ja-JP': 'Japanese (日本語)',
      'ar-SA': 'Arabic (العربية)',
    };
    const targetLang = languageNames[language] || 'English';
    const langInstruction = `\nLANGUAGE REQUIREMENT: Generate all spoken output fields ("spokenAlert", "primaryAlert", "trafficAlert", "sceneSummary", "answer") in ${targetLang}. The visually impaired user is listening in ${targetLang}.\n`;

    // Clean base64 string
    let cleanBase64 = image;
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    let prompt = '';
    if (mode === 'read') {
      prompt = `You are a real-time OCR and text reading assistant for a blind person holding a smartphone camera.
${langInstruction}
Analyze the image. Read any visible text accurately: signs, room numbers, labels, packaging, documents, notices, menus, bus numbers.
Extract the text verbatim. Provide a clear, natural spoken readout of what the text says.
If text is blurry or cut off, clearly state: "I can't read the text clearly. Please move the camera closer or steady the phone."
Output JSON with:
{
  "extractedText": "full recognized text",
  "spokenAlert": "natural speech text for earbud readout",
  "textType": "signboard" | "label" | "document" | "notice" | "room_number" | "other" | "none"
}`;
    } else if (mode === 'describe') {
      prompt = `You are an AI environmental describer for a visually impaired user.
${langInstruction}
Describe their surroundings concisely in 2 to 3 calm, informative sentences.
Prioritize:
1. Immediate safety hazards / walking path
2. Key structures and people (e.g. sidewalk, parked cars, open door, stairs)
3. Directional placement (left, center, right)
Never claim "the road is safe" or "cross now". Use cautious language if traffic or road crossing is present.
Output JSON with:
{
  "sceneSummary": "detailed 2-3 sentence description",
  "spokenAlert": "concise spoken description for Bluetooth earbuds",
  "detectedHazards": ["hazard1", "hazard2"]
}`;
    } else if (mode === 'ask_ai') {
      prompt = `You are an AI assistant answering a visually impaired person's specific question about what the camera sees.
${langInstruction}
User question: "${userQuestion || 'What is this?'}".
Answer directly, concisely, and honestly.
If confidence is low, use cautious language like "I am not certain, but it appears to be...".
Never present uncertain predictions as guaranteed facts.
Output JSON with:
{
  "answer": "concise answer to user's question",
  "spokenAlert": "clear spoken answer for Bluetooth earbuds",
  "confidence": "high" | "medium" | "low"
}`;
    } else {
      // assist or navigation mode
      prompt = `You are an AI mobility assistant for a blind pedestrian walking with a smartphone chest/hand-held camera.
${langInstruction}
Analyze this camera frame for physical obstacles and environmental hazards.
Walking context: ${walkingContext || 'walking on path/sidewalk'}.

Identify key objects in the path or immediate vicinity:
- People, vehicles (cars, buses, trucks, motorcycles, bicycles), animals
- Obstacles: walls, closed doors, poles, trees, chairs, tables, bags
- Ground hazards: stairs, steps, curbs, potholes, drop-offs, barriers
- Road elements: road crossings, zebra crossings, traffic lights

For each significant object, evaluate:
- name: object name (e.g. "Vehicle", "Person", "Pole", "Curbs", "Stairs", "Pothole", "Bicycle")
- distance: approximate string ("very close", "about 1 meter", "about 2 meters", "several meters away", "far ahead")
- distanceMeters: estimated number in meters (0.5 to 10)
- direction: "far left" | "left" | "center" | "right" | "far right"
- movement: "stationary" | "approaching" | "moving away" | "crossing path"
- inWalkingPath: boolean (true if obstructing the forward center walking path)
- priorityLevel:
    1 (CRITICAL: immediate danger, approaching vehicle, drop-off/pothole/down stairs within 1.5m, obstacle <1m directly in walking path)
    2 (HIGH: obstacle ahead ~1-2 meters in path)
    3 (MEDIUM: person or object nearby 2-3 meters)
    4 (LOW: peripheral or stationary distant objects)
- spokenAlert: clear, punchy warning (e.g., "Warning: Vehicle approaching from your right", "Obstacle ahead, approximately 1 meter", "Person on your left, about 2 meters", "Curbs ahead, about 1 meter")

SAFETY RULES:
- NEVER tell the user "The road is safe" or "Cross now" or "No vehicles are coming".
- If a road crossing is visible, include trafficAlert: "Road crossing detected. Please verify traffic before crossing."
- Limit objects to the 1 to 4 most relevant to avoid audio clutter.
- Provide primaryAlert: the single most urgent alert to speak right now, or empty string if clear.

Output valid JSON matching this schema:
{
  "primaryAlert": "string with most urgent spoken alert, or empty string",
  "trafficAlert": "string if road/crossing hazard detected, or null",
  "objects": [
    {
      "name": "string",
      "distance": "string",
      "distanceMeters": 1.0,
      "direction": "left" | "center" | "right" | "far left" | "far right",
      "movement": "stationary" | "approaching" | "moving away" | "crossing path",
      "inWalkingPath": true,
      "priorityLevel": 1,
      "spokenAlert": "string"
    }
  ]
}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText.trim());
    } catch {
      // Fallback extract json from markdown
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = { spokenAlert: responseText };
      }
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    res.status(500).json({
      error: 'Vision analysis failed: ' + (err.message || 'unknown error'),
      spokenAlert: 'Vision analysis is temporarily unavailable.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`VisionGuide PWA server listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
