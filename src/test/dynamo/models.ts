import { Table } from "../../main/dynamo/Table"

export const table = new Table({
  name: "TestTable",
  partitionKeyName: "pk",
  sortKeyName: "sk",
})

export enum ModelType {
  Musician = "musician",
  Song = "song",
}

export interface Musician {
  model: ModelType.Musician
  id: string
  name: string
}

export interface Song {
  model: ModelType.Song
  musicianId: string
  id: string
  title: string
  base64MP3: string // used to test "large" objects, e.g. for paginated results
}

export const MusicianModel = table
  .model<Musician>(ModelType.Musician)
  .partitionKey(ModelType.Musician, "id")
  .sortKey(ModelType.Musician, "id")

export const SongModel = table
  .model<Song>(ModelType.Song)
  .partitionKey(ModelType.Musician, "musicianId")
  .sortKey(ModelType.Song, "id")

export const MusicianPartition = table.partition([MusicianModel, SongModel])

export const byModelAndIdGSI = table
  .gsi("byModelAndId")
  .models([MusicianModel, SongModel])
  .partitionKey("model")
  .sortKey("id")

export const byNameAndIdGSI = table
  .gsi("byNameAndId")
  .models([MusicianModel])
  .partitionKey("name")
  .sortKey("id")

export function aMusicianWithTwoSongs(): [Musician, Song, Song] {
  const musician = MusicianModel.create({
    id: "1",
    name: "Bob Marley",
  })

  const song1 = SongModel.create({
    musicianId: "1",
    id: "2",
    title: "Buffalo Soldier",
    base64MP3: "fake-data",
  })

  const song2 = SongModel.create({
    musicianId: "1",
    id: "3",
    title: "No Woman, No Cry",
    base64MP3: "fake-data",
  })

  return [musician, song1, song2]
}
