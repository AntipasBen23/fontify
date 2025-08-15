import * as vscode from 'vscode';
import { FontDetectionService, DetectedFont } from './services/fontDetection';

let fontService: FontDetectionService;

export function activate(context: vscode.ExtensionContext) {
  console.log('Fontify extension is now active!');

  fontService = new FontDetectionService();

  const disposables = [
    vscode.commands.registerCommand('fontify.detectFonts', async () => {
      await detectFontsCommand();
    }),

    vscode.commands.registerCommand('fontify.installFont', () => {
      vscode.window.showInformationMessage('Installing font... (Coming soon!)');
    }),

    vscode.commands.registerCommand('fontify.makeProductionReady', () => {
      vscode.window.showInformationMessage(
        'Making production-ready... (Coming soon!)'
      );
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
      'Install Missing'
    );

    if (action === 'View Details') {
      showFontDetails(fonts);
    } else if (action === 'Install Missing') {
      vscode.window.showInformationMessage('Font installation coming soon!');
    }
  } catch (error) {
    console.error('Font detection failed:', error);
    vscode.window.showErrorMessage(
      'Failed to detect fonts. Check output for details.'
    );
  }
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
