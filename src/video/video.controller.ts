import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('stream/:stream_id')
  @ApiParam({
    name: 'stream_id',
    description: 'stream id',
    example: 'a1b2c3d4e5',
  })
  async getVideo(@Param('stream_id') stream_id: string, @Res() res) {
    if (stream_id.indexOf('.m3u8') !== -1) {
      stream_id = stream_id.replace('.m3u8', '');
    }

    // get stream id from request
    const stream = await this.videoService.getStream(stream_id);
    if (!stream) {
      throw new NotFoundException('해당하는 스트림이 없습니다.');
    }

    const segments = await this.videoService.getSegments(stream_id);

    // generate m3u8 file from segments
    const isLive = await this.videoService.isLive(stream_id);
    const m3u8 = await this.videoService.generateM3u8(
      segments,
      isLive ? 'live' : 'vod',
    );

    // return m3u8 text to response
    // just return m3u8 text (don't use nestjs interceptors)
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8);
  }

  @Get(['stream/:stream_id/live', 'stream/:stream_id/live.m3u8'])
  @ApiParam({
    name: 'stream_id',
    description: 'stream id',
    example: 'a1b2c3d4e5',
  })
  async getLiveVideo(@Param('stream_id') stream_id: string, @Res() res) {
    if (stream_id.indexOf('.m3u8') !== -1) {
      stream_id = stream_id.replace('.m3u8', '');
    }

    // get stream id from request
    const stream = await this.videoService.getStream(stream_id);
    if (!stream) {
      throw new NotFoundException('해당하는 스트림이 없습니다.');
    }

    const segments = await this.videoService.getContinuousSegments(stream_id);
    const m3u8 = await this.videoService.generateM3u8(segments, 'real-live');

    // return m3u8 text to response
    // just return m3u8 text (don't use nestjs interceptors)
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8);
  }
}
