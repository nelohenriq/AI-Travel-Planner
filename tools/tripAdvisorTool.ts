// FIX: The type 'FunctionDeclarationsTool' is not exported by '@google/genai'.
// The correct way to type a tool is as an object containing a 'functionDeclarations'
// array, where each element is of type 'FunctionDeclaration'.
import { FunctionDeclaration, Part, Type } from "@google/genai";

export const tripAdvisorTool: { functionDeclarations: FunctionDeclaration[] } = {
  functionDeclarations: [
    {
      name: "searchTripAdvisor",
      description: "Gets a TripAdvisor search URL for a specific restaurant in a given city. Use this to provide a link for dining suggestions.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          restaurantName: {
            type: Type.STRING,
            description: "The name of the restaurant to search for.",
          },
          destination: {
            type: Type.STRING,
            description: "The city or area where the restaurant is located.",
          },
        },
        required: ["restaurantName", "destination"],
      },
    },
  ],
};

export const handleTripAdvisorTool = (functionCall: Part['functionCall']): Part => {
  if (functionCall.name === 'searchTripAdvisor') {
    const { restaurantName, destination } = functionCall.args;
    if (typeof restaurantName !== 'string' || typeof destination !== 'string') {
        return {
            functionResponse: {
                name: 'searchTripAdvisor',
                response: { url: '' }
            }
        };
    }
    const url = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${restaurantName} ${destination}`)}`;
    return {
      functionResponse: {
        name: 'searchTripAdvisor',
        response: {
          url: url,
        },
      },
    };
  }
  
  // Fallback for any other functions that might be called
  return {
    functionResponse: {
      name: functionCall.name,
      response: {
        error: `Function ${functionCall.name} not found.`
      }
    }
  }
};
