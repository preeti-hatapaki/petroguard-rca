import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface CauseNode {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'terminated' | 'accepted' | 'continuing' | 'merged';
  remark?: string;
  layer: number;
  parentId?: string;
}

export const geminiService = {
  async generateInitialCauses(incident: string): Promise<CauseNode[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a professional Root Cause Analysis (RCA) for the following incident in a refining/petrochemical context: "${incident}".
      Align with CCPS (Center for Chemical Process Safety) and API (American Petroleum Institute) standards (e.g., API RP 754, API 580).
      Provide 5-8 high-level potential causes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING, description: "Short title of the cause" },
              description: { type: Type.STRING, description: "Detailed explanation of why this is a potential cause" }
            },
            required: ["label", "description"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: `initial-${index}`,
      label: item.label,
      description: item.description,
      status: 'pending',
      layer: 1
    }));
  },

  async generateSubCauses(parentCause: string, incident: string, layer: number): Promise<CauseNode[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `In the context of this incident: "${incident}", we are investigating this specific cause: "${parentCause}".
      Provide 3-6 deeper sub-causes or contributing factors. Use industry-standard failure logic (e.g., TapRooT, 5 Whys, Fishbone).
      Layer depth is ${layer}. Focus on technical, organizational, and human factors.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["label", "description"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: `sub-${layer}-${Math.random().toString(36).substr(2, 9)}`,
      label: item.label,
      description: item.description,
      status: 'pending',
      layer: layer
    }));
  },

  async suggestActions(rootCause: string): Promise<{ action: string; description: string }[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `For the identified root cause: "${rootCause}", suggest 3-5 specific, measurable, and actionable corrective/preventive actions (CAPA) aligned with API and CCPS guidelines.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["action", "description"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  }
};
