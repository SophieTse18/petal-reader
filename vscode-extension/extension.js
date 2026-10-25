'use strict';
// Petal Reader for VS Code.
// The read-aloud player itself lives in media/petal-preview.js, which VS Code loads into the Markdown preview.
// This file only adds two commands: open the preview, and open the file in the Petal Reader app (Edge voices).
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

function findEdge() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/opt/microsoft/msedge/msedge'];
  return candidates.find((p) => { try { return p && fs.existsSync(p); } catch (e) { return false; } });
}

async function markdownDocument(uri) {
  if (uri instanceof vscode.Uri) return vscode.workspace.openTextDocument(uri);
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.languageId === 'markdown') return editor.document;
  const visible = vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'markdown');
  return visible ? visible.document : undefined;
}

function absoluteImages(html, docUri) {
  if (docUri.scheme !== 'file') return html;
  const dir = path.dirname(docUri.fsPath);
  return html.replace(/(<img\b[^>]*?\ssrc=")([^"]+)(")/gi, (m, a, src, b) => {
    if (/^(https?:|data:|file:)/i.test(src)) return m;
    try { return a + pathToFileURL(path.resolve(dir, decodeURIComponent(src))).href + b; } catch (e) { return m; }
  });
}

async function openInApp(uri) {
  const doc = await markdownDocument(uri);
  if (!doc) {
    vscode.window.showInformationMessage('Petal Reader: open a Markdown file first, then try again.');
    return;
  }
  let html = await vscode.commands.executeCommand('markdown.api.render', doc.getText());
  if (typeof html !== 'string') html = '';
  html = absoluteImages(html, doc.uri);

  const template = fs.readFileSync(path.join(__dirname, 'media', 'app.html'), 'utf8');
  const payload = { title: path.basename(doc.fileName), source: doc.uri.toString(), html };
  const json = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const page = template.replace('<!--PETAL_EMBED-->', () => '<script>window.PETAL_EMBED = ' + json + ';</script>');

  const dir = path.join(os.tmpdir(), 'petal-reader');
  fs.mkdirSync(dir, { recursive: true });
  const name = path.basename(doc.fileName).replace(/\.(md|markdown|mdown|mkd)$/i, '').replace(/[^\w.-]+/g, '_') || 'document';
  const file = path.join(dir, name + '.html');
  fs.writeFileSync(file, page, 'utf8');

  const useEdge = vscode.workspace.getConfiguration('petalReader').get('openWith', 'edge') === 'edge';
  const edge = useEdge ? findEdge() : undefined;
  if (edge) {
    const child = cp.spawn(edge, ['--app=' + pathToFileURL(file).href], { detached: true, stdio: 'ignore' });
    child.on('error', () => vscode.env.openExternal(vscode.Uri.file(file)));
    child.unref();
  } else {
    await vscode.env.openExternal(vscode.Uri.file(file));
  }
}

async function readAloud(uri) {
  const doc = await markdownDocument(uri);
  await vscode.commands.executeCommand('markdown.showPreviewToSide', doc ? doc.uri : undefined);
  vscode.window.setStatusBarMessage('Petal Reader: press ▶ in the bottom-right of the preview, or double-click any word.', 6000);
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('petalReader.readAloud', readAloud),
    vscode.commands.registerCommand('petalReader.openInApp', (uri) =>
      openInApp(uri).catch((err) => vscode.window.showErrorMessage('Petal Reader could not open the file: ' + (err && err.message ? err.message : err))))
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
