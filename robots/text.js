const algorithmia = require('algorithmia') //importando o módulo para dentro do robô
const algorithmiaApiKey =  require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

async function robot(content) {
    await fetchContentFromWikipedia(content) //baixar conteúdo
    sanitizeContent(content) //limpar o conteúdo
    breakContentIntoSentences(content) //quebrar em sentenças

  async function fetchContentFromWikipedia(content){
    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey) //API Temporaria (nada ver) vai retornar uma instância autenticada
    const wikipediaAlgorithm = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2?timeout=300") //através do método algo vai chegar na instância, o link foi pego dentro da documentação
    const wikipediaResponde = await wikipediaAlgorithm.pipe(content.searchTerm) //metodo pipe aceita por parâmetro o conteúdo que vamos buscar
    const wikipediaContent = wikipediaResponde.get()
    

    content.sourceContentOriginal = wikipediaContent.content
  }

  function sanitizeContent(content){
      const withoutBlankLinesAndMarkdown = renoveBlankLinesAndMarkdown(content.sourceContentOriginal)
      const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)

      content.sourceContentSanitized = withoutDatesInParentheses
      function renoveBlankLinesAndMarkdown(text){
          const allLines = text.split('\n')
         
          const withoutBlankLinesAndMarkdown = allLines.filter ((line) => {
              if (line.trim().length === 0 || line.trim().startsWith('=')) {
                  return false 
              }

              return true
          })

          return withoutBlankLinesAndMarkdown.join('')
      }
      
    }

    function removeDatesInParentheses(text) {
        return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/ /g,' ')
    }

    function breakContentIntoSentences(content){
        content.sentences = []        
        
        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

}

module.exports = robot