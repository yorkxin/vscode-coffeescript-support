/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import { ExtensionContext, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

const DOC_SELECTORS = [
  { language: 'coffeescript', scheme: 'file' }
]

const GLOB_COFFEE_SCRIPT_FILES = "**/*.coffee";

export function activate(context: ExtensionContext) {

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(path.join('server', 'src', 'server.js'));
  // The debug options for the server
  let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run : { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  }

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for CoffeeScript documents
    documentSelector: DOC_SELECTORS,
    synchronize: {
      // Synchronize the setting section 'coffeeScriptSupport' to the server
      configurationSection: 'coffeeScriptSupport',
      fileEvents: workspace.createFileSystemWatcher(GLOB_COFFEE_SCRIPT_FILES)
    }
  }

  // Create the language client and start the client.
  let client = new LanguageClient('coffeeScriptSupport', 'CoffeeScript Support', serverOptions, clientOptions)
  let disposable = client.start();

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);

  client.onReady().then(() => {
    workspace.findFiles(GLOB_COFFEE_SCRIPT_FILES)
      .then(fileDescriptors => {
        const files = fileDescriptors.map(file => file.path)
        client.sendRequest('custom/addFiles', { files })
      })
  })
}
