export const FEATURE_FLAGS = {
  PRIMITIVE_MODE: import.meta.env.VITE_PRIMITIVE_MODE === 'true' || true, // Bật mặc định theo yêu cầu Sơ khai
  ENABLE_FLASHCARDS: true,
  ENABLE_STUDY_ROOM: false,
  ENABLE_CO_STUDY: false,
  ENABLE_TEACHER_DASHBOARD: false,
  ENABLE_ADMIN_CREATE: false,
  ENABLE_ACHIEVEMENTS: false,
  ENABLE_CYBERPUNK: false,
  ENABLE_RANKING: false,
  ENABLE_SKILL_TREE: false,
  ENABLE_HISTORY: false,
};

export const isFeatureEnabled = (featureKey: keyof typeof FEATURE_FLAGS) => {
  if (FEATURE_FLAGS.PRIMITIVE_MODE) {
    if (featureKey === 'ENABLE_FLASHCARDS') return true;
    return false;
  }
  return FEATURE_FLAGS[featureKey];
};
