import { Model, Table } from "./types"
import { groupBy } from "./util"

export function generatePartitionKeys(table: Table): string {
  const modelsByPartition = groupBy(table.models, "partition")

  const partitions = modelsByPartition.map(([partition, models]) =>
    generatePartitionKey(partition, models, table.partitions)
  )

  return `
      pk: {
        ${partitions.join("\n,")}
      }
    `
}

function generatePartitionKey(
  partition: string,
  models: Model[],
  partitionKeys: { [partition: string]: string[] }
): string {
  const modelNames = models.map((_) => _.name)
  const keyParts = partitionKeys[partition]

  const inputFields: string[] = []
  const parts: string[] = []

  keyParts.forEach((part) => {
    if (part.startsWith("_.")) {
      inputFields.push(part.replace("_.", ""))
      parts.push(part)
    } else {
      parts.push(`"${part}"`)
    }
  })

  const inputType = inputFields.map((_) => `${_}: string`).join(",")
  const modelType = modelNames.join(" | ")
  const keyComponents = parts.join(", ")
  return `${partition}: key<{${inputType}}, ${modelType}>("pk", _ => [${keyComponents}])`
}
