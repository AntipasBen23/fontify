# Fontify

**Automatically detect and setup Google Fonts in your VS Code projects with zero configuration.**

Fontify streamlines your development workflow by intelligently scanning your project for Google Font usage and generating production-ready font integration code. Say goodbye to manual Google Fonts setup and copy-pasting CDN links.

## Features

### Smart Font Detection
- **Multi-source scanning**: Detects fonts from VS Code settings, CSS files, Tailwind configs, and package.json
- **Framework agnostic**: Works with any CSS format, SCSS, CSS-in-JS, and popular frameworks
- **Google Fonts validation**: Automatically checks which fonts are available on Google Fonts
- **Intelligent parsing**: Handles complex CSS structures, Unicode issues, and various font-family declarations

### Smart Framework Detection
- **Automatic framework detection**: Analyzes package.json to detect Next.js, React, Vue, or vanilla projects
- **Intelligent directory placement**: Suggests framework-appropriate output directories
- **Pre-configured defaults**: Next.js → `public/fonts/`, React/Vite → `src/assets/fonts/`, Vue → `assets/fonts/`
- **Existing directory detection**: Scans for existing `public/`, `assets/`, or `src/assets/` folders
- **Custom setup support**: Full flexibility for unique project structures

### Automated Production Setup
- **CDN integration**: Generate Google Fonts CDN links with optimal loading
- **Self-hosted fonts**: Download and bundle fonts for your project with framework-specific paths
- **Framework-specific integration**: Next.js localFont setup, React CSS modules, Vue composables
- **Performance optimization**: Includes preload tags and font-display: swap
- **Complete integration guide**: Auto-generated documentation with framework-specific usage examples
- **Automatic file placement**: Integrates directly into your project structure using best practices

## Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Open any project** with font declarations in CSS
3. **Run** `Ctrl+Shift+P` → "Fontify: Detect Fonts"
4. **Click** "Make Production-Ready" to generate framework-optimized integration code

## Commands

| Command | Description |
|---------|-------------|
| `Fontify: Detect Fonts` | Scan project and validate fonts against Google Fonts |
| `Fontify: Make Production-Ready` | Generate production font integration code with framework detection |
| `Fontify: Refresh Font Cache` | Re-scan project for font changes |

## Configuration

Fontify works with zero configuration, but you can customize its behavior:

```json
{
  "fontify.autoDetect": true,
  "fontify.sources": ["google-fonts", "fontsource"]
}
```

### Settings

- **`fontify.autoDetect`**: Automatically detect fonts on startup (default: `true`)
- **`fontify.sources`**: Font sources to search (default: `["google-fonts", "fontsource"]`)

## Framework-Specific Integration

### Next.js Projects
**Auto-detected from**: `next` dependency in package.json

**Output directory**: `public/fonts/`

**Generated files**:
```typescript
// Inter.ts
import localFont from 'next/font/local';

export const inter = localFont({
  src: './Inter/*.woff2',
  display: 'swap',
  variable: '--font-inter'
});

// Usage: className={`${inter.variable} font-inter`}
```

### React/Vite Projects
**Auto-detected from**: `react` + `vite` dependencies

**Output directory**: `src/assets/fonts/`

**Integration**: CSS modules and standard @font-face rules

### Vue/Nuxt Projects
**Auto-detected from**: `vue` or `nuxt` dependencies

**Output directory**: `assets/fonts/`

**Integration**: Vue 3 composables and scoped CSS support

### Vanilla CSS Projects
**Fallback for**: Projects without detected frameworks

**Output directory**: `assets/fonts/` (or existing directory structure)

**Integration**: Standard CSS @font-face rules and utility classes

## Use Cases

### **Development Workflow**
```css
/* Your CSS */
.heading { font-family: 'Inter', sans-serif; }
.body { font-family: 'Roboto', sans-serif; }
```

1. Fontify detects Inter and Roboto usage
2. Auto-detects your framework (Next.js, React, Vue, etc.)
3. Suggests appropriate output directory
4. Generates framework-specific integration code

### **Production Deployment**
Choose your deployment strategy:

**Self-Hosted** (Recommended)
- Downloads font files to framework-appropriate directories
- Generates CSS @font-face rules with correct paths
- Creates framework-specific integration code
- Works offline, GDPR compliant, better performance

**CDN Integration**
- Generates Google Fonts `<link>` tags
- Includes preload optimization
- Quick setup, smaller bundle, requires internet

**Hybrid Approach**
- Provides both self-hosted and CDN options
- Maximum flexibility for different environments
- Use CDN for development, self-hosted for production

## Generated Files Structure

### Next.js Project Example
```
public/fonts/
├── Inter/
│   ├── Inter-400.woff2
│   ├── Inter-500.woff2
│   ├── Inter.css
│   └── Inter.ts               # Next.js localFont config
├── Roboto/
│   ├── Roboto-400.woff2
│   ├── Roboto.css
│   └── Roboto.ts
└── FONT_GUIDE.md              # Framework-specific integration guide
```

### React/Vite Project Example
```
src/assets/fonts/
├── Inter/
│   ├── Inter-400.woff2
│   ├── Inter.css
├── Roboto/
│   ├── Roboto-400.woff2
│   ├── Roboto.css
└── FONT_GUIDE.md
```

## Supported Formats

### CSS Detection
- Standard CSS: `font-family: 'Inter', sans-serif;`
- SCSS/SASS nested rules
- CSS-in-JS declarations
- CSS custom properties: `--main-font: 'Inter';`
- @font-face declarations

### Framework Integration
- **Tailwind CSS**: `fontFamily` configurations
- **Next.js**: Generates `localFont` setup with TypeScript
- **React/Vue**: CSS modules and styled-components
- **Package.json**: `@fontsource/*` dependencies

### Font Sources
- **Google Fonts**: 1400+ font families with instant validation
- **Fontsource**: NPM-hosted Google Fonts detection
- **Custom fonts**: Coming after MVP release - upload and manage your own fonts

## Complete Workflow

1. **Detect** → Scans your project for Google Font usage
2. **Analyze** → Auto-detects your framework and project structure
3. **Validate** → Checks font availability on Google Fonts
4. **Configure** → Suggests framework-appropriate settings
5. **Generate** → Creates production-ready integration code
6. **Integrate** → Places code in correct directories with usage guide

## Why Fontify?

### Before Fontify
- Manually browse Google Fonts website
- Copy/paste CDN links for each font
- Create @font-face CSS rules manually
- Figure out correct directory structure for each framework
- Write framework-specific font loading code
- Inconsistent font loading strategies across projects

### With Fontify
- Automatic font detection across your project
- Smart framework detection and configuration
- Framework-appropriate directory placement
- Production bundles with optimal loading
- Framework-specific integration code generation
- Complete setup in seconds with best practices

## Technical Details

### Smart Framework Detection
- **Package.json analysis**: Detects framework dependencies automatically
- **Directory structure scanning**: Looks for existing asset folders
- **Framework-specific defaults**: Uses industry-standard directory conventions
- **Fallback detection**: Graceful handling of custom or mixed setups

### Font Detection Engine
- Multi-pattern regex for global CSS compatibility
- Unicode normalization for robust parsing
- AST-aware configuration file parsing
- Performance-optimized file scanning (max 20 files per type)

### Google Fonts Integration
- Real-time font availability validation
- Google Fonts API v2 integration
- Font format optimization (woff2 preferred)
- Automatic variant selection for optimal loading

### Production Code Generation
- Multiple hosting strategies (self-hosted, CDN, hybrid)
- Framework-specific code generation with proper imports
- Performance optimization (preload, font-display)
- Directory path validation and normalization

## Contributing

Fontify is open source and welcomes contributions! Here's how you can help:

- **Report bugs** via GitHub Issues
- **Suggest features** for new font sources or frameworks
- **Submit pull requests** for bug fixes or enhancements
- **Improve documentation** and examples
- **Add localization** support

**Roadmap:** After the initial MVP with Google Fonts, we plan to expand Fontify with advanced features:

**Phase 2 - Enhanced CSS Parsing**
- CSS parser library (PostCSS) for more robust detection
- CSS variable resolution (--main-font support)
- Complex nested rules and import following

**Phase 3 - Framework-Specific Support**
- React/JSX component font detection
- Vue Single File Component parsing
- Angular template and style analysis
- Component prop and style binding tracking

**Phase 4 - Build Tool Integration**
- Webpack/Vite/Rollup plugin integration
- Cross-file import dependency tracking
- Module resolution for font files
- Build-time font optimization

**Phase 5 - Custom Fonts & Sources**
- Custom font upload and management
- Adobe Fonts integration
- Commercial font marketplace support
- Enterprise font library management

Check our GitHub issues for detailed roadmap and planned features!

### Development Setup
```bash
git clone https://github.com/AntipasBen23/fontify.git
cd fontify
npm install
npm run compile
```

Press `F5` in VS Code to start debugging the extension.

## License

MIT

## Acknowledgments

- **Google Fonts** for providing free, high-quality fonts
- **Fontsource** for NPM-hosted font distribution
- **VS Code Extension API** for enabling seamless editor integration

## Links

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AntipasBen23.fontify)**
- **[GitHub Repository](https://github.com/AntipasBen23/fontify)**
- **[Issue Tracker](https://github.com/AntipasBen23/fontify/issues)**
- **[Changelog](https://github.com/AntipasBen23/fontify/blob/main/CHANGELOG.md)**

---

**Made with love for developers who care about typography**

*Fontify automatically handles the complexity of font management so you can focus on building great products.*