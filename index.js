const prompts = require('prompts')
const ora = require('ora')
const execa = require('execa')
const chalk = require('chalk')
const writePkg = require('write-pkg')
const fs = require('promise-fs')
const fetch = require('node-fetch')

let spinner

prompts([
  {
    type: 'text',
    name: 'name',
    message: 'What\'s the name of your project?',
    validate: (value) => value ? true : 'You must enter a name!'
  },
  {
    type: 'text',
    name: 'description',
    message: 'How would you describe your project?',
    validate: (value) => value ? true : 'You must enter a description!'
  },
  {
    type: 'text',
    name: 'author',
    message: 'What\'s your name?',
    validate: (value) => value ? true : 'You must enter your name!'
  },
  {
    type: 'confirm',
    name: 'private',
    message: 'Should this be private?',
    initial: true
  }
], {
  onCancel() {
    process.exit(0)
  }
}).then(({ name, description, author, private }) => {
  console.log(chalk.blue('Bootstrapping Next.js project...'))
  spinner = ora('Create package.json').start()
  return writePkg({
    name: name.toLowerCase().trim().replace(/\s/g, '-'),
    description,
    scripts: {
      start: 'next start',
      build: 'next build',
      dev: 'next dev',
      lint: 'eslint .',
      'lint:fix': 'eslint --fix .',
      export: 'next export'
    },
    version: '1.0.0',
    main: 'pages/index.js',
    author,
    license: private ? 'UNLICENSED' : 'MIT',
    private,
    eslintConfig: {
      extends: [
        'eslint:recommended',
        'plugin:react/recommended'
      ],
      settings: {
        react: {
          version: 'detect'
        }
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        semi: [
          'error',
          'never'
        ],
        quotes: [
          'error',
          'single'
        ]
      },
      parser: 'babel-eslint',
      env: {
        node: true,
        browser: true,
        es6: true
      }
    }
  }).then(() => {
    spinner.succeed()
    spinner = ora('Install required packages').start()
    return execa('yarn', [ 'add', 'react', 'react-dom', 'next' ])
  }).then(() => {
    spinner.succeed()
    spinner = ora('Install development packages').start()
    return execa('yarn', [ 'add', '--dev', 'eslint', 'babel-eslint', 'babel', 'eslint-plugin-react' ])
  }).then(() => {
    spinner.succeed()
    spinner = ora('Create files and directories').start()
    return Promise.all([
      fs.mkdir('pages').then(() => {
        return fs.writeFile('pages/index.js', `
import { Component } from 'react'

export default class extends Component {
  render() {
    return (
      <h1>${name}</h1>
    )
  }
}
        `.trim())
      }),
      fs.mkdir('lib'),
      fs.mkdir('components'),
      fs.mkdir('static'),
      fs.writeFile('README.md', `
# ${name}

${description}

## Development

To run this during development, just run \`yarn dev\`. To lint you code and attempt to fix some problems, run \`yarn lint:fix\`. If you just want to lint it, only run \`yarn lint\`.

## Production

During production, you probably don't want to use development mode. Just run \`yarn build\` and then \`yarn start\` to build and run your project.

If you prefer a static approach, run \`yarn export\` instead of \`yarn start\`. The output will be in an \`out/\` folder.
      `.trim())
    ])
  }).then(() => {
    spinner.succeed()
    spinner = ora('Fetch and save gitignore').start()
    return fetch('https://raw.githubusercontent.com/github/gitignore/master/Node.gitignore')
  }).then((response) => {
    if (!response.ok) throw new Error('Error fetching gitignore')
    return response.text()
  }).then((gitignore) => {
    return fs.writeFile('.gitignore', gitignore)
  }).then(() => {
    spinner.succeed()
    console.log(chalk.green('Done bootstrapping Next.js project!'))
    console.log(chalk.bold('Development'))
    console.log(chalk.dim('`yarn dev`'))
    console.log(chalk.dim('`yarn lint:fix`'))
    console.log(chalk.bold('Production'))
    console.log(chalk.dim('`yarn build`'))
    console.log(chalk.dim('`yarn start`'))
    console.log('Read README.md for more information')
  })
}).catch(({ message }) => {
  spinner.fail()
  console.error(chalk.red('Error bootstrapping Next.js project:', message))
})