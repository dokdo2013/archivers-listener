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

  private async getLiveSegments(streamId: string) {
    const res = (await this.segmentModel.findAll({
      where: {
        streamId,
      },
      order: [['segment_date', 'DESC']],
      limit: 30,
      raw: true,
    })) as Segment[];

    return res;
  }

  async getContinuousSegments(streamId: string): Promise<Segment[]> {
    const segments = await this.getLiveSegments(streamId);

    // 세그먼트 배열을 뒤집기
    const reversedSegments = segments.reverse();

    let continuousSegments: Segment[] = [];
    let currentStreak: Segment[] = [];

    for (let i = 0; i < reversedSegments.length - 1; i++) {
      const dateDifference =
        new Date(reversedSegments[i + 1].segmentDate).getTime() -
        new Date(reversedSegments[i].segmentDate).getTime();

      // segmentDate가 2초 (2000밀리초)의 차이를 보이는지 검사
      if (dateDifference === 2000) {
        currentStreak.push(reversedSegments[i]);
      } else {
        currentStreak = []; // 연속이 끊긴 경우, 현재 스트릭을 초기화
      }

      // 15개 이상의 연속된 세그먼트를 찾았다면 루프 종료
      if (currentStreak.length >= 15) {
        continuousSegments = currentStreak;
        break;
      }
    }

    // 만약 15개의 연속된 세그먼트가 찾아지지 않았다면 빈 배열 반환
    if (continuousSegments.length < 15) {
      return [];
    }

    return continuousSegments.slice(0, 15);
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
