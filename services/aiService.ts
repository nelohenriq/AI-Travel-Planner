
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { TripPreferences, ItineraryPlan, AIProviderConfig } from '../types';
import { tripAdvisorTool, handleTripAdvisorTool } from '../tools/tripAdvisorTool';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini provider will not work.");
}
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;


const ITINERARY_PLAN_SCHEMA_DESCRIPTION = `
  You must produce a JSON object with the following structure. Do not add any text before or after the JSON object.

  interface ItineraryPlan {
    tripTitle: string; // A catchy and descriptive title for the trip.
    tripOverview: string; // A short, engaging paragraph summarizing the trip's theme and highlights.
    costEstimation: {
      accommodation: string; // Estimated cost range for accommodation.
      activities: string;    // Estimated cost range for activities.
      food: string;          // Estimated cost range for food.
      total: string;         // Total estimated cost range for the trip.
    };
    flightInfo: {
      suggestions: {
        airline: string; // Name of the airline.
        priceRange: string; // Estimated price range for a round trip.
        notes: string; // Any relevant notes about the flight.
      }[];
      googleFlightsUrl: string; // A pre-filled Google Flights URL for the user's trip.
    };
    accommodation: {
      recommendations: string; // Advice on best neighborhoods or areas to stay in.
      examples: {
          name: string; // A specific example of accommodation (hotel or apartment name).
          priceRange: string; // Estimated price range per night.
          bookingUrl?: string; // Optional: A direct booking.com search URL for the accommodation.
      }[]; // 1-2 specific examples of accommodation.
    };
    generalTips: {
      transit: string; // Tips on getting around the destination, including airport to city center advice.
      customs: string; // Notes on local customs, etiquette, or important phrases.
      weather: string; // Expected weather for the travel dates and what to pack.
      practicalAdvice: string; // Other practical tips like safety, currency, etc.
    };
    dailyItineraries: {
      day: number;
      date: string; // The specific date or relative day.
      title: string; // A theme for the day.
      activities: {
        time: string; // Suggested time for the activity.
        description: string; // Name of the activity or attraction.
        details?: string; // More details about the activity (booking info, recommendations, etc.).
      }[];
      food: {
        meal: string; // The meal type (Lunch, Dinner, etc.).
        suggestion: string; // A specific restaurant suggestion or a type of food to try.
        notes?: string; // Details like reservation needed, dietary notes, or atmosphere.
        link?: string; // A direct TripAdvisor search URL for the suggestion.
      }[];
      insiderTip: string; // A helpful 'local' tip for the day.
    }[];
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
  1.  **Research and include flight suggestions:** 
      - Find 2-3 flight options for a trip from ${prefs.origin} to ${prefs.destination}.
      - Provide estimated price ranges for a round trip.
      - Generate a pre-filled Google Flights URL for a round-trip flight from ${prefs.origin} to ${prefs.destination}, starting on the specified date for the trip's duration.
  2.  **Provide a cost estimation:**
      - Estimate costs for the entire trip based on the user's budget preference.
      - Break it down into 'accommodation', 'activities', and 'food', and provide a 'total' estimated range.
  3.  **Provide dining suggestions:**
      - For every dining suggestion, suggest a specific, highly-rated restaurant.
      - **For each restaurant, you MUST use the 'searchTripAdvisor' tool** to generate a search URL.
      - Place the URL returned by the tool into the 'link' property for that dining suggestion.
      - Provide only the name of the restaurant in the 'suggestion' property.
      - **Do NOT provide links for activities.** The UI will handle generating navigation links.
  4.  **Provide accommodation suggestions:** For each accommodation example, include a specific name, an estimated price range (e.g., per night), and a booking.com search URL for the specific accommodation in the 'bookingUrl' field.
  5.  **Provide airport transit advice:** In the 'generalTips.transit' section, include specific, practical advice on getting from the destination's main airport to the city center (e.g., train, bus, taxi options with estimated costs and travel times).
  
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
        
        const plan: ItineraryPlan = JSON.parse(jsonText.replace(/\\'/g, "'"));
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks?.length) {
          plan.sources = groundingChunks
            .map((chunk: any) => chunk.web)
            .filter((source: any) => source?.uri && source.title)
            .map((source: any) => ({ uri: source.uri, title: source.title }));
        }
        return plan;
    } catch (error) {
        console.error("Error generating itinerary from Gemini API:", error, "Raw response:", response?.text);
        if (error instanceof SyntaxError) {
          throw new Error("The AI returned a plan in an unexpected format. Please try again.");
        }
        if (error instanceof Error) throw error;
        throw new Error("Failed to parse or receive a valid plan from the Gemini AI.");
    }
};

const generateWithGroq = async (prefs: TripPreferences, config: AIProviderConfig): Promise<ItineraryPlan> => {
    if (!config.groqApiKey) throw new Error("Groq API key not provided.");
    
    const prompt = buildBasePrompt(prefs) + `
    
    IMPORTANT INSTRUCTION: For each day in the 'dailyItineraries' array, the 'food' array MUST contain at least two entries: one for 'Lunch' and one for 'Dinner'.
    
    ` + ITINERARY_PLAN_SCHEMA_DESCRIPTION;

    const openAITools = [{
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
    }];

    const messages: any[] = [{ role: "user", content: prompt }];

    try {
        for (let i = 0; i < 5; i++) { // Allow up to 5 rounds of tool calls
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.7,
                    tools: openAITools,
                    tool_choice: "auto",
                })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`Groq API error: ${errorBody.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
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
                const firstBraceIndex = jsonText.indexOf('{');
                const lastBraceIndex = jsonText.lastIndexOf('}');
                if (firstBraceIndex === -1 || lastBraceIndex === -1) {
                    throw new Error("The AI returned a plan in an unexpected format.");
                }
                const sanitizedJsonText = jsonText.substring(firstBraceIndex, lastBraceIndex + 1);
                return JSON.parse(sanitizedJsonText);
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
        return JSON.parse(data.response);
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

// --- Translation Functions ---

const buildTranslationPrompt = (itinerary: ItineraryPlan, targetLanguage: string) => {
    const languageName = languageMap[targetLanguage] || 'English';
    return `
      You are an expert translator. Your task is to translate all user-facing string values in the following JSON object to ${languageName}.
      **CRITICAL INSTRUCTIONS:**
      1.  Translate EVERY string value.
      2.  Do NOT touch the JSON structure, keys, or any non-string values (like numbers or URLs in 'link'/'googleFlightsUrl' properties).
      3.  If a string is a proper name (e.g., "Colosseum", "Eiffel Tower", "Pizzarium Bonci"), keep the original name.
      4.  Ensure your output is ONLY the translated JSON object, with no extra text or markdown formatting.

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
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }], model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Groq API error: ${errorBody.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
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
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }], model: "openai/gpt-oss-20b",
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Groq API error for suggestion: ${errorBody.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
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