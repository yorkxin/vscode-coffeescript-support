import * as fs from 'fs'
import * as URL from 'url'

export function uriToPath(uri: string): string {
  return URL.parse(uri).path
}

export function readFileByPath(path: string): string {
  return fs.readFileSync(path, 'utf-8')
}

export function readFileByURI(uri: string): string {
  return this.readFileByPath(this.uriToPath(uri))
}

