import { GoogleGenAI, Type } from '@google/genai';
import { Rule, Configuration, ValidationViolation, ProductAttribute } from '../types';

// NOTE: In a real environment, this API key would come from a secure backend proxy or properly injected env var.
// The prompt instructions specify using process.env.API_KEY directly.
const API_KEY = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MOCK_EXTRACTED_RULES: Rule[] = [
  {
    id: `draft-${Date.now()}-1`,
    natural_text: "Marine environments require Stainless Steel casing (which implies Cooling Unit ACM-600).",
    type: 'implication',
    condition: { attribute: 'environment', operator: '==', value: 'marine' },
    consequence: { attribute: 'cooling_unit', operator: '==', value: 'ACM-600' },
    priority: 50,
    confidence: 0.85,
    approved: false,
    created_at: new Date().toISOString(),
    source_doc: 'uploaded_reqs.txt'
  },
  {
    id: `draft-${Date.now()}-2`,
    natural_text: "Standard Motor (5HP) cannot be used with ACM-600.",
    type: 'implication',
    condition: { attribute: 'cooling_unit', operator: '==', value: 'ACM-600' },
    consequence: { attribute: 'motor_hp', operator: '>=', value: 12 },
    priority: 50,
    confidence: 0.92,
    approved: false,
    created_at: new Date().toISOString(),
    source_doc: 'uploaded_reqs.txt'
  }
];

export const extractRulesFromText = async (text: string, attributes: ProductAttribute[]): Promise<Rule[]> => {
  if (!API_KEY) {
    console.warn("No API Key found. Returning mock extraction.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return MOCK_EXTRACTED_RULES;
  }

  const validAttributesString = attributes.map(a => a.id).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a CPQ Rule Extractor. Extract logical constraints from the following text and return them as a JSON array.
      
      Schema for Rule:
      {
        id: string (generate a unique id),
        natural_text: string (summary of the rule),
        type: 'implication' | 'exclusion',
        condition: { attribute: string, operator: string, value: any },
        consequence: { attribute: string, operator: string, value: any } (only for implication),
        confidence: number (0-1),
        source_doc: string (use 'uploaded_text')
      }

      Valid Attributes: ${validAttributesString}.
      Valid Operators: >, >=, <, <=, ==, !=, in.

      Text to parse:
      "${text}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    natural_text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['implication', 'exclusion'] },
                    condition: {
                        type: Type.OBJECT,
                        properties: {
                            attribute: { type: Type.STRING },
                            operator: { type: Type.STRING },
                            value: { type: Type.STRING } // Using string for flexibility in schema, cast later if needed
                        }
                    },
                    consequence: {
                        type: Type.OBJECT,
                        properties: {
                            attribute: { type: Type.STRING },
                            operator: { type: Type.STRING },
                            value: { type: Type.STRING }
                        }
                    },
                    confidence: { type: Type.NUMBER },
                    source_doc: { type: Type.STRING }
                }
            }
        }
      }
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty response from LLM");
    
    const parsed = JSON.parse(raw);
    
    // Post-processing to ensure clean structure match
    return parsed.map((r: any) => ({
      ...r,
      approved: false,
      created_at: new Date().toISOString(),
      // Simple heuristic to cast number strings back to numbers for the engine
      condition: { ...r.condition, value: isNaN(Number(r.condition.value)) ? r.condition.value : Number(r.condition.value) },
      consequence: r.consequence ? { ...r.consequence, value: isNaN(Number(r.consequence.value)) ? r.consequence.value : Number(r.consequence.value) } : undefined
    }));

  } catch (error) {
    console.error("LLM Extraction failed", error);
    return MOCK_EXTRACTED_RULES;
  }
};

export const getFixSuggestions = async (config: Configuration, violations: ValidationViolation[]): Promise<string> => {
   if (!API_KEY) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "Suggestion (Mock): Based on the violation, consider upgrading the Cooling Unit to ACM-500 to match the high horsepower motor selected.";
  }

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a CPQ Advisor. The user has an invalid configuration.
      
      Current Config: ${JSON.stringify(config)}
      Violations: ${JSON.stringify(violations)}

      Please suggest a specific fix in 1-2 sentences. Explain why.
      `
     });
     return response.text || "No suggestion available.";
  } catch (e) {
      console.error(e);
      return "Unable to generate suggestions at this time.";
  }
}