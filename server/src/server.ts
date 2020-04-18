import {
  CompletionItem,
  createConnection,
  Hover,
  ProposedFeatures,
  TextDocument,
  TextDocuments,
  TextDocumentPositionParams
} from 'vscode-languageserver'

import { CursorInfo } from './common/types'

import { completions, completionDetails, infoHovers } from './dictionary'

const getCursorInfo = (
  text: string,
  start: number,
  end: number
): CursorInfo => {
  while (start >= 0 && /[a-zA-Z0-9_#@]/.test(text[start])) {
    start--
  }

  while (end < text.length && /[a-zA-Z0-9_\(]/.test(text[end])) {
    end++

    if (text.substr(end - 1, 1) === '(') {
      return {
        type: 'function',
        word: text.substr(start + 1, end - start - 1)
      }
    }
  }

  return {
    type: 'default',
    word: text.substr(start + 1, end - start - 1)
  }
}

const connection = createConnection(ProposedFeatures.all)

let documents: TextDocuments = new TextDocuments()

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      completionProvider: { resolveProvider: true },
      hoverProvider: true
    }
  }
})

connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams):
    CompletionItem[] => completions
)

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  item.detail = completionDetails[item.data].detail
  item.documentation = completionDetails[item.data].documentation

  return item
})

connection.onHover(
  (textDocumentPosition: TextDocumentPositionParams): Hover => {
    const document: TextDocument = documents.get(
      textDocumentPosition.textDocument.uri
    )
    const text: string = document.getText()
    const offset: number = document.offsetAt(textDocumentPosition.position)

    let start: number = offset
    let end: number = offset + 1

    const cursorInfo: CursorInfo = getCursorInfo(text, start, end)

    let result: any = 'undefined'

    if (cursorInfo.type === 'function') {
      result = (cursorInfo.word !== '')
        ? completions.find(item => item.label.startsWith(cursorInfo.word))
        : undefined

      return {
        contents: (result)
          ? completionDetails[result.data].documentation
          : undefined
      }
    }

    result = (cursorInfo.word !== '')
      ? infoHovers.find(item => item.name.startsWith(cursorInfo.word))
      : undefined

    return {
      contents: (result)
        ? result.contents
        : undefined
    }
  }
)

documents.listen(connection)

connection.listen()
