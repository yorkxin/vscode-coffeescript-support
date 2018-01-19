/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
  IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments,
  InitializeResult,
  SymbolInformation
} from 'vscode-languageserver';

import { documentSymbol } from "./features/documentSymbol"
import { validateTextDocument } from "./features/validateTextDocument"
import { readFileByURI, uriToPath } from "./utils/fileReader"
import { SymbolIndex } from "./SymbolIndex"

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot: string;
let symbolIndex: SymbolIndex;

connection.onInitialize((params): InitializeResult => {
  workspaceRoot = params.rootUri;

  symbolIndex = new SymbolIndex()
  symbolIndex.indexDirectory(uriToPath(workspaceRoot)).then(() => {
    console.log("index done")
  })

  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: documents.syncKind,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true
    }
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  const diagnostics = validateTextDocument(change.document.getText())
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

/*
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
});
*/

connection.onDocumentSymbol(params => {
  if (/file:\/\//.test(params.textDocument.uri)) {
    const src = readFileByURI(params.textDocument.uri)
    return documentSymbol(src)
  } else {
    // TODO: find a way to get content of Untitled tab
    return []
  }
})

connection.onWorkspaceSymbol((params): SymbolInformation[] => {
  if (params.query.length > 0) {
    return symbolIndex.find(params.query)
  } else {
    return []
  }
})

/*
connection.onDidOpenTextDocument((params) => {
  // A text document got opened in VSCode.
  // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
  // params.text the initial full content of the document.
  connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
  // The content of a text document did change in VSCode.
  // params.uri uniquely identifies the document.
  // params.contentChanges describe the content changes to the document.
  connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
  // A text document got closed in VSCode.
  // params.uri uniquely identifies the document.
  connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Listen on the connection
connection.listen();

