import * as vscode from 'vscode';
import { GoogleFontsService } from './googleFontsService';
import { DetectedFont } from './fontDetection';

export interface InstallResult {
  fontName: string;
  success: boolean;
  source: 'google-fonts' | 'fontsource' | 'local';
  installedFiles?: string[];
  error?: string;
  requiresReload?: boolean;
}

export class FontInstallerService {
  private googleFontsService: GoogleFontsService;

  constructor() {
    this.googleFontsService = new GoogleFontsService();
  }

  async installFont(fontName: string): Promise<InstallResult> {
    // First try Google Fonts
    const googleResult = await this.installFromGoogleFonts(fontName);
    if (googleResult.success) {
      return googleResult;
    }

    // Could add other sources here (Fontsource, Adobe Fonts, etc.)

    return {
      fontName,
      success: false,
      source: 'google-fonts',
      error: `Font "${fontName}" not found in any supported font sources`,
    };
  }

  async installMultipleFonts(fonts: DetectedFont[]): Promise<InstallResult[]> {
    const results: InstallResult[] = [];

    // Filter out fonts that are already installed
    const fontsToInstall = fonts.filter(font => font.isInstalled !== true);

    for (const font of fontsToInstall) {
      const result = await this.installFont(font.name);
      results.push(result);

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  private async installFromGoogleFonts(
    fontName: string
  ): Promise<InstallResult> {
    try {
      // Check if font exists
      const googleFont = await this.googleFontsService.searchFont(fontName);
      if (!googleFont) {
        return {
          fontName,
          success: false,
          source: 'google-fonts',
          error: `"${fontName}" not found on Google Fonts`,
        };
      }

      // Install with common variants
      const variants = this.getCommonVariants(googleFont.variants);
      const installResult = await this.googleFontsService.installFont(
        fontName,
        variants
      );

      if (!installResult.success) {
        return {
          fontName,
          success: false,
          source: 'google-fonts',
          error: installResult.error,
        };
      }

      return {
        fontName,
        success: true,
        source: 'google-fonts',
        installedFiles: installResult.installedFiles,
        requiresReload: this.requiresReload(),
      };
    } catch (error) {
      return {
        fontName,
        success: false,
        source: 'google-fonts',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private getCommonVariants(availableVariants: string[]): string[] {
    // Install the most commonly used variants
    const preferredVariants = ['regular', '400', '500', '600', '700', 'bold'];

    return preferredVariants
      .filter(
        variant =>
          availableVariants.includes(variant) ||
          availableVariants.includes(variant === 'bold' ? '700' : variant)
      )
      .slice(0, 3); // Limit to 3 variants to avoid too many downloads
  }

  private requiresReload(): boolean {
    // Windows requires app reload, macOS is immediate, Linux after fc-cache
    return process.platform === 'win32';
  }

  async checkFontAvailability(fontName: string): Promise<{
    available: boolean;
    source?: 'google-fonts' | 'fontsource' | 'local';
    variants?: string[];
    license?: string;
  }> {
    // Check Google Fonts
    const googleFont = await this.googleFontsService.searchFont(fontName);
    if (googleFont) {
      const license = await this.googleFontsService.getFontLicense(fontName);
      return {
        available: true,
        source: 'google-fonts',
        variants: googleFont.variants,
        license: license || undefined,
      };
    }

    return {
      available: false,
    };
  }

  async showInstallProgress(
    fonts: DetectedFont[],
    onProgress?: (current: number, total: number, fontName: string) => void
  ): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const fontsToInstall = fonts.filter(font => font.isInstalled !== true);

    for (let i = 0; i < fontsToInstall.length; i++) {
      const font = fontsToInstall[i];

      if (onProgress) {
        onProgress(i + 1, fontsToInstall.length, font.name);
      }

      const result = await this.installFont(font.name);
      results.push(result);

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }
}
