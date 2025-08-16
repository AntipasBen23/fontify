import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GoogleFontsService } from './googleFontsService';
import { DetectedFont } from './fontDetection';

export interface BundleOptions {
  strategy: 'self-hosted' | 'cdn' | 'both';
  outputDir: string;
  framework: 'vanilla' | 'nextjs' | 'react' | 'vue' | 'custom';
}

interface FrameworkInfo {
  name: string;
  defaultDir: string;
  detected: boolean;
}

export class ProductionBundlerService {
  private googleFontsService = new GoogleFontsService();

  async detectFramework(): Promise<FrameworkInfo> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return { name: 'vanilla', defaultDir: 'assets/fonts', detected: false };
    }

    const packageJsonPath = path.join(workspaceRoot, 'package.json');

    try {
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (deps.next) {
          return { name: 'nextjs', defaultDir: 'public/fonts', detected: true };
        }
        if (deps.react && (deps.vite || deps['@vitejs/plugin-react'])) {
          return {
            name: 'react-vite',
            defaultDir: 'src/assets/fonts',
            detected: true,
          };
        }
        if (deps.react) {
          return {
            name: 'react',
            defaultDir: 'src/assets/fonts',
            detected: true,
          };
        }
        if (deps.vue || deps.nuxt) {
          return { name: 'vue', defaultDir: 'assets/fonts', detected: true };
        }
      }

      const existingDirs = ['public', 'assets', 'src/assets', 'static'];
      for (const dir of existingDirs) {
        if (await fs.pathExists(path.join(workspaceRoot, dir))) {
          return {
            name: 'vanilla',
            defaultDir: dir === 'public' ? 'public/fonts' : `${dir}/fonts`,
            detected: false,
          };
        }
      }
    } catch (error) {
      console.warn('Framework detection failed:', error);
    }

    return { name: 'vanilla', defaultDir: 'assets/fonts', detected: false };
  }

  async selectHostingStrategy(): Promise<
    'self-hosted' | 'cdn' | 'both' | undefined
  > {
    const options = [
      {
        label: 'Self-hosted',
        detail:
          'Download fonts locally - Better performance, GDPR compliant, works offline',
      },
      {
        label: 'CDN',
        detail:
          'Use Google Fonts links - Quick setup, smaller bundle, requires internet',
      },
      {
        label: 'Both',
        detail:
          'Generate both options - Maximum flexibility for different environments',
      },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      title: 'Choose font hosting strategy',
    });

    if (!selected) return undefined;

    if (selected.label === 'Self-hosted') return 'self-hosted';
    if (selected.label === 'CDN') return 'cdn';
    return 'both';
  }

  async selectFrameworkAndDirectory(): Promise<
    { framework: string; outputDir: string } | undefined
  > {
    const detectedFramework = await this.detectFramework();

    const frameworkOptions = [
      {
        label: `${detectedFramework.detected ? '✓ ' : ''}Next.js`,
        value: 'nextjs',
        defaultDir: 'public/fonts',
        description:
          detectedFramework.detected && detectedFramework.name === 'nextjs'
            ? 'Detected in project'
            : 'Generate localFont configuration',
      },
      {
        label: `${detectedFramework.detected && detectedFramework.name.includes('react') ? '✓ ' : ''}React/Vite`,
        value: 'react',
        defaultDir: 'src/assets/fonts',
        description:
          detectedFramework.detected && detectedFramework.name.includes('react')
            ? 'Detected in project'
            : 'React-compatible CSS modules',
      },
      {
        label: `${detectedFramework.detected && detectedFramework.name === 'vue' ? '✓ ' : ''}Vue/Nuxt`,
        value: 'vue',
        defaultDir: 'assets/fonts',
        description:
          detectedFramework.detected && detectedFramework.name === 'vue'
            ? 'Detected in project'
            : 'Vue 3 composables and scoped CSS',
      },
      {
        label: 'Vanilla CSS',
        value: 'vanilla',
        defaultDir: detectedFramework.defaultDir,
        description: 'Standard CSS @font-face rules and utility classes',
      },
      {
        label: 'Custom setup',
        value: 'custom',
        defaultDir: 'fonts',
        description: 'Specify your own directory structure',
      },
    ];

    let preselectedIndex = 0;
    if (detectedFramework.detected) {
      preselectedIndex = frameworkOptions.findIndex(
        opt =>
          (detectedFramework.name === 'nextjs' && opt.value === 'nextjs') ||
          (detectedFramework.name.includes('react') && opt.value === 'react') ||
          (detectedFramework.name === 'vue' && opt.value === 'vue')
      );
    }

    const selectedFramework = await vscode.window.showQuickPick(
      frameworkOptions.map((opt, index) => ({
        ...opt,
        picked: index === preselectedIndex,
      })),
      {
        title: `Choose your framework ${detectedFramework.detected ? '(auto-detected: ' + detectedFramework.name + ')' : ''}`,
      }
    );

    if (!selectedFramework) return undefined;

    const defaultDir = selectedFramework.defaultDir;
    const outputDir = await vscode.window.showInputBox({
      prompt: 'Output directory (relative to workspace root)',
      value: defaultDir,
      placeHolder: defaultDir,
      validateInput: value => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        if (value.includes('..') || path.isAbsolute(value)) {
          return 'Please use a relative path within your project';
        }
        return undefined;
      },
    });

    if (!outputDir) return undefined;

    return {
      framework: selectedFramework.value,
      outputDir: outputDir.trim(),
    };
  }

  async bundleMultipleFonts(
    fonts: DetectedFont[],
    options: BundleOptions,
    onProgress?: (current: number, total: number, fontName: string) => void
  ): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) throw new Error('No workspace folder found');

    const outputPath = path.join(workspaceRoot, options.outputDir);
    await fs.ensureDir(outputPath);

    const bundles: string[] = [];
    const variants = ['400', '500', '600', '700'];

    for (let i = 0; i < fonts.length; i++) {
      const font = fonts[i];
      onProgress?.(i + 1, fonts.length, font.name);

      try {
        const bundle = await this.bundleFont(
          font.name,
          variants,
          options,
          outputPath
        );
        if (bundle) bundles.push(bundle);
      } catch (error) {
        console.warn(`Failed to bundle font ${font.name}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    await this.generateIntegrationGuide(bundles, options, outputPath);
  }

  private async bundleFont(
    fontFamily: string,
    variants: string[],
    options: BundleOptions,
    outputPath: string
  ): Promise<string | null> {
    const sanitizedName = fontFamily.replace(/[^a-zA-Z0-9]/g, '-');
    const fontDir = path.join(outputPath, sanitizedName);
    await fs.ensureDir(fontDir);

    let cssContent = `/* ${fontFamily} Font Family */\n\n`;

    if (options.strategy === 'self-hosted' || options.strategy === 'both') {
      const fontFiles = await this.googleFontsService.getFontFiles(
        fontFamily,
        variants
      );

      for (const fontFile of fontFiles) {
        const downloadedPath = await this.googleFontsService.downloadFont(
          fontFile,
          fontDir
        );
        if (downloadedPath) {
          const fileName = path.basename(downloadedPath);
          const weight =
            fontFile.variant === 'regular' ? '400' : fontFile.variant;

          cssContent += `@font-face {
  font-family: '${fontFamily}';
  src: url('./${sanitizedName}/${fileName}') format('woff2');
  font-weight: ${weight};
  font-display: swap;
}\n\n`;
        }
      }
    }

    if (options.strategy === 'cdn' || options.strategy === 'both') {
      const familyParam = fontFamily.replace(/\s+/g, '+');
      const weightsParam = variants.join(';');
      const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightsParam}&display=swap`;

      cssContent += `/* CDN Option */\n@import url('${googleFontsUrl}');\n\n`;
    }

    cssContent += `/* Utility Classes */\n`;
    cssContent += `.font-${sanitizedName.toLowerCase()} { font-family: '${fontFamily}', sans-serif; }\n`;
    cssContent += `:root { --font-${sanitizedName.toLowerCase()}: '${fontFamily}', sans-serif; }\n`;

    const cssFile = path.join(fontDir, `${sanitizedName}.css`);
    await fs.writeFile(cssFile, cssContent);

    if (options.framework === 'nextjs') {
      await this.generateNextJSCode(fontFamily, fontDir);
    }

    return path.relative(outputPath, cssFile);
  }

  private async generateNextJSCode(
    fontFamily: string,
    fontDir: string
  ): Promise<void> {
    const sanitizedName = fontFamily
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();

    const nextjsCode = `import localFont from 'next/font/local';

export const ${sanitizedName} = localFont({
  src: './${path.basename(fontDir)}/*.woff2',
  display: 'swap',
  variable: '--font-${sanitizedName}'
});

// Usage: className={\`\${${sanitizedName}.variable} font-${sanitizedName}\`}
`;

    await fs.writeFile(path.join(fontDir, `${sanitizedName}.ts`), nextjsCode);
  }

  private async generateIntegrationGuide(
    bundles: string[],
    options: BundleOptions,
    outputPath: string
  ): Promise<void> {
    let guide = `# Font Integration Guide\n\n`;
    guide += `Generated: ${new Date().toLocaleString()}\n`;
    guide += `Strategy: ${options.strategy}\n`;
    guide += `Framework: ${options.framework}\n`;
    guide += `Output: ${options.outputDir}\n\n`;

    if (options.strategy === 'self-hosted' || options.strategy === 'both') {
      guide += `## Self-Hosted Usage\n\n`;

      if (options.framework === 'nextjs') {
        guide += `### Next.js App Router\n\nImport fonts in your layout.tsx:\n\n\`\`\`tsx\n`;
        bundles.forEach(bundle => {
          const fontName = path.basename(bundle, '.css').toLowerCase();
          guide += `import { ${fontName} } from './${options.outputDir}/${fontName}/${fontName}';\n`;
        });
        guide += `\nexport default function RootLayout({ children }) {\n`;
        guide += `  return (\n    <html className={\`\${`;
        guide += bundles
          .map(bundle => path.basename(bundle, '.css').toLowerCase())
          .join('.variable} ${');
        guide += `.variable}\`}>\n      <body>{children}</body>\n    </html>\n  );\n}\n\`\`\`\n\n`;
      }

      guide += `### CSS Import Method\n\nAdd to your main CSS file:\n\n\`\`\`css\n`;
      bundles.forEach(bundle => {
        guide += `@import url('./${bundle}');\n`;
      });
      guide += `\`\`\`\n\n`;
    }

    if (options.strategy === 'cdn' || options.strategy === 'both') {
      guide += `## CDN Usage\n\nThe CDN imports are included in the CSS files above.\n\n`;
    }

    guide += `## Apply Fonts\n\n\`\`\`css\n`;
    bundles.forEach(bundle => {
      const fontName = path.basename(bundle, '.css');
      guide += `.font-${fontName.toLowerCase()} { font-family: var(--font-${fontName.toLowerCase()}); }\n`;
    });
    guide += `\`\`\`\n\n`;

    guide += `## Framework-Specific Tips\n\n`;
    if (options.framework === 'nextjs') {
      guide += `**Next.js:** Use the generated TypeScript files for optimal performance and type safety.\n\n`;
    } else if (options.framework === 'react') {
      guide += `**React:** Import the CSS files in your index.js or App.jsx file.\n\n`;
    } else if (options.framework === 'vue') {
      guide += `**Vue:** Import the CSS files in your main.js or use scoped styles in components.\n\n`;
    }

    await fs.writeFile(path.join(outputPath, 'FONT_GUIDE.md'), guide);
  }
}
