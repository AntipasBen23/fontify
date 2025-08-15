import * as vscode from 'vscode';
import * as fs from 'fs-extra';

export interface DetectedFont {
  name: string;
  source: 'vscode-settings' | 'css' | 'tailwind' | 'package-json';
  filePath?: string;
  isInstalled?: boolean;
}

export class FontDetectionService {
  constructor(private readonly workspace = vscode.workspace) {}

  async detectFonts(): Promise<DetectedFont[]> {
    const fonts: DetectedFont[] = [];

    fonts.push(...this.detectFromVSCodeSettings());
    fonts.push(...(await this.detectFromFiles()));

    return this.deduplicate(fonts);
  }

  private detectFromVSCodeSettings(): DetectedFont[] {
    const fontFamily = this.workspace
      .getConfiguration('editor')
      .get<string>('fontFamily');
    if (!fontFamily) return [];

    return this.parseFontFamily(fontFamily).map(name => ({
      name,
      source: 'vscode-settings' as const,
    }));
  }

  private async detectFromFiles(): Promise<DetectedFont[]> {
    const fonts: DetectedFont[] = [];

    try {
      const cssFiles = await this.workspace.findFiles(
        '**/*.{css,scss}',
        '**/{node_modules,dist,build}/**'
      );

      for (const file of cssFiles.slice(0, 20)) {
        const content = await fs.readFile(file.fsPath, 'utf8');
        const fontNames = this.extractAllFontsFromCSS(content);

        fonts.push(
          ...fontNames.map(name => ({
            name,
            source: 'css' as const,
            filePath: file.fsPath,
          }))
        );
      }

      const tailwindFiles = await this.workspace.findFiles(
        'tailwind.config.{js,ts}'
      );
      for (const file of tailwindFiles) {
        const content = await fs.readFile(file.fsPath, 'utf8');
        const fontMatch = content.match(
          /fontFamily\s*:\s*\{[^}]*['"`]([^'"`]+)['"`]\s*:\s*\[([^\]]+)\]/g
        );

        if (fontMatch) {
          fontMatch.forEach(match => {
            const arrayMatch = match.match(/\[([^\]]+)\]/);
            if (arrayMatch) {
              const fontNames = this.parseFontFamily(arrayMatch[1]);
              fonts.push(
                ...fontNames.map(name => ({
                  name,
                  source: 'tailwind' as const,
                  filePath: file.fsPath,
                }))
              );
            }
          });
        }
      }

      const packageFiles = await this.workspace.findFiles(
        '**/package.json',
        '**/node_modules/**'
      );
      for (const file of packageFiles) {
        const content = await fs.readFile(file.fsPath, 'utf8');
        const pkg = JSON.parse(content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        Object.keys(deps).forEach(dep => {
          if (dep.startsWith('@fontsource/')) {
            const fontName = dep.replace('@fontsource/', '').replace(/-/g, ' ');
            fonts.push({
              name: fontName,
              source: 'package-json',
              filePath: file.fsPath,
              isInstalled: true,
            });
          }
        });
      }
    } catch (error) {
      console.warn('Font detection error:', error);
    }

    return fonts;
  }

  private extractAllFontsFromCSS(content: string): string[] {
    const fonts = new Set<string>();

    const cleanContent = content
      .replace(/\u0000/g, '')
      .replace(/[\u0001-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const fontFamilyPattern = /font-family\s*:\s*([^;}]+)/gi;

    let match;
    while ((match = fontFamilyPattern.exec(cleanContent)) !== null) {
      const fontValue = match[1].trim();
      if (fontValue) {
        const parsedFonts = this.parseFontFamily(fontValue);
        parsedFonts.forEach(font => fonts.add(font));
      }
    }

    return Array.from(fonts);
  }

  private parseFontFamily(fontFamily: string): string[] {
    return fontFamily
      .split(',')
      .map(font => font.trim().replace(/['"]/g, ''))
      .filter(font => !this.isSystemFont(font))
      .slice(0, 3);
  }

  private isSystemFont(font: string): boolean {
    const systemFonts = [
      'serif',
      'sans-serif',
      'monospace',
      'arial',
      'helvetica',
      'times',
    ];
    return systemFonts.includes(font.toLowerCase());
  }

  private deduplicate(fonts: DetectedFont[]): DetectedFont[] {
    const unique = new Map<string, DetectedFont>();
    fonts.forEach(font => {
      const key = font.name.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, font);
      }
    });
    return Array.from(unique.values());
  }
}
