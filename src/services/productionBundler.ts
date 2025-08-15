import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GoogleFontsService } from './googleFontsService';
import { DetectedFont } from './fontDetection';

export interface ProductionBundle {
  fontFamily: string;
  strategy: 'self-hosted' | 'cdn' | 'both';
  files: {
    cssFile?: string;
    fontFiles: string[];
    licenseFile?: string;
  };
  code: {
    htmlLink?: string;
    cssImport?: string;
    cssFontFace?: string;
    nextjsFont?: string;
  };
}

export interface BundleOptions {
  strategy: 'self-hosted' | 'cdn' | 'both';
  variants: string[];
  outputDir: string;
  framework: 'vanilla' | 'nextjs' | 'react' | 'vue';
  includePreload: boolean;
}

export class ProductionBundlerService {
  private googleFontsService: GoogleFontsService;

  constructor() {
    this.googleFontsService = new GoogleFontsService();
  }

  async bundleFont(
    fontFamily: string,
    options: BundleOptions
  ): Promise<ProductionBundle> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const outputPath = path.join(workspaceRoot, options.outputDir);
    const fontDir = path.join(outputPath, this.sanitizeFontName(fontFamily));

    const bundle: ProductionBundle = {
      fontFamily,
      strategy: options.strategy,
      files: {
        fontFiles: [],
      },
      code: {},
    };

    // Ensure output directory exists
    await fs.ensureDir(fontDir);

    if (options.strategy === 'self-hosted' || options.strategy === 'both') {
      await this.generateSelfHostedBundle(fontFamily, options, fontDir, bundle);
    }

    if (options.strategy === 'cdn' || options.strategy === 'both') {
      this.generateCDNBundle(fontFamily, options, bundle);
    }

    // Generate framework-specific code
    this.generateFrameworkCode(fontFamily, options, bundle);

    // Create license file
    await this.createLicenseFile(fontFamily, fontDir, bundle);

    return bundle;
  }

  async bundleMultipleFonts(
    fonts: DetectedFont[],
    options: BundleOptions,
    onProgress?: (current: number, total: number, fontName: string) => void
  ): Promise<ProductionBundle[]> {
    const bundles: ProductionBundle[] = [];

    for (let i = 0; i < fonts.length; i++) {
      const font = fonts[i];

      if (onProgress) {
        onProgress(i + 1, fonts.length, font.name);
      }

      try {
        const bundle = await this.bundleFont(font.name, options);
        bundles.push(bundle);
      } catch (error) {
        console.warn(`Failed to bundle font ${font.name}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return bundles;
  }

  private async generateSelfHostedBundle(
    fontFamily: string,
    options: BundleOptions,
    fontDir: string,
    bundle: ProductionBundle
  ): Promise<void> {
    // Download font files
    const fontFiles = await this.googleFontsService.getFontFiles(
      fontFamily,
      options.variants
    );

    for (const fontFile of fontFiles) {
      const fileName = `${this.sanitizeFontName(fontFamily)}-${fontFile.variant}.${fontFile.format}`;
      const filePath = path.join(fontDir, fileName);

      const downloadedPath = await this.googleFontsService.downloadFont(
        fontFile,
        fontDir
      );
      if (downloadedPath) {
        bundle.files.fontFiles.push(
          path.relative(this.getWorkspaceRoot()!, downloadedPath)
        );
      }
    }

    // Generate CSS @font-face rules
    const cssContent = this.generateFontFaceCSS(fontFamily, fontFiles, options);
    const cssFile = path.join(
      fontDir,
      `${this.sanitizeFontName(fontFamily)}.css`
    );

    await fs.writeFile(cssFile, cssContent);
    bundle.files.cssFile = path.relative(this.getWorkspaceRoot()!, cssFile);
    bundle.code.cssFontFace = cssContent;
  }

  private generateCDNBundle(
    fontFamily: string,
    options: BundleOptions,
    bundle: ProductionBundle
  ): void {
    const familyParam = fontFamily.replace(/\s+/g, '+');
    const weightsParam = options.variants
      .map(v => (v === 'regular' ? '400' : v))
      .join(';');

    // Google Fonts CDN link
    const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightsParam}&display=swap`;

    bundle.code.htmlLink = `<link href="${googleFontsUrl}" rel="stylesheet">`;
    bundle.code.cssImport = `@import url('${googleFontsUrl}');`;
  }

  private generateFrameworkCode(
    fontFamily: string,
    options: BundleOptions,
    bundle: ProductionBundle
  ): void {
    if (options.framework === 'nextjs' && bundle.files.fontFiles.length > 0) {
      bundle.code.nextjsFont = this.generateNextJSCode(
        fontFamily,
        bundle.files.fontFiles
      );
    }
  }

  private generateFontFaceCSS(
    fontFamily: string,
    fontFiles: any[],
    options: BundleOptions
  ): string {
    const fontDir = options.outputDir;
    const sanitizedName = this.sanitizeFontName(fontFamily);

    let css = `/* ${fontFamily} Font Family */\n\n`;

    fontFiles.forEach(fontFile => {
      const fileName = `${sanitizedName}-${fontFile.variant}.${fontFile.format}`;
      const fontPath = `/${fontDir}/${sanitizedName}/${fileName}`;

      const weight = fontFile.variant === 'regular' ? '400' : fontFile.variant;
      const format = fontFile.format === 'woff2' ? 'woff2' : fontFile.format;

      css += `@font-face {
  font-family: '${fontFamily}';
  src: url('${fontPath}') format('${format}');
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
}\n\n`;
    });

    // Add utility classes
    css += `/* Utility Classes */\n`;
    css += `.font-${sanitizedName.toLowerCase()} {
  font-family: '${fontFamily}', sans-serif;
}\n\n`;

    // Add CSS custom property
    css += `:root {
  --font-${sanitizedName.toLowerCase()}: '${fontFamily}', sans-serif;
}\n`;

    return css;
  }

  private generateNextJSCode(fontFamily: string, fontFiles: string[]): string {
    const sanitizedName = this.sanitizeFontName(fontFamily);
    const varName = sanitizedName.toLowerCase();

    let nextjsCode = `import localFont from 'next/font/local';\n\n`;

    nextjsCode += `export const ${varName} = localFont({\n`;
    nextjsCode += `  src: [\n`;

    fontFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      const match = fileName.match(/-(\w+)\./);
      const weight = match && match[1] !== 'regular' ? match[1] : '400';

      nextjsCode += `    {\n`;
      nextjsCode += `      path: './${filePath}',\n`;
      nextjsCode += `      weight: '${weight}',\n`;
      nextjsCode += `      style: 'normal',\n`;
      nextjsCode += `    },\n`;
    });

    nextjsCode += `  ],\n`;
    nextjsCode += `  display: 'swap',\n`;
    nextjsCode += `  variable: '--font-${varName}'\n`;
    nextjsCode += `});\n\n`;

    nextjsCode += `// Usage in your components:\n`;
    nextjsCode += `// <div className={\`\${${varName}.variable} font-${varName}\`}>\n`;
    nextjsCode += `//   Your content here\n`;
    nextjsCode += `// </div>\n`;

    return nextjsCode;
  }

  private async createLicenseFile(
    fontFamily: string,
    fontDir: string,
    bundle: ProductionBundle
  ): Promise<void> {
    const license = await this.googleFontsService.getFontLicense(fontFamily);

    if (license) {
      const licenseContent = `Font: ${fontFamily}
Source: Google Fonts
License: ${license}
Downloaded: ${new Date().toISOString()}

This font software is licensed under the SIL Open Font License, Version 1.1.
You can use this font freely in your projects, both personal and commercial.

For full license details, visit: https://scripts.sil.org/OFL
`;

      const licenseFile = path.join(fontDir, 'LICENSE.txt');
      await fs.writeFile(licenseFile, licenseContent);
      bundle.files.licenseFile = path.relative(
        this.getWorkspaceRoot()!,
        licenseFile
      );
    }
  }

  async generateProjectSummary(
    bundles: ProductionBundle[],
    options: BundleOptions
  ): Promise<string> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    let summary = `# Font Integration Guide\n\n`;
    summary += `Generated on: ${new Date().toLocaleString()}\n`;
    summary += `Strategy: ${options.strategy}\n`;
    summary += `Framework: ${options.framework}\n\n`;

    if (options.strategy === 'cdn' || options.strategy === 'both') {
      summary += `## CDN Integration\n\n`;
      summary += `Add to your HTML <head>:\n\n`;
      summary += `\`\`\`html\n`;
      bundles.forEach(bundle => {
        if (bundle.code.htmlLink) {
          summary += `${bundle.code.htmlLink}\n`;
        }
      });
      summary += `\`\`\`\n\n`;

      if (options.includePreload) {
        summary += `For better performance, add preload tags:\n\n`;
        summary += `\`\`\`html\n`;
        bundles.forEach(bundle => {
          const familyParam = bundle.fontFamily.replace(/\s+/g, '+');
          summary += `<link rel="preconnect" href="https://fonts.googleapis.com">\n`;
          summary += `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n`;
        });
        summary += `\`\`\`\n\n`;
      }
    }

    if (options.strategy === 'self-hosted' || options.strategy === 'both') {
      summary += `## Self-Hosted Integration\n\n`;
      summary += `Import the CSS files:\n\n`;
      summary += `\`\`\`css\n`;
      bundles.forEach(bundle => {
        if (bundle.files.cssFile) {
          summary += `@import url('./${bundle.files.cssFile}');\n`;
        }
      });
      summary += `\`\`\`\n\n`;

      if (options.framework === 'nextjs') {
        summary += `### Next.js Integration\n\n`;
        bundles.forEach(bundle => {
          if (bundle.code.nextjsFont) {
            summary += `\`\`\`typescript\n${bundle.code.nextjsFont}\n\`\`\`\n\n`;
          }
        });
      }
    }

    summary += `## CSS Usage\n\n`;
    bundles.forEach(bundle => {
      const sanitizedName = this.sanitizeFontName(
        bundle.fontFamily
      ).toLowerCase();
      summary += `\`\`\`css\n`;
      summary += `/* Using ${bundle.fontFamily} */\n`;
      summary += `.your-class {\n`;
      summary += `  font-family: '${bundle.fontFamily}', sans-serif;\n`;
      summary += `}\n\n`;
      summary += `/* Or use utility class */\n`;
      summary += `.font-${sanitizedName} {\n`;
      summary += `  font-family: var(--font-${sanitizedName});\n`;
      summary += `}\n`;
      summary += `\`\`\`\n\n`;
    });

    const summaryFile = path.join(
      workspaceRoot,
      options.outputDir,
      'FONT_INTEGRATION.md'
    );
    await fs.writeFile(summaryFile, summary);

    return summaryFile;
  }

  private sanitizeFontName(fontName: string): string {
    return fontName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  }

  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }
}
