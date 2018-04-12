/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const USE_BACKGROUND = false;

import * as path from "path";
import * as cp from "child_process";
import * as tmp from 'tmp';

import {
  IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments,
  InitializeResult,
  SymbolInformation
} from 'vscode-languageserver';

import { Parser } from "./lib/Parser"
import { SymbolIndex } from "./lib/SymbolIndex"
import { readFileByURI } from "./utils/fileReader"

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
let symbolIndex: SymbolIndex;
let documentParser: Parser;
let dbFilename: string

connection.onInitialize((_): InitializeResult => {
  dbFilename = tmp.tmpNameSync({ prefix: "coffee-symbols-", postfix: '.json' })
  console.log("Symbols DB:", dbFilename)
  symbolIndex = new SymbolIndex(dbFilename)
  documentParser = new Parser()

  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: documents.syncKind,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true
    }
  }
});

connection.onRequest('custom/indexFiles', (params) => {
  console.log('custom/indexFiles')
  const uris = params.files

  console.log("indexFiles:", uris.length, 'files')
  console.time("indexFiles")

  let indexer

  if (USE_BACKGROUND) {
    console.log('background')
    indexer = indexFilesInBackground(uris)
  } else {
    console.log('foreground')
    indexer = indexFilesInForeground(uris)
  }

  return indexer.then(() => {
    console.timeEnd("indexFiles")
  })
})

function indexFilesInForeground(uris: string[]): Promise<any> {
  return Promise.all(uris.map((uri: string) => symbolIndex.indexFile(uri)))
}

async function indexFilesInBackground(uris: string[]): Promise<any> {
  const current = uris.shift()
  return indexSingleFileInBackground(current).then(() => {
    if (uris.length === 0) {
      return Promise.resolve();
    } else {
      return indexFilesInBackground(uris)
    }
  })
}

function indexSingleFileInBackground(uri: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.time(`fork index ${uri}`)
    const purosesu = cp.fork(path.join(__dirname, "bin", "indexer"), [ "-d", dbFilename, "-f", uri ])

    purosesu.on('exit', (code) => {
      if (code !== 0) { reject('indexer returned non-zero') }
      console.timeEnd(`fork index ${uri}`)
      resolve()
    })
  })
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  const diagnostics = documentParser.validateSource(change.document.getText())
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
    return documentParser.getSymbolsFromSource(src)
  } else {
    // TODO: find a way to get content of Untitled tab
    return []
  }
})

connection.onWorkspaceSymbol(async (params): Promise<SymbolInformation[]> => {
  if (params.query.length > 0) {
    return await symbolIndex.find(params.query)
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

