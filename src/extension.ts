import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Fontify extension is now active!');

  // Register commands
  const disposables = [
    vscode.commands.registerCommand('fontify.detectFonts', () => {
      vscode.window.showInformationMessage('Detecting fonts... (Coming soon!)');
    }),

    vscode.commands.registerCommand('fontify.installFont', () => {
      vscode.window.showInformationMessage('Installing font... (Coming soon!)');
    }),

    vscode.commands.registerCommand('fontify.makeProductionReady', () => {
      vscode.window.showInformationMessage('Making production-ready... (Coming soon!)');
    }),

    vscode.commands.registerCommand('fontify.refreshCache', () => {
      vscode.window.showInformationMessage('Refreshing font cache... (Coming soon!)');
    })
  ];

  // Add all disposables to context
  context.subscriptions.push(...disposables);

  // Auto-detect fonts on startup if enabled
  const config = vscode.workspace.getConfiguration('fontify');
  if (config.get('autoDetect', true)) {
    vscode.window.showInformationMessage('Fontify: Auto-detecting fonts...');
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('Fontify extension deactivated');
}