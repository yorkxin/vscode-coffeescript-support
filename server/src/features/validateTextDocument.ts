import * as CoffeeScript from 'coffeescript'

import { readFileByURI } from "../utils/fileReader"

import { DiagnosticSeverity, Diagnostic } from "vscode-languageserver"

export default function(uri: string): Diagnostic[] {
  let src = readFileByURI(uri)

  try {
    CoffeeScript.nodes(src)
    return []
  } catch (error) {
		let range = {
			start: { line: error.location.first_line, character: error.location.first_column },
			end: { line: error.location.last_line, character: error.location.last_column }
		}
    return [{
      severity: DiagnosticSeverity.Error,
      range: range,
      message: `${range.start.line+1}:${range.start.character+1} ${error.message}`,
      source: 'coffee'
    }]
  }
}

/*
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
*/
