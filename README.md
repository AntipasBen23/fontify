# Fontify

**Automatically detect, install, and manage fonts in VS Code with zero configuration.**

Fontify streamlines your development workflow by intelligently scanning your project for font usage, installing missing fonts locally, and generating production-ready font bundles. Say goodbye to manual font hunting and broken typography in development.

# Fontify

**Automatically detect, install, and manage fonts in VS Code with zero configuration.**

Fontify streamlines your development workflow by intelligently scanning your project for font usage, installing missing fonts locally, and generating production-ready font bundles. Say goodbye to manual font hunting and broken typography in development.

## Features

### Smart Font Detection
- **Multi-source scanning**: Detects fonts from VS Code settings, CSS files, Tailwind configs, and package.json
- **Framework agnostic**: Works with any CSS format, SCSS, CSS-in-JS, and popular frameworks
- **Intelligent parsing**: Handles complex CSS structures, Unicode issues, and various font-family declarations

### One-Click Font Installation
- **Google Fonts integration**: Install any Google Font with a single command
- **Cross-platform support**: Works on Windows, macOS, and Linux
- **Batch installation**: Install all missing fonts at once with progress tracking
- **Smart variant selection**: Automatically selects common font weights (400, 500, 600, 700)

### Production-Ready Bundling
- **Self-hosted fonts**: Download and bundle fonts for your project
- **CDN integration**: Generate Google Fonts CDN links
- **Framework support**: Next.js, React, Vue, and vanilla CSS
- **Performance optimization**: Includes preload tags and font-display: swap
- **Complete integration guide**: Auto-generated documentation with usage examples

## Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Open any project** with font declarations
3. **Run** `Ctrl+Shift+P` → "Fontify: Detect Missing Fonts"
4. **Choose** to install locally and/or make production-ready

## Commands

| Command | Description |
|---------|-------------|
| `Fontify: Detect Missing Fonts` | Scan project and detect all font usage |
| `Fontify: Install Font` | Install a specific font by name |
| `Fontify: Make Production-Ready` | Generate production font bundles |
| `Fontify: Refresh Font Cache` | Re-scan project for font changes |

## Configuration

Fontify works with zero configuration, but you can customize its behavior:

```json
{
  "fontify.autoDetect": true,
  "fontify.autoInstall": false,
  "fontify.sources": ["google-fonts", "fontsource"]
}
```

### Settings

- **`fontify.autoDetect`**: Automatically detect fonts on startup (default: `true`)
- **`fontify.autoInstall`**: Install missing fonts without prompting (default: `false`)
- **`fontify.sources`**: Font sources to search (default: `["google-fonts", "fontsource"]`)

## Use Cases

### **Development Workflow**
```css
/* Your CSS */
.heading { font-family: 'Inter', sans-serif; }
.body { font-family: 'Roboto', sans-serif; }
```

1. Fontify detects Inter and Roboto usage
2. Installs fonts locally for development
3. Fonts work immediately in VS Code and browser

### **Production Deployment**
Choose your deployment strategy:

**Self-Hosted** (Recommended)
- Downloads font files to `/public/fonts/`
- Generates CSS @font-face rules
- Creates framework-specific integration code

**CDN Integration**
- Generates Google Fonts `<link>` tags
- Includes preload optimization
- Zero hosting requirements

**Hybrid Approach**
- Provides both self-hosted and CDN options
- Fallback strategies for maximum reliability

## Supported Formats

### CSS Detection
- Standard CSS: `font-family: 'Inter', sans-serif;`
- SCSS/SASS nested rules
- CSS-in-JS declarations
- CSS custom properties: `--main-font: 'Inter';`
- @font-face declarations

### Framework Integration
- **Tailwind CSS**: `fontFamily` configurations
- **Next.js**: Generates `localFont` setup
- **React/Vue**: CSS modules and styled-components
- **Package.json**: `@fontsource/*` dependencies

### Font Sources
- **Google Fonts**: 1400+ font families
- **Fontsource**: NPM-hosted Google Fonts
- **Local fonts**: System font detection

## Generated Files

When you run "Make Production-Ready", Fontify creates:

```
public/fonts/
├── Inter/
│   ├── Inter-400.woff2
│   ├── Inter-500.woff2
│   ├── Inter-600.woff2
│   ├── Inter-700.woff2
│   ├── Inter.css
│   └── LICENSE.txt
├── Roboto/
│   ├── Roboto-400.woff2
│   ├── Roboto-700.woff2
│   ├── Roboto.css
│   └── LICENSE.txt
└── FONT_INTEGRATION.md
```

## Complete Workflow

1. **Detect** → Scans your project for font usage
2. **Install** → Downloads fonts for local development
3. **Bundle** → Generates production-ready assets
4. **Deploy** → Copy files and follow integration guide

## Why Fontify?

### Before Fontify
- Manually browse Google Fonts website
- Copy/paste CDN links for each font
- Broken fonts in development environment
- Inconsistent font loading strategies
- Manual @font-face CSS generation

### With Fontify
- Automatic font detection across your project
- One-click installation for development
- Production bundles with optimal loading
- Consistent development-to-production workflow
- Framework-specific integration code

## Technical Details

### Font Detection Engine
- Multi-pattern regex for global CSS compatibility
- Unicode normalization for robust parsing
- AST-aware configuration file parsing
- Performance-optimized file scanning (max 20 files per type)

### Installation System
- Cross-platform user font directory detection
- Google Fonts API v2 integration
- Font format optimization (woff2 preferred)
- Automatic font cache refresh (Linux fc-cache)

### Production Bundling
- Multiple hosting strategies (self-hosted, CDN, hybrid)
- Framework-specific code generation
- Performance optimization (preload, font-display)
- License compliance and attribution

## Contributing

Fontify is open source and welcomes contributions! Here's how you can help:

- **Report bugs** via GitHub Issues
- **Suggest features** for new font sources or frameworks
- **Submit pull requests** for bug fixes or enhancements
- **Improve documentation** and examples
- **Add localization** support

### Development Setup
```bash
git clone https://github.com/AntipasBen23/fontify.git
cd fontify
npm install
npm run compile
```

Press `F5` in VS Code to start debugging the extension.

## License

MIT License - feel free to use Fontify in personal and commercial projects.

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