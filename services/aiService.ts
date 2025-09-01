
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { TripPreferences, ItineraryPlan, AIProviderConfig } from '../types';
import { tripAdvisorTool, handleTripAdvisorTool } from '../tools/tripAdvisorTool';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini provider will not work.");
}
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;


// New tool definition for OpenAI-compatible APIs like Groq
const openAITripAdvisorTool = {
    type: "function" as const,
    function: {
        name: "searchTripAdvisor",
        description: "Gets a TripAdvisor search URL for a specific restaurant in a given city. Use this to provide a link for dining suggestions.",
        parameters: {
            type: "object",
            properties: {
                restaurantName: { type: "string", description: "The name of the restaurant to search for." },
                destination: { type: "string", description: "The city where the restaurant is located." },
            },
            required: ["restaurantName", "destination"],
        },
    },
};


const ITINERARY_PLAN_SCHEMA_DESCRIPTION = `
  You must produce a JSON object with the following structure. Do not add any text before or after the JSON object.

  interface Location { latitude: number; longitude: number; }

  interface ItineraryPlan {
    tripTitle: string; // Catchy, descriptive title.
    tripOverview: string; // Engaging summary paragraph.
    costEstimation: { ... }; // Estimated costs for accommodation, activities, food, and total.
    flightInfo: { ... }; // 2-3 flight suggestions and a Google Flights URL.
    accommodation: {
      recommendations: string;
      examples: {
          name: string; // Specific hotel/apartment name.
          priceRange: string;
          bookingUrl?: string; // booking.com URL for the specific accommodation.
          location?: Location; // Geographic coordinates.
      }[];
    };
    generalTips: { ... }; // Tips for transit, customs, weather, and practical advice.
    dailyItineraries: {
      day: number;
      date: string;
      title: string;
      activities: {
        time: string;
        description: string;
        details?: string;
        location?: Location; // Geographic coordinates for the activity.
      }[];
      food: {
        meal: string;
        suggestion: string; // Specific restaurant name.
        notes?: string;
        link?: string; // TripAdvisor URL.
        location?: Location; // Geographic coordinates for the restaurant.
      }[];
      insiderTip: string;
    }[];
    packingList: {
      packingTips: string; // General packing advice based on weather and activities.
      categories: {
        category: string; // e.g., 'Clothing', 'Documents', 'Electronics'.
        items: {
          item: string; // The item to pack.
          notes: string; // e.g., '2 pairs, waterproof', 'for formal dinner'.
        }[];
      }[];
    };
  }
`;

const languageMap: { [key: string]: string } = {
  en: 'English',
  pt: 'European Portuguese',
  fr: 'French',
};

const buildBasePrompt = (prefs: TripPreferences): string => {
  return `
  You are an expert travel planner. Your task is to create a detailed, personalized, and realistic travel itinerary in English.
  
  **CRITICAL INSTRUCTIONS:**
  1.  **Find Coordinates:** For EVERY accommodation, activity, and restaurant you suggest, you MUST find its geographic coordinates and include them in the 'location' field as { "latitude": <number>, "longitude": <number> }.
  2.  **Research Flights:** Find 2-3 flight options from ${prefs.origin} to ${prefs.destination} and generate a pre-filled Google Flights URL.
  3.  **Estimate Costs:** Provide a cost breakdown for 'accommodation', 'activities', 'food', and a 'total' estimate based on the user's budget.
  4.  **Suggest Dining:** For every dining suggestion, suggest a specific, real restaurant. Use the 'searchTripAdvisor' tool to generate a search URL for each one and place it in the 'link' property.
  5.  **Suggest Accommodation:** For each accommodation example, include a specific name, price, a booking.com search URL, and its geographic coordinates.
  6.  **Provide Transit Advice:** In 'generalTips.transit', give specific advice on getting from the destination's main airport to the city center.
  7.  **Generate a Packing List:** Create a personalized packing list in the 'packingList' field. Base it on the destination's weather for the travel dates, the planned activities, and the trip duration. Organize it into logical categories like 'Clothing', 'Documents & Money', 'Toiletries', 'Electronics', and 'Miscellaneous'. Provide helpful notes for items.
  
  User Preferences:
  - Origin: ${prefs.origin}
  - Destination: ${prefs.destination}
  - Trip Duration: ${prefs.duration} days
  - Travel Dates: Starting on ${prefs.startDate} for ${prefs.duration} days.
  - Group Composition: ${prefs.groupComposition}
  - Budget: ${prefs.budget}
  - Key Interests: ${prefs.interests.join(', ')}
  - Preferred Accommodation Style: ${prefs.accommodationStyle}
  - Transportation Preference: ${prefs.transportation}
  - Special Needs or Constraints: ${prefs.specialNeeds || 'None'}
  - Prior Experience with Destination: ${prefs.experience}
  - Desired Attraction Type: ${prefs.attractionType}
  - Response Language: English
`;
}

const generateWithGemini = async (prefs: TripPreferences): Promise<ItineraryPlan> => {
    if (!ai) throw new Error("Google Gemini API key not configured.");

    const prompt = buildBasePrompt(prefs) + `
      Please generate a complete itinerary based on the details above.
      You MUST respond ONLY with a single, valid JSON object that strictly follows the schema structure described below.
      Do not include any text, pleasantries, or markdown formatting (like \`\`\`json) before or after the JSON object.

      ${ITINERARY_PLAN_SCHEMA_DESCRIPTION}
    `;

    const model = "gemini-2.5-flash";
    const tools = [tripAdvisorTool];
    const conversationHistory: { role: string; parts: Part[] }[] = [
        { role: 'user', parts: [{ text: prompt }] }
    ];
    let response!: GenerateContentResponse;
    const MAX_TOOL_ROUNDS = 5; // Prevent infinite loops

    try {
        for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
            const result = await ai.models.generateContent({
                model,
                contents: conversationHistory,
                config: {
                    tools,
                },
            });
            response = result; // Store the latest response

            const candidate = response.candidates?.[0];
            if (!candidate) {
                throw new Error("The AI did not return a candidate response.");
            }
            
            const modelResponseContent = candidate.content;
            
            // If the model response is empty or has no parts, we assume it's the final text response.
            if (!modelResponseContent?.parts) {
                break;
            }

            // Add the model's response to history. This contains the function calls the model wants to make.
            conversationHistory.push({ role: 'model', parts: modelResponseContent.parts });
            
            // Extract all function calls from the response parts
            const functionCalls = modelResponseContent.parts
                .filter(part => !!part.functionCall)
                .map(part => part.functionCall!); // Use non-null assertion as we've filtered

            // If there are no function calls, we're done with tool usage and can exit the loop.
            if (functionCalls.length === 0) {
                break; 
            }

            // Safety check to prevent infinite loops
            if (i === MAX_TOOL_ROUNDS - 1) {
                throw new Error("The AI model is stuck in a tool-calling loop.");
            }
            
            // Process all function calls and get the tool responses
            const toolResponseParts: Part[] = functionCalls.map(handleTripAdvisorTool);
            
            // Add all tool responses back to the conversation history in a single 'tool' turn
            conversationHistory.push({ role: 'tool', parts: toolResponseParts });
        }

        const responseText = response.text;
        if (!responseText) {
            const finishReason = response.candidates?.[0]?.finishReason;
            let errorMessage = `The AI returned an empty response. Finish reason: ${finishReason || 'Unknown'}.`;
            if (finishReason === 'SAFETY') {
                errorMessage = `The AI response was blocked for safety reasons. Please modify your request.`;
            }
            console.error("Gemini response text was empty.", { response });
            throw new Error(errorMessage);
        }

        let jsonText;
        // Try to find a JSON block enclosed in markdown fences
        const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
            jsonText = jsonBlockMatch[1].trim();
        } else {
            // If no markdown fence, find the first '{' and last '}'
            const firstBraceIndex = responseText.indexOf('{');
            const lastBraceIndex = responseText.lastIndexOf('}');
            if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
                jsonText = responseText.substring(firstBraceIndex, lastBraceIndex + 1);
            } else {
                 console.error("Could not find a valid JSON object in the AI response.", { responseText });
                 throw new Error("The AI returned a plan in an unexpected format. Please try again.");
            }
        }
        
        try {
            const plan: ItineraryPlan = JSON.parse(jsonText.replace(/\\'/g, "'"));
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks?.length) {
              plan.sources = groundingChunks
                .map((chunk: any) => chunk.web)
                .filter((source: any) => source?.uri && source.title)
                .map((source: any) => ({ uri: source.uri, title: source.title }));
            }
            return plan;
        } catch (e) {
            console.error("Failed to parse JSON from Gemini response:", jsonText, e);
            throw new Error("The AI returned a plan in an unexpected format. Please try again.");
        }
    } catch (error) {
        console.error("Error generating itinerary from Gemini API:", error, "Raw response:", response?.text);
        if (error instanceof SyntaxError) {
          throw new Error("The AI returned a plan in an unexpected format. Please try again.");
        }
        if (error instanceof Error) throw error;
        throw new Error("Failed to parse or receive a valid plan from the Gemini AI.");
    }
};

// Helper function to handle Groq API calls with model fallback
const groqApiCallWithFallback = async (apiKey: string, bodyPayload: Omit<any, 'model'>): Promise<any> => {
    const groqModels = ["llama3-70b-8192", "llama3-8b-8192", "gemma-7b-it"];
    let lastError: Error | null = null;

    for (const model of groqModels) {
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...bodyPayload, model })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                const errorMessage = `Groq API error with model ${model}: ${errorBody.error?.message || 'Unknown error'}`;
                console.warn(errorMessage);
                lastError = new Error(errorMessage);
                continue; // Try next model
            }
            // If response is OK, we've succeeded.
            return await response.json();
        } catch (error) {
            console.warn(`Request failed for Groq model '${model}'. Trying next...`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }
    // If the loop completes without returning, it means all models failed.
    throw lastError || new Error("All configured Groq models failed.");
};


const generateWithGroq = async (prefs: TripPreferences, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.groqApiKey) throw new Error("Groq API key not provided.");
    
    const prompt = buildBasePrompt(prefs) + `
    After using any necessary tools, you must produce a single, valid JSON object containing the complete itinerary.
    Adhere strictly to all instructions from the base prompt.
    `;

    const openAITools = [openAITripAdvisorTool];
    const messages: any[] = [{ role: "user", content: prompt }];

    try {
        for (let i = 0; i < 5; i++) { // Allow up to 5 rounds of tool calls
            const data = await groqApiCallWithFallback(config.groqApiKey, {
                messages: messages,
                temperature: 0.7,
                tools: openAITools,
                tool_choice: "auto"
            });

            const message = data.choices[0]?.message;
            if (!message) throw new Error("Groq API returned an empty message.");
            messages.push(message);

            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const functionCallForHandler = {
                        name: toolCall.function.name,
                        args: JSON.parse(toolCall.function.arguments)
                    };
                    const toolResponsePart = handleTripAdvisorTool(functionCallForHandler);
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolResponsePart.functionResponse.name,
                        content: JSON.stringify(toolResponsePart.functionResponse.response),
                    });
                }
                continue;
            } else {
                const jsonText = message.content;
                try {
                  const firstBraceIndex = jsonText.indexOf('{');
                  const lastBraceIndex = jsonText.lastIndexOf('}');
                  if (firstBraceIndex === -1 || lastBraceIndex === -1) {
                      throw new Error("No JSON object found in response.");
                  }
                  const sanitizedJsonText = jsonText.substring(firstBraceIndex, lastBraceIndex + 1);
                  return JSON.parse(sanitizedJsonText);
                } catch (e) {
                    console.error("Failed to parse JSON from Groq response:", jsonText, e);
                    throw new Error("The AI returned a plan in an unexpected format. Please try again.");
                }
            }
        }
        throw new Error("The AI model did not produce a final plan after multiple tool calls.");
    } catch (error) {
        console.error("Error generating itinerary from Groq API:", error);
        throw new Error(`Failed to get a valid plan from Groq. ${error instanceof Error ? error.message : ''}`);
    }
};

const generateWithOllama = async (prefs: TripPreferences, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.ollamaUrl || !config.ollamaModel) throw new Error("Ollama URL or model not configured.");
    
    const prompt = buildBasePrompt(prefs) + `
    IMPORTANT INSTRUCTION: For each day in the 'dailyItineraries' array, the 'food' array MUST contain at least two entries: one for 'Lunch' and one for 'Dinner'.
    ` + ITINERARY_PLAN_SCHEMA_DESCRIPTION;

    try {
        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.ollamaModel,
                prompt: prompt,
                format: "json",
                stream: false,
            })
        });
        if (!response.ok) throw new Error(`Ollama server returned an error: ${response.statusText}`);
        const data = await response.json();
        if (typeof data.response !== 'string') {
            throw new Error("Ollama response format is invalid.");
        }
        try {
            return JSON.parse(data.response);
        } catch (e) {
            console.error("Failed to parse JSON from Ollama response:", data.response, e);
            throw new Error("The AI returned a plan in an unexpected format. Please try again.");
        }
    } catch (error) {
        console.error("Error generating itinerary from Ollama:", error);
        throw new Error(`Failed to get a valid plan from Ollama. Ensure the server is running. ${error instanceof Error ? error.message : ''}`);
    }
};

export const generateItinerary = async (prefs: TripPreferences, config: AIProviderConfig): Promise<ItineraryPlan> => {
    switch (config.provider) {
        case 'groq': return generateWithGroq(prefs, config);
        case 'ollama': return generateWithOllama(prefs, config);
        case 'gemini': default: return generateWithGemini(prefs);
    }
};

// --- Itinerary Modification Functions ---

const buildModificationPrompt = (currentPlan: ItineraryPlan, modificationRequest: string): string => {
  return `
    You are an expert travel planner AI. Your task is to modify an existing travel itinerary based on a user's request.

    **CRITICAL INSTRUCTIONS:**
    1.  Analyze the provided JSON of the current itinerary.
    2.  Analyze the user's modification request.
    3.  Generate a **complete, new itinerary JSON object** that incorporates the requested change.
    4.  **Do not just output the changed part.** You must return the full, updated itinerary object.
    5.  Maintain the exact same JSON schema as the original, including all fields like 'location' and 'packingList'.
    6.  If the user requests to add or change a restaurant, you **MUST use the 'searchTripAdvisor' tool** to get a new search URL for it and place it in the 'link' property. You must also find and add its 'location' coordinates.
    7.  If the change affects activities or duration, consider if the 'packingList' needs minor adjustments and make them.
    8.  Ensure all other parts of the itinerary (like timings and daily themes) remain logical and consistent after the change.
    9.  Respond ONLY with the raw JSON object, without any markdown formatting (like \`\`\`json) or extra text.

    **Current Itinerary JSON:**
    ${JSON.stringify(currentPlan, null, 2)}

    **User's Modification Request:**
    "${modificationRequest}"
  `;
};

const modifyWithGemini = async (currentPlan: ItineraryPlan, modificationRequest: string): Promise<ItineraryPlan> => {
    if (!ai) throw new Error("Google Gemini API key not configured.");
    const prompt = buildModificationPrompt(currentPlan, modificationRequest);

    // This logic is nearly identical to generateWithGemini, just with a different initial prompt
    const model = "gemini-2.5-flash";
    const tools = [tripAdvisorTool];
    const conversationHistory: { role: string; parts: Part[] }[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let response!: GenerateContentResponse;

    try {
        for (let i = 0; i < 5; i++) {
            const result = await ai.models.generateContent({ model, contents: conversationHistory, config: { tools } });
            response = result;
            const candidate = response.candidates?.[0];
            if (!candidate) throw new Error("AI modification did not return a candidate.");
            if (!candidate.content?.parts) break;

            conversationHistory.push({ role: 'model', parts: candidate.content.parts });
            const functionCalls = candidate.content.parts.filter(p => !!p.functionCall).map(p => p.functionCall!);
            if (functionCalls.length === 0) break;

            const toolResponseParts: Part[] = functionCalls.map(handleTripAdvisorTool);
            conversationHistory.push({ role: 'tool', parts: toolResponseParts });
        }

        const responseText = response.text;
        if (!responseText) throw new Error("AI returned an empty response during modification.");

        try {
            const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonText = jsonBlockMatch?.[1] ? jsonBlockMatch[1].trim() : responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1);
            return JSON.parse(jsonText.replace(/\\'/g, "'"));
        } catch (e) {
            console.error("Failed to parse JSON from Gemini modification response:", responseText, e);
            throw new Error("The AI returned a modified plan in an unexpected format.");
        }
    } catch (error) {
        console.error("Error modifying itinerary with Gemini:", error);
        throw new Error("Failed to modify the plan with Gemini AI.");
    }
};

const modifyWithGroq = async (currentPlan: ItineraryPlan, modificationRequest: string, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.groqApiKey) throw new Error("Groq API key not provided for modification.");
    const prompt = buildModificationPrompt(currentPlan, modificationRequest);
    const openAITools = [openAITripAdvisorTool];
    const messages: any[] = [{ role: "user", content: prompt }];

    try {
        for (let i = 0; i < 5; i++) {
            const data = await groqApiCallWithFallback(config.groqApiKey, {
                messages,
                temperature: 0.7,
                tools: openAITools,
                tool_choice: "auto"
            });

            const message = data.choices[0]?.message;
            if (!message) throw new Error("Groq API returned an empty message during modification.");
            messages.push(message);

            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const functionCallForHandler = { name: toolCall.function.name, args: JSON.parse(toolCall.function.arguments) };
                    const toolResponsePart = handleTripAdvisorTool(functionCallForHandler);
                    messages.push({ tool_call_id: toolCall.id, role: "tool", name: toolResponsePart.functionResponse.name, content: JSON.stringify(toolResponsePart.functionResponse.response) });
                }
            } else {
                const jsonText = message.content;
                try {
                    const firstBraceIndex = jsonText.indexOf('{');
                    const lastBraceIndex = jsonText.lastIndexOf('}');
                    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
                        throw new Error("No JSON object found in response.");
                    }
                    return JSON.parse(jsonText.substring(firstBraceIndex, lastBraceIndex + 1));
                } catch(e) {
                    console.error("Failed to parse JSON from Groq modification response:", jsonText, e);
                    throw new Error("The AI returned a modified plan in an unexpected format.");
                }
            }
        }
        throw new Error("The AI model did not produce a final plan after modification attempts.");
    } catch (error) {
        console.error("Error modifying itinerary with Groq:", error);
        throw new Error(`Failed to modify plan with Groq. ${error instanceof Error ? error.message : ''}`);
    }
};

const modifyWithOllama = async (currentPlan: ItineraryPlan, modificationRequest: string, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.ollamaUrl || !config.ollamaModel) throw new Error("Ollama URL or model not configured for modification.");
    const prompt = buildModificationPrompt(currentPlan, modificationRequest);

    try {
        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: config.ollamaModel, prompt, format: "json", stream: false })
        });
        if (!response.ok) throw new Error(`Ollama server error during modification: ${response.statusText}`);
        const data = await response.json();
        try {
            return JSON.parse(data.response);
        } catch (e) {
            console.error("Failed to parse JSON from Ollama modification response:", data.response, e);
            throw new Error("The AI returned a modified plan in an unexpected format.");
        }
    } catch (error) {
        console.error("Error modifying itinerary with Ollama:", error);
        throw new Error(`Failed to modify plan with Ollama. ${error instanceof Error ? error.message : ''}`);
    }
};

export const modifyItinerary = async (currentPlan: ItineraryPlan, modificationRequest: string, config: AIProviderConfig): Promise<ItineraryPlan> => {
    switch (config.provider) {
        case 'groq': return modifyWithGroq(currentPlan, modificationRequest, config);
        case 'ollama': return modifyWithOllama(currentPlan, modificationRequest, config);
        case 'gemini': default: return modifyWithGemini(currentPlan, modificationRequest);
    }
};


// --- Translation Functions ---

const buildTranslationPrompt = (itinerary: ItineraryPlan, targetLanguage: string) => {
    const languageName = languageMap[targetLanguage] || 'English';
    return `
      You are an expert translator. Your task is to translate all user-facing string values in the following JSON object to ${languageName}.
      **CRITICAL INSTRUCTIONS:**
      1.  Translate EVERY user-facing string value (titles, descriptions, tips, notes, etc.).
      2.  Do NOT touch the JSON structure, keys, or any non-string values (like numbers, coordinates, or URLs).
      3.  The 'category' names in the 'packingList' should be translated (e.g., "Clothing" to "Vêtements").
      4.  If a string is a proper name (e.g., "Colosseum", "Eiffel Tower", "Pizzarium Bonci"), keep the original name.
      5.  Ensure your output is ONLY the translated JSON object, with no extra text or markdown formatting.

      Here is the JSON object to translate:
      ${JSON.stringify(itinerary, null, 2)}
    `;
};

const translateWithGemini = async (prompt: string): Promise<ItineraryPlan> => {
    if (!ai) throw new Error("Google Gemini API key not configured for translation.");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json" },
        });
        const jsonText = response.text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error translating with Gemini:", error);
        throw new Error("Failed to translate the itinerary with Gemini.");
    }
};

const translateWithGroq = async (prompt: string, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.groqApiKey) throw new Error("Groq API key not provided for translation.");
    try {
        const data = await groqApiCallWithFallback(config.groqApiKey, {
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });
        return JSON.parse(data.choices[0].message.content);
    } catch (error) {
        console.error("Error translating with Groq:", error);
        throw new Error(`Failed to translate with Groq. ${error instanceof Error ? error.message : ''}`);
    }
};

const translateWithOllama = async (prompt: string, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.ollamaUrl || !config.ollamaModel) throw new Error("Ollama URL/model not configured for translation.");
    try {
        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: config.ollamaModel, prompt: prompt, format: "json", stream: false })
        });
        if (!response.ok) throw new Error(`Ollama server error: ${response.statusText}`);
        const data = await response.json();
        return JSON.parse(data.response);
    } catch (error) {
        console.error("Error translating with Ollama:", error);
        throw new Error(`Failed to translate with Ollama. ${error instanceof Error ? error.message : ''}`);
    }
};

export const translateItinerary = async (itinerary: ItineraryPlan, targetLanguage: string, config: AIProviderConfig): Promise<ItineraryPlan> => {
    const prompt = buildTranslationPrompt(itinerary, targetLanguage);
    switch (config.provider) {
        case 'groq': return translateWithGroq(prompt, config);
        case 'ollama': return translateWithOllama(prompt, config);
        case 'gemini': default: return translateWithGemini(prompt);
    }
};

// --- Destination Suggestion Functions ---

interface DestinationSuggestion {
    destination: string;
}

const buildSuggestionPrompt = (prefs: Omit<TripPreferences, 'destination' | 'language'>): string => `
  You are a travel expert. Based on the following user preferences, suggest a single, specific travel destination (city and country).
  - Origin: ${prefs.origin}
  - Trip Duration: ${prefs.duration} days
  - Travel Dates: Around ${prefs.startDate}
  - Group Composition: ${prefs.groupComposition}
  - Budget: ${prefs.budget}
  - Key Interests: ${prefs.interests.join(', ')}
  - Preferred Accommodation Style: ${prefs.accommodationStyle}
  
  CRITICAL: Respond ONLY with a valid JSON object in the format: {"destination": "City, Country"}. Do not add any other text or markdown.
`;

const suggestWithGemini = async (prompt: string): Promise<DestinationSuggestion> => {
    if (!ai) throw new Error("Google Gemini API key not configured for suggestion.");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error suggesting destination with Gemini:", error);
        throw new Error("Failed to get a destination suggestion from Gemini.");
    }
};

const suggestWithGroq = async (prompt: string, config: AIProviderConfig): Promise<DestinationSuggestion> => {
    if (!config.groqApiKey) throw new Error("Groq API key not provided for suggestion.");
    try {
        const data = await groqApiCallWithFallback(config.groqApiKey, {
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });
        return JSON.parse(data.choices[0].message.content);
    } catch (error) {
        console.error("Error suggesting destination with Groq:", error);
        throw new Error(`Failed to get suggestion from Groq. ${error instanceof Error ? error.message : ''}`);
    }
};

const suggestWithOllama = async (prompt: string, config: AIProviderConfig): Promise<DestinationSuggestion> => {
    if (!config.ollamaUrl || !config.ollamaModel) throw new Error("Ollama URL/model not configured for suggestion.");
    try {
        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: config.ollamaModel, prompt: prompt, format: "json", stream: false })
        });
        if (!response.ok) throw new Error(`Ollama server error for suggestion: ${response.statusText}`);
        const data = await response.json();
        return JSON.parse(data.response);
    } catch (error) {
        console.error("Error suggesting destination with Ollama:", error);
        throw new Error(`Failed to get suggestion from Ollama. ${error instanceof Error ? error.message : ''}`);
    }
};

export const suggestDestination = async (prefs: Omit<TripPreferences, 'destination' | 'language'>, config: AIProviderConfig): Promise<DestinationSuggestion> => {
    const prompt = buildSuggestionPrompt(prefs);
    switch (config.provider) {
        case 'groq': return suggestWithGroq(prompt, config);
        case 'ollama': return suggestWithOllama(prompt, config);
        case 'gemini': default: return suggestWithGemini(prompt);
    }
};


// --- Connection Test Functions ---

export const testGroqConnection = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return response.ok;
    } catch { return false; }
};

export const fetchOllamaModels = async (url: string): Promise<string[]> => {
    if (!url) return [];
    try {
        const response = await fetch(`${url}/api/tags`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.models.map((model: any) => model.name);
    } catch { return []; }
};

// --- Chat Functions ---

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const CHAT_SYSTEM_INSTRUCTION = `You are a friendly and helpful travel planning assistant. Your goal is to gather a user's travel preferences step-by-step through a natural conversation. Ask one question at a time.

You must gather the following pieces of information:
- Origin (e.g., New York, USA)
- Destination (e.g., Rome, Italy)
- Trip Duration (in days, as a number)
- Start Date (in YYYY-MM-DD format)
- Group Composition (e.g., 'Solo', 'Couple', 'Family with kids')
- Budget ('Budget-Friendly', 'Mid-Range', or 'Luxury')
- Key Interests (an array of strings from the user's description)
- Accommodation Style (e.g., 'Apartment rental')
- Transportation Preference (e.g., 'Public transport and walking')

Once you have gathered ALL of the above information, confirm with the user that you have everything you need to build their plan.

Upon user confirmation, your **final response** MUST be a single, valid JSON object, and NOTHING ELSE. No introductory text, no markdown fences. The JSON object must have this exact structure:
\`{ "preferences": { ... an object matching the TripPreferences type ... }, "itinerary": { ... an object matching the ItineraryPlan type ... } }\`

To create the \`itinerary\` part of the JSON, follow all the detailed instructions for itinerary generation, including finding coordinates, flights, costs, packing lists, etc.
The \`preferences\` part of the JSON should be filled with the information you gathered during the conversation. For fields you didn't gather (like \`specialNeeds\`), use an empty string. The language should be 'en' by default.`;

const sendChatWithGemini = async (messages: ChatMessage[]): Promise<string> => {
    if (!ai) throw new Error("Google Gemini API key not configured.");
    
    const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: CHAT_SYSTEM_INSTRUCTION
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error sending chat message with Gemini:", error);
        throw new Error("Failed to get a response from Gemini chat.");
    }
};

const sendChatWithGroq = async (messages: ChatMessage[], config: AIProviderConfig): Promise<string> => {
    if (!config.groqApiKey) throw new Error("Groq API key not provided.");

    const formattedMessages = [
        { role: 'system', content: CHAT_SYSTEM_INSTRUCTION },
        ...messages.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text
        }))
    ];

    try {
        const data = await groqApiCallWithFallback(config.groqApiKey, {
            messages: formattedMessages,
            temperature: 0.7,
        });
        const message = data.choices[0]?.message?.content;
        if (!message) throw new Error("Groq API returned an empty message.");
        return message;
    } catch (error) {
        console.error("Error sending chat message with Groq:", error);
        throw new Error(`Failed to get a response from Groq. ${error instanceof Error ? error.message : ''}`);
    }
};

const sendChatWithOllama = async (messages: ChatMessage[], config: AIProviderConfig): Promise<string> => {
    if (!config.ollamaUrl || !config.ollamaModel) throw new Error("Ollama URL or model not configured.");

    const formattedMessages = messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
    }));

    try {
        const response = await fetch(`${config.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.ollamaModel,
                messages: [
                    { role: 'system', content: CHAT_SYSTEM_INSTRUCTION },
                    ...formattedMessages
                ],
                stream: false
            })
        });
        if (!response.ok) throw new Error(`Ollama server returned an error: ${response.statusText}`);
        const data = await response.json();
        const message = data.message?.content;
        if (typeof message !== 'string') {
            throw new Error("Ollama chat response format is invalid.");
        }
        return message;
    } catch (error) {
        console.error("Error sending chat message with Ollama:", error);
        throw new Error(`Failed to get a response from Ollama. ${error instanceof Error ? error.message : ''}`);
    }
};

export const sendChatMessage = async (messages: ChatMessage[], config: AIProviderConfig): Promise<string> => {
    switch (config.provider) {
        case 'groq': return await sendChatWithGroq(messages, config);
        case 'ollama': return await sendChatWithOllama(messages, config);
        case 'gemini': default: return await sendChatWithGemini(messages);
    }
};
