/**
 * Symphony Orchestra MVP-3: Design Tokens to Tailwind Bridge
 * Generates Tailwind configuration from design tokens
 */

const fs = require('fs');
const path = require('path');

// Load design tokens
const tokensPath = path.join(__dirname, 'tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

/**
 * Convert design tokens to Tailwind theme configuration
 */
function generateTailwindTheme(tokens) {
  const theme = {
    colors: {},
    fontFamily: tokens.typography['font-family'],
    fontSize: {},
    fontWeight: tokens.typography['font-weight'],
    lineHeight: tokens.typography['line-height'],
    spacing: tokens.spacing,
    borderRadius: tokens.radius,
    boxShadow: tokens.shadow,
    screens: tokens.breakpoints,
    zIndex: tokens['z-index'],
    transitionDuration: tokens.animation.duration,
    transitionTimingFunction: tokens.animation.timing,
  };

  // Convert color tokens to Tailwind format
  const colors = tokens.color;

  // Flatten nested color structure
  function flattenColors(colorObj, prefix = '') {
    const result = {};

    for (const [key, value] of Object.entries(colorObj)) {
      const colorKey = prefix ? `${prefix}-${key}` : key;

      if (typeof value === 'string') {
        result[colorKey] = value;
      } else if (typeof value === 'object') {
        Object.assign(result, flattenColors(value, colorKey));
      }
    }

    return result;
  }

  theme.colors = {
    ...flattenColors(colors),
    // Add standard Tailwind colors for compatibility
    transparent: 'transparent',
    current: 'currentColor',
    black: '#000000',
    white: '#ffffff',
  };

  // Convert font sizes with line heights
  for (const [key, value] of Object.entries(tokens.typography['font-size'])) {
    theme.fontSize[key] = [
      value,
      { lineHeight: tokens.typography['line-height'].normal },
    ];
  }

  return theme;
}

/**
 * Generate complete Tailwind configuration
 */
function generateTailwindConfig(tokens) {
  const theme = generateTailwindTheme(tokens);

  return {
    content: [
      './ui/**/*.{html,js,jsx,ts,tsx}',
      './client/src/**/*.{js,jsx,ts,tsx}',
      './server/src/**/*.{js,ts}',
    ],
    theme: {
      extend: theme,
    },
    plugins: [
      // Custom plugins for Symphony-specific utilities
      function ({ addUtilities, theme }) {
        const newUtilities = {
          // Glass morphism effect
          '.glass-card': {
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },

          // Status indicators
          '.status-indicator': {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
          },

          // Console-style text
          '.console-text': {
            fontFamily: theme('fontFamily.mono'),
            fontSize: theme('fontSize.sm')[0],
            backgroundColor: theme('colors.background-primary'),
            color: theme('colors.semantic-success'),
            padding: theme('spacing.4'),
            borderRadius: theme('borderRadius.lg'),
            overflowX: 'auto',
          },

          // High contrast mode support
          '@media (prefers-contrast: high)': {
            '.high-contrast': {
              borderColor: theme('colors.foreground-primary'),
              borderWidth: '2px',
            },
          },

          // Reduced motion support
          '@media (prefers-reduced-motion: reduce)': {
            '.reduce-motion': {
              animation: 'none !important',
              transition: 'none !important',
            },
          },
        };

        addUtilities(newUtilities);
      },
    ],

    // Dark mode configuration
    darkMode: 'class',

    // Accessibility-focused configuration
    variants: {
      extend: {
        opacity: ['disabled'],
        cursor: ['disabled'],
        backgroundColor: ['active', 'disabled'],
        textColor: ['active', 'disabled'],
      },
    },
  };
}

/**
 * Generate CSS custom properties from tokens
 */
function generateCSSProperties(tokens) {
  let css = ':root {\n';

  function addProperties(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const propName = prefix ? `${prefix}-${key}` : key;

      if (typeof value === 'string') {
        css += `  --symphony-${propName}: ${value};\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        addProperties(value, propName);
      }
    }
  }

  addProperties(tokens);
  css += '}\n';

  return css;
}

/**
 * Generate TypeScript type definitions from tokens
 */
function generateTypeDefinitions(tokens) {
  let types = '// Generated design token types\n\n';

  types += 'export interface SymphonyTokens {\n';

  function addTypes(obj, indent = '  ') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        types += `${indent}${key}: string;\n`;
      } else if (Array.isArray(value)) {
        types += `${indent}${key}: string[];\n`;
      } else if (typeof value === 'object') {
        types += `${indent}${key}: {\n`;
        addTypes(value, indent + '  ');
        types += `${indent}};\n`;
      }
    }
  }

  addTypes(tokens);
  types += '}\n\n';

  types += 'declare const tokens: SymphonyTokens;\n';
  types += 'export default tokens;\n';

  return types;
}

/**
 * Main function to generate all outputs
 */
function generateDesignSystem() {
  const outputDir = path.join(__dirname, '../generated');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate Tailwind config
  const tailwindConfig = generateTailwindConfig(tokens);
  fs.writeFileSync(
    path.join(__dirname, '../tailwind.config.js'),
    `module.exports = ${JSON.stringify(tailwindConfig, null, 2)};`,
  );

  // Generate CSS custom properties
  const cssProperties = generateCSSProperties(tokens);
  fs.writeFileSync(path.join(outputDir, 'tokens.css'), cssProperties);

  // Generate TypeScript definitions
  const typeDefinitions = generateTypeDefinitions(tokens);
  fs.writeFileSync(path.join(outputDir, 'tokens.d.ts'), typeDefinitions);

  // Generate theme object for runtime use
  fs.writeFileSync(
    path.join(outputDir, 'theme.js'),
    `export default ${JSON.stringify(tokens, null, 2)};`,
  );

  console.log('Design system generated successfully:');
  console.log('  - tailwind.config.js');
  console.log('  - generated/tokens.css');
  console.log('  - generated/tokens.d.ts');
  console.log('  - generated/theme.js');
}

// Run if called directly
if (require.main === module) {
  generateDesignSystem();
}

module.exports = {
  generateTailwindTheme,
  generateTailwindConfig,
  generateCSSProperties,
  generateTypeDefinitions,
  generateDesignSystem,
};
