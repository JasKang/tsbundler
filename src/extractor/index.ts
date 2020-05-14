import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import { TsrvOptions } from '../options'

async function buildTypes({ cwd, outDir }: TsrvOptions) {
  const extractorConfigPath = path.join(cwd, 'api-extractor.json')
  await fs.writeJSON(extractorConfigPath, {
    $schema: 'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
    mainEntryPointFilePath: `<projectFolder>/${outDir}/__types__/index.d.ts`,
    apiReport: {
      enabled: false
    },
    docModel: {
      enabled: false,
      apiJsonFilePath: `<projectFolder>/${outDir}/index.api.json`
    },
    dtsRollup: {
      enabled: true,
      untrimmedFilePath: `<projectFolder>/${outDir}/index.d.ts`
    },
    tsdocMetadata: {
      enabled: false
    },
    messages: {
      compilerMessageReporting: {
        default: {
          logLevel: 'warning'
        }
      },
      extractorMessageReporting: {
        default: {
          logLevel: 'warning',
          addToApiReportFile: true
        },
        'ae-missing-release-tag': {
          logLevel: 'none'
        }
      },
      tsdocMessageReporting: {
        default: {
          logLevel: 'none'
        }
      }
    }
  })

  const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath)
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true
  })
  await fs.remove(extractorConfigPath)
  await fs.remove(path.join(cwd, outDir, '__types__'))
  if (extractorResult.succeeded) {
    console.log(chalk.bold(chalk.green(`API Extractor completed successfully.`)))
  } else {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`
    )
    process.exitCode = 1
  }
}

export default buildTypes
