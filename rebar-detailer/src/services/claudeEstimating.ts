import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { imageToBase64 } from './fileIngestion.js';
import { REBAR_DENSITIES } from './estimatingService.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const ESTIMATING_PROMPT = `You are an expert structural engineer performing a rebar estimating takeoff from structural drawings. Analyze this drawing and identify ALL concrete structural elements and their dimensions so we can estimate the total rebar quantity.

For each structural element you can identify, extract:

1. **name**: Descriptive label (e.g., "Spread Footing F1", "Column C1-C12", "Grade Beam GB1", "Slab on Grade Level 1")
2. **elementType**: One of these exact values:
   - "spread_footing" — isolated/spread footings
   - "continuous_footing" — strip/continuous footings
   - "mat_foundation" — mat/raft foundations
   - "pile_cap" — pile caps
   - "grade_beam" — grade beams
   - "column_tied" — rectangular/tied columns
   - "column_spiral" — circular/spiral columns
   - "beam_regular" — standard beams
   - "beam_transfer" — transfer/deep beams
   - "slab_on_grade" — slabs on grade
   - "elevated_slab" — elevated/suspended slabs
   - "post_tension_slab" — post-tensioned slabs
   - "shear_wall" — shear walls
   - "retaining_wall" — retaining walls
   - "basement_wall" — basement/foundation walls
   - "stairs" — stairs
3. **inputMethod**: How dimensions are provided:
   - "dimensions" — individual L, W, D measurements
   - "volume" — total cubic yards given
   - "area" — square footage (for slabs)
4. **length**: Length in feet (for dimensions method)
5. **width**: Width in feet (for dimensions method)
6. **depth**: Depth/height in feet (for dimensions method)
7. **count**: Number of identical elements (e.g., 12 identical footings)
8. **squareFeet**: Total area in SF (for area method, slabs)
9. **thickness**: Thickness in inches (for area method, slabs)
10. **cubicYards**: Total volume in CY (for volume method)
11. **densityLevel**: Estimate reinforcement intensity:
    - "light" — lightly reinforced (residential, simple structures)
    - "medium" — typical reinforcement (most commercial)
    - "heavy" — heavily reinforced (seismic, high-rise, transfer elements)
12. **notes**: Any relevant details (seismic zone, special conditions, PT, epoxy, etc.)

IMPORTANT GUIDELINES:
- Read dimensions from plan views, sections, details, schedules, and notes
- If you see a footing schedule, column schedule, or beam schedule, extract ALL entries
- Convert all dimensions to feet for length/width/depth
- For slabs, prefer area method (squareFeet + thickness in inches)
- For walls, use dimensions: length = total wall length, width = wall thickness, depth = wall height
- Count identical elements (e.g., "TYP OF 12" means count=12)
- If exact dimensions aren't visible, estimate based on typical proportions and note it
- Infer density level from the drawing context:
  - Heavy: seismic design categories D-F, transfer structures, shear walls in high-rises
  - Medium: standard commercial, most office/retail/residential
  - Light: simple structures, light loads, residential
- Group similar elements (e.g., all identical footings as one entry with count)

Return ONLY a valid JSON array of objects. No markdown, no explanation. Example:

[
  {
    "name": "Spread Footings F1-F12",
    "elementType": "spread_footing",
    "inputMethod": "dimensions",
    "length": 7,
    "width": 7,
    "depth": 2.5,
    "count": 12,
    "densityLevel": "medium",
    "notes": "Per footing schedule"
  },
  {
    "name": "Slab on Grade",
    "elementType": "slab_on_grade",
    "inputMethod": "area",
    "squareFeet": 15000,
    "thickness": 5,
    "densityLevel": "medium",
    "notes": "#4 @ 18\" EW, WWF 6x6 W2.9xW2.9"
  },
  {
    "name": "Columns C1-C8",
    "elementType": "column_tied",
    "inputMethod": "dimensions",
    "length": 2,
    "width": 2,
    "depth": 14,
    "count": 8,
    "densityLevel": "medium",
    "notes": "24\" square, ground to roof"
  }
]

Return ONLY the JSON array.`;

export interface EstimatingExtractionResult {
  elements: any[];
  rawResponse: string;
  pageCount: number;
}

/**
 * Extract structural elements from drawing images for estimating takeoff.
 * Processes multiple images and merges results.
 */
export async function extractForEstimating(
  imagePaths: string[],
): Promise<EstimatingExtractionResult> {
  const allElements: any[] = [];
  let rawResponse = '';

  // Process each image (page)
  for (const imagePath of imagePaths) {
    try {
      const result = await extractSinglePage(imagePath);
      rawResponse += result.rawResponse + '\n---\n';
      allElements.push(...result.elements);
    } catch (err) {
      console.error(`Failed to extract from ${imagePath}:`, err);
    }
  }

  // Deduplicate elements that appear on multiple pages
  const merged = deduplicateElements(allElements);

  return {
    elements: merged,
    rawResponse,
    pageCount: imagePaths.length,
  };
}

async function extractSinglePage(imagePath: string): Promise<{ elements: any[]; rawResponse: string }> {
  const { base64, mediaType } = await imageToBase64(imagePath);

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: ESTIMATING_PROMPT,
          },
        ],
      },
    ],
  });

  const rawResponse = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  const elements = parseResponse(rawResponse);
  return { elements, rawResponse };
}

function parseResponse(rawResponse: string): any[] {
  try {
    let jsonStr = rawResponse.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    // Validate and normalize each element
    const validTypes = Object.keys(REBAR_DENSITIES);

    return parsed.map((item: any) => {
      const elementType = validTypes.includes(item.elementType) ? item.elementType : 'spread_footing';
      const inputMethod = ['dimensions', 'volume', 'area'].includes(item.inputMethod) ? item.inputMethod : 'dimensions';
      const densityLevel = ['light', 'medium', 'heavy'].includes(item.densityLevel) ? item.densityLevel : 'medium';

      return {
        name: item.name || 'Unknown Element',
        elementType,
        inputMethod,
        length: parseFloat(item.length) || 0,
        width: parseFloat(item.width) || 0,
        depth: parseFloat(item.depth) || 0,
        count: parseInt(item.count) || 1,
        squareFeet: parseFloat(item.squareFeet) || 0,
        thickness: parseFloat(item.thickness) || 0,
        cubicYards: parseFloat(item.cubicYards) || 0,
        densityLevel,
        notes: item.notes || '',
      };
    });
  } catch (err) {
    console.error('Failed to parse estimating response:', err);
    return [];
  }
}

/**
 * Merge duplicate elements that may appear across multiple pages.
 * Elements with the same name and type are combined.
 */
function deduplicateElements(elements: any[]): any[] {
  const seen = new Map<string, any>();

  for (const el of elements) {
    const key = `${el.elementType}:${el.name}`.toLowerCase();

    if (seen.has(key)) {
      // Same element on different pages — keep the one with more data
      const existing = seen.get(key)!;
      const existingScore = scoreElement(existing);
      const newScore = scoreElement(el);
      if (newScore > existingScore) {
        // Preserve count if the existing had a higher count
        if (existing.count > el.count) el.count = existing.count;
        // Merge notes
        if (existing.notes && el.notes && existing.notes !== el.notes) {
          el.notes = `${el.notes}; ${existing.notes}`;
        }
        seen.set(key, el);
      }
    } else {
      seen.set(key, el);
    }
  }

  return Array.from(seen.values());
}

function scoreElement(el: any): number {
  let score = 0;
  if (el.length > 0) score++;
  if (el.width > 0) score++;
  if (el.depth > 0) score++;
  if (el.count > 1) score++;
  if (el.squareFeet > 0) score++;
  if (el.cubicYards > 0) score++;
  if (el.notes) score++;
  return score;
}
