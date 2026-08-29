import React from 'react';
import { Shield, Crown, Zap, Flame, Star, Sparkles, Skull, Feather } from 'lucide-react';

export const BADGE_ICONS = {
  shield: Shield,
  crown: Crown,
  lightning: Zap,
  flame: Flame,
  star: Star,
  dragon: Sparkles,
  skull: Skull,
  falcon: Feather,
};

export const PATTERNS = [
  { id: 'solid', label: 'Solid Classic' },
  { id: 'vertical_stripes', label: 'Vertical Stripes' },
  { id: 'hoops', label: 'Horizontal Hoops' },
  { id: 'sash', label: 'Diagonal Sash' },
  { id: 'split', label: 'Half & Half' },
  { id: 'checker', label: 'Checkerboard' },
  { id: 'sleeves', label: 'Contrast Sleeves' },
];

export const PRO_PRESETS = [
  { name: 'Blaugrana', primary: '#183668', secondary: '#A50044', pattern: 'vertical_stripes', badge: 'crown' },
  { name: 'Los Blancos', primary: '#FFFFFF', secondary: '#F59E0B', pattern: 'solid', badge: 'crown' },
  { name: 'City Sky', primary: '#6CABDD', secondary: '#1C2C5B', pattern: 'sleeves', badge: 'shield' },
  { name: 'Reds', primary: '#C8102E', secondary: '#00B2A9', pattern: 'solid', badge: 'flame' },
  { name: 'Nerazzurri', primary: '#001489', secondary: '#0F172A', pattern: 'vertical_stripes', badge: 'lightning' },
  { name: 'Gunners', primary: '#EF0107', secondary: '#FFFFFF', pattern: 'sleeves', badge: 'shield' },
  { name: 'Cyber Neon', primary: '#8B5CF6', secondary: '#EC4899', pattern: 'sash', badge: 'dragon' },
  { name: 'Golden Dragon', primary: '#D97706', secondary: '#111827', pattern: 'checker', badge: 'dragon' },
];

export const JerseyKit = ({
  kitConfig = {},
  size = 48,
  className = '',
  number = null,
}) => {
  const primary = kitConfig?.primary_color || '#10B981';
  const secondary = kitConfig?.secondary_color || '#0F172A';
  const pattern = kitConfig?.pattern || 'solid';
  const badgeKey = kitConfig?.badge_icon || 'shield';
  const BadgeIcon = BADGE_ICONS[badgeKey] || Shield;

  const patternId = `kit-pattern-${pattern}-${primary.replace('#', '')}-${secondary.replace('#', '')}-${size}`;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        <defs>
          {/* Vertical Stripes Pattern */}
          <pattern
            id={`vstripes-${patternId}`}
            width="20"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <rect width="10" height="100" fill={primary} />
            <rect x="10" width="10" height="100" fill={secondary} />
          </pattern>

          {/* Hoops Pattern */}
          <pattern
            id={`hoops-${patternId}`}
            width="100"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <rect width="100" height="10" fill={primary} />
            <rect y="10" width="100" height="10" fill={secondary} />
          </pattern>

          {/* Checkerboard Pattern */}
          <pattern
            id={`checker-${patternId}`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <rect width="12" height="12" fill={primary} />
            <rect x="12" width="12" height="12" fill={secondary} />
            <rect y="12" width="12" height="12" fill={secondary} />
            <rect x="12" y="12" width="12" height="12" fill={primary} />
          </pattern>

          {/* Jersey Shape Clip Path */}
          <clipPath id={`jersey-clip-${patternId}`}>
            <path d="M 28,15 L 40,25 L 60,25 L 72,15 L 94,32 L 82,48 L 74,42 L 74,88 L 26,88 L 26,42 L 18,48 L 6,32 Z" />
          </clipPath>

          {/* Torso Clip Path (excluding sleeves) */}
          <clipPath id={`torso-clip-${patternId}`}>
            <path d="M 26,20 L 74,20 L 74,88 L 26,88 Z" />
          </clipPath>
        </defs>

        {/* Outer Jersey Silhouette */}
        <g clipPath={`url(#jersey-clip-${patternId})`}>
          {/* Base Color / Background */}
          <rect width="100" height="100" fill={primary} />

          {/* Pattern Overlay */}
          {pattern === 'vertical_stripes' && (
            <rect width="100" height="100" fill={`url(#vstripes-${patternId})`} />
          )}

          {pattern === 'hoops' && (
            <rect width="100" height="100" fill={`url(#hoops-${patternId})`} />
          )}

          {pattern === 'checker' && (
            <rect width="100" height="100" fill={`url(#checker-${patternId})`} />
          )}

          {pattern === 'sash' && (
            <polygon
              points="10,-10 35,-10 95,95 70,95"
              fill={secondary}
            />
          )}

          {pattern === 'split' && (
            <rect x="50" width="50" height="100" fill={secondary} />
          )}

          {pattern === 'sleeves' && (
            <>
              {/* Left Sleeve */}
              <polygon points="6,32 28,15 40,25 26,42 18,48" fill={secondary} />
              {/* Right Sleeve */}
              <polygon points="94,32 72,15 60,25 74,42 82,48" fill={secondary} />
            </>
          )}

          {/* Subtle 3D Fold Shading */}
          <path
            d="M 28,15 L 26,88 M 72,15 L 74,88"
            stroke="#000000"
            strokeWidth="1.5"
            strokeOpacity="0.2"
          />
        </g>

        {/* Collar V-Neck / Trim */}
        <path
          d="M 38,15 Q 50,30 62,15"
          fill="none"
          stroke={secondary}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Sleeve Cuffs */}
        <line x1="6" y1="32" x2="18" y2="48" stroke={secondary} strokeWidth="3" strokeOpacity="0.8" />
        <line x1="94" y1="32" x2="82" y2="48" stroke={secondary} strokeWidth="3" strokeOpacity="0.8" />

        {/* Center Crest / Badge or Number */}
        {number !== null ? (
          <text
            x="50"
            y="62"
            textAnchor="middle"
            fill={primary === '#FFFFFF' ? '#0F172A' : '#FFFFFF'}
            fontSize="26"
            fontWeight="900"
            fontFamily="monospace"
            className="drop-shadow"
          >
            {number}
          </text>
        ) : (
          <foreignObject x="38" y="42" width="24" height="24">
            <div className="w-full h-full flex items-center justify-center">
              <div className="p-1 rounded-full bg-slate-950/60 shadow border border-white/20">
                <BadgeIcon
                  className="w-3.5 h-3.5"
                  style={{ color: secondary === primary ? '#FFFFFF' : secondary }}
                />
              </div>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
};
