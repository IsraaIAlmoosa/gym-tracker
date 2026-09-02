type IconProps = { color: string; size?: number; filled?: boolean };

const common = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function HomeIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

export function HistoryIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

export function ProgressIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M21 7v6h-6" />
    </svg>
  );
}

export function DumbbellIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <path d="M6.5 6.5l11 11" />
      <path d="M4.5 4.5l4 4-2 2-4-4z" />
      <path d="M19.5 19.5l-4-4 2-2 4 4z" />
      <path d="M2.5 8.5l2-2" />
      <path d="M21.5 15.5l-2 2" />
    </svg>
  );
}

export function ScaleIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v14M4 21h16" />
      <path d="M6 10l-3 6a5 5 0 0 0 6 0z" />
      <path d="M18 10l-3 6a5 5 0 0 0 6 0z" />
    </svg>
  );
}

export function SettingsIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

export function PlusCircleIcon({ color, size = 22, filled = false }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" />
      <path
        d="M12 8v8M8 12h8"
        stroke={filled ? '#0A0A0A' : color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrophyIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4" />
      <path d="M12 13v4M9 21h6M10 17h4v4h-4z" />
    </svg>
  );
}

export function CalendarIcon({ color, size = 22 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}

export function GlobeIcon({ color, size = 20 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function LogOutIcon({ color, size = 20 }: IconProps) {
  return (
    <svg {...common(size, color)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
