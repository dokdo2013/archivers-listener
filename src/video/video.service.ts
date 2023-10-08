import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Segment } from 'src/recorder/entities/segment.entity';
import { Stream } from 'src/recorder/entities/stream.entity';

@Injectable()
export class VideoService {
  constructor(
    @InjectModel(Stream)
    private readonly streamModel: typeof Stream,
    @InjectModel(Segment)
    private readonly segmentModel: typeof Segment,
    private readonly sequelize: Sequelize,
  ) {
    this.sequelize.addModels([Stream, Segment]);
  }

  async getStream(streamId: string) {
    const res = await this.streamModel.findOne({
      where: {
        streamId,
      },
    });

    return res;
  }

  async getSegments(streamId: string) {
    const res = (await this.segmentModel.findAll({
      where: {
        streamId,
      },
      order: [['segment_date', 'ASC']],
      // offset: 8, // offset is for skipping commercial break
      raw: true,
    })) as Segment[];

    // const segmentLinks = res.map((segment) => segment.link);

    return res;
  }

  async isLive(streamId: string) {
    const res = await this.streamModel.findOne({
      where: {
        streamId,
      },
    });

    return res.isLive;
  }

  async generateM3u8(segments: Segment[], type: 'live' | 'vod' = 'vod') {
    let m3u8 = '#EXTM3U' + '\n';
    m3u8 += '#EXT-X-VERSION:3' + '\n';
    m3u8 += '#EXT-X-TARGETDURATION:2\n';
    m3u8 += '#EXT-X-MEDIA-SEQUENCE:0' + '\n';

    if (type === 'vod') {
      m3u8 += '#EXT-X-PLAYLIST-TYPE:VOD' + '\n';
    }
    m3u8 += '#EXT-X-ALLOW-CACHE:YES' + '\n';

    for (let i = 0; i < segments.length; i++) {
      m3u8 += '#EXTINF:' + segments[i].segmentLength + ',\n';
      m3u8 += segments[i].link + '\n';
    }

    if (type === 'live') {
      m3u8 += '#EXT-X-DISCONTINUITY';
    } else {
      m3u8 += '#EXT-X-ENDLIST';
    }

    return m3u8;
  }
}
