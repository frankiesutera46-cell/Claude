import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { imageToBase64 } from './fileIngestion.js';
import type { CreateRebarItem } from '../models/RebarItem.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const EXTRACTION_PROMPT = `You are an expert structural engineering drawing reader specializing in reinforcement (rebar) detailing. Analyze the structural drawing image provided and extract ALL reinforcement bar information visible.

For each rebar callout, note, schedule entry, or detail you can identify, extract:

1. **barMark**: The bar mark/label (e.g., "1A", "2", "B1", "M1"). If no mark is visible, create one based on the element.
2. **barSize**: The ACI bar size number (3-18). Parse from callouts like "#5", "No.5", "#5 bar", etc.
3. **shapeCode**: The shape:
   - "00" = Straight bar
   - "11" = L-shape (single 90° bend)
   - "13" = Z-shape (2 opposite bends/crank)
   - "21" = U-shape / hairpin
   - "51" = Rectangular stirrup/tie
   - "52" = Stirrup with hooks
   - "56" = Circular/hoop
   - "99" = Special/other shape
4. **dimensions**: Object with legs labeled a, b, c, d, e (in inches). For stirrups, a=width, b=height. Include hookType if hooks shown ("90", "135", "180").
5. **quantity**: Number of bars. Parse from "12-#8", "(12) #8", "12 EA", etc.
6. **spacing**: On-center spacing in inches. Parse "@ 12" O.C.", "@ 300mm", "12" ctrs", etc.
7. **structuralElement**: What element this bar belongs to (e.g., "Footing F1", "Column C3", "Beam B2", "Slab S1", "Wall W1").
8. **zone**: Construction zone or pour area if noted.
9. **totalLength**: Total bar length in inches if directly stated. Parse "22'-6"" as 270.
10. **grade**: Steel grade (40, 60, 75, 80). Default 60 if not stated.
11. **coating**: "epoxy" if noted as epoxy-coated, "galvanized" if galvanized, otherwise "none".
12. **notes**: Any special notes (stagger, alternate, EF/NF/EW, lap splice info, etc.).

IMPORTANT parsing rules:
- "#5 @ 12" O.C." → barSize=5, spacing=12
- "12-#8 x 22'-6"" → quantity=12, barSize=8, totalLength=270
- "(4) #9 T&B" → quantity=4 (per layer), barSize=9, notes="Top and Bottom"
- "#4 stirrups @ 8" O.C." → barSize=4, shapeCode="51", spacing=8
- "2 legs #4 @ 6"" → quantity based on member length/6, barSize=4, shapeCode="51"

Look carefully at:
- Bar schedules/tables on the drawing
- Section cuts and detail views
- Dimension callouts on bars
- General notes about reinforcement
- Typical details that apply to multiple elements

Return ONLY a valid JSON array of objects. Each object must have all fields listed above. If a field is unknown, use null. Example:

[
  {
    "barMark": "1",
    "barSize": 5,
    "shapeCode": "00",
    "dimensions": {"a": 240},
    "quantity": 8,
    "spacing": 12,
    "structuralElement": "Footing F1",
    "zone": null,
    "totalLength": 240,
    "grade": 60,
    "coating": "none",
    "notes": "Bottom mat, E.W."
  }
]

Return ONLY the JSON array. No markdown, no explanation, no code fences.`;

export interface ExtractionResult {
  items: Partial<CreateRebarItem>[];
  rawResponse: string;
  confidence: number;
}

/**
 * Extract rebar information from a drawing image using Claude Vision API.
 */
export async function extractWithClaude(
  imagePath: string,
  projectId: string,
  sheetId: string,
): Promise<ExtractionResult> {
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
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const rawResponse = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  const items = parseClaudeResponse(rawResponse, projectId, sheetId);
  const confidence = items.length > 0 ? calculateConfidence(items) : 0;

  return { items, rawResponse, confidence };
}

function parseClaudeResponse(
  rawResponse: string,
  projectId: string,
  sheetId: string,
): Partial<CreateRebarItem>[] {
  try {
    // Try to extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => ({
      projectId,
      sheetId,
      barMark: item.barMark || '',
      barSize: parseInt(item.barSize) || 5,
      shapeCode: item.shapeCode || '00',
      totalLength: item.totalLength || undefined,
      dimensions: {
        a: item.dimensions?.a || undefined,
        b: item.dimensions?.b || undefined,
        c: item.dimensions?.c || undefined,
        d: item.dimensions?.d || undefined,
        e: item.dimensions?.e || undefined,
        hookType: item.dimensions?.hookType || undefined,
      },
      quantity: parseInt(item.quantity) || 1,
      spacing: item.spacing || undefined,
      structuralElement: item.structuralElement || '',
      zone: item.zone || undefined,
      grade: item.grade || 60,
      coating: item.coating || 'none',
      notes: item.notes || undefined,
      confidence: 0.85, // Base confidence for Claude extraction
      source: 'claude' as const,
    }));
  } catch (err) {
    console.error('Failed to parse Claude response:', err);
    return [];
  }
}

function calculateConfidence(items: Partial<CreateRebarItem>[]): number {
  if (items.length === 0) return 0;

  let totalScore = 0;
  for (const item of items) {
    let score = 0.5; // Base score for having any data
    if (item.barMark) score += 0.1;
    if (item.barSize) score += 0.1;
    if (item.quantity && item.quantity > 0) score += 0.1;
    if (item.structuralElement) score += 0.1;
    if (item.totalLength || (item.dimensions && Object.values(item.dimensions).some((v) => v))) score += 0.1;
    totalScore += Math.min(score, 1);
  }

  return totalScore / items.length;
}
