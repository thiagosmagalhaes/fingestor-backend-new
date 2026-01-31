/**
 * View mode for dashboard visualization
 * - current: Shows only actual values (paid/received transactions)
 * - projected: Includes pending values for the month (scheduled transactions)
 */
export type ViewMode = 'current' | 'projected';

/**
 * User settings stored in metadata
 */
export interface MetadataSettings {
  /** User chosen theme */
  theme?: string;
  
  /** Dashboard visualization mode */
  view_mode?: ViewMode;
}

/**
 * Complete metadata structure stored in profiles.metadata column
 */
export interface ProfileMetadata {
  /** Indicates if user has completed onboarding */
  onboarding_completed?: boolean;
  
  /** User preferences and settings */
  settings?: MetadataSettings;
}

/**
 * Single update operation
 */
export interface MetadataUpdate {
  /** Path to the metadata field (e.g., 'onboarding_completed', 'settings.theme') */
  path: string;
  
  /** Value to set (null to delete the field) */
  value: any;
}

/**
 * Request body for updating metadata (supports single or batch updates)
 */
export type UpdateMetadataRequest = 
  | MetadataUpdate // Single update
  | { updates: MetadataUpdate[] }; // Batch updates
