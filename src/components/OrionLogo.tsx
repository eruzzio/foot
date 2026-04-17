interface OrionLogoProps {
  className?: string;
  size?: number;
}

export default function OrionLogo({ className = '', size = 112 }: OrionLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="orion-outer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e5fa8" />
          <stop offset="100%" stopColor="#0a2a5a" />
        </radialGradient>
        <radialGradient id="orion-inner" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4aaaf5" />
          <stop offset="60%" stopColor="#1a6dc8" />
          <stop offset="100%" stopColor="#0c3a7a" />
        </radialGradient>
        <linearGradient id="orion-arrow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5ab8ff" />
          <stop offset="100%" stopColor="#a8dcff" />
        </linearGradient>
        <linearGradient id="orion-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a7fd4" />
          <stop offset="50%" stopColor="#5aaff7" />
          <stop offset="100%" stopColor="#1a5aaa" />
        </linearGradient>
        <filter id="orion-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="78" stroke="url(#orion-ring)" strokeWidth="8" fill="none" opacity="0.7" />

      {/* Main circle body */}
      <circle cx="100" cy="100" r="68" fill="url(#orion-outer)" />
      <circle cx="100" cy="100" r="60" fill="url(#orion-inner)" />

      {/* Inner highlight arc (top-left) */}
      <path
        d="M 52 72 A 55 55 0 0 1 100 45"
        stroke="rgba(150,210,255,0.4)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Swirl / C-shape */}
      <path
        d="M 145 65 A 55 55 0 1 0 148 138"
        stroke="url(#orion-ring)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />

      {/* Stars */}
      {/* Large star center-left */}
      <g transform="translate(78, 92)" filter="url(#orion-glow)">
        <polygon
          points="0,-12 3,-4 12,-4 5,2 8,11 0,5 -8,11 -5,2 -12,-4 -3,-4"
          fill="white"
          opacity="0.95"
        />
      </g>
      {/* Small star top */}
      <g transform="translate(102, 72)">
        <polygon
          points="0,-8 2,-3 8,-3 3,1 5,7 0,3 -5,7 -3,1 -8,-3 -2,-3"
          fill="white"
          opacity="0.85"
        />
      </g>
      {/* Tiny star bottom-left */}
      <g transform="translate(68, 118)">
        <polygon
          points="0,-6 1.5,-2 6,-2 2.5,1 4,6 0,3 -4,6 -2.5,1 -6,-2 -1.5,-2"
          fill="white"
          opacity="0.75"
        />
      </g>

      {/* Arrow (top-right) */}
      <g transform="translate(138, 55) rotate(-30)">
        {/* Arrow shaft */}
        <line x1="-18" y1="18" x2="8" y2="-8" stroke="url(#orion-arrow)" strokeWidth="7" strokeLinecap="round" />
        {/* Arrow head */}
        <polygon points="8,-8 -4,-14 -14,-4" fill="url(#orion-arrow)" />
      </g>
    </svg>
  );
}
