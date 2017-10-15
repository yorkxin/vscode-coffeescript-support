/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as fs from 'fs'
import * as URL from 'url'

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument,
	Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem,
	CompletionItemKind, SymbolInformation, SymbolKind, Range
} from 'vscode-languageserver';

import CoffeeScriptParser from "./parser.js"

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
// let workspaceRoot: string;
connection.onInitialize((_): InitializeResult => {
	// workspaceRoot = params.rootPath;
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			documentSymbolProvider: true,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			}
		}
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	validateTextDocument(change.document);
});

// The settings interface describe the server relevant settings part
interface Settings {
	lspSample: ExampleSettings;
}

// These are the example settings we defined in the client's package.json
// file
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	let settings = <Settings>change.settings;
	maxNumberOfProblems = settings.lspSample.maxNumberOfProblems || 100;
	// Revalidate any open text documents
	documents.all().forEach(validateTextDocument);
});

function validateTextDocument(textDocument: TextDocument): void {
	let diagnostics: Diagnostic[] = [];
	let lines = textDocument.getText().split(/\r?\n/g);
	let problems = 0;
	for (var i = 0; i < lines.length && problems < maxNumberOfProblems; i++) {
		let line = lines[i];
		let index = line.indexOf('typescript');
		if (index >= 0) {
			problems++;
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range: {
					start: { line: i, character: index },
					end: { line: i, character: index + 10 }
				},
				message: `${line.substr(index, 10)} should be spelled TypeScript`,
				source: 'ex'
			});
		}
	}
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We recevied an file change event');
});


// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
	return [
		{
			label: 'TypeScript',
			kind: CompletionItemKind.Text,
			data: 1
		},
		{
			label: 'JavaScript',
			kind: CompletionItemKind.Text,
			data: 2
		}
	]
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data === 1) {
		item.detail = 'TypeScript details',
			item.documentation = 'TypeScript documentation'
	} else if (item.data === 2) {
		item.detail = 'JavaScript details',
			item.documentation = 'JavaScript documentation'
	}
	return item;
});

connection.onDocumentSymbol((documentSymbolParams) => {
	let path = URL.parse(documentSymbolParams.textDocument.uri).path
	let tree = CoffeeScriptParser.parse(fs.readFileSync(path, 'utf-8'))
	let symbolInformation: SymbolInformation[] = []

	tree.traverseChildren(true, (node) => {
		switch (node.constructor.name) {
			case "Class":
				let name = String(node.variable.base.value)
				let range = _createRange(node.locationData)
				symbolInformation.push(SymbolInformation.create(name, SymbolKind.Class, range))
				break;

			case "Assign":
				if (node.value) {
					let name = String(node.variable.base.value)

					if (node.value.constructor.name === 'Code') {
						let kind: SymbolKind
						if (node.variable.base.value === 'constructor') {
							kind = SymbolKind.Constructor
						} else {
							kind = SymbolKind.Method
						}
						let params = node.value.params.map(param => param.name.value).join(', ')
						let arrow = node.value.bound ? "=>" : "->"
						name = `${name}(${params}) ${arrow}`
						let range = _createRange(node.locationData)
						symbolInformation.push(SymbolInformation.create(name, kind, range))
					} else if (node.variable.base.constructor.name === 'ThisLiteral') {
						let kind = SymbolKind.Property
						node.variable.properties.forEach((access) => {
							name = `@${access.name.value}`
							let range = _createRange(access.locationData)
							symbolInformation.push(SymbolInformation.create(name, kind, range))
						})
					} else if (node.variable.base.constructor.name === 'PropertyName') {
						let kind = SymbolKind.Property
						let range = _createRange(node.locationData)
						symbolInformation.push(SymbolInformation.create(name, kind, range))
					} else {
						let kind = SymbolKind.Variable
						let range = _createRange(node.locationData)
						symbolInformation.push(SymbolInformation.create(name, kind, range))
					}

					if (name === "ho") {
						console.log(node)
					}
				}
				break;

			default:
				break;
		}
	})
	return symbolInformation
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

function _createRange(locationData: any): Range {
	return Range.create(locationData.first_line, locationData.first_column, locationData.last_line, locationData.last_column)
}
