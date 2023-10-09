import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RecorderDto, RecorderEndDto } from './dto/recorder.dto';
import { ApiBody } from '@nestjs/swagger';
import { RecorderService } from './recorder.service';
import { ParserService } from 'src/parser/parser.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as k8s from '@kubernetes/client-node';

@Controller('recorder')
export class RecorderController {
  constructor(
    private readonly recorderService: RecorderService,
    private readonly parserService: ParserService,
    @InjectQueue('worker') private readonly workerQueue: Queue,
  ) {}

  @Post('')
  @ApiBody({
    type: RecorderDto,
  })
  async postRecorder(@Body() data: RecorderDto) {
    // 임시 : Maintaining Mode
    const isMaintainingMode = false;
    if (isMaintainingMode) {
      console.log(`Maintaining Mode: ${JSON.stringify(data)}`);
      return null;
    }

    // 1. get m3u8
    const m3u8 = await this.parserService.getM3u8(data.user_id);

    // 2. save it to stream table
    const streamId = Math.random().toString(36).substr(2, 11);
    await this.recorderService.createStream(streamId, data.title, data.user_id);

    // 3. Create Kubernetes Job
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.BatchV1Api);

    const jobManifest: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: `archivers-pipeline-${streamId}`,
      },
      spec: {
        template: {
          spec: {
            serviceAccountName: 'archivers-listener',
            automountServiceAccountToken: true,
            nodeSelector: {
              'vke.vultr.com/node-pool': 'archivers-pipeline',
            },
            containers: [
              {
                name: 'pipeline',
                image: 'hyeonwoo5342/archivers-pipeline:latest',
                env: [
                  {
                    name: 'STREAM_ID',
                    value: streamId,
                  },
                  {
                    name: 'M3U8_URL',
                    value: m3u8[0].url,
                  },
                ],
                envFrom: [
                  {
                    secretRef: {
                      name: 'archivers-secret',
                    },
                  },
                ],
                resources: {
                  requests: {
                    memory: '130Mi',
                    cpu: '60m',
                  },
                  limits: {
                    memory: '130Mi',
                    cpu: '60m',
                  },
                },
              },
            ],
            imagePullSecrets: [
              {
                name: 'dockerhub-secret',
              },
            ],
            restartPolicy: 'OnFailure',
          },
        },
        ttlSecondsAfterFinished: 60 * 60 * 24, // automatically delete after 1 day
      },
    };

    await k8sApi.createNamespacedJob('archivers', jobManifest);

    return m3u8;
  }

  @Post('end')
  async postRecorderEnd(@Body() data: RecorderEndDto) {
    await this.recorderService.endStream(data.user_id);

    return {
      message: 'success',
    };
  }

  @Get('thumbnail/:stream_id')
  async getThumbnail(@Param('stream_id') stream_id: string) {
    const res = await this.recorderService.saveThumbnail(stream_id);

    return res;
  }
}
