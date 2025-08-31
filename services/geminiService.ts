/*
 * DEPRECATED AND NOT IN USE.
 * This file is an old version and is not used by the application.
 * All AI logic is handled by `services/aiService.ts`.
 * This file will be removed.
*/

import { GoogleGenAI, Type } from "@google/genai";
import { TripPreferences, ItineraryPlan } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema: any = {
  type: Type.OBJECT,
  properties: {
    tripTitle: { type: Type.STRING, description: "A catchy and descriptive title for the trip. e.g., '5-Day Historical and Culinary Adventure in Rome'" },
    tripOverview: { type: Type.STRING, description: "A short, engaging paragraph summarizing the trip's theme and highlights." },
    accommodation: {
      type: Type.OBJECT,
      properties: {
        recommendations: { type: Type.STRING, description: "General advice on the best neighborhoods or areas to stay in, based on the traveler's preferences." },
        examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-2 specific examples of accommodation (e.g., 'Hotel Example', 'Apartment Complex Name') that fit the budget and style." },
      },
      required: ["recommendations", "examples"]
    },
    generalTips: {
      type: Type.OBJECT,
      properties: {
        transit: { type: Type.STRING, description: "Tips on getting around the destination (e.g., public transport, ride-sharing, walking)." },
        customs: { type: Type.STRING, description: "Brief notes on local customs, etiquette, or important phrases." },
        weather: { type: Type.STRING, description: "Guidance on expected weather for the travel dates and what to pack." },
        practicalAdvice: { type: Type.STRING, description: "Other practical tips like safety, currency, power outlets, etc." },
      },
      required: ["transit", "customs", "weather", "practicalAdvice"]
    },
    dailyItineraries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          date: { type: Type.STRING, description: "The specific date for this day's plan. Can be relative like 'Day 1' if specific dates are not provided." },
          title: { type: Type.STRING, description: "A theme for the day, e.g., 'Ancient Rome Exploration'." },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "Suggested time, e.g., 'Morning', '2:00 PM'." },
                description: { type: Type.STRING, description: "Name of the activity or attraction." },
                details: { type: Type.STRING, description: "More details about the activity, like booking info, why it's recommended, or child-friendly notes." },
              },
              required: ["time", "description"]
            }
          },
          food: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                meal: { type: Type.STRING, description: "e.g., 'Lunch', 'Dinner', 'Snack'." },
                suggestion: { type: Type.STRING, description: "A specific restaurant suggestion or a type of food to try." },
                notes: { type: Type.STRING, description: "Details like reservation needed, dietary notes, or atmosphere." },
              },
              required: ["meal", "suggestion"]
            }
          },
          insiderTip: { type: Type.STRING, description: "A helpful 'local' tip for the day." },
        },
        required: ["day", "date", "title", "activities", "food", "insiderTip"]
      }
    }
  },
  required: ["tripTitle", "tripOverview", "accommodation", "generalTips", "dailyItineraries"]
};


export const generateItinerary = async (prefs: TripPreferences): Promise<ItineraryPlan> => {
  const prompt = `
    You are an expert travel planner. Create a detailed, personalized, and realistic travel itinerary based on the following user preferences.
    The plan should be well-structured, considering the group size, ages, budget, and interests to ensure a smooth and enjoyable trip.
    
    User Preferences:
    - Destination: ${prefs.destination}
    - Trip Duration: ${prefs.duration} days
    // FIX: Property 'travelDates' does not exist on type 'TripPreferences'. Using startDate and duration instead.
    - Travel Dates: Starting on ${prefs.startDate} for ${prefs.duration} days.
    - Group Composition: ${prefs.groupComposition}
    - Budget: ${prefs.budget}
    - Key Interests: ${prefs.interests.join(', ')}
    - Preferred Accommodation Style: ${prefs.accommodationStyle}
    - Transportation Preference: ${prefs.transportation}
    - Special Needs or Constraints: ${prefs.specialNeeds || 'None'}
    - Prior Experience with Destination: ${prefs.experience}
    - Desired Attraction Type: ${prefs.attractionType}

    Please generate a complete itinerary and respond ONLY with a valid JSON object that strictly follows the provided schema.
    Do not include any text, pleasantries, or markdown formatting before or after the JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    const plan: ItineraryPlan = JSON.parse(jsonText);
    return plan;
  } catch (error) {
    console.error("Error generating itinerary from Gemini API:", error);
    throw new Error("Failed to parse or receive a valid plan from the AI.");
  }
};