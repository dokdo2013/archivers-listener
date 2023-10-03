import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Segment } from 'src/recorder/entities/segment.entity';
import { Stream } from 'src/recorder/entities/stream.entity';

@Module({
  imports: [SequelizeModule.forFeature([Segment, Stream])],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
