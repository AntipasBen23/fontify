import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  files: Record<string, string>;
}

export interface FontFile {
  family: string;
  variant: string;
  url: string;
  format: 'woff2' | 'woff' | 'ttf';
}

export class GoogleFontsService {
  private static readonly API_KEY = 'AIzaSyBB9Q-XaRyE_8mKD8j6i8W5QWc8kHq5Nqo'; // Free public key
  private static readonly API_URL =
    'https://www.googleapis.com/webfonts/v1/webfonts';
  private static readonly CSS_URL = 'https://fonts.googleapis.com/css2';

  private fontsCache: GoogleFont[] | null = null;

  async searchFont(fontName: string): Promise<GoogleFont | null> {
    const fonts = await this.getAllFonts();
    const normalizedName = fontName.toLowerCase().replace(/\s+/g, '');

    return (
      fonts.find(
        font => font.family.toLowerCase().replace(/\s+/g, '') === normalizedName
      ) || null
    );
  }

  async getAllFonts(): Promise<GoogleFont[]> {
    if (this.fontsCache) {
      return this.fontsCache;
    }

    try {
      const response = await fetch(
        `${GoogleFontsService.API_URL}?key=${GoogleFontsService.API_KEY}&sort=popularity`
      );
      const data = (await response.json()) as { items: GoogleFont[] };

      this.fontsCache = data.items || [];
      return this.fontsCache;
    } catch (error) {
      console.error('Failed to fetch Google Fonts:', error);
      return [];
    }
  }

  async getFontFiles(
    fontFamily: string,
    variants: string[] = ['regular']
  ): Promise<FontFile[]> {
    const fontFiles: FontFile[] = [];

    try {
      // Build Google Fonts CSS URL
      const familyParam = `family=${encodeURIComponent(fontFamily)}:wght@${variants.map(v => (v === 'regular' ? '400' : v)).join(';')}`;
      const cssUrl = `${GoogleFontsService.CSS_URL}?${familyParam}&display=swap`;

      // Fetch CSS with woff2 user agent
      const response = await fetch(cssUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const cssContent = await response.text();

      // Extract font URLs from CSS
      const fontFaceRegex = /@font-face\s*\{[^}]*\}/g;
      const urlRegex = /url\(([^)]+)\)/;
      const fontFamilyRegex = /font-family:\s*['"]([^'"]+)['"]/;
      const fontWeightRegex = /font-weight:\s*(\d+)/;

      let match;
      while ((match = fontFaceRegex.exec(cssContent)) !== null) {
        const fontFace = match[0];

        const urlMatch = urlRegex.exec(fontFace);
        const familyMatch = fontFamilyRegex.exec(fontFace);
        const weightMatch = fontWeightRegex.exec(fontFace);

        if (urlMatch && familyMatch) {
          const url = urlMatch[1].replace(/['"]/g, '');
          const family = familyMatch[1];
          const weight = weightMatch ? weightMatch[1] : '400';
          const variant = weight === '400' ? 'regular' : weight;

          // Determine format from URL
          let format: 'woff2' | 'woff' | 'ttf' = 'woff2';
          if (url.includes('.woff2')) format = 'woff2';
          else if (url.includes('.woff')) format = 'woff';
          else if (url.includes('.ttf')) format = 'ttf';

          fontFiles.push({
            family,
            variant,
            url,
            format,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to get font files for ${fontFamily}:`, error);
    }

    return fontFiles;
  }

  async downloadFont(
    fontFile: FontFile,
    outputDir: string
  ): Promise<string | null> {
    try {
      const response = await fetch(fontFile.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();

      // Generate filename
      const familyName = fontFile.family.replace(/\s+/g, '-');
      const filename = `${familyName}-${fontFile.variant}.${fontFile.format}`;
      const filePath = path.join(outputDir, filename);

      // Ensure directory exists
      await fs.ensureDir(outputDir);

      // Write font file
      await fs.writeFile(filePath, buffer);

      return filePath;
    } catch (error) {
      console.error(`Failed to download font ${fontFile.family}:`, error);
      return null;
    }
  }

  async installFont(
    fontFamily: string,
    variants: string[] = ['regular']
  ): Promise<{ success: boolean; installedFiles: string[]; error?: string }> {
    try {
      // Check if font exists on Google Fonts
      const googleFont = await this.searchFont(fontFamily);
      if (!googleFont) {
        return {
          success: false,
          installedFiles: [],
          error: `Font "${fontFamily}" not found on Google Fonts`,
        };
      }

      // Get font files
      const fontFiles = await this.getFontFiles(fontFamily, variants);
      if (fontFiles.length === 0) {
        return {
          success: false,
          installedFiles: [],
          error: `No font files found for "${fontFamily}"`,
        };
      }

      // Determine user fonts directory
      const userFontsDir = this.getUserFontsDirectory();

      // Download and install fonts
      const installedFiles: string[] = [];

      for (const fontFile of fontFiles) {
        const filePath = await this.downloadFont(fontFile, userFontsDir);
        if (filePath) {
          installedFiles.push(filePath);
        }
      }

      if (installedFiles.length === 0) {
        return {
          success: false,
          installedFiles: [],
          error: 'Failed to download any font files',
        };
      }

      // Platform-specific post-installation
      await this.postInstallActions();

      return {
        success: true,
        installedFiles,
        error: undefined,
      };
    } catch (error) {
      return {
        success: false,
        installedFiles: [],
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private getUserFontsDirectory(): string {
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return path.join(
          os.homedir(),
          'AppData',
          'Local',
          'Microsoft',
          'Windows',
          'Fonts'
        );
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Fonts');
      case 'linux':
      default:
        return path.join(os.homedir(), '.local', 'share', 'fonts');
    }
  }

  private async postInstallActions(): Promise<void> {
    const platform = os.platform();

    if (platform === 'linux') {
      // Refresh font cache on Linux
      try {
        const { exec } = require('child_process');
        await new Promise<void>((resolve, reject) => {
          exec('fc-cache -f', (error: any) => {
            if (error) {
              console.warn('Failed to refresh font cache:', error);
            }
            resolve();
          });
        });
      } catch (error) {
        console.warn('Failed to run fc-cache:', error);
      }
    }
  }

  async getFontLicense(fontFamily: string): Promise<string | null> {
    try {
      const googleFont = await this.searchFont(fontFamily);
      if (!googleFont) return null;

      // Most Google Fonts use OFL license
      return 'Open Font License (OFL) - Free for commercial use';
    } catch (error) {
      console.error('Failed to get font license:', error);
      return null;
    }
  }
}
