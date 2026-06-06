import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../../common/decorators/roles.decorator';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body('From') from: string,
    @Body('Body') body: string,
    @Res() res: Response,
  ) {
    const message = await this.whatsappService.processMessage(from ?? '', body ?? '');
    const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    res.set('Content-Type', 'text/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`,
    );
  }
}
