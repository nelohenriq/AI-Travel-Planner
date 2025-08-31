
export type AIProvider = 'gemini' | 'groq' | 'ollama';

export interface AIProviderConfig {
  provider: AIProvider;
  groqApiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface TripPreferences {
  origin: string;
  destination: string;
  duration: number;
  startDate: string;
  groupComposition: string;
  budget: string;
  interests: string[];
  accommodationStyle: string;
  transportation: string;
  specialNeeds: string;
  experience: string;
  attractionType: string;
  language: string;
}

export interface Activity {
  time: string;
  description: string;
  details?: string;
}

export interface FoodSuggestion {
  meal: string;
  suggestion: string;
  notes?: string;
  link?: string;
}

export interface DailyItinerary {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
  food: FoodSuggestion[];
  insiderTip: string;
}

export interface AccommodationExample {
  name: string;
  priceRange: string;
  bookingUrl?: string;
}

export interface Accommodation {
  recommendations: string;
  examples: AccommodationExample[];
}

export interface GeneralTips {
  transit: string;
  customs: string;
  weather: string;
  practicalAdvice: string;
}

export interface FlightSuggestion {
  airline: string;
  priceRange: string;
  notes: string;
}

export interface FlightInfo {
  suggestions: FlightSuggestion[];
  googleFlightsUrl: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface CostEstimation {
  accommodation: string;
  activities: string;
  food: string;
  total: string;
}

export interface ItineraryPlan {
  tripTitle: string;
  tripOverview: string;
  accommodation: Accommodation;
  generalTips: GeneralTips;
  dailyItineraries: DailyItinerary[];
  flightInfo?: FlightInfo;
  sources?: GroundingSource[];
  costEstimation?: CostEstimation;
}