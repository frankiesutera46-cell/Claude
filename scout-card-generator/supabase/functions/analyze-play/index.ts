import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image, userEmail } = await req.json();

    // Only allow authorized emails
    const ALLOWED_EMAILS = ["frankiesutera46@gmail.com", "frankiesuteraphoto@gmail.com"];
    if (!userEmail || !ALLOWED_EMAILS.includes(userEmail.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine media type from base64 header
    let mediaType = "image/png";
    let imageData = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1];
        imageData = match[2];
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: "text",
                text: `Analyze this football play diagram image. Extract the play information and return ONLY valid JSON (no markdown, no explanation) with this exact structure:

{
  "playName": "name of the play if visible, or best guess",
  "formation": "closest match from: doubR, doubL, 3x1R, 3x1L, treyR, treyL, deuceR, deuceL, empty",
  "players": [
    {
      "key": "player key (QB, RB, X, Z, H, Y, F for offense; C, LG, RG, LT, RT for OL)",
      "label": "label shown on diagram",
      "xPct": 0.5,
      "yPct": 0.7,
      "side": "offense"
    }
  ],
  "routes": [
    {
      "playerKey": "X",
      "routeType": "closest match from: go, post, corner, seam, wheel, dig, out, comeback, slant, over, hitch, flat, screen, drag, arrow, swing, riz, roz, rpwr, rctr, rdraw, rswp, bpass, bdrive, bpull, breach, motl, motr, jetl, jetr",
      "waypoints": [
        {"xPct": 0.1, "yPct": 0.5},
        {"xPct": 0.15, "yPct": 0.2}
      ]
    }
  ]
}

IMPORTANT RULES:
- xPct and yPct are percentages (0-1) of the image dimensions. 0,0 = top-left. 1,1 = bottom-right.
- For each player with a route line drawn, include an entry in "routes" with waypoints tracing the path.
- Waypoints should follow the actual drawn line path — include the start point (at the player) and key turns/endpoints.
- Include 2-6 waypoints per route to capture the shape accurately.
- If the play shows blocking assignments, use routeType: bpass, bdrive, bpull, or breach.
- If a route doesn't match any known type, pick the closest one.
- For run plays, identify the runner and use riz/roz/rpwr/rctr/rdraw/rswp.
- Only include offensive players you can clearly identify. Skip defenders unless they're clearly labeled.
- The "key" for skill players should be: QB (quarterback), RB (running back), X (split end/boundary WR), Z (flanker WR), H (slot receiver), Y (tight end), F (flex if 5 receivers).
- OL keys: C (center), LG, RG, LT, RT.
- Return ONLY the JSON object. No text before or after.`
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the text response
    const text = data.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let playData;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      playData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to parse play data", raw: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(playData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
