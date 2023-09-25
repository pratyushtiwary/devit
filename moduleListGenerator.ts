/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import { type Route, type Routes } from './src/types/route'

interface CustomRoute extends Route {
  creation?: Date
}

interface CustomRoutes {
  [slug: string]: CustomRoute
}

function generateRoutes() {
  console.clear()
  console.log('Generating Routes List from Modules...')

  const srcPath = 'src'
  const modulesPath = path.join(srcPath, 'modules')

  if (!fs.existsSync(modulesPath)) {
    throw Error(`Failed to generate routes list, module dir not found under '${modulesPath}'`)
  }

  const modules = fs.readdirSync(modulesPath)

  if (modules.length === 0) {
    console.warn(`No modules found under '${modulesPath}'`)
  }

  console.log(`Found ${modules.length} module(s), generating routes...`)

  const routesList: CustomRoutes = {}

  for (let i = 0; i < modules.length; i++) {
    const modulePath = path.join(modulesPath, modules[i]),
      moduleConfigPath = path.join(modulePath, 'config.json'),
      stat = fs.statSync(modulePath)

    if (!fs.existsSync(moduleConfigPath)) {
      console.warn(`Skipping ${modules[i]} module, no config file found`)
      continue
    }

    if (!fs.existsSync(path.join(modulePath, modules[i] + '.vue'))) {
      console.warn(`Skipping ${modules[i]} module, no ${modules[i]}.vue file found`)
      continue
    }

    try {
      const config = JSON.parse(fs.readFileSync(moduleConfigPath, 'utf-8'))
      const slug = config.slug
      delete config['slug']

      routesList[slug] = {
        dir: modules[i],
        creation: stat.ctime,
        ...config
      }
    } catch (e) {
      console.warn(`Invalid config file for module ${modules[i]}, skipping module`)
    }
  }

  // sort based on creation time
  const finalRoutes: Routes = {}
  Object.keys(routesList)
    .sort((a: string, b: string) => {
      // @ts-ignore
      return routesList[a].creation?.getTime() - routesList[b].creation?.getTime()
    })
    .forEach((e) => {
      delete routesList[e].creation
      finalRoutes[e] = routesList[e]
    })

  const finalFile = `import { type Routes } from '@/types/route'\nconst routes: Routes = ${JSON.stringify(
    finalRoutes,
    null,
    4
  )};\n\nexport default routes;`

  console.log(`Saving routes list...`)

  fs.writeFileSync(path.join(srcPath, 'routes.ts'), finalFile, 'utf-8')

  console.log('Routes list created and saved successfully!')
}

export default () => ({
  name: 'module-list-generator',
  configResolved() {
    generateRoutes()
  },
  handleHotUpdate(ctx: any) {
    if (ctx.file.split('/').pop() !== 'config.json') return
    generateRoutes()
    ctx.server.restart()
  }
})