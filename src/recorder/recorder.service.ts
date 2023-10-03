import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Stream } from './entities/stream.entity';
import { Streamer } from './entities/streamer.entity';
import { Segment } from './entities/segment.entity';

@Injectable()
export class RecorderService {
  constructor(
    @InjectModel(Stream)
    private readonly streamModel: typeof Stream,
    @InjectModel(Streamer)
    private readonly streamerModel: typeof Streamer,
    @InjectModel(Segment)
    private readonly segmentModel: typeof Segment,
    private readonly sequelize: Sequelize,
  ) {
    this.sequelize.addModels([Stream, Segment, Streamer]);
  }

  /**
   * Create stream
   * @param streamId 생방송 ID
   * @param title 생방송 제목
   * @param categoryId 카테고리 ID
   * @param categoryName 카테고리 이름
   * @returns {Promise<YudarlinnStream>} YudarlinnStream
   */
  async createStream(streamId: string, title: string) {
    const res = await this.streamModel.create({
      streamId,
      title,
      isLive: true,
      startAt: new Date(),
      m3u8Address: `https://archivers.app/media-api/video/stream/${streamId}.m3u8`,
      storageProvider: 'r2',
    });

    return res;
  }

  /**
   * End live stream
   * @param streamId 생방송 ID
   */
  async endStream(streamId: string) {
    const res = await this.streamModel.update(
      {
        isLive: false,
      },
      {
        where: {
          streamId,
        },
      },
    );

    return res;
  }
}
