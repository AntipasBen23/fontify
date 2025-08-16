import * as vscode from 'vscode';
import { FontDetectionService, DetectedFont } from './services/fontDetection';
import { ProductionBundlerService } from './services/productionBundler';
import { GoogleFontsService } from './services/googleFontsService';

let fontService: FontDetectionService;
let bundlerService: ProductionBundlerService;
let googleFontsService: GoogleFontsService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Fontify extension is now active!');

  fontService = new FontDetectionService();
  bundlerService = new ProductionBundlerService();
  googleFontsService = new GoogleFontsService();

  const disposables = [
    vscode.commands.registerCommand('fontify.detectFonts', async () => {
      await detectFontsCommand();
    }),

    vscode.commands.registerCommand('fontify.makeProductionReady', async () => {
      await makeProductionReadyCommand();
    }),

    vscode.commands.registerCommand('fontify.refreshCache', async () => {
      await detectFontsCommand();
    }),
  ];

  context.subscriptions.push(...disposables);

  const config = vscode.workspace.getConfiguration('fontify');
  if (config.get('autoDetect', true)) {
    detectFontsCommand();
  }
}

async function detectFontsCommand() {
  try {
    vscode.window.showInformationMessage('🔍 Detecting fonts...');

    const fonts = await fontService.detectFonts();

    if (fonts.length === 0) {
      vscode.window.showInformationMessage(
        '✅ No custom fonts detected in your project'
      );
      return;
    }

    const validatedFonts = fonts.map(font => ({
      ...font,
      available: true,
    }));

    const availableFonts = validatedFonts.filter(f => f.available);
    const unavailableFonts = validatedFonts.filter(f => !f.available);

    const bySource = availableFonts.reduce(
      (acc, font) => {
        if (!acc[font.source]) {
          acc[font.source] = [];
        }
        acc[font.source].push(font);
        return acc;
      },
      {} as Record<string, DetectedFont[]>
    );

    const summary = Object.entries(bySource)
      .map(([source, fonts]) => `${source}: ${fonts.length}`)
      .join(', ');

    let message = `🎨 Found ${availableFonts.length} fonts (${summary})`;
    if (unavailableFonts.length > 0) {
      message += ` • ${unavailableFonts.length} not available`;
    }

    const action = await vscode.window.showInformationMessage(
      message,
      'View Details',
      'Make Production-Ready'
    );

    if (action === 'View Details') {
      showFontDetails(validatedFonts);
    } else if (action === 'Make Production-Ready') {
      await makeProductionReadyFonts(availableFonts);
    }
  } catch (error) {
    console.error('Font detection failed:', error);
    vscode.window.showErrorMessage(
      'Failed to detect fonts. Check output for details.'
    );
  }
}

async function makeProductionReadyCommand() {
  const fonts = await fontService.detectFonts();

  if (fonts.length === 0) {
    vscode.window.showInformationMessage(
      'No fonts detected. Run font detection first.'
    );
    return;
  }

  const validatedFonts = fonts.map(font => ({ ...font, available: true }));
  const availableFonts = validatedFonts.filter(f => f.available);

  if (availableFonts.length === 0) {
    vscode.window.showInformationMessage('No fonts found in your project.');
    return;
  }

  await makeProductionReadyFonts(availableFonts);
}

async function makeProductionReadyFonts(fonts: DetectedFont[]) {
  const strategy = await bundlerService.selectHostingStrategy();
  if (!strategy) return;

  const frameworkSelection = await bundlerService.selectFrameworkAndDirectory();
  if (!frameworkSelection) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Making fonts production-ready...',
      cancellable: false,
    },
    async progress => {
      try {
        await bundlerService.bundleMultipleFonts(
          fonts,
          {
            strategy,
            outputDir: frameworkSelection.outputDir,
            framework: frameworkSelection.framework as any,
          },
          (current, total, fontName) => {
            progress.report({
              increment: 100 / total,
              message: `Processing ${fontName} (${current}/${total})`,
            });
          }
        );

        const action = await vscode.window.showInformationMessage(
          `✅ Successfully prepared ${fonts.length} fonts for production! Generated files in ${frameworkSelection.outputDir}/`,
          'View Integration Guide',
          'Open Folder'
        );

        if (action === 'View Integration Guide') {
          const workspaceRoot =
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (workspaceRoot) {
            const guidePath = require('path').join(
              workspaceRoot,
              frameworkSelection.outputDir,
              'FONT_GUIDE.md'
            );
            const doc = await vscode.workspace.openTextDocument(guidePath);
            vscode.window.showTextDocument(doc);
          }
        } else if (action === 'Open Folder') {
          const workspaceRoot =
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (workspaceRoot) {
            const outputPath = require('path').join(
              workspaceRoot,
              frameworkSelection.outputDir
            );
            vscode.commands.executeCommand(
              'revealFileInOS',
              vscode.Uri.file(outputPath)
            );
          }
        }
      } catch (error) {
        console.error('Production bundling failed:', error);
        vscode.window.showErrorMessage(
          'Production bundling failed. Check output for details.'
        );
      }
    }
  );
}

function showFontDetails(fonts: (DetectedFont & { available?: boolean })[]) {
  const content = [
    '# Detected Fonts\n',
    ...Object.entries(
      fonts.reduce(
        (acc, font) => {
          if (!acc[font.source]) {
            acc[font.source] = [];
          }
          acc[font.source].push(font);
          return acc;
        },
        {} as Record<string, typeof fonts>
      )
    )
      .map(([source, fonts]) => [
        `## ${source.toUpperCase()}\n`,
        ...fonts.map(
          font =>
            `- **${font.name}**${font.filePath ? ` (${font.filePath})` : ''} - ✅ Available`
        ),
        '',
      ])
      .flat(),
  ].join('\n');

  vscode.workspace
    .openTextDocument({
      content,
      language: 'markdown',
    })
    .then(doc => {
      vscode.window.showTextDocument(doc);
    });
}

export function deactivate() {
  console.log('Fontify extension deactivated');
}
