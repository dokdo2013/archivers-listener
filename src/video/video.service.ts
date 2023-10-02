import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { YudarlinnSegment } from 'src/recorder/entities/yudarlinn-segment.entity';
import { YudarlinnStream } from 'src/recorder/entities/yudarlinn-stream.entity';

@Injectable()
export class VideoService {
  constructor(
    @InjectModel(YudarlinnStream)
    private readonly yudarlinnStreamModel: typeof YudarlinnStream,
    @InjectModel(YudarlinnSegment)
    private readonly yudarlinnSegmentModel: typeof YudarlinnSegment,
    private readonly sequelize: Sequelize,
  ) {
    this.sequelize.addModels([YudarlinnStream, YudarlinnSegment]);
  }

  async getStream(streamId: string) {
    const res = await this.yudarlinnStreamModel.findOne({
      where: {
        streamId,
      },
    });

    return res;
  }

  async getSegments(streamId: string) {
    const res = (await this.yudarlinnSegmentModel.findAll({
      where: {
        streamId,
      },
      order: [['created_at', 'ASC']],
      raw: true,
    })) as YudarlinnSegment[];

    // const segmentLinks = res.map((segment) => segment.link);

    return res;
  }

  generateM3u8(segments: YudarlinnSegment[], type: 'live' | 'vod' = 'vod') {
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
