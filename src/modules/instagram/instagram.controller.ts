import { Controller, Get, Post, Body, Query, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { InstagramService } from './instagram.service';
import { Public } from '../../common/decorators/roles.decorator';

@Controller('instagram')
@Public()
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  // Meta webhook verification handshake
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.META_VERIFY_TOKEN ?? 'mystical-verify-token';
    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  // Receive Instagram DMs
  @Post('webhook')
  @HttpCode(200)
  async receive(@Body() payload: Record<string, unknown>): Promise<string> {
    try {
      const entries = (payload['entry'] as Array<Record<string, unknown>>) ?? [];
      for (const entry of entries) {
        const messaging = (entry['messaging'] as Array<Record<string, unknown>>) ?? [];
        for (const event of messaging) {
          const sender = (event['sender'] as Record<string, unknown> | undefined)?.['id'] as
            | string
            | undefined;
          const message = event['message'] as Record<string, unknown> | undefined;
          const text = message?.['text'] as string | undefined;

          if (sender && text) {
            // Fire and forget — Meta expects 200 immediately
            void this.instagramService.processMessage(sender, text);
          }
        }
      }
    } catch {
      // Always return 200 or Meta will retry
    }
    return 'EVENT_RECEIVED';
  }
}
