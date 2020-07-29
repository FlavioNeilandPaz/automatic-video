const algorithmia = require('algorithmia') //importando o módulo para dentro do robô
const algorithmiaApiKey =  require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require ('../credentials/watson-nlu.json').apikey
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
 
const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
})

const state = require('./state.js')//IMPORTA ROBÔ DE ESTADO

async function robot() {
    const content = state.load() //CARREGOU O ESTADO

    await fetchContentFromWikipedia(content) //baixar conteúdo
    sanitizeContent(content) //limpar o conteúdo
    breakContentIntoSentences(content) //quebrar em sentenças
    limitMaximumSentences(content)
    await fetchKeywordsOfAllSentences(content) //nova função asyncrona

    state.save(content)// SALVA INFORMAÇÕES INSERIDAS DENTRO DO CONTENT

  async function fetchContentFromWikipedia(content){
    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey) //API Temporaria (nada ver) vai retornar uma instância autenticada
    const wikipediaAlgorithm = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2?timeout=300") //através do método algo vai chegar na instância, o link foi pego dentro da documentação
    const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm) //metodo pipe aceita por parâmetro o conteúdo que vamos buscar
    const wikipediaContent = wikipediaResponse.get()
    

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

          return withoutBlankLinesAndMarkdown.join(' ')
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
function limitMaximumSentences(content) {
    content.sentences = content.sentences.slice(0, content.maximumSentences)
}

async function fetchKeywordsOfAllSentences(content) { 
    for (const sentence of content.sentences) { //é realizado um loop na sentença
        sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text) //usamos a função para passar o texto de cada sentença
    }
}

async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise ((resolve, reject) =>{
    nlu.analyze({
        text: sentence,
            features: {
                keywords: {}
            } 
        }, (error, response) =>{
            if (error) {
                throw error
            }
            const keywords = response.keywords.map((keyword) =>{
                return keyword.text
            })

        resolve(keywords)
        
      })
    })
  }
}

module.exports = robot