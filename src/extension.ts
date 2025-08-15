import * as vscode from 'vscode';
import { FontDetectionService, DetectedFont } from './services/fontDetection';
import { FontInstallerService } from './services/fontInstaller';
import { ProductionBundlerService } from './services/productionBundler';

let fontService: FontDetectionService;
let installerService: FontInstallerService;
let bundlerService: ProductionBundlerService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Fontify extension is now active!');

  fontService = new FontDetectionService();
  installerService = new FontInstallerService();
  bundlerService = new ProductionBundlerService();

  const disposables = [
    vscode.commands.registerCommand('fontify.detectFonts', async () => {
      await detectFontsCommand();
    }),

    vscode.commands.registerCommand('fontify.installFont', async () => {
      await installFontCommand();
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

    const bySource = fonts.reduce(
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

    const message = `🎨 Found ${fonts.length} fonts (${summary})`;

    const action = await vscode.window.showInformationMessage(
      message,
      'View Details',
      'Install Missing',
      'Make Production-Ready'
    );

    if (action === 'View Details') {
      showFontDetails(fonts);
    } else if (action === 'Install Missing') {
      await installMissingFonts(fonts);
    } else if (action === 'Make Production-Ready') {
      await makeProductionReadyFonts(fonts);
    }
  } catch (error) {
    console.error('Font detection failed:', error);
    vscode.window.showErrorMessage(
      'Failed to detect fonts. Check output for details.'
    );
  }
}

async function installFontCommand() {
  const fontName = await vscode.window.showInputBox({
    prompt: 'Enter font name to install',
    placeHolder: 'e.g., Inter, Roboto, Poppins',
  });

  if (!fontName) return;

  try {
    vscode.window.showInformationMessage(`🔄 Installing "${fontName}"...`);

    const result = await installerService.installFont(fontName);

    if (result.success) {
      const message = `✅ Successfully installed "${result.fontName}" from ${result.source}`;
      const reloadMessage = result.requiresReload
        ? ' Click "Reload Window" to activate the font.'
        : '';

      if (result.requiresReload) {
        const action = await vscode.window.showInformationMessage(
          message + reloadMessage,
          'Reload Window'
        );

        if (action === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      } else {
        vscode.window.showInformationMessage(message);
      }
    } else {
      vscode.window.showErrorMessage(
        `❌ Failed to install "${result.fontName}": ${result.error}`
      );
    }
  } catch (error) {
    console.error('Font installation failed:', error);
    vscode.window.showErrorMessage(
      'Font installation failed. Check output for details.'
    );
  }
}

async function installMissingFonts(fonts: DetectedFont[]) {
  const missingFonts = fonts.filter(font => font.isInstalled !== true);

  if (missingFonts.length === 0) {
    vscode.window.showInformationMessage('✅ All fonts are already available');
    return;
  }

  const confirm = await vscode.window.showInformationMessage(
    `Install ${missingFonts.length} missing fonts?`,
    'Yes, Install All',
    'Cancel'
  );

  if (confirm !== 'Yes, Install All') return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Installing fonts...',
      cancellable: false,
    },
    async progress => {
      const results = await installerService.showInstallProgress(
        missingFonts,
        (current, total, fontName) => {
          progress.report({
            increment: 100 / total,
            message: `Installing ${fontName} (${current}/${total})`,
          });
        }
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      let message = '';
      if (successful.length > 0) {
        message += `✅ Installed ${successful.length} fonts successfully`;
      }
      if (failed.length > 0) {
        message += ` ❌ Failed to install ${failed.length} fonts`;
      }

      const requiresReload = results.some(r => r.requiresReload);
      if (requiresReload) {
        const action = await vscode.window.showInformationMessage(
          message + '. Reload VS Code to activate fonts.',
          'Reload Window'
        );

        if (action === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      } else {
        vscode.window.showInformationMessage(message);
      }
    }
  );
}

async function makeProductionReadyCommand() {
  const fonts = await fontService.detectFonts();

  if (fonts.length === 0) {
    vscode.window.showInformationMessage(
      'No fonts detected. Run font detection first.'
    );
    return;
  }

  await makeProductionReadyFonts(fonts);
}

async function makeProductionReadyFonts(fonts: DetectedFont[]) {
  // Get user preferences
  const strategy = await vscode.window.showQuickPick(
    [
      {
        label: 'Self-hosted',
        value: 'self-hosted',
        description: 'Download fonts and host them yourself (recommended)',
      },
      { label: 'CDN', value: 'cdn', description: 'Use Google Fonts CDN links' },
      {
        label: 'Both',
        value: 'both',
        description: 'Generate both self-hosted and CDN options',
      },
    ],
    {
      placeHolder: 'Choose font hosting strategy',
    }
  );

  if (!strategy) return;

  const framework = await vscode.window.showQuickPick(
    [
      {
        label: 'Vanilla CSS',
        value: 'vanilla',
        description: 'Standard CSS @font-face rules',
      },
      {
        label: 'Next.js',
        value: 'nextjs',
        description: 'Generate Next.js font configuration',
      },
      { label: 'React', value: 'react', description: 'React-compatible CSS' },
      { label: 'Vue', value: 'vue', description: 'Vue-compatible CSS' },
    ],
    {
      placeHolder: 'Choose your framework',
    }
  );

  if (!framework) return;

  const outputDir = await vscode.window.showInputBox({
    prompt: 'Output directory (relative to workspace root)',
    value: 'public/fonts',
    placeHolder: 'public/fonts',
  });

  if (!outputDir) return;

  const includePreload = await vscode.window.showQuickPick(
    [
      {
        label: 'Yes',
        value: true,
        description: 'Include preload tags for better performance',
      },
      { label: 'No', value: false, description: 'Skip preload tags' },
    ],
    {
      placeHolder: 'Include preload tags for performance?',
    }
  );

  if (includePreload === undefined) return;

  // Bundle the fonts
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Making fonts production-ready...',
      cancellable: false,
    },
    async progress => {
      try {
        const bundles = await bundlerService.bundleMultipleFonts(
          fonts,
          {
            strategy: strategy.value as any,
            variants: ['regular', '500', '600', '700'],
            outputDir,
            framework: framework.value as any,
            includePreload: includePreload.value,
          },
          (current, total, fontName) => {
            progress.report({
              increment: 100 / total,
              message: `Processing ${fontName} (${current}/${total})`,
            });
          }
        );

        // Generate integration guide
        const summaryFile = await bundlerService.generateProjectSummary(
          bundles,
          {
            strategy: strategy.value as any,
            variants: ['regular', '500', '600', '700'],
            outputDir,
            framework: framework.value as any,
            includePreload: includePreload.value,
          }
        );

        const successful = bundles.filter(b => b.files.fontFiles.length > 0);

        if (successful.length > 0) {
          const action = await vscode.window.showInformationMessage(
            `✅ Successfully prepared ${successful.length} fonts for production! Generated files in ${outputDir}/`,
            'View Integration Guide',
            'Open Folder'
          );

          if (action === 'View Integration Guide') {
            const doc = await vscode.workspace.openTextDocument(summaryFile);
            vscode.window.showTextDocument(doc);
          } else if (action === 'Open Folder') {
            const workspaceRoot =
              vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceRoot) {
              const outputPath = require('path').join(workspaceRoot, outputDir);
              vscode.commands.executeCommand(
                'revealFileInOS',
                vscode.Uri.file(outputPath)
              );
            }
          }
        } else {
          vscode.window.showErrorMessage(
            '❌ Failed to prepare fonts for production. Check output for details.'
          );
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

function showFontDetails(fonts: DetectedFont[]) {
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
        {} as Record<string, DetectedFont[]>
      )
    )
      .map(([source, fonts]) => [
        `## ${source.toUpperCase()}\n`,
        ...fonts.map(
          font =>
            `- **${font.name}**${font.filePath ? ` (${font.filePath})` : ''}${
              font.isInstalled !== undefined
                ? ` - ${font.isInstalled ? '✅ Installed' : '❌ Not installed'}`
                : ''
            }`
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
