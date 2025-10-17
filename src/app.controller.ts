import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import type { ClassifyResult } from './interfaces/classify-result.interface';
import { ClassifyDto } from './dto/classify.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/classify')
  async classify(@Body() body: ClassifyDto): Promise<ClassifyResult> {
    return await this.appService.classifyText(body.text);
  }
}
