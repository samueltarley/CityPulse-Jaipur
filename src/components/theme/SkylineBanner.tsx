import React from 'react';

interface SkylineBannerProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const SkylineBanner: React.FC<SkylineBannerProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const heightClass = variant === 'compact' ? 'h-16 md:h-24' : 'h-28 md:h-36';

  return (
    <div
      className={`relative w-full overflow-hidden select-none pointer-events-none transition-opacity duration-300 ${heightClass} ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute bottom-0 left-0 w-full h-full text-[#D9707E] dark:text-[#F08B9B] opacity-25"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Aravalli hill line with Nahargarh & Jaigarh ramparts */}
        <path
          d="M0 120 L0 80 Q120 65, 240 75 T480 60 Q600 45, 720 58 T960 52 Q1080 40, 1200 68 T1440 72 L1440 120 Z"
          opacity="0.3"
        />

        {/* Crenellated fortress walls & watchtowers on ridge */}
        <path
          d="M40 75 L40 68 L44 68 L44 75 L48 75 L48 68 L52 68 L52 75 L56 75 L56 65 L66 65 L66 75 
             M280 72 L280 64 L288 64 L288 72 M292 72 L292 64 L300 64 L300 72
             M1120 62 L1120 54 L1126 54 L1126 62 M1130 62 L1130 54 L1136 54 L1136 62"
          stroke="currentColor"
          strokeWidth="1"
          fill="currentColor"
          opacity="0.4"
        />

        {/* Detailed Foreground Jaipur Heritage Architectural Silhouette */}
        {/*
            From Left to Right:
            0 - 220: Sanganeri & Ajmeri Gate Arches with Chhatris
            220 - 450: Albert Hall Museum (Indo-Saracenic central bulbous dome, flanked by miniature domes & open arcades)
            450 - 750: Hawa Mahal (Pyramidal Palace of Winds, 5 tiers of stepped balconies, fluted domed jharokhas)
            750 - 1050: Jal Mahal & City Palace Mubarak Mahal (Water pavilion with Rajput chhatris at corners)
            1050 - 1300: Amber Fort Ganesh Pol & Sun Gate silhouette
            1300 - 1440: Chandpole Gateway & Watchtowers
        */}
        <path
          d="
            M0 120
            /* Left Gate */
            L0 95 L20 95 L20 85 L28 85 L28 78 Q34 72, 40 78 L40 85 L48 85 L48 95 L70 95
            /* Ajmeri Gate cusped archway */
            L70 95 L70 70 L80 70 L80 62 Q95 52, 110 62 L110 70 L120 70 L120 95 L160 95
            /* Chhatri 1 */
            L160 88 L168 88 L168 76 Q178 68, 188 76 L188 88 L196 88 L196 98 L240 98

            /* ALBERT HALL MUSEUM */
            L240 90 L255 90 L255 75 L265 75 L265 65 Q275 58, 285 65 L285 75 L295 75 L295 90
            L310 90 L310 70 L325 70
            /* Central Albert Hall grand bulbous dome */
            L325 60 Q345 35, 365 60 L365 70 L380 70 L380 90
            /* Right pavilion */
            L395 90 L395 75 L405 75 L405 65 Q415 58, 425 65 L425 75 L435 75 L435 90 L460 90

            /* HAWA MAHAL (Palace of Winds - 5 tiers stepped pyramid) */
            L460 95 L480 95 L480 82 L495 82 L495 70 L510 70 L510 56 L525 56 L525 42 L540 42
            /* Tier 5 (Apex crown chhatri) */
            L540 32 Q555 18, 570 32 L570 42
            /* Stepped down right side */
            L585 42 L585 56 L600 56 L600 70 L615 70 L615 82 L630 82 L630 95 L660 95

            /* Intermediate Minarets / City Palace Tower (Swargasuli / Isarlat) */
            L670 95 L670 48 L682 48 L682 95 L700 95
            L705 95 L705 80 L715 80 L715 72 Q722 66, 730 72 L730 80 L740 80 L740 95 L770 95

            /* JAL MAHAL (Water Palace with corner chhatris) */
            L770 95 L780 95 L780 72 Q792 60, 805 72 L805 95 L825 95
            /* Central arched pavilion */
            L825 78 L840 78 L840 68 Q860 55, 880 68 L880 78 L895 78 L895 95
            /* East chhatri */
            L915 95 L915 72 Q928 60, 940 72 L940 95 L980 95

            /* AMBER FORT & NAHARGARH RAMPARTS */
            L980 90 L1000 90 L1000 78 L1012 78 L1012 70 Q1024 62, 1036 70 L1036 78 L1048 78 L1048 90
            L1070 90 L1070 65 L1085 65 L1085 54 Q1100 44, 1115 54 L1115 65 L1130 65 L1130 90
            L1160 90 L1175 90 L1175 75 L1190 75 L1190 92 L1220 92

            /* CHANDPOLE GATEWAY & BASTIONS */
            L1220 95 L1240 95 L1240 68 L1255 68 L1255 58 Q1275 46, 1295 58 L1295 68 L1310 68 L1310 95
            L1340 95 L1350 95 L1350 82 Q1360 74, 1370 82 L1370 95
            L1400 95 L1410 95 L1410 85 L1440 85
            L1440 120 Z
          "
        />

        {/* Base foundation line */}
        <rect x="0" y="116" width="1440" height="4" fill="currentColor" opacity="0.6" />
      </svg>
    </div>
  );
};
