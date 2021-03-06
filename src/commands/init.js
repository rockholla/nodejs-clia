import { logger } from '..'
import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'

class CommandDefinition {

  constructor () {
    this.cliName  = 'clia'
    this.logPad   = '==> '
    this.dir      = null
    this.command  = 'init [--dir=<target directory>] [--cli-name=<entrypoint file name>]'
    this.desc     = 'Initializes a node project with clia resources'
    this.creates  = null
  }

  handler (argv) {
    this.dir = argv.dir ? path.resolve(argv.dir) : process.cwd()
    this.precheck()
    this.projectPackage = require(path.resolve(this.dir, 'package.json'))
    logger.info(`Initializing project in ${this.dir} for clia`)
    return this.getCliName(argv).then((response) => {
      this.cliName = response.cliName
      return this.config()
    }).then(() => {
      return this.packageJson()
    }).then(() => {
      return this.entrypointCliFile()
    }).then(() => {
      return this.commandsDir()
    }).then(() => {
      return this.commandAdd('use')
    }).then(() => {
      return this.commandAdd('add-requirement')
    }).catch((error) => {
      logger.error(error)
      process.exit(1)
    })
  }

  getCliName (argv) {
    if (argv.cliName) {
      return Promise.resolve({
        cliName: argv.cliName
      })
    } else {
      return inquirer.prompt({
        type: 'input',
        default: this.cliName,
        name: 'cliName',
        message: 'What would you like the cli command entrypoint to be named?',
      })
    }
  }

  precheck () {
    if (!fs.existsSync(path.resolve(this.dir, 'package.json'))) {
      logger.error(`No package.json found in ${this.dir}, are you trying to init in a directory that isn't a node project?`)
      process.exit(1)
    }
  }

  config () {
    logger.info(`${this.logPad}ensuring /config directory exists`)
    if (!fs.existsSync(path.resolve(this.dir, 'config'))) {
      fs.mkdirSync(path.resolve(this.dir, 'config'))
    }
    if (!fs.existsSync(path.resolve(this.dir, 'config', '.gitignore'))) {
      fs.writeFileSync(path.resolve(this.dir, 'config', '.gitignore'), 'local.js')
    }
    logger.info(`${this.logPad}adding default config at /config/default.js`)
    const writeDefaultConfig = () => {
      fs.writeFileSync(path.resolve(this.dir, 'config', 'default.js'), 'module.exports = {};')
    }
    if (fs.existsSync(path.resolve(this.dir, 'config', 'default.js'))) {
      logger.warn('/config/default.js already exists')
      return inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite it with the clia default?',
      }).then((response) => {
        if (response.overwrite) {
          writeDefaultConfig()
        } else {
          logger.warn(`${this.logPad}OK, not overwriting /config/default.js`)
        }
      })
    } else {
      writeDefaultConfig()
      return Promise.resolve()
    }
  }

  packageJson () {
    logger.info(`${this.logPad}Adding the clia property and related meta to your package.json`)
    let json = require(path.resolve(this.dir, 'package.json'))
    const addCliaProperty = () => {
      json.clia = {
        help: 'For more info on setting values here, see https://github.com/rockholla/nodejs-clia#packagejson-cliarequirements',
        requirements: {
          enabled: true,
          executables: [],
        },
      }
      fs.writeFileSync(path.resolve(this.dir, 'package.json'), JSON.stringify(json, null, 2))
    }
    if (json.clia !== undefined) {
      logger.warn('The clia property already exists in your package.json')
      return inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite the property with clia defaults?',
      }).then((response) => {
        if (response.overwrite) {
          addCliaProperty()
        } else {
          logger.warn(`${this.logPad}OK, not overwriting clia property in package.json`)
        }
      })
    } else {
      addCliaProperty()
      return Promise.resolve()
    }

  }

  entrypointCliFile () {
    logger.info(`${this.logPad}Copying cli entrypoint command to the root of your project`)
    let cliName = this.cliName
    const writeCliFile = () => {
      fs.writeFileSync(path.resolve(this.dir, cliName), fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'clia.js')))
      fs.chmodSync(path.resolve(this.dir, cliName), '0755')
    }
    if (fs.existsSync(path.resolve(this.dir, cliName))) {
      logger.warn(`The /${cliName} entrypoint file already exists`)
      return inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite it with the clia default one?',
      }).then((response) => {
        if (response.overwrite) {
          writeCliFile()
        } else {
          logger.warn(`${this.logPad}OK, not overwriting clia root entrypoint`)
        }
      })
    } else {
      writeCliFile()
      return Promise.resolve()
    }
  }

  commandsDir () {
    logger.info(`${this.logPad}Ensuring commands directory exists`)
    if (!fs.existsSync(path.resolve(this.dir, 'commands'))) {
      fs.mkdirSync(path.resolve(this.dir, 'commands'))
    }
    return Promise.resolve()
  }

  commandAdd (name) {
    const writeCommand = () => {
      fs.writeFileSync(path.resolve(this.dir, 'commands', `${name}.js`), fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'commands', `${name}.js`)))
    }
    logger.info(`${this.logPad}Adding /commands/${name}.js command`)
    if (fs.existsSync(path.resolve(this.dir, 'commands', `${name}.js`))) {
      logger.warn(`The /commands/${name}.js file already exists`)
      return inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite it with the clia default one?',
      }).then((response) => {
        if (response.overwrite) {
          writeCommand()
        } else {
          logger.warn(`${this.logPad}OK, not overwriting /commands/${name}.js`)
        }
      })
    } else {
      writeCommand()
      return Promise.resolve()
    }
  }

}

const commandDefinition = new CommandDefinition()
module.exports = {
  command: commandDefinition.command,
  desc: commandDefinition.desc,
  handler: (argv) => {
    commandDefinition.handler(argv)
  }
}
