import { v4 as uuidv4 } from 'uuid';

export interface UserProfile {
  id: string;
  name: string;
  color: string;
}

const STORAGE_KEY = 'hashhustlers_user_profile';

const COLORS = [
  '#ff5f56', '#ffbd2e', '#27c93f', '#7f0df2', '#00d1ff', '#ff00ff', '#ffa500', 
  '#00ff00', '#00ffff', '#ffff00', '#ff4500', '#1e90ff', '#32cd32', '#da70d6'
];

/**
 * Retrieves the user profile from localStorage or creates a new one if it doesn't exist.
 * This is used to maintain identity across sessions and collaborative edits.
 * 
 * @returns {UserProfile | null} The user profile, or null if called during SSR.
 */
export const getOrCreateUser = (): UserProfile | null => {
  // Check if we are in a browser environment
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UserProfile;
    }

    // Generate new profile
    const userId = uuidv4();
    const username = `User ${Math.floor(Math.random() * 10000)}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const profile: UserProfile = {
      id: userId,
      name: username,
      color: color,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    console.log('[Identity] New user profile generated:', profile);
    
    return profile;
  } catch (error) {
    console.error('[Identity] Error managing user profile:', error);
    return null;
  }
};
