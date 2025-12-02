import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProcessItem, ScanMode } from "../types";

// Helper to sanitize JSON string if the model returns markdown code blocks
const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|\n?```/g, '').trim();
};

export const analyzeProcessList = async (
  processes: ProcessItem[],
  mode: ScanMode
): Promise<ProcessItem[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("No API Key found");

  const ai = new GoogleGenAI({ apiKey });

  // Simplify list for the prompt to save tokens/complexity
  const simpleList = processes.map(p => ({ name: p.name, memory: p.memoryMB + "MB" }));
  const jsonList = JSON.stringify(simpleList);

  const modelName = mode === ScanMode.DEEP_THINKING ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
  // Define Schema for structured output
  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING, enum: ['System', 'User', 'Background', 'Bloatware', 'Unknown'] },
        safeToKill: { type: Type.BOOLEAN },
        riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
        reasoning: { type: Type.STRING },
      },
      required: ['name', 'description', 'category', 'safeToKill', 'riskLevel'],
    },
  };

  const systemInstruction = `
    You are an Expert Windows Systems Architect. 
    Analyze the provided list of running processes.
    Identify which are critical system components (Kernel, Drivers) and which are user-space applications or potential bloatware.
    Determine if they are safe to terminate to free up RAM.
    
    CRITICAL RULES:
    1. 'svchost.exe', 'System', 'Registry', 'smss.exe', 'csrss.exe', 'wininit.exe', 'services.exe', 'lsass.exe', 'explorer.exe' are ALWAYS Critical/High Risk. NEVER safe to kill.
    2. Common browsers (chrome, firefox) are 'User' apps, safe to kill but will lose data.
    3. Look for updaters (AdobeUpdater, JavaUpdate) as 'Bloatware'/'Background'.
    
    Return a JSON array matching the schema.
  `;

  try {
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: systemInstruction,
    };

    if (mode === ScanMode.DEEP_THINKING) {
      // Use Thinking Budget for deep reasoning on obscure processes
      config.thinkingConfig = { thinkingBudget: 16000 }; 
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Analyze these processes: ${jsonList}`,
      config: config,
    });

    const resultText = response.text || "[]";
    const analysis = JSON.parse(cleanJsonString(resultText));

    // Merge analysis back into original items
    return processes.map(p => {
      const match = analysis.find((a: any) => a.name === p.name);
      if (match) {
        return {
          ...p,
          description: match.description,
          category: match.category,
          safeToKill: match.safeToKill,
          riskLevel: match.riskLevel,
          reasoning: match.reasoning,
        };
      }
      return p;
    });

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const lookupUnknownProcess = async (processName: string): Promise<string> => {
   const apiKey = process.env.API_KEY;
   if (!apiKey) throw new Error("No API Key");
   
   const ai = new GoogleGenAI({ apiKey });

   try {
     const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: `What is the Windows process "${processName}"? Is it safe to disable? Be concise.`,
       config: {
         tools: [{ googleSearch: {} }],
       }
     });

     // Extract grounding metadata if available
     const grounding = response.candidates?.[0]?.groundingMetadata;
     let text = response.text || "No information found.";
     
     if (grounding?.groundingChunks) {
        const sources = grounding.groundingChunks
          .map((c: any) => c.web?.uri)
          .filter(Boolean)
          .slice(0, 2)
          .join('\n');
        
        if (sources) {
            text += `\n\nSources:\n${sources}`;
        }
     }
     
     return text;

   } catch (e) {
     return "Could not retrieve details.";
   }
};