import { Module } from '@nestjs/common';
import { RecorderController } from './recorder.controller';
import { RecorderService } from './recorder.service';
import { ParserModule } from 'src/parser/parser.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';
import { Segment } from './entities/segment.entity';
import { Stream } from './entities/stream.entity';
import { Streamer } from './entities/streamer.entity';
import { BullBoardModule } from '@bull-board/nestjs';
// const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
import { BullAdapter } from '@bull-board/api/bullAdapter';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    ParserModule,
    SequelizeModule.forFeature([Segment, Stream, Streamer]),
    BullModule.registerQueue({
      name: 'worker',
    }),
    BullBoardModule.forFeature({
      name: 'worker',
      adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
    }),
  ],
  controllers: [RecorderController],
  providers: [RecorderService],
})
export class RecorderModule {}
