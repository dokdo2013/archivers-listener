import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Stream } from './entities/stream.entity';
import { Streamer } from './entities/streamer.entity';
import { Segment } from './entities/segment.entity';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

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
    private readonly configService: ConfigService,
  ) {
    this.sequelize.addModels([Stream, Segment, Streamer]);
  }

  /**
   * Create stream
   * @param streamId 생방송 ID
   * @param title 생방송 제목
   * @param userId 유저 ID
   * @returns {Promise<YudarlinnStream>} YudarlinnStream
   */
  async createStream(streamId: string, title: string, userId: string) {
    const user = await this.streamerModel.findOne({
      where: {
        twitchName: userId,
      },
    });

    const res = await this.streamModel.create({
      streamId,
      title,
      isLive: true,
      startAt: new Date(),
      m3u8Address: `https://archivers.app/media-api/video/stream/${streamId}.m3u8`,
      storageProvider: 'r2',
      streamerId: user.id,
      spaceId: user.spaceId,
    });

    return res;
  }

  /**
   * End live stream
   * @param streamId 생방송 ID
   */
  async endStream(streamerId: string) {
    const user = await this.streamerModel.findOne({
      where: {
        twitchName: streamerId,
      },
    });

    const res = await this.streamModel.update(
      {
        isLive: false,
        endAt: new Date(),
      },
      {
        where: {
          streamerId: user.id,
        },
      },
    );

    return res;
  }

  async saveThumbnail(streamId: string) {
    // get user name from streamId
    const stream = await this.streamModel.findOne({
      where: {
        streamId,
      },
    });
    const streamerId = stream.streamerId;
    const streamer = await this.streamerModel.findOne({
      where: {
        id: streamerId,
      },
    });

    // make twitch thumbnail url
    const twitchThumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${streamer.twitchName}.jpg`;
    const fileName = `archivers-thumb-${streamId}`;

    // upload thumbnail to cloudflare images
    await this.uploadToCloudflareImages(twitchThumbnailUrl, fileName);

    const thumbnailUrl = `https://archivers.app/cdn-cgi/imagedelivery/lR-z0ff8FVe1ydEi9nc-5Q/${fileName}/public`;

    return {
      url: thumbnailUrl,
    };
  }

  private async uploadToCloudflareImages(imageUrl: string, fileName: string) {
    // curl --request POST \
    // --url https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/images/v1 \
    // --header 'Authorization: Bearer <API_TOKEN>' \
    // --form 'url=https://[user:password@]example.com/<PATH_TO_IMAGE>' \
    // --form 'metadata={"key":"value"}' \
    // --form 'requireSignedURLs=false'

    const account = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const token = this.configService.get<string>('CLOUDFLARE_IMAGES_API_TOKEN');

    const url = `https://api.cloudflare.com/client/v4/accounts/${account}/images/v1`;

    const formData = new FormData();
    formData.append('url', imageUrl);
    formData.append('requireSignedURLs', 'false');
    formData.append('id', fileName);

    await axios
      .post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch((err) => {
        console.error(err);
        console.log(JSON.stringify(err.response.data));
      });

    return true;
  }
}
