'use strict';

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

export default class CoffeeScriptDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  private client: LanguageClient

  constructor(client: LanguageClient) {
    this.client = client
  }

  public async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SymbolInformation[]> {
    await this.client.sendRequest('textDocument/documentSymbol', document, token)
    return []
  }
}
