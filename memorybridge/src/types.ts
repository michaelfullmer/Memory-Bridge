export interface MemoryData {
  // Screen 1: Identity
  name: string;
  age: string;
  location: string;
  occupation: string;
  
  // Screen 2: Cognition
  commStyle: string;
  hates: string;
  directness: number; // 1-5
  
  // Screen 3: Priorities
  projects: string;
  goals: string;
  persistentMemories: string;
}

export type Step = 1 | 2 | 3 | 4;
