import * as fs from 'fs'
import Uri from 'vscode-uri'

export function uriToPath(uri: string): string {
  // This decodes url-encoded chars such as `@` or `:` (used in Windows)
  return Uri.parse(uri).fsPath
}

export function readFileByPath(path: string): string {
  return fs.readFileSync(path, 'utf-8')
}

export function readFileByURI(uri: string): string {
  return this.readFileByPath(this.uriToPath(uri))
}
