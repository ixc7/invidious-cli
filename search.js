import https from 'https'
import getInstancesList from './instances.js'

let MAXPAGES = 2
let USERINPUT = 'hello cruel world'

const loadEnv = async () => {
  const hosts = await getInstancesList()
  return {
    hosts,
    serverMax: hosts.length,
    serverIndex: 1,
    server: hosts[(hosts.length - 1)],
  }
}

// request 1 page
const search = async (p, environment) => {

  let env = false
  
  if (!environment) {
    env = await loadEnv()
  } else {
    env = environment
  }
  
  let { hosts, serverMax, serverIndex, server } = env
  
  return new Promise((resolve, reject) => {
    const query = new URL(
      `/api/v1/search`, 
      `${server}/api`
    )

    query.searchParams.set('q', USERINPUT)
    query.searchParams.set('page', p)
    query.searchParams.set('pretty', 1)

    const req = https.request(query.href)

    req.on('response', res => {
      let resToString  = ''

      res.on('data', chunk => resToString += chunk.toString('utf8'))

      res.on('end', () => {
        // try different server if current is down
        if (res.statusCode !== 200) {
          console.log(`server '${server}' is down (${res.statusCode}).`)
        
          // return false if all servers have been tried.
          if (serverIndex >= serverMax) {
            return false
          // keep trying servers recursively, and return the first successful result.
          } else {
            serverIndex += 1
            server = hosts[(hosts.length - serverIndex)]
            resolve(search(p, env))
          }
        }

        // return result if first server is up.
        resolve(resToString)
      })
    })

    req.end()
  })
}

// request (1-MAXPAGES) number of pages
// break and return if MAXPAGES is reached, or no more results are found.
const searchRecursive = async (userInput = USERINPUT, maxpages = MAXPAGES) => {
    let env = await loadEnv()
    let final = {}

    for (let i = 1; i < (maxpages + 1); i += 1) {

      const res = await search(i, env)
      if (!res) return false
      
      const resJSON = JSON.parse(res)
      if (resJSON.length < 1) return final
      
      const resMapped = resJSON.map(item => {
        return {
          name: item.title,
          value: `${env.server}/watch?v=${item.videoId}`
        }
      })

      final[i] = resMapped
    }
    return final
}

export { loadEnv, search, searchRecursive }
