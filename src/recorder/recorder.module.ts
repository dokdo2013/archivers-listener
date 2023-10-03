import { Module } from '@nestjs/common';
import { RecorderController } from './recorder.controller';
import { RecorderService } from './recorder.service';
import { ParserModule } from 'src/parser/parser.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';
import { Segment } from './entities/segment.entity';
import { Stream } from './entities/stream.entity';
import { Streamer } from './entities/streamer.entity';

@Module({
  imports: [
    ParserModule,
    SequelizeModule.forFeature([Segment, Stream, Streamer]),
    BullModule.registerQueue({
      name: 'archivers',
    }),
  ],
  controllers: [RecorderController],
  providers: [RecorderService],
})
export class RecorderModule {}
