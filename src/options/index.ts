import path from 'path'
import fs from 'fs-extra'
import { transform } from '@babel/core'
import requireFromString from 'require-from-string'
import camelCase from 'camelcase'
import { OutputOptions } from 'rollup'
import { safePackageName, safeVariableName } from '../utils'

type formatType = 'cjs' | 'esm' | 'umd'

export interface TsrvConfig {
  formats: Array<formatType>
  outDir: string
  globals: { [name: string]: string }
}

export interface TsrvOptions {
  cwd: string
  format: formatType
  pkg: any
  tsconfig: any
  output: OutputOptions
}

const defaultTsrvConfig: TsrvConfig = {
  formats: ['cjs', 'esm'],
  outDir: 'dist',
  globals: { react: 'React', 'react-native': 'ReactNative' }
}

function loadTsrvConfig(cwd): TsrvConfig {
  const configfiles = ['tsrv.config.js', 'tsrv.config.ts']
  let userConfig = {}
  for (const file of configfiles) {
    const configPath = path.join(cwd, file)
    if (fs.pathExistsSync(configPath)) {
      const content = transform(fs.readFileSync(configPath, 'utf8'), {
        babelrc: false,
        configFile: false,
        filename: configPath,
        presets: [
          [
            require('@babel/preset-env'),
            {
              targets: {
                node: 'current'
              }
            }
          ],
          configPath.endsWith('.ts') && require('@babel/preset-typescript')
        ].filter(Boolean)
      })
      const m = requireFromString((content && content.code) || '', configPath)
      userConfig = m.default || m
    }
  }
  return {
    ...defaultTsrvConfig,
    ...userConfig
  } as TsrvConfig
}

export function loadOptions(cwd: string): TsrvOptions[] {
  const userConfig = loadTsrvConfig(cwd)
  const tsconfig = fs.readJsonSync(path.join(cwd, 'tsconfig.json')) || {}
  const pkg = fs.readJSONSync(path.join(cwd, 'package.json')) || null
  return userConfig.formats.map(type => {
    const outputName = [`${userConfig.outDir}/${safePackageName(pkg.name)}`, type, 'js'].filter(Boolean).join('.')
    return {
      cwd,
      format: type,
      outDir: userConfig.outDir,
      pkg: pkg,
      tsconfig,
      output: {
        file: outputName,
        // Pass through the file format
        format: type,
        // Do not let Rollup call Object.freeze() on namespace import objects
        // (i.e. import * as namespaceImportObject from...) that are accessed dynamically.
        freeze: false,
        // Respect tsconfig esModuleInterop when setting __esModule.
        esModule: Boolean(tsconfig?.compilerOptions?.esModuleInterop),
        name: pkg.name || safeVariableName(pkg.name),
        sourcemap: true,
        globals: userConfig.globals,
        exports: 'named'
      }
    }
  })
}
