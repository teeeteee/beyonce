import { DynamoDB } from "aws-sdk"
import { JayZ } from "@ginger.io/jay-z"
import { Key } from "./Key"
import { Model } from "./Model"
import { QueryBuilder } from "./QueryBuilder"
import {
  decryptOrPassThroughItem,
  encryptOrPassThroughItem,
  PartitionAndSortKey,
  toJSON
} from "./util"

export type Options = {
  jayz?: JayZ
}

/** A thin wrapper around the DynamoDB sdk client that
 * does auto mapping between JSON <=> DynamoDB Items
 */
export class Beyonce {
  private client: DynamoDB.DocumentClient
  private jayz?: JayZ

  constructor(
    private tableName: string,
    dynamo: DynamoDB,
    options: Options = {}
  ) {
    this.client = new DynamoDB.DocumentClient({ service: dynamo })

    if (options.jayz !== undefined) {
      this.jayz = options.jayz
    }
  }

  /** Retrieve a single Item out of Dynamo */
  async get<T extends Model, U extends Model>(
    keys: PartitionAndSortKey<T, U>
  ): Promise<U | undefined> {
    const { Item: item } = await this.client
      .get({
        TableName: this.tableName,
        Key: {
          [keys.partition.name]: keys.partition.value,
          [keys.sort.name]: keys.sort.value
        }
      })
      .promise()

    if (item !== undefined) {
      return toJSON<U>(await decryptOrPassThroughItem(this.jayz, item))
    }
  }

  /** BatchGet items */
  async batchGet<T extends Model>(params: {
    keys: PartitionAndSortKey<any, T>[]
  }): Promise<T[]> {
    const {
      Responses: responses,
      UnprocessedKeys: unprocessedKeys
    } = await this.client
      .batchGet({
        RequestItems: {
          [this.tableName]: {
            Keys: params.keys.map(({ partition, sort }) => ({
              [partition.name]: partition.value,
              [sort.name]: sort.value
            }))
          }
        }
      })
      .promise()

    if (unprocessedKeys !== undefined) {
      console.error("Some keys didn't process", unprocessedKeys)
    }

    if (responses !== undefined) {
      const items = responses[this.tableName]
      const jsonItems = items.map(async _ => {
        const item = await decryptOrPassThroughItem(this.jayz, _)
        return toJSON<T>(item)
      })

      return Promise.all(jsonItems)
    } else {
      return []
    }
  }

  query<T extends Model>(pk: Key<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client, this.tableName, pk, this.jayz)
  }

  /** Write an item into Dynamo */
  async put<T extends Model, U extends Model>(
    keys: PartitionAndSortKey<T, U>,
    fields: U
  ): Promise<void> {
    const item = await encryptOrPassThroughItem(this.jayz, keys, {
      ...fields,
      [keys.partition.name]: keys.partition.value,
      [keys.sort.name]: keys.sort.value
    })

    await this.client
      .put({
        TableName: this.tableName,
        Item: item
      })
      .promise()
  }
}