import { ApiProperty } from '@nestjs/swagger';

export class RecorderDto {
  @ApiProperty({
    description: 'user_id',
    example: 'arahashitabi_stellive',
  })
  user_id: string;

  @ApiProperty({
    description: 'title',
    example: 'test',
  })
  title: string;

  @ApiProperty({
    description: 'description',
    example: 'test',
  })
  description: string;

  @ApiProperty({
    description: 'thumbnail',
    example: 'test',
  })
  thumbnail: string;
}
