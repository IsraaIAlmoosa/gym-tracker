export type CategorySlug =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'full_body';

export const CATEGORIES: { slug: CategorySlug; en: string; ar: string }[] = [
  { slug: 'chest', en: 'Chest', ar: 'الصدر' },
  { slug: 'back', en: 'Back', ar: 'الظهر' },
  { slug: 'shoulders', en: 'Shoulders', ar: 'الكتف' },
  { slug: 'arms', en: 'Arms', ar: 'الذراعين' },
  { slug: 'legs', en: 'Legs', ar: 'الأرجل' },
  { slug: 'core', en: 'Core', ar: 'الجذع' },
  { slug: 'full_body', en: 'Full Body', ar: 'الجسم كامل' },
];

export const EXERCISE_CATEGORY: Record<string, CategorySlug> = {
  'Barbell Squat': 'legs',
  'Leg Press': 'legs',
  Deadlift: 'back',
  'Romanian Deadlift': 'back',
  Lunges: 'legs',
  'Bulgarian Split Squat': 'legs',
  'Leg Extension': 'legs',
  'Leg Curl': 'legs',
  'Hip Thrust': 'legs',
  'Bench Press': 'chest',
  'Incline Bench Press': 'chest',
  'Push Up': 'chest',
  'Dumbbell Fly': 'chest',
  'Overhead Press': 'shoulders',
  'Lateral Raise': 'shoulders',
  'Barbell Row': 'back',
  'Lat Pulldown': 'back',
  'Pull Up': 'back',
  'Seated Cable Row': 'back',
  'Face Pull': 'shoulders',
  'Bicep Curl': 'arms',
  'Hammer Curl': 'arms',
  'Tricep Pushdown': 'arms',
  'Skull Crusher': 'arms',
  Plank: 'core',
  Crunch: 'core',
  'Leg Raise': 'core',
  'Russian Twist': 'core',
  'Calf Raise': 'legs',
  'Hyperextension (Back Extension)': 'back',
  "Farmer's Carry": 'full_body',
  'Box Jump': 'full_body',
  'Battle Ropes': 'full_body',
  'Kettlebell Swing': 'full_body',
  Burpee: 'full_body',
};

export function getExerciseCategory(nameEn: string): CategorySlug {
  return EXERCISE_CATEGORY[nameEn] ?? 'full_body';
}

// ترتيب مقترح فقط (بدون إخفاء أي مجموعة) — كل المجموعات متاحة دايماً للجميع
export function getOrderedCategories(
  gender: 'male' | 'female' | null
): typeof CATEGORIES {
  if (gender === 'female') {
    const order: CategorySlug[] = [
      'legs',
      'core',
      'full_body',
      'back',
      'chest',
      'shoulders',
      'arms',
    ];
    return order.map((slug) => CATEGORIES.find((c) => c.slug === slug)!);
  }
  return CATEGORIES;
}

// أيقونات بسيطة (stroke-only) بنفس ستايل باقي التطبيق، لون واحد يتغير حسب الحالة
export function CategoryIcon({ slug, color }: { slug: CategorySlug; color: string }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (slug) {
    case 'chest':
      return (
        <svg {...common}>
          <path d="M4 8c2-2 5-2 8-1 3-1 6-1 8 1v9c-2 2-5 2-8 1-3 1-6 1-8-1z" />
        </svg>
      );
    case 'back':
      return (
        <svg {...common}>
          <path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z" />
        </svg>
      );
    case 'shoulders':
      return (
        <svg {...common}>
          <circle cx="6" cy="8" r="3" />
          <circle cx="18" cy="8" r="3" />
          <path d="M6 11v2M18 11v2M4 20c1-3 3-5 8-5s7 2 8 5" />
        </svg>
      );
    case 'arms':
      return (
        <svg {...common}>
          <path d="M6 20V10a4 4 0 0 1 8 0c0 2-1 3-1 5" />
          <circle cx="17" cy="6" r="2.5" />
        </svg>
      );
    case 'legs':
      return (
        <svg {...common}>
          <path d="M9 3h2l.5 9-2 9H8l.5-9z" />
          <path d="M15 3h-2l-.5 9 2 9h1.5l-.5-9z" />
        </svg>
      );
    case 'core':
      return (
        <svg {...common}>
          <rect x="6" y="4" width="12" height="16" rx="3" />
          <path d="M6 9h12M6 14h12" />
        </svg>
      );
    case 'full_body':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="4" r="2" />
          <path d="M12 6v7M8 10l4 3 4-3M9 20l3-7 3 7" />
        </svg>
      );
  }
}
